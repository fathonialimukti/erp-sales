import { describe, expect, it } from "vitest";

import {
  currencyDigits,
  formatDateTime,
  formatDocumentMoney,
  titleCase,
  toNum,
} from "../../lib/print/print-format";

/**
 * Unit tests for the shared document-print formatters (lib/print/
 * print-format.ts — V-T1 foundation consolidation). The helpers were
 * lifted byte-identically from the Action Program and Event Proposal
 * print sheets, so the cases they pinned move here with them:
 *
 *  - `toNum` must coerce every wire shape of a Prisma Decimal
 *    (number / string / Decimal-like object) defensively.
 *  - `currencyDigits` is the frozen convention: IDR → 0, others → 2.
 *  - `formatDocumentMoney` is the frozen money story (id-ID/IDR without
 *    minor digits, en-US/2 decimals otherwise).
 *
 * `titleCase` / `formatDateTime` were private in the sheets and gain
 * coverage here for the first time.
 */

describe("toNum — Prisma Decimal wire coercion", () => {
  it("passes numbers through", () => {
    expect(toNum(1500)).toBe(1500);
    expect(toNum(0)).toBe(0);
  });

  it("parses decimal strings (Decimal.toJSON over JSON)", () => {
    expect(toNum("1234.5")).toBe(1234.5);
  });

  it("reads Decimal-like objects via Number valueOf", () => {
    expect(toNum({ valueOf: () => 42 })).toBe(42);
  });

  it("falls back to 0 for null / undefined / non-finite", () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum("abc")).toBe(0);
  });
});

describe("currencyDigits — frozen money convention", () => {
  it("gives IDR no minor unit", () => {
    expect(currencyDigits("IDR")).toBe(0);
  });

  it("gives every other currency 2 digits", () => {
    expect(currencyDigits("USD")).toBe(2);
    expect(currencyDigits("PHP")).toBe(2);
    expect(currencyDigits("SGD")).toBe(2);
  });
});

describe("formatDocumentMoney", () => {
  // ICU formats currency amounts with non-breaking spaces (e.g. id-ID
  // "Rp 2.500.000" uses U+00A0) — normalize before comparing.
  const plain = (s: string) => s.replace(/\u00A0/g, " ");

  it("formats IDR without minor digits, id-ID locale", () => {
    expect(plain(formatDocumentMoney(2500000, "IDR"))).toBe("Rp 2.500.000");
  });

  it("formats non-IDR with 2 decimals, en-US locale", () => {
    expect(formatDocumentMoney(1234.5, "USD")).toBe("$1,234.50");
  });

  it("coerces Prisma decimals that arrive as numeric strings and nulls to 0", () => {
    expect(plain(formatDocumentMoney("250000", "IDR"))).toBe("Rp 250.000");
    expect(plain(formatDocumentMoney(null, "IDR"))).toBe("Rp 0");
  });
});

describe("titleCase — enum fallback labels", () => {
  it("title-cases snake-case enums", () => {
    expect(titleCase("AI_VALIDATED")).toBe("Ai Validated");
    expect(titleCase("DRAFT")).toBe("Draft");
  });

  it("normalizes spaces and hyphens as word boundaries", () => {
    expect(titleCase("pending approval")).toBe("Pending Approval");
    expect(titleCase("some-mixed_Case value")).toBe("Some Mixed Case Value");
  });

  it("collapses separator runs and drops empty segments", () => {
    expect(titleCase("  --foo__bar  ")).toBe("Foo Bar");
  });
});

describe("formatDateTime — printed-on footer timestamp", () => {
  it("formats en-GB long form, local wall clock", () => {
    // Zone-less ISO parses as LOCAL time, so the local wall-clock
    // components are TZ-independent and the assertion is deterministic.
    expect(formatDateTime("2026-03-12T09:30:00")).toBe(
      "12 March 2026 at 09:30",
    );
    expect(formatDateTime("2026-03-12T21:05:00")).toBe(
      "12 March 2026 at 21:05",
    );
  });
});
