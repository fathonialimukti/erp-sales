import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { jsPDF } from "jspdf";

import { buildDocumentPdf, type DocumentPdfSpec } from "./documentPdf.js";

/**
 * Build/preview/print/download lifecycle for the client-side jsPDF
 * pipeline (docs/plans/jspdf-documents — Task J-T1; pipeline contract in
 * docs/plans/jspdf-documents/PLAN.md is FROZEN):
 *
 *  - build is gated on open + data-ready via a stable `buildKey`; the
 *    builder identity travels in a ref so the build effect never depends
 *    on it;
 *  - `URL.revokeObjectURL` on cleanup AND before every rebuild — one
 *    blob URL alive at a time, no leaks;
 *  - preview = `<iframe src={blobUrl}>` in the browser's native PDF
 *    viewer; the SAME blob serves print and download;
 *  - print = `iframe.contentWindow.focus() + print()`; Firefox's PDF.js
 *    may reject parent-frame printing → catch opens the blob URL in a
 *    full tab (printPdfInFrame);
 *  - download = anchor with the `download` attribute (sanitized name);
 *  - NO artificial build delay: jsPDF assembles bytes in RAM with no
 *    canvas sources in this app. The reference app's 50 ms paint timer
 *    exists only for offscreen QRCodeCanvas painting — reintroduce a
 *    delay ONLY if a future QR-label feature adds a canvas source.
 *
 * React binding note: the client test suite runs vitest in a node
 * environment — no jsdom — so the hook itself cannot be rendered
 * headlessly. All lifecycle mechanics of the blob-URL flow
 * (docs/plans/jspdf-documents/PLAN.md) live in the pure
 * `createPdfDocumentFlow` / `printPdfInFrame` /
 * `sanitizePdfFileName` seams below; the hook is a thin binding of
 * `createPdfDocumentFlow` to React state + the real URL/window APIs.
 */

// ---------------------------------------------------------------------------
// File name
// ---------------------------------------------------------------------------

const PDF_FILE_NAME_MAX_CHARS = 120;
const PDF_FILE_NAME_FALLBACK = "document";

/**
 * Windows-safe download name: strip filesystem-illegal characters and
 * control chars, collapse whitespace, trim leading/trailing dots and
 * spaces (Windows forbids both at the ends), cap length, guarantee the
 * .pdf suffix (case-insensitive — an existing ".PDF" is kept).
 */
export const sanitizePdfFileName = (raw: string): string => {
  let name = raw
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/[\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  name = name.replace(/^[\s.]+/, "").replace(/[\s.]+$/, "");
  name = name.slice(0, PDF_FILE_NAME_MAX_CHARS).replace(/[\s.]+$/, "");
  if (name.length === 0) {
    name = PDF_FILE_NAME_FALLBACK;
  }
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
};

// ---------------------------------------------------------------------------
// Print mechanics
// ---------------------------------------------------------------------------

/**
 * Structural print target — a real HTMLIFrameElement satisfies it; tests
 * inject fakes (node vitest, no jsdom).
 */
export interface PdfPrintFrame {
  contentWindow: { focus(): void; print(): void } | null;
}

/**
 * Pipeline print step: scope printing to the preview iframe's PDF, with
 * the FROZEN fallback — any failure (Firefox PDF.js rejecting the
 * parent-frame print(), iframe not mounted) opens the blob URL in a full
 * tab. No fallback URL / no frame → no-op.
 */
export const printPdfInFrame = (
  frame: PdfPrintFrame | null,
  fallbackUrl: string | null,
  openUrl: (url: string) => void,
): void => {
  if (fallbackUrl === null) return; // nothing built yet → no-op
  try {
    const win = frame?.contentWindow;
    if (!win) {
      throw new Error("pdf-preview-frame-unavailable");
    }
    win.focus();
    win.print();
  } catch {
    if (fallbackUrl) {
      openUrl(fallbackUrl);
    }
  }
};

// ---------------------------------------------------------------------------
// Build / URL lifecycle (pure — unit-testable seam)
// ---------------------------------------------------------------------------

export interface PdfDocumentFlowState {
  /** Object URL of the built PDF — drives the preview iframe. */
  url: string | null;
  isBuilding: boolean;
  /** Failure message from the last build (renderer threw). */
  error: string | null;
}

export interface PdfDocumentFlowHost {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  onStateChange(state: PdfDocumentFlowState): void;
}

export interface PdfDocumentFlow {
  /**
   * Build from the spec builder — revokes any previous URL BEFORE the
   * rebuild, then publishes the new blob URL (or the error state).
   */
  build(builder: () => DocumentPdfSpec): void;
  /** Modal closed / unmount: revoke the URL and clear the state. */
  reset(): void;
}

export const createPdfDocumentFlow = (
  host: PdfDocumentFlowHost,
): PdfDocumentFlow => {
  let url: string | null = null;

  const revokeCurrent = () => {
    if (url !== null) {
      host.revokeObjectUrl(url);
      url = null;
    }
  };

  return {
    build(builder) {
      revokeCurrent(); // BEFORE rebuild — never leak the previous blob URL
      host.onStateChange({ url: null, isBuilding: true, error: null });
      try {
        const pdf = buildDocumentPdf(builder());
        const blob = pdf.output("blob");
        url = host.createObjectUrl(blob);
        host.onStateChange({ url, isBuilding: false, error: null });
      } catch (e) {
        url = null;
        host.onStateChange({
          url: null,
          isBuilding: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
    reset() {
      revokeCurrent();
      host.onStateChange({ url: null, isBuilding: false, error: null });
    },
  };
};

// ---------------------------------------------------------------------------
// React binding
// ---------------------------------------------------------------------------

export interface UsePdfDocumentArgs {
  /**
   * Build gate — the modal's open flag. `buildKey: ""` additionally
   * suppresses building (data not ready yet — e.g. companyIdentity
   * still loading).
   */
  enabled: boolean;
  /**
   * Stable identity of the build inputs. The build runs once per
   * (enabled, buildKey); a changed key means exactly one rebuild.
   */
  buildKey: string;
  /**
   * Spec builder (labels pre-resolved via `intl.formatMessage` at call
   * time). Kept in a ref — the build effect must NOT depend on builder
   * identity.
   */
  buildSpec: () => DocumentPdfSpec;
  /** Download file name (sanitized at download time). */
  fileName: string;
}

export interface UsePdfDocumentResult {
  /** Object URL of the built PDF (blob:…) — the preview iframe's src. */
  pdfUrl: string | null;
  isBuilding: boolean;
  /** Failure message from the last build, if any. */
  error: string | null;
  /** Rebuild now (error-state retry) without changing buildKey. */
  retry: () => void;
  /**
   * Print the previewed PDF scoped to the modal iframe; Firefox fallback
   * opens the same blob URL in a full tab.
   */
  print: () => void;
  /** Trigger a real .pdf download via an anchor + download attribute. */
  download: () => void;
  /** Attach to the preview <iframe> so print() can reach its contentWindow. */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function usePdfDocument({
  enabled,
  buildKey,
  buildSpec,
  fileName,
}: UsePdfDocumentArgs): UsePdfDocumentResult {
  const [state, setState] = useState<PdfDocumentFlowState>({
    url: null,
    isBuilding: false,
    error: null,
  });
  const [retryNonce, setRetryNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const flow = useMemo(
    () =>
      createPdfDocumentFlow({
        createObjectUrl: (blob) => URL.createObjectURL(blob),
        revokeObjectUrl: (url) => URL.revokeObjectURL(url),
        onStateChange: setState,
      }),
    [],
  );

  // Builder identity via ref — must be declared BEFORE the build effect
  // so effects run ref-update → build on the same commit.
  const buildSpecRef = useRef(buildSpec);
  useEffect(() => {
    buildSpecRef.current = buildSpec;
  });

  useEffect(() => {
    if (!enabled || buildKey.length === 0) {
      flow.reset();
      return;
    }
    flow.build(buildSpecRef.current);
    // Revoke on cleanup AND before rebuild (build() revokes first) —
    // exactly one blob URL alive at a time.
    return () => flow.reset();
  }, [flow, enabled, buildKey, retryNonce]);

  const print = useCallback(() => {
    printPdfInFrame(
      iframeRef.current,
      state.url,
      (url) => window.open(url, "_blank"),
    );
  }, [state.url]);

  const download = useCallback(() => {
    if (!state.url) return;
    const anchor = document.createElement("a");
    anchor.href = state.url;
    anchor.download = sanitizePdfFileName(fileName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [state.url, fileName]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  return {
    pdfUrl: state.url,
    isBuilding: state.isBuilding,
    error: state.error,
    retry,
    print,
    download,
    iframeRef,
  };
}
