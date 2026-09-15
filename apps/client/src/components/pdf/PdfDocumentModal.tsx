import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Printer } from "lucide-react";
import { useIntl } from "react-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocumentPdfSpec, PdfCompanyIdentity } from "@/lib/pdf/documentPdf";
import { usePdfDocument } from "@/lib/pdf/usePdfDocument";
import { trpcClient } from "@/lib/trpc";

/**
 * PDF document preview modal — the FROZEN pipeline surface
 * (docs/plans/jspdf-documents/PLAN.md): the built blob renders in the
 * browser's NATIVE PDF viewer inside an iframe; Print scopes printing to
 * that PDF (Firefox fallback opens the blob in a tab); Download serves
 * the same blob as a real .pdf file; the modal stays open throughout.
 *
 * Screen chrome uses semantic Tailwind tokens ONLY (design law — no raw
 * hex on screen); the PDF bytes carry the frozen print palette.
 *
 * Build gating (frozen): builds once per stable `buildKey` while open,
 * after `settings.companyIdentity` settles (unless the `identity` prop
 * is provided). Pass `buildKey: ""` while other document inputs are
 * still loading to suppress the build.
 */

export interface PdfDocumentModalLabels {
  print: string;
  download: string;
  close: string;
  loading: string;
  error: string;
  errorHint: string;
  retry: string;
  previewAria: string;
}

export interface PdfDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog chrome title — already intl'd by the calling sheet. */
  title: string;
  /**
   * Stable key of the build inputs — must change whenever the document
   * data changes. Empty string = inputs not ready → no build.
   */
  buildKey: string;
  /** Spec builder; receives the company identity (null while unavailable). */
  buildSpec: (identity: PdfCompanyIdentity | null) => DocumentPdfSpec;
  /** Download file name (sanitized at download time). */
  fileName: string;
  /**
   * Identity override — when provided (even null), the modal skips its
   * own `settings.companyIdentity` query.
   */
  identity?: PdfCompanyIdentity | null;
  /** Modal chrome labels — defaults to the common.* keys via intl. */
  labels?: Partial<PdfDocumentModalLabels>;
}

export const PdfDocumentModal = ({
  open,
  onOpenChange,
  title,
  buildKey,
  buildSpec,
  fileName,
  identity,
  labels,
}: PdfDocumentModalProps) => {
  const intl = useIntl();
  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number | boolean>,
  ) =>
    intl.formatMessage({ id, defaultMessage }, values as Record<string, string>);

  const resolvedLabels: PdfDocumentModalLabels = {
    print: labels?.print ?? t("common.action.print", "Print"),
    download: labels?.download ?? t("common.action.download", "Download"),
    close: labels?.close ?? t("common.action.close", "Close"),
    loading: labels?.loading ?? t("common.loading", "Loading..."),
    error: labels?.error ?? t("common.modal.error", "Error"),
    errorHint:
      labels?.errorHint ??
      t(
        "pdf.preview.error_hint",
        "Something went wrong while building the PDF.",
      ),
    retry: labels?.retry ?? t("common.action.retry", "Retry"),
    previewAria:
      labels?.previewAria ?? t("pdf.preview.aria", "Document preview"),
  };

  // Company identity — the modal queries once (5-min stale) unless the
  // sheet passes its own; the renderer consumes it as data.
  const identityQuery = useQuery({
    queryKey: ["companyIdentity"],
    queryFn: () => trpcClient.settings.companyIdentity.query(),
    staleTime: 300_000,
    enabled: open && identity === undefined,
  });
  const resolvedIdentity: PdfCompanyIdentity | null | undefined =
    identity !== undefined ? identity : (identityQuery.data ?? null);
  const dataReady =
    identity !== undefined || identityQuery.isSuccess || identityQuery.isError;

  const { pdfUrl, isBuilding, error, retry, print, download, iframeRef } =
    usePdfDocument({
      enabled: open && buildKey.length > 0 && dataReady,
      buildKey,
      buildSpec: () => buildSpec(resolvedIdentity ?? null),
      fileName,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85dvh] flex-col gap-3 sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted">
          {error ? (
            <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-bold text-destructive">
                {resolvedLabels.error}
              </p>
              <p className="text-xs text-muted-foreground">
                {resolvedLabels.errorHint}
              </p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="mt-2"
                onClick={retry}
              >
                {resolvedLabels.retry}
              </Button>
            </div>
          ) : pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title={resolvedLabels.previewAria}
              className="size-full"
            />
          ) : (
            <div className="flex size-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {resolvedLabels.loading}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {resolvedLabels.close}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={download}
            disabled={!pdfUrl || isBuilding}
          >
            <Download aria-hidden />
            {resolvedLabels.download}
          </Button>
          <Button type="button" onClick={print} disabled={!pdfUrl || isBuilding}>
            <Printer aria-hidden />
            {resolvedLabels.print}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
