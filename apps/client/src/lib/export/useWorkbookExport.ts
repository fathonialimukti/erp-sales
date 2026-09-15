import { useCallback, useState } from "react";
import { useIntl } from "react-intl";
import * as XLSX from "xlsx";

import { useToast } from "../../components/useToast";

export interface WorkbookColumn {
  key: string;
  /**
   * Pre-translated header — callers pass `intl.formatMessage` results so no
   * English is hardcoded in the util.
   */
  header: string;
  /** Optional formatter for cell values. */
  format?: (value: unknown) => string | number;
}

export interface WorkbookSummaryRow {
  label: string;
  value: string | number;
}

export interface WorkbookSummarySheet {
  /** Pre-translated summary sheet name. */
  sheetName: string;
  /** KPI/trend label-value pairs, written as a headerless two-column sheet. */
  rows: WorkbookSummaryRow[];
}

export interface WorkbookExportOptions {
  /** Filename prefix — the util appends the local date: `prefix-YYYY-MM-DD.xlsx`. */
  prefix: string;
  /** Pre-translated data sheet name. */
  sheetName: string;
  columns: WorkbookColumn[];
  rows: Record<string, unknown>[];
  /** Optional KPI/trend summary second sheet, only when trivially available. */
  summary?: WorkbookSummarySheet;
}

/** `prefix-YYYY-MM-DD.xlsx`, stamped with the LOCAL date. */
export const workbookFilename = (
  prefix: string,
  now: Date = new Date(),
): string => {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${prefix}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`;
};

/** Excel sheet names allow max 31 chars and no []:*?/\ — sanitize translated names. */
const sanitizeSheetName = (name: string, fallback: string): string =>
  name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || fallback;

/** Translated header row + formatted data rows. */
const toSheetAoa = (
  rows: Record<string, unknown>[],
  columns: WorkbookColumn[],
): (string | number)[][] => [
  columns.map((c) => c.header),
  ...rows.map((row) =>
    columns.map((col) => {
      const raw = row[col.key];
      return col.format ? col.format(raw) : ((raw ?? "") as string | number);
    }),
  ),
];

/** Build the workbook: data sheet + optional summary sheet. Pure — no side effects. */
export const buildWorkbook = (options: WorkbookExportOptions): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(toSheetAoa(options.rows, options.columns)),
    sanitizeSheetName(options.sheetName, "Report"),
  );
  if (options.summary && options.summary.rows.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(
        options.summary.rows.map((r) => [r.label, r.value]),
      ),
      sanitizeSheetName(options.summary.sheetName, "Summary"),
    );
  }
  return workbook;
};

/**
 * Build the workbook and trigger the browser download. Async and throwing so
 * callers can drive a loading state and a translated error toast — never call
 * this without feedback around it (prefer the `useWorkbookExport` hook, which
 * wires both). Resolves with the generated date-stamped filename.
 */
export const exportWorkbook = async (
  options: WorkbookExportOptions,
): Promise<string> => {
  const filename = workbookFilename(options.prefix);
  const workbook = buildWorkbook(options);
  // Yield a macrotask so the caller's loading state paints before the sync write.
  await new Promise((resolve) => setTimeout(resolve, 0));
  XLSX.writeFile(workbook, filename);
  return filename;
};

export interface UseWorkbookExportResult {
  /**
   * Run an export with loading + translated error handling built in. Resolves
   * with the generated filename, or null when the export failed (error toast
   * already shown).
   */
  exportWorkbook: (options: WorkbookExportOptions) => Promise<string | null>;
  isExporting: boolean;
}

/**
 * Shared workbook-export hook. Consumed by the report tabs (Task 3), budget
 * pages (Task 4), and the activity log page (Task 5).
 */
export const useWorkbookExport = (): UseWorkbookExportResult => {
  const intl = useIntl();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const run = useCallback(
    async (options: WorkbookExportOptions): Promise<string | null> => {
      setIsExporting(true);
      try {
        return await exportWorkbook(options);
      } catch {
        toast.error(
          intl.formatMessage({
            id: "reports.export.error",
            defaultMessage: "Export failed. Please try again.",
          }),
        );
        return null;
      } finally {
        setIsExporting(false);
      }
    },
    [intl, toast],
  );

  return { exportWorkbook: run, isExporting };
};
