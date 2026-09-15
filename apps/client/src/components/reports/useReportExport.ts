/**
 * Report print helper. Workbook export is delegated to the shared util
 * `lib/export/useWorkbookExport.ts` (used by the report tabs, budget pages,
 * and the activity log page) — this file only owns the report print flow.
 */

/**
 * Print the active report tab's purpose-built print sheet. Adds a body class
 * that `styles/report-print.css` keys off: the app shell is hidden in print
 * and the portaled `ReportPrintSheet` becomes the only printed content.
 */
export function printReport() {
  document.body.classList.add("printing-report");
  const cleanup = () => {
    document.body.classList.remove("printing-report");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
