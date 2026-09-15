import {
  generateEmbedding,
  getEmbeddingSimilarityThreshold,
  isEmbeddingConfigured,
  toPgVectorLiteral,
} from './ai-embedding.js';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

export type KnowledgeHit = {
  id?: string;
  title: string;
  source: string;
  content: string;
  rank: number;
};

export type KnowledgeSearchHit = {
  title: string;
  source: string;
  snippet: string;
  rank: number;
};

export type KnowledgeSearchMode = 'vector' | 'fts' | 'hybrid';

export type KnowledgeSearchOptions = {
  /** Restrict retrieval to these sources (markdown basenames, e.g. 'email-agent-rules'). */
  sources?: string[];
  /** Restrict retrieval to these titles (exact match). */
  titles?: string[];
  /** Skip rows whose source matches (e.g. prompt files already injected verbatim). */
  excludeSources?: string[];
  /** Minimum cosine similarity for vector hits (default: embedding.similarityThreshold). */
  threshold?: number;
};

const SNIPPET_MAX = 280;

/** Format structured hits as markdown for system-prompt injection. */
export function formatKnowledgeHits(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return '';
  return hits
    .map((c) => `### ${c.title} (source: ${c.source})\n${c.content}`)
    .join('\n\n');
}

export function toKnowledgeSearchHits(
  hits: KnowledgeHit[],
  snippetMax = SNIPPET_MAX,
): KnowledgeSearchHit[] {
  return hits.map((h) => ({
    title: h.title,
    source: h.source,
    snippet:
      h.content.length > snippetMax
        ? `${h.content.slice(0, snippetMax).trimEnd()}…`
        : h.content,
    rank: h.rank,
  }));
}

function hitKey(hit: KnowledgeHit): string {
  if (hit.id) return `id:${hit.id}`;
  return `c:${hit.source}\0${hit.title}\0${hit.content}`;
}

/**
 * Merge FTS + vector hits with Reciprocal Rank Fusion (RRF).
 * RRF (k=60) is scale-free: it does not care that ts_rank is unbounded while
 * cosine similarity is 0..1, so neither retriever can dominate the ranking.
 * Dedupes by id/content and keeps the higher raw rank for display.
 */
export function mergeKnowledgeHits(
  primary: KnowledgeHit[],
  secondary: KnowledgeHit[],
  limit: number,
): KnowledgeHit[] {
  const RRF_K = 60;
  const scores = new Map<string, number>();
  const byKey = new Map<string, KnowledgeHit>();

  const accumulate = (hits: KnowledgeHit[]) => {
    hits.forEach((hit, idx) => {
      const key = hitKey(hit);
      const rank = idx + 1;
      scores.set(key, (scores.get(key) ?? 0) + 1 / (RRF_K + rank));
      const existing = byKey.get(key);
      if (!existing || hit.rank > existing.rank) byKey.set(key, hit);
    });
  };

  accumulate(primary);
  accumulate(secondary);

  return [...byKey.values()]
    .map((hit) => ({ hit, score: scores.get(hitKey(hit)) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))
    .map(({ hit }) => hit);
}

async function countNonNullEmbeddings(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
    `SELECT COUNT(*)::int AS count FROM knowledge_chunks WHERE embedding IS NOT NULL`,
  );
  return Number(rows[0]?.count ?? 0);
}

function buildWhereClause(options: KnowledgeSearchOptions): string {
  const clauses: string[] = [];
  if (options.sources?.length) {
    clauses.push(`source = ANY(${pgArrayLiteral(options.sources)})`);
  }
  if (options.titles?.length) {
    clauses.push(`title = ANY(${pgArrayLiteral(options.titles)})`);
  }
  if (options.excludeSources?.length) {
    clauses.push(`NOT (source = ANY(${pgArrayLiteral(options.excludeSources)}))`);
  }
  return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}

function pgArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(',');
  return `ARRAY[${escaped}]::text[]`;
}

/** Postgres FTS retrieval only. */
export async function searchKnowledgeChunksFts(
  query: string,
  limit = 5,
  options: KnowledgeSearchOptions = {},
): Promise<KnowledgeHit[]> {
  if (!query.trim()) return [];

  const where = buildWhereClause(options);
  const chunks = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      source: string;
      content: string;
      rank: number;
    }>
  >(
    `SELECT
        id,
        title,
        source,
        content,
        ts_rank(
            to_tsvector('english', title || ' ' || content),
            plainto_tsquery('english', $1)
        )::float8 AS rank
     FROM knowledge_chunks
     ${where}
     ${where ? 'AND' : 'WHERE'} to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $2`,
    query,
    limit,
  );

  return chunks.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source,
    content: c.content,
    rank: Number(c.rank),
  }));
}

/**
 * Vector cosine retrieval (pgvector).
 * Uses `1 - (embedding <=> query)` similarity with threshold.
 */
export async function searchKnowledgeChunksVector(
  query: string,
  limit = 5,
  threshold?: number,
  options: KnowledgeSearchOptions = {},
): Promise<KnowledgeHit[]> {
  if (!query.trim() || !(await isEmbeddingConfigured(prisma))) return [];

  const effectiveThreshold = threshold ?? (await getEmbeddingSimilarityThreshold(prisma));
  const embedding = await generateEmbedding(prisma, query);
  const vectorLiteral = toPgVectorLiteral(embedding);
  const where = buildWhereClause(options);

  const chunks = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      source: string;
      content: string;
      similarity: number;
    }>
  >(
    `SELECT
        id,
        title,
        source,
        content,
        (1 - (embedding <=> $1::vector))::float8 AS similarity
     FROM knowledge_chunks
     ${where}
     ${where ? 'AND' : 'WHERE'} embedding IS NOT NULL
       AND (1 - (embedding <=> $1::vector)) > $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vectorLiteral,
    effectiveThreshold,
    limit,
  );

  return chunks.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source,
    content: c.content,
    rank: Number(c.similarity),
  }));
}

/**
 * Hybrid retrieval: vector (when configured + rows embedded) + FTS, merged with
 * Reciprocal Rank Fusion. Falls back to FTS-only when embedding is missing or
 * the vector path fails. Supports source/title pinning via options.
 */
export async function searchKnowledgeChunks(
  query: string,
  limit = 5,
  options: KnowledgeSearchOptions = {},
): Promise<KnowledgeHit[]> {
  if (!query.trim()) return [];

  const ftsHits = await searchKnowledgeChunksFts(query, limit, options);

  let vectorHits: KnowledgeHit[] = [];
  let mode: KnowledgeSearchMode = 'fts';

  if (await isEmbeddingConfigured(prisma)) {
    try {
      const embeddedCount = await countNonNullEmbeddings();
      if (embeddedCount > 0) {
        vectorHits = await searchKnowledgeChunksVector(query, limit, options.threshold, options);
        mode =
          vectorHits.length > 0 && ftsHits.length > 0
            ? 'hybrid'
            : vectorHits.length > 0
              ? 'vector'
              : 'fts';
      }
    } catch (err) {
      logger.warn('[rag] vector search failed; FTS only', {
        error: err instanceof Error ? err.message : String(err),
      });
      mode = 'fts';
      vectorHits = [];
    }
  }

  const hits =
    vectorHits.length > 0
      ? mergeKnowledgeHits(vectorHits, ftsHits, limit)
      : ftsHits.slice(0, limit);

  if (process.env.NODE_ENV !== 'production') {
    logger.info(
      `[rag] mode=${mode} fts=${ftsHits.length} vector=${vectorHits.length} merged=${hits.length}` +
        (hits.length > 0
          ? ` titles=${hits.map((c) => c.title).join(' | ')}`
          : ''),
    );
  }

  return hits;
}

/** Guide-aligned alias: embed query → hybrid retrieve. */
export async function findRelevantContent(
  query: string,
  limit = 5,
  options: KnowledgeSearchOptions = {},
): Promise<KnowledgeHit[]> {
  return searchKnowledgeChunks(query, limit, options);
}

/**
 * Backward-compatible helper: returns formatted markdown for prompt injection.
 * Prefer `searchKnowledgeChunks` when structured hits are needed (tools).
 */
export async function retrieveRelevantChunks(
  query: string,
  limit = 5,
  options: KnowledgeSearchOptions = {},
): Promise<string> {
  const hits = await searchKnowledgeChunks(query, limit, options);
  return formatKnowledgeHits(hits);
}

