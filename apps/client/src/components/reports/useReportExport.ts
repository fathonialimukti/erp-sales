import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  header: string;
  /** Optional formatter for cell values. */
  format?: (value: unknown) => string | number;
}

/**
 * Build a worksheet from rows + columns and trigger an .xlsx download.
 */
export function exportExcel(rows: Record<string, unknown>[], columns: ExportColumn[], filename: string) {
  const data = rows.map((row) =>
    columns.reduce<Record<string, string | number>>((acc, col) => {
      const raw = row[col.key];
      acc[col.header] = col.format ? col.format(raw) : (raw as string | number);
      return acc;
    }, {}),
  );
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Print a specific DOM node. Hides the rest of the app via a body class that
 * the print stylesheet keys off of.
 */
export function printReport(ref: React.RefObject<HTMLElement>) {
  const previous = document.body.className;
  document.body.classList.add('printing-report');
  const node = ref.current;
  if (node) node.classList.add('print-area');
  const cleanup = () => {
    document.body.classList.remove('printing-report');
    if (node) node.classList.remove('print-area');
    window.removeEventListener('afterprint', cleanup);
    document.body.className = previous;
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
