import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DocumentPdfSpec } from "../../../lib/pdf/documentPdf";
import {
  createPdfDocumentFlow,
  printPdfInFrame,
  sanitizePdfFileName,
  type PdfDocumentFlowHost,
  type PdfDocumentFlowState,
  type PdfPrintFrame,
} from "../../../lib/pdf/usePdfDocument";

/**
 * Lifecycle tests for the jsPDF pipeline seams (J-T1 foundation —
 * write-only here; the quality engineer owns execution).
 *
 * The client suite runs vitest in a node environment (no jsdom /
 * @testing-library), so the React hook cannot render headlessly. The
 * build/URL/print mechanics live in the
 * pure seams `createPdfDocumentFlow` / `printPdfInFrame` and are tested
 * here against fakes; `usePdfDocument` itself is a thin binding that
 *   - calls flow.build exactly once per (enabled, buildKey, retryNonce),
 *   - revokes on cleanup AND before rebuild (build() does), and
 *   - wires print/download to the iframe ref + current URL.
 */

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

interface FlowHarness {
  host: PdfDocumentFlowHost;
  /** Ordered create/revoke log — proves revoke-before-rebuild. */
  log: string[];
  states: PdfDocumentFlowState[];
}

const makeFlowHarness = (): FlowHarness => {
  const log: string[] = [];
  const states: PdfDocumentFlowState[] = [];
  let counter = 0;
  const host: PdfDocumentFlowHost = {
    createObjectUrl: (blob) => {
      const url = `blob:fake-${++counter}`;
      log.push(`create:${url}`);
      expect(blob).toBeInstanceOf(Blob);
      return url;
    },
    revokeObjectUrl: (url) => {
      log.push(`revoke:${url}`);
    },
    onStateChange: (state) => {
      states.push(state);
    },
  };
  return { host, log, states };
};

const minimalSpec = (): DocumentPdfSpec => ({
  letterhead: {
    identity: null,
    fallbackInitial: "A",
    fallbackName: "B2B CRM",
    fallbackTagline: "Sales OS",
    phoneLabel: "Phone",
    taxIdLabel: "Tax ID",
    title: "Action Program",
    documentNumber: "AP #TEST0001",
    status: null,
  },
  meta: [],
  blocks: [],
  signatures: [],
  footer: { printedOn: "Printed on 01 September 2026 at 10:00" },
});

const fakeFrame = (
  printImpl?: () => void,
): { frame: PdfPrintFrame; focus: ReturnType<typeof vi.fn>; print: ReturnType<typeof vi.fn> } => {
  const focus = vi.fn();
  const print = vi.fn(printImpl);
  return { frame: { contentWindow: { focus, print } }, focus, print };
};

let h: FlowHarness;

beforeEach(() => {
  h = makeFlowHarness();
});

// ---------------------------------------------------------------------------
// createPdfDocumentFlow — build / URL lifecycle
// ---------------------------------------------------------------------------

describe("createPdfDocumentFlow", () => {
  it("builds and publishes the blob URL through the state machine", () => {
    const flow = createPdfDocumentFlow(h.host);

    flow.build(minimalSpec);

    expect(h.states[0]).toEqual({ url: null, isBuilding: true, error: null });
    expect(h.states[h.states.length - 1]).toEqual({
      url: "blob:fake-1",
      isBuilding: false,
      error: null,
    });
    expect(h.log).toEqual(["create:blob:fake-1"]);
  });

  it("revokes the previous URL BEFORE rebuilding (no leaks)", () => {
    const flow = createPdfDocumentFlow(h.host);

    flow.build(minimalSpec);
    flow.build(minimalSpec);

    expect(h.log).toEqual([
      "create:blob:fake-1",
      "revoke:blob:fake-1",
      "create:blob:fake-2",
    ]);
  });

  it("reset revokes the current URL and clears the state", () => {
    const flow = createPdfDocumentFlow(h.host);

    flow.build(minimalSpec);
    flow.reset();

    expect(h.log).toEqual(["create:blob:fake-1", "revoke:blob:fake-1"]);
    expect(h.states[h.states.length - 1]).toEqual({
      url: null,
      isBuilding: false,
      error: null,
    });

    // Second reset is safe (idempotent, no double revoke).
    flow.reset();
    expect(h.log).toEqual(["create:blob:fake-1", "revoke:blob:fake-1"]);
  });

  it("a throwing builder lands in the error state without leaking URLs", () => {
    const flow = createPdfDocumentFlow(h.host);
    flow.build(minimalSpec);

    flow.build(() => {
      throw new Error("boom");
    });

    expect(h.log).toEqual(["create:blob:fake-1", "revoke:blob:fake-1"]);
    expect(h.states[h.states.length - 1]).toEqual({
      url: null,
      isBuilding: false,
      error: "boom",
    });

    // A retry (build again) recovers onto a fresh URL.
    flow.build(minimalSpec);
    expect(h.states[h.states.length - 1]).toEqual({
      url: "blob:fake-2",
      isBuilding: false,
      error: null,
    });
  });

  it("a fresh flow reset only clears state (nothing to revoke)", () => {
    const flow = createPdfDocumentFlow(h.host);

    flow.reset();

    expect(h.log).toEqual([]);
    expect(h.states).toEqual([{ url: null, isBuilding: false, error: null }]);
  });
});

// ---------------------------------------------------------------------------
// printPdfInFrame — frozen print mechanics + Firefox fallback
// ---------------------------------------------------------------------------

describe("printPdfInFrame", () => {
  it("scopes printing to the iframe: focus + print on its contentWindow", () => {
    const { frame, focus, print } = fakeFrame();
    const openUrl = vi.fn();

    printPdfInFrame(frame, "blob:pdf", openUrl);

    expect(focus).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("falls back to opening the blob in a tab when print() throws (Firefox PDF.js)", () => {
    const { frame, print } = fakeFrame(() => {
      throw new Error("PDF.js refuses parent-frame print");
    });
    const openUrl = vi.fn();

    printPdfInFrame(frame, "blob:pdf", openUrl);

    expect(print).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith("blob:pdf");
  });

  it("falls back when the iframe has no contentWindow (WebKitGTK blank viewer)", () => {
    const frame: PdfPrintFrame = { contentWindow: null };
    const openUrl = vi.fn();

    printPdfInFrame(frame, "blob:pdf", openUrl);

    expect(openUrl).toHaveBeenCalledWith("blob:pdf");
  });

  it("falls back when no frame is mounted but a URL exists", () => {
    const openUrl = vi.fn();

    printPdfInFrame(null, "blob:pdf", openUrl);

    expect(openUrl).toHaveBeenCalledWith("blob:pdf");
  });

  it("is a no-op without a fallback URL (nothing built yet)", () => {
    const { frame, print } = fakeFrame();
    const openUrl = vi.fn();

    printPdfInFrame(frame, null, openUrl);
    expect(print).not.toHaveBeenCalled();

    printPdfInFrame(null, null, openUrl);
    printPdfInFrame({ contentWindow: null }, null, openUrl);

    expect(openUrl).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// sanitizePdfFileName — download attribute name
// ---------------------------------------------------------------------------

describe("sanitizePdfFileName", () => {
  it("appends the .pdf suffix", () => {
    expect(sanitizePdfFileName("Action Program")).toBe("Action Program.pdf");
  });

  it("keeps an existing .pdf suffix (case-insensitive)", () => {
    expect(sanitizePdfFileName("report.pdf")).toBe("report.pdf");
    expect(sanitizePdfFileName("REPORT.PDF")).toBe("REPORT.PDF");
  });

  it("strips filesystem-illegal characters and control chars", () => {
    expect(sanitizePdfFileName('a/b\\c:d*e?f"g<h>i|j.pdf')).toBe(
      "a b c d e f g h i j.pdf",
    );
    expect(sanitizePdfFileName("inv\u0000oice")).toBe("invoice.pdf");
  });

  it("collapses whitespace runs to single spaces", () => {
    expect(sanitizePdfFileName("  Visit   Report  ")).toBe(
      "Visit Report.pdf",
    );
  });

  it("trims leading/trailing dots and spaces (Windows)", () => {
    expect(sanitizePdfFileName("... report ...")).toBe("report.pdf");
  });

  it("caps the length and still guarantees the suffix", () => {
    const long = "x".repeat(300);
    const out = sanitizePdfFileName(long);
    expect(out.length).toBeLessThanOrEqual(120 + ".pdf".length);
    expect(out.endsWith(".pdf")).toBe(true);
  });

  it("falls back to document.pdf for empty/blank/only-dots input", () => {
    expect(sanitizePdfFileName("")).toBe("document.pdf");
    expect(sanitizePdfFileName("   ")).toBe("document.pdf");
    expect(sanitizePdfFileName("...")).toBe("document.pdf");
  });
});
