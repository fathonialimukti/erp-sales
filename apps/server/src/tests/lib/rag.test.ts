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
    expect(merged[0]).toMatchObject({ id: '1', rank: 0.9 });
    expect(merged.map((h) => h.id)).toEqual(['1', '3', '2']);
  });

  it('respects limit after sort', () => {
    const hits: KnowledgeHit[] = [
      { id: 'a', title: 'A', source: 's', content: 'c', rank: 0.1 },
      { id: 'b', title: 'B', source: 's', content: 'c', rank: 0.9 },
      { id: 'c', title: 'C', source: 's', content: 'c', rank: 0.5 },
    ];
    const merged = mergeKnowledgeHits(hits, [], 2);
    expect(merged.map((h) => h.id)).toEqual(['b', 'c']);
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
