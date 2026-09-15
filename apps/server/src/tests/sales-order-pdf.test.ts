import { describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import type { Response } from 'express';
import {
  formatCurrency,
  fractionDigitsForCurrency,
  labelsFor,
  parsePdfLocale,
  pdfFilenameFor,
  pdfLabels,
  sanitizeAsciiFilename,
  streamSalesOrderPdf,
  type SalesOrderPdfRecord,
} from '../lib/sales-order-pdf.js';
import { getCompanyIdentity } from '../lib/company-identity.js';
import {
  PRINT_BORDER,
  PRINT_DESTRUCTIVE,
  PRINT_INK,
  PRINT_MUTED,
  PRINT_PRIMARY,
  PRINT_STATUS_COLORS,
  PRINT_SUCCESS,
  PRINT_WARNING,
} from '../lib/print-palette.js';
import { createCaller } from './helpers/caller.js';

// =============================================
// print-palette.ts — frozen contract for Tasks 2 & 3
// =============================================

describe('print palette', () => {
  const HEX = /^#[0-9A-F]{6}$/;

  it('exposes canonical hex constants derived from the light-mode design tokens', () => {
    // Canonical values from apps/client/src/index.css (the design law's source
    // of truth): hardcoding is correct for print ink — CSS vars would leak dark mode.
    expect(PRINT_INK).toBe('#080D16'); // --foreground oklch(0.16 0.02 260)
    expect(PRINT_MUTED).toBe('#003B67'); // --muted-foreground oklch(0.34 0.10 242.749)
    expect(PRINT_BORDER).toBe('#D6DFE7'); // --border oklch(0.9 0.015 242)
    expect(PRINT_PRIMARY).toBe('#0069A6'); // Aurora Azure --primary oklch(0.5 0.13 242.749)
    expect(PRINT_SUCCESS).toBe('#00A859'); // --success oklch(0.62 0.2 160)
    expect(PRINT_WARNING).toBe('#EF9900'); // --warning oklch(0.75 0.18 75)
    expect(PRINT_DESTRUCTIVE).toBe('#E7000B'); // --destructive oklch(0.577 0.245 27.325)
  });

  it('maps approval statuses to design-law chip colors (color + label, never color alone)', () => {
    for (const [status, colors] of Object.entries(PRINT_STATUS_COLORS)) {
      expect(colors.bg).toMatch(HEX);
      expect(colors.fg).toMatch(HEX);
      expect(status).toMatch(/^[A-Z_]+$/); // raw enum keys
    }
    expect(PRINT_STATUS_COLORS.APPROVED?.bg).not.toBe(PRINT_STATUS_COLORS.REJECTED?.bg);
    expect(PRINT_STATUS_COLORS.DRAFT?.fg).toBe(PRINT_INK); // neutral plate + black label
  });
});

// =============================================
// company-identity.ts — env-sourced letterhead
// =============================================

describe('company identity', () => {
  const ENV_KEYS = ['COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_PHONE', 'COMPANY_TAX_ID'] as const;
  const saved: Record<string, string | undefined> = {};
  const withEnv = async (
    values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
    run: () => void | Promise<void>,
  ) => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    Object.assign(process.env, values);
    try {
      await run();
    } finally {
      for (const key of ENV_KEYS) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  };

  it('falls back to sane defaults when no env is set', async () => {
    await withEnv({}, () => {
      expect(getCompanyIdentity()).toEqual({
        name: 'B2B CRM',
        addressLines: [],
        phone: '',
        taxId: '',
      });
    });
  });

  it('reads identity from env and splits the address into lines', async () => {
    await withEnv(
      {
        COMPANY_NAME: 'PT AetherGlo Nusantara',
        COMPANY_ADDRESS: 'Jl. Jend. Sudirman Kav. 1\nJakarta Selatan 12190',
        COMPANY_PHONE: '+62 21 555 0100',
        COMPANY_TAX_ID: '01.234.567.8-901.000',
      },
      () => {
        expect(getCompanyIdentity()).toEqual({
          name: 'PT AetherGlo Nusantara',
          addressLines: ['Jl. Jend. Sudirman Kav. 1', 'Jakarta Selatan 12190'],
          phone: '+62 21 555 0100',
          taxId: '01.234.567.8-901.000',
        });
      },
    );
  });

  it('treats blank env values as unset', async () => {
    await withEnv({ COMPANY_NAME: '  ', COMPANY_ADDRESS: '', COMPANY_PHONE: '' }, () => {
      expect(getCompanyIdentity().name).toBe('B2B CRM');
      expect(getCompanyIdentity().addressLines).toEqual([]);
    });
  });

  it('is exposed to authenticated clients via settings.companyIdentity (tRPC path)', async () => {
    await withEnv({ COMPANY_NAME: 'PT Identity Test', COMPANY_ADDRESS: 'Jl. Test 9' }, async () => {
      const caller = createCaller({ userId: 'pdf-identity-user', email: 'pdf-identity@example.com', name: 'PDF Identity' });
      const identity = await caller.settings.companyIdentity();
      expect(identity).toEqual({
        name: 'PT Identity Test',
        addressLines: ['Jl. Test 9'],
        phone: '',
        taxId: '',
      });
    });
  });
});

// =============================================
// Label dictionary — localized en + id
// =============================================

describe('pdf label dictionary', () => {
  it('has complete key parity between en and id', () => {
    expect(Object.keys(pdfLabels.id).sort()).toEqual(Object.keys(pdfLabels.en).sort());
    expect(Object.keys(pdfLabels.id.columns).sort()).toEqual(Object.keys(pdfLabels.en.columns).sort());
  });

  it('maps raw approval-status enums to translated labels', () => {
    expect(labelsFor('en').statusNames.DRAFT).toBe('Draft');
    expect(labelsFor('en').statusNames.APPROVED).toBe('Approved');
    expect(labelsFor('id').statusNames.DRAFT).toBe('Draf');
    expect(labelsFor('id').statusNames.APPROVED).toBe('Disetujui');
    expect(labelsFor('id').statusNames.REJECTED).toBe('Ditolak');
    expect(labelsFor('id').statusNames.AI_VALIDATED).toBe('Tervalidasi AI');
  });

  it('falls back to English for unknown locales', () => {
    expect(labelsFor('fr' as 'en')).toBe(pdfLabels.en);
  });

  it('localizes column headers and totals', () => {
    expect(labelsFor('en').columns.lineTotal).toBe('LINE TOTAL');
    expect(labelsFor('id').columns.lineTotal).toBe('TOTAL BARIS');
    expect(labelsFor('id').grandTotal).toBe('Total Keseluruhan');
  });
});

// =============================================
// Per-currency fraction digits
// =============================================

describe('currency formatting', () => {
  it('uses 0 fraction digits for IDR and 2 otherwise', () => {
    expect(fractionDigitsForCurrency('IDR')).toBe(0);
    expect(fractionDigitsForCurrency('idr')).toBe(0);
    for (const currency of ['USD', 'SGD', 'PHP', 'MYR', 'EUR', 'XXX']) {
      expect(fractionDigitsForCurrency(currency)).toBe(2);
    }
  });

  it('renders IDR magnitudes without decimals and USD with cents', () => {
    const idr = formatCurrency(1234567.89, 'IDR');
    expect(idr.startsWith('Rp')).toBe(true);
    expect(idr).toMatch(/1(\.|,)?234(\.|,)?568$/); // rounded, no cents

    const usd = formatCurrency(1234.5, 'USD');
    expect(usd).toContain('1,234.50');
  });
});

// =============================================
// Locale query-param contract (?locale=en|id)
// =============================================

describe('parsePdfLocale', () => {
  it('accepts en and id case-insensitively', () => {
    expect(parsePdfLocale('en')).toBe('en');
    expect(parsePdfLocale('id')).toBe('id');
    expect(parsePdfLocale('ID')).toBe('id');
  });

  it('defaults missing or invalid locale to en', () => {
    expect(parsePdfLocale(undefined)).toBe('en');
    expect(parsePdfLocale(null)).toBe('en');
    expect(parsePdfLocale('')).toBe('en');
    expect(parsePdfLocale('fr')).toBe('en');
    expect(parsePdfLocale('en-US')).toBe('en');
    expect(parsePdfLocale('id-ID')).toBe('en');
    expect(parsePdfLocale(['id'])).toBe('en'); // array query param is not a string
  });
});

// =============================================
// Content-Disposition filename sanitization
// =============================================

describe('pdf filename sanitization', () => {
  it('keeps only ASCII letters, digits, dot, dash and underscore', () => {
    expect(sanitizeAsciiFilename('SO-2026-0001')).toBe('SO-2026-0001');
    expect(sanitizeAsciiFilename('SO #2026/001')).toBe('SO-2026-001');
    expect(sanitizeAsciiFilename('«Àé» quote')).toBe('Ae-quote');
    expect(sanitizeAsciiFilename('a__b.pdf')).toBe('a__b.pdf');
  });

  it('collapses separators and falls back to a safe name when empty', () => {
    expect(sanitizeAsciiFilename('  ###  ')).toBe('sales-order');
    expect(sanitizeAsciiFilename('///')).toBe('sales-order');
    expect(sanitizeAsciiFilename('a -- b')).toBe('a-b');
  });

  it('builds the Content-Disposition filename from the document label', () => {
    expect(pdfFilenameFor({ documentNumber: 'SO/2026 #12' } as SalesOrderPdfRecord)).toBe('SO-2026-12.pdf');
    // No document number → ULID-prefix fallback, still sanitized.
    expect(pdfFilenameFor({ id: '01HZX3WKY5Q8T2R4N9MCV6B7AD', documentNumber: null } as SalesOrderPdfRecord)).toBe(
      'SO-01HZX3WK.pdf',
    );
  });
});

// =============================================
// Streaming behavior
// =============================================

const makeRecord = (overrides: Partial<SalesOrderPdfRecord> = {}): SalesOrderPdfRecord => ({
  id: '01HZX3WKY5Q8T2R4N9MCV6B7AD',
  documentNumber: 'SO-2026-0001',
  date: new Date('2026-09-01T00:00:00Z'),
  currency: 'IDR',
  paymentTerms: 'Net 30',
  customer: { id: 'c1', name: 'PT Maju Jaya' },
  outlet: null,
  area: { id: 'a1', name: 'Jakarta' },
  createdBy: { id: 'u1', name: 'Ada' },
  approvedBy: null,
  approvalStatus: 'APPROVED',
  subtotal: 1_000_000,
  discountTotal: 0,
  taxTotal: 100_000,
  grandTotal: 1_100_000,
  notes: null,
  expectedDeliveryDate: null,
  items: [],
  ...overrides,
});

const makeStreamRes = (headersSent: boolean) => {
  const res = new PassThrough() as PassThrough & Response;
  Object.defineProperty(res, 'headersSent', { get: () => headersSent });
  const headers: Record<string, string> = {};
  (res as unknown as Record<string, unknown>).setHeader = (name: string, value: string) => {
    headers[name] = value;
  };
  (res as unknown as Record<string, unknown>).status = () => res;
  (res as unknown as Record<string, unknown>).json = () => res;
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
  return { res, headers, done };
};

describe('streamSalesOrderPdf', () => {
  it('streams a valid PDF with PDF headers even with no line items (guard row)', async () => {
    const { res, headers, done } = makeStreamRes(false);
    streamSalesOrderPdf(res, makeRecord({ items: [] }), 'id');

    const pdf = await done;
    expect(headers['Content-Type']).toBe('application/pdf');
    expect(headers['Content-Disposition']).toBe('inline; filename="SO-2026-0001.pdf"');
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('does not leave a truncated 200 when drawing fails after pipe — destroys the response', () => {
    const { res } = makeStreamRes(true); // headers already flushed (post-pipe state)
    // Invalid date makes Intl throw inside drawHeader — simulates a mid-draw failure.
    streamSalesOrderPdf(res, makeRecord({ date: new Date('not-a-date') as unknown as Date }), 'en');
    expect(res.destroyed).toBe(true);
    expect(res.writableEnded).toBe(false);
  });

  it('pages long documents instead of dropping rows at page breaks', async () => {
    const manyItems = Array.from({ length: 60 }, (_, i) => ({
      id: `item-${i}`,
      sku: { id: `sku-${i}`, name: `Kopi Bubuk Arabika Gayo 200g varian ${i}`, code: `KPI-200-${i}`, baseUnit: 'PCS' },
      quantity: 2,
      unitPrice: 85_000,
      discountPercent: null,
      taxPercent: 11,
      lineTotal: 188_700,
      notes: 'Dikemas terpisah, simpan di tempat sejuk dan kering.',
    }));
    const { res, done } = makeStreamRes(false);
    streamSalesOrderPdf(res, makeRecord({ items: manyItems }), 'id');

    const pdf = await done;
    // Page objects live outside compressed content streams — countable in the raw file.
    const pageCount = (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThanOrEqual(2);
  });
});
