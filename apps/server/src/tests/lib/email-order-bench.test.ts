/**
 * email-order-bench thresholds — offline, deterministic, no network/DB/SMTP.
 *
 * Reuses the pure helpers exported from the bench script (SAMPLES, extractor,
 * scorer, percentile) instead of duplicating pipeline logic. The `--live` path
 * is never exercised here: it needs AI credentials + DB, so CI only asserts
 * the offline summary carries no live result.
 */
import { describe, expect, it } from 'vitest';
import {
  FIELDS,
  SAMPLES,
  extractFields,
  quantile,
  runCase,
  summarize,
} from '../../scripts/email-order-bench.js';

describe('email-order-bench offline thresholds', () => {
  const results = SAMPLES.map(runCase);
  const summary = summarize(results);

  it('covers all 8 pipeline cases', () => {
    expect(SAMPLES).toHaveLength(8);
    expect(results).toHaveLength(8);
  });

  it('every case reaches its expected decision', () => {
    for (const r of results) {
      expect(r.decision, r.name).toBe(r.expected.decision);
    }
  });

  it('exercises every decision branch', () => {
    const decisions = [...new Set(results.map((r) => r.decision))].sort();
    expect(decisions).toEqual([
      'ask-for-details',
      'blocked',
      'draft',
      'rejection',
      'skipped',
      'unknown_sku',
    ]);
  });

  it('every case matches all expected fields', () => {
    for (const r of results) {
      expect(r.score, r.name).toBe(FIELDS.length);
    }
  });

  it('overall accuracy meets the 90% baseline', () => {
    expect(summary.overallPct).toBeGreaterThanOrEqual(90);
    expect(summary.passed).toBe(summary.total);
  });

  it('validateConciergeResult ok on all draft cases', () => {
    const drafts = results.filter((r) => r.decision === 'draft');
    expect(drafts.length).toBeGreaterThan(0);
    for (const r of drafts) {
      expect(r.validateOk, r.name).toBe(true);
    }
  });

  it('stage latencies are finite numbers >= 0 (no wall-clock upper bounds)', () => {
    for (const r of results) {
      for (const ms of [r.parseMs, r.cartonGateMs, r.validateMs, r.totalMs]) {
        expect(ms, `${r.name} latency`).toBeGreaterThanOrEqual(0);
        expect(ms, `${r.name} latency`).toSatisfy(Number.isFinite);
      }
    }
  });

  it('p50/p95 are computed and sane', () => {
    for (const ms of [summary.meanMs, summary.p50Ms, summary.p95Ms]) {
      expect(ms).toSatisfy(Number.isFinite);
    }
    expect(summary.p50Ms).toBeLessThanOrEqual(summary.p95Ms);
  });

  it('stays offline: no live AI result without --live', () => {
    expect(summary.live).toBeNull();
  });

  it('runs offline in under 10s', () => {
    const start = performance.now();
    summarize(SAMPLES.map(runCase));
    expect(performance.now() - start).toBeLessThan(10_000);
  });
});

describe('extractFields stand-in', () => {
  it('extracts sku, qty, outlet, and customer', () => {
    expect(
      extractFields(
        'Hi, please order SKU-A 40 pcs for outlet JKT-01. Thanks.',
        'budi@ptmaju.co.id',
      ),
    ).toEqual({ customer: 'PT Maju', outlet: 'JKT-01', sku: 'SKU-A', quantity: 40 });
  });

  it('returns nulls when nothing matches', () => {
    expect(extractFields('Please see attached.', 'budi@ptmaju.co.id')).toEqual({
      customer: 'PT Maju',
      outlet: null,
      sku: null,
      quantity: null,
    });
  });
});

describe('quantile', () => {
  it('returns 0 for empty input', () => {
    expect(quantile([], 0.5)).toBe(0);
  });

  it('picks ceil-based indexes', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(quantile([1, 2, 3, 4], 0.95)).toBe(4);
  });
});
