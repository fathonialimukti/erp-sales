/**
 * Email order bench — offline accuracy + stage latency for the inbound
 * email → draft-order stand-in pipeline.
 *
 * Offline default: zero network, zero DB, zero SMTP sends. The extractor
 * below is a tiny regex stand-in (SKU code + qty + outlet keyword), not the
 * AI concierge — it measures pipeline plumbing (skip gate → extract →
 * carton gate → validate), not model quality.
 *
 * Usage: bun src/scripts/email-order-bench.ts [--json] [--live]
 *   --json  dump machine-readable { cases, summary } instead of tables
 *   --live  also run one real getChatModel + generateText suggest call
 *           (requires ai.apiKey / AI_API_KEY + reachable ai.baseUrl);
 *           prints a clean message and exits 0 when AI is not configured.
 *           Never sends email.
 */
import 'dotenv/config';
import type { EmailInboundPayload } from '@repo/schemas/email-crm';
import { assertCartonMultiple, nearestCartonMultiples } from '@repo/schemas/sales-order';
import {
  extractBody,
  formatAttachmentNote,
  normalizeEmail,
  shouldSkipInbound,
} from '../lib/email-inbound.js';
import { validateConciergeResult } from '../lib/email-concierge.js';
import type { ConciergeRunState } from '../lib/email-concierge-tools.js';

export type Decision =
  | 'draft'
  | 'blocked'
  | 'unknown_sku'
  | 'rejection'
  | 'ask-for-details'
  | 'skipped';

export type FieldName = 'customer' | 'outlet' | 'sku' | 'quantity' | 'cartonValid' | 'decision';

export type Expected = {
  customer: string | null;
  outlet: string | null;
  sku: string | null;
  quantity: number | null;
  cartonValid: boolean;
  decision: Decision;
};

export type Sample = { name: string; payload: EmailInboundPayload; expected: Expected };

export type Extracted = {
  customer: string | null;
  outlet: string | null;
  sku: string | null;
  quantity: number | null;
};

export type CaseResult = {
  name: string;
  skipReason: string | null;
  extracted: Extracted;
  cartonValid: boolean;
  nearest: { lower: number; upper: number } | null;
  decision: Decision;
  expected: Expected;
  fields: Record<FieldName, boolean>;
  score: number;
  parseMs: number;
  cartonGateMs: number;
  validateMs: number;
  validateOk: boolean;
  totalMs: number;
};

export type Summary = {
  total: number;
  passed: number;
  fieldPct: Record<FieldName, number>;
  overallPct: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  live: { aiLatencyMs: number; model: string } | null;
};

// ponytail: stub pack-size map — the bench never touches the DB/Sku table.
const PACK_SIZES: Record<string, number> = { 'SKU-A': 20, 'SKU-B': 15, 'SKU-C': 12 };

// ponytail: stub customer directory — sender email → customer name.
const CUSTOMERS: Record<string, string> = {
  'budi@ptmaju.co.id': 'PT Maju',
  'sari@tokoindah.com': 'Toko Indah',
};

export const FIELDS: FieldName[] = ['customer', 'outlet', 'sku', 'quantity', 'cartonValid', 'decision'];

export const SAMPLES: Sample[] = [
  {
    name: 'clean-en-valid',
    payload: {
      from: 'budi@ptmaju.co.id',
      to: 'sales@example.com',
      subject: 'Order SKU-A',
      text: 'Hi, please order SKU-A 40 pcs for outlet JKT-01. Thanks.',
    },
    expected: {
      customer: 'PT Maju',
      outlet: 'JKT-01',
      sku: 'SKU-A',
      quantity: 40,
      cartonValid: true,
      decision: 'draft',
    },
  },
  {
    name: 'clean-id-valid',
    payload: {
      from: 'sari@tokoindah.com',
      to: 'sales@example.com',
      subject: 'Pesanan',
      text: 'Halo, tolong pesan SKU-B 30 pcs untuk outlet SBY-02. Terima kasih.',
    },
    expected: {
      customer: 'Toko Indah',
      outlet: 'SBY-02',
      sku: 'SKU-B',
      quantity: 30,
      cartonValid: true,
      decision: 'draft',
    },
  },
  {
    name: 'non-carton-qty',
    payload: {
      from: 'budi@ptmaju.co.id',
      to: 'sales@example.com',
      subject: 'Order SKU-A',
      text: 'Hi, please order SKU-A 35 pcs for outlet JKT-01. Thanks.',
    },
    expected: {
      customer: 'PT Maju',
      outlet: 'JKT-01',
      sku: 'SKU-A',
      quantity: 35,
      cartonValid: false,
      decision: 'blocked',
    },
  },
  {
    name: 'unknown-sku',
    payload: {
      from: 'budi@ptmaju.co.id',
      to: 'sales@example.com',
      subject: 'Order SKU-ZZZ',
      text: 'Hi, please order SKU-ZZZ 20 pcs for outlet JKT-01. Thanks.',
    },
    expected: {
      customer: 'PT Maju',
      outlet: 'JKT-01',
      sku: 'SKU-ZZZ',
      quantity: 20,
      cartonValid: false,
      decision: 'unknown_sku',
    },
  },
  {
    name: 'missing-customer',
    payload: {
      from: 'stranger@gmail.com',
      to: 'sales@example.com',
      subject: 'Order SKU-A',
      text: 'Hi, please order SKU-A 40 pcs for outlet JKT-01. Thanks.',
    },
    expected: {
      customer: null,
      outlet: 'JKT-01',
      sku: 'SKU-A',
      quantity: 40,
      cartonValid: true,
      decision: 'rejection',
    },
  },
  {
    name: 'attachment-only',
    payload: {
      from: 'budi@ptmaju.co.id',
      to: 'sales@example.com',
      subject: 'PO attached',
      text: 'Please see attached.',
      hasAttachments: true,
      attachments: [{ filename: 'po.pdf', contentType: 'application/pdf', size: 48210 }],
    },
    expected: {
      customer: 'PT Maju',
      outlet: null,
      sku: null,
      quantity: null,
      cartonValid: false,
      decision: 'ask-for-details',
    },
  },
  {
    name: 'empty',
    payload: { from: 'budi@ptmaju.co.id', to: 'sales@example.com', text: '' },
    expected: {
      customer: null,
      outlet: null,
      sku: null,
      quantity: null,
      cartonValid: false,
      decision: 'skipped',
    },
  },
  {
    name: 'noreply',
    payload: {
      from: 'noreply@erp.example.com',
      to: 'sales@example.com',
      subject: 'Order',
      text: 'SKU-A 40 pcs outlet JKT-01',
    },
    expected: {
      customer: null,
      outlet: null,
      sku: null,
      quantity: null,
      cartonValid: false,
      decision: 'skipped',
    },
  },
];

/** Tiny regex extractor stand-in: SKU code + qty (N pcs) + outlet keyword. */
export function extractFields(body: string, from: string): Extracted {
  const sku = body.match(/SKU-[A-Z0-9]+/i)?.[0]?.toUpperCase() ?? null;
  const qtyRaw = body.match(/(\d+)\s*(?:pcs|pieces|units?)\b/i)?.[1];
  const quantity = qtyRaw !== undefined ? Number(qtyRaw) : null;
  const outlet = body.match(/outlet\s+([A-Za-z0-9-]+)/i)?.[1]?.toUpperCase() ?? null;
  const customer = CUSTOMERS[normalizeEmail(from)] ?? null;
  return { customer, outlet, sku, quantity };
}

function decideCase(
  skip: string | null,
  ext: Extracted,
  cartonValid: boolean,
): Decision {
  if (skip) return 'skipped';
  if (!ext.customer) return 'rejection';
  if (ext.sku && PACK_SIZES[ext.sku] === undefined) return 'unknown_sku';
  if (!ext.sku || ext.quantity === null) return 'ask-for-details';
  if (!cartonValid) return 'blocked';
  return 'draft';
}

/** Synthetic concierge state matching the stand-in decision, so the real
 * validateConciergeResult gate is exercised (timed, not scored). */
function buildValidateState(decision: Decision): ConciergeRunState {
  if (decision === 'draft') {
    const doc = 'SO-BENCH-0001';
    return {
      finalized: { htmlBody: `<p>Draft order ${doc} created.</p>` },
      createdOrderDocNumbers: [doc],
    };
  }
  if (decision === 'skipped') return { createdOrderDocNumbers: [] };
  return {
    finalized: { htmlBody: '<p>Thanks — could you confirm the details?</p>' },
    createdOrderDocNumbers: [],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function runCase(sample: Sample): CaseResult {
  // parse stage: skip gate + body extract + regex fields
  const t0 = performance.now();
  const skip = shouldSkipInbound(sample.payload);
  const body = `${extractBody(sample.payload)}${formatAttachmentNote(sample.payload)}`;
  const extracted = skip
    ? { customer: null, outlet: null, sku: null, quantity: null }
    : extractFields(body, sample.payload.from);
  const parseMs = performance.now() - t0;

  // cartonGate stage: real assertCartonMultiple / nearestCartonMultiples
  const t1 = performance.now();
  const packSize = extracted.sku ? PACK_SIZES[extracted.sku] : undefined;
  let cartonValid = false;
  let nearest: { lower: number; upper: number } | null = null;
  if (extracted.sku && packSize !== undefined && extracted.quantity !== null && extracted.quantity > 0) {
    try {
      assertCartonMultiple(extracted.quantity, packSize, extracted.sku);
      cartonValid = true;
    } catch {
      cartonValid = false;
      nearest = nearestCartonMultiples(extracted.quantity, packSize);
    }
  }
  const cartonGateMs = performance.now() - t1;

  const decision = decideCase(skip, extracted, cartonValid);

  // validate stage: real validateConciergeResult on a synthetic state
  const t2 = performance.now();
  const validated = validateConciergeResult(buildValidateState(decision));
  const validateMs = performance.now() - t2;

  const fields: Record<FieldName, boolean> = {
    customer: extracted.customer === sample.expected.customer,
    outlet: extracted.outlet === sample.expected.outlet,
    sku: extracted.sku === sample.expected.sku,
    quantity: extracted.quantity === sample.expected.quantity,
    cartonValid: cartonValid === sample.expected.cartonValid,
    decision: decision === sample.expected.decision,
  };
  const score = FIELDS.filter((f) => fields[f]).length;

  return {
    name: sample.name,
    skipReason: skip,
    extracted,
    cartonValid,
    nearest,
    decision,
    expected: sample.expected,
    fields,
    score,
    parseMs: round2(parseMs),
    cartonGateMs: round2(cartonGateMs),
    validateMs: round2(validateMs),
    validateOk: validated.ok,
    totalMs: round2(parseMs + cartonGateMs + validateMs),
  };
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

export function summarize(results: CaseResult[]): Summary {
  const fieldPct = {} as Record<FieldName, number>;
  for (const f of FIELDS) {
    const correct = results.filter((r) => r.fields[f]).length;
    fieldPct[f] = Math.round((correct / results.length) * 1000) / 10;
  }
  const totalFields = results.length * FIELDS.length;
  const correctFields = results.reduce((acc, r) => acc + r.score, 0);
  const totals = results.map((r) => r.totalMs).sort((a, b) => a - b);
  const mean = totals.reduce((acc, t) => acc + t, 0) / (totals.length || 1);
  return {
    total: results.length,
    passed: results.filter((r) => r.score === FIELDS.length).length,
    fieldPct,
    overallPct: Math.round((correctFields / totalFields) * 1000) / 10,
    meanMs: round2(mean),
    p50Ms: round2(quantile(totals, 0.5)),
    p95Ms: round2(quantile(totals, 0.95)),
    live: null,
  };
}

/**
 * --live: one real getChatModel + generateText suggest call for the first
 * sample. Suggest flow only — never sends. Returns null (after a clean
 * message) when AI is not configured or the call fails.
 */
async function runLiveSuggest(): Promise<Summary['live']> {
  const { prisma } = await import('../lib/prisma.js');
  try {
    const { getSettingValue, getSecretValue } = await import('../lib/settings-service.js');
    const apiKey = await getSecretValue(prisma, 'ai.apiKey');
    if (!apiKey) {
      console.log('email-order-bench: --live skipped — AI API key not configured (ai.apiKey / AI_API_KEY).');
      return null;
    }
    const { getChatModel } = await import('../lib/ai-provider.js');
    const { generateText } = await import('ai');
    const sample = SAMPLES[0];
    if (!sample) return null;
    const thread = `${sample.payload.from}: ${extractBody(sample.payload)}`;
    const start = performance.now();
    const { text } = await generateText({
      model: await getChatModel(prisma),
      instructions: 'You are a B2B sales representative writing real email replies. Reply body only.',
      prompt: `Suggest a short reply to this customer order email (suggest only, do not send anything):\n\n${thread}`,
    });
    const aiLatencyMs = performance.now() - start;
    const model = String(await getSettingValue(prisma, 'ai.model'));
    console.log(`live suggest ok in ${aiLatencyMs.toFixed(0)}ms — snippet: ${text.slice(0, 200)}`);
    return { aiLatencyMs: round2(aiLatencyMs), model };
  } catch (err) {
    console.log(
      `email-order-bench: --live failed cleanly: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const live = args.includes('--live');

  const results = SAMPLES.map(runCase);
  const summary = summarize(results);
  if (live) summary.live = await runLiveSuggest();

  if (asJson) {
    console.log(JSON.stringify({ cases: results, summary }, null, 2));
    return;
  }

  console.table(
    results.map((r) => ({
      case: r.name,
      'expected→got': `${r.expected.decision}→${r.decision}`,
      score: `${r.score}/${FIELDS.length}`,
      parseMs: r.parseMs,
      cartonGateMs: r.cartonGateMs,
      validateMs: r.validateMs,
      totalMs: r.totalMs,
    })),
  );
  console.table(
    FIELDS.map((f) => ({ field: f, accuracyPct: summary.fieldPct[f] })),
  );
  console.log(
    `overall ${summary.overallPct}% — ${summary.passed}/${summary.total} cases fully correct — ` +
      `mean ${summary.meanMs}ms p50 ${summary.p50Ms}ms p95 ${summary.p95Ms}ms` +
      (summary.live ? ` — live aiLatencyMs ${summary.live.aiLatencyMs}ms (${summary.live.model})` : ''),
  );
}

// ponytail: guard so vitest can import the pure helpers above without running
// the CLI. `bun src/scripts/email-order-bench.ts` still runs via argv[1].
const invokedDirectly = process.argv[1]?.endsWith('email-order-bench.ts') ?? false;
if (invokedDirectly) {
  main().catch((err) => {
    console.error('email-order-bench failed:', err);
    process.exit(1);
  });
}
