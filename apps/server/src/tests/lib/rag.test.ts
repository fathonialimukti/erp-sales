import { describe, expect, it } from 'vitest';
import {
  formatKnowledgeHits,
  mergeKnowledgeHits,
  toKnowledgeSearchHits,
  type KnowledgeHit,
} from '../../lib/rag.js';
import { serverTools } from '../../lib/ai-tools.js';

describe('rag format helpers', () => {
  const hits: KnowledgeHit[] = [
    {
      title: 'Approval workflow',
      source: 'approvals',
      content: 'Orders move DRAFT → PROPOSED → APPROVED or REJECTED.',
      rank: 0.42,
    },
    {
      title: 'Long doc',
      source: 'general',
      content: 'x'.repeat(400),
      rank: 0.1,
    },
  ];

  it('formats markdown with title and source', () => {
    const md = formatKnowledgeHits(hits);
    expect(md).toContain('### Approval workflow (source: approvals)');
    expect(md).toContain('Orders move DRAFT');
    expect(md).toContain('### Long doc (source: general)');
  });

  it('returns empty string for no hits', () => {
    expect(formatKnowledgeHits([])).toBe('');
  });

  it('builds search snippets for tool payload', () => {
    const short = toKnowledgeSearchHits([hits[0]!]);
    expect(short[0]).toMatchObject({
      title: 'Approval workflow',
      source: 'approvals',
      snippet: 'Orders move DRAFT → PROPOSED → APPROVED or REJECTED.',
      rank: 0.42,
    });

    const truncated = toKnowledgeSearchHits([hits[1]!], 50);
    expect(truncated[0]!.snippet.endsWith('…')).toBe(true);
    expect(truncated[0]!.snippet.length).toBeLessThanOrEqual(51);
  });
});

describe('mergeKnowledgeHits', () => {
  it('dedupes by id and keeps higher rank', () => {
    const a: KnowledgeHit[] = [
      { id: '1', title: 'A', source: 's', content: 'c', rank: 0.5 },
      { id: '2', title: 'B', source: 's', content: 'c2', rank: 0.2 },
    ];
    const b: KnowledgeHit[] = [
      { id: '1', title: 'A', source: 's', content: 'c', rank: 0.9 },
      { id: '3', title: 'C', source: 's', content: 'c3', rank: 0.4 },
    ];
    const merged = mergeKnowledgeHits(a, b, 10);
    expect(merged).toHaveLength(3);
    // RRF: '1' = 1/61 + 1/61 (rank 1 in both) > '2' = 1/62 (rank 2 in a) = '3' = 1/62 (rank 2 in b).
    // Tie between '2' and '3' keeps insertion order (a before b).
    expect(merged[0]).toMatchObject({ id: '1', rank: 0.9 });
    expect(merged.map((h) => h.id)).toEqual(['1', '2', '3']);
  });

  it('respects limit after sort', () => {
    const hits: KnowledgeHit[] = [
      { id: 'a', title: 'A', source: 's', content: 'c', rank: 0.1 },
      { id: 'b', title: 'B', source: 's', content: 'c', rank: 0.9 },
      { id: 'c', title: 'C', source: 's', content: 'c', rank: 0.5 },
    ];
    const merged = mergeKnowledgeHits(hits, [], 2);
    // All in primary only → RRF scores 1/61, 1/62, 1/63 → top 2 are a, b.
    expect(merged.map((h) => h.id)).toEqual(['a', 'b']);
  });

  it('uses RRF: a hit present in both lists outranks a hit present in one', () => {
    // '1' appears in both lists (rank 1 + rank 2) → RRF score 1/61 + 1/62.
    // '2' appears only in list a at rank 2 → 1/62. '3' only in list b at rank 1 → 1/61.
    const a: KnowledgeHit[] = [
      { id: '1', title: 'A', source: 's', content: 'c', rank: 0.5 },
      { id: '2', title: 'B', source: 's', content: 'c2', rank: 0.2 },
    ];
    const b: KnowledgeHit[] = [
      { id: '3', title: 'C', source: 's', content: 'c3', rank: 0.9 },
      { id: '1', title: 'A', source: 's', content: 'c', rank: 0.4 },
    ];
    const merged = mergeKnowledgeHits(a, b, 10);
    // RRF: '1' = 1/61 + 1/62 ≈ 0.0327; '3' = 1/61 ≈ 0.0164; '2' = 1/62 ≈ 0.0161
    expect(merged.map((h) => h.id)).toEqual(['1', '3', '2']);
  });

  it('does not let a huge raw vector rank dominate a lexical hit', () => {
    // 'v1' is rank 1 in vector + rank 2 in fts → 1/61 + 1/62 ≈ 0.0327.
    // 'shared' is rank 1 in fts only → 1/61 ≈ 0.0164. RRF keeps v1 first —
    // the raw 0.99 cosine does NOT single-handedly dominate the ranking.
    const vector: KnowledgeHit[] = [
      { id: 'v1', title: 'Vector only', source: 's', content: 'c', rank: 0.99 },
    ];
    const fts: KnowledgeHit[] = [
      { id: 'shared', title: 'Shared', source: 's', content: 'c', rank: 0.01 },
      { id: 'v1', title: 'Vector only', source: 's', content: 'c', rank: 0.99 },
    ];
    const merged = mergeKnowledgeHits(vector, fts, 10);
    expect(merged[0]!.id).toBe('v1');
    // A hit present in both lists still outranks a single-list hit at the same rank.
    const merged2 = mergeKnowledgeHits(
      [{ id: 'shared', title: 'Shared', source: 's', content: 'c', rank: 0.99 }],
      [{ id: 'shared', title: 'Shared', source: 's', content: 'c', rank: 0.99 }],
      10,
    );
    expect(merged2[0]!.id).toBe('shared');
  });
});

describe('serverTools.searchKnowledge', () => {
  it('exports tool named searchKnowledge with execute', () => {
    expect(serverTools.searchKnowledge).toBeDefined();
    expect(typeof (serverTools.searchKnowledge as { execute?: unknown }).execute).toBe(
      'function',
    );
  });
});
