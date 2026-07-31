import { useIntl } from "react-intl";
import "./SalesOrder.css";

/**
 * SalesOrderPrint — print-friendly sales order document.
 *
 * Hidden on screen via @media screen, shown only when printing.
 * The browser's native print dialog handles "Save as PDF" automatically
 * — this is the iOS-native approach (system print sheet) and adds no
 * extra deps.
 *
 * Usage:
 *   <SalesOrderPrint record={data} />  — anywhere in the React tree
 *   printOrder()                        — trigger the print dialog
 */

export interface SalesOrderPrintRecord {
  id: string;
  documentNumber: string | null;
  date: string;
  currency: string;
  paymentTerms: string | null;
  customer: { id: string; name: string } | null;
  outlet: { id: string; name: string };
  area: { id: string; name: string };
  createdBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  approvalStatus: string;
  subtotal: number | null;
  discountTotal: number | null;
  taxTotal: number | null;
  grandTotal: number | null;
  notes: string | null;
  expectedDeliveryDate: string | null;
  items: {
    id: string;
    sku: { id: string; name: string; code: string | null; baseUnit: string };
    quantity: number;
    unitPrice: number;
    discountPercent: number | null;
    taxPercent: number | null;
    lineTotal: number;
    notes: string | null;
  }[];
}

export const printOrder = () => window.print();

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
};

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

interface SalesOrderPrintProps {
  record: SalesOrderPrintRecord;
}

export const SalesOrderPrint = ({ record }: SalesOrderPrintProps) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string, values?: Record<string, string | number | boolean>) =>
    intl.formatMessage({ id, defaultMessage }, values as any);

  return (
    <article className="so-print" aria-hidden="true">
      <header className="so-print__header">
        <div className="so-print__brand">
          <div className="so-print__brand-mark" aria-hidden="true">S</div>
          <div className="so-print__brand-text">
            <div className="so-print__brand-title">
              {intl.formatMessage({ id: "nav.erp_sales", defaultMessage: "CRM" })}
            </div>
            <div className="so-print__brand-sub">
              {intl.formatMessage({ id: "nav.brand_sub", defaultMessage: "Sales OS" })}
            </div>
          </div>
        </div>
        <div className="so-print__title-block">
          <h1 className="so-print__title">
            {t("sales_order.print.title", "Sales order")}
          </h1>
          <div className="so-print__doc">
            {record.documentNumber ?? `SO #${record.id.slice(0, 8).toUpperCase()}`}
          </div>
          <div className={`so-print__status so-print__status--${record.approvalStatus.toLowerCase()}`}>
            {record.approvalStatus}
          </div>
        </div>
      </header>

      <div className="so-print__meta-grid">
        <MetaCell
          label={t("sales_order.print.meta_doc", "Document number")}
          value={record.documentNumber ?? `SO #${record.id.slice(0, 8).toUpperCase()}`}
        />
        <MetaCell
          label={t("sales_order.print.meta_date", "Order date")}
          value={formatDate(record.date)}
        />
        <MetaCell
          label={t("sales_order.print.meta_status", "Status")}
          value={record.approvalStatus}
        />
        <MetaCell
          label={t("sales_order.print.meta_currency", "Currency")}
          value={record.currency}
        />
        <MetaCell
          label={t("sales_order.print.meta_customer", "Bill to")}
          value={record.customer?.name ?? "N/A"}
        />
        {record.outlet && (
          <MetaCell
            label={t("sales_order.print.meta_outlet", "Outlet")}
            value={record.outlet.name}
          />
        )}
        <MetaCell
          label={t("sales_order.print.meta_area", "Area")}
          value={record.area.name}
        />
        {record.expectedDeliveryDate && (
          <MetaCell
            label={t("sales_order.print.meta_delivery", "Expected delivery")}
            value={formatDate(record.expectedDeliveryDate)}
          />
        )}
        {record.paymentTerms && (
          <MetaCell
            label={t("sales_order.print.meta_payment", "Payment terms")}
            value={record.paymentTerms}
          />
        )}
      </div>

      <section className="so-print__section">
        <h2 className="so-print__section-title">
          {t("sales_order.print.section_items", "Line items")}
        </h2>
        <table className="so-print__table">
          <thead>
            <tr>
              <th className="so-print__th so-print__th--sku">
                {t("sales_order.print.col_sku", "Code")}
              </th>
              <th className="so-print__th so-print__th--product">
                {t("sales_order.print.col_product", "Product")}
              </th>
              <th className="so-print__th so-print__th--num">
                {t("sales_order.print.col_qty", "Qty")}
              </th>
              <th className="so-print__th so-print__th--num">
                {t("sales_order.print.col_unit", "Unit price")}
              </th>
              <th className="so-print__th so-print__th--num">
                {t("sales_order.print.col_disc", "Disc %")}
              </th>
              <th className="so-print__th so-print__th--num">
                {t("sales_order.print.col_tax", "Tax %")}
              </th>
              <th className="so-print__th so-print__th--num">
                {t("sales_order.print.col_total", "Line total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {record.items.map((it) => (
              <tr key={it.id}>
                <td className="so-print__td so-print__td--sku">
                  {it.sku.code ?? "—"}
                </td>
                <td className="so-print__td so-print__td--product">
                  <div className="so-print__product-name">{it.sku.name}</div>
                  {it.notes && <div className="so-print__product-note">{it.notes}</div>}
                </td>
                <td className="so-print__td so-print__td--num">
                  {it.quantity} {it.sku.baseUnit}
                </td>
                <td className="so-print__td so-print__td--num">
                  {formatCurrency(it.unitPrice)}
                </td>
                <td className="so-print__td so-print__td--num">
                  {it.discountPercent ?? 0}%
                </td>
                <td className="so-print__td so-print__td--num">
                  {it.taxPercent ?? 0}%
                </td>
                <td className="so-print__td so-print__td--num so-print__td--strong">
                  {formatCurrency(it.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="so-print__total-label">
                {t("sales_order.print.totals_subtotal", "Subtotal")}
              </td>
              <td className="so-print__total-value">
                {formatCurrency(record.subtotal ?? 0)}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="so-print__total-label">
                {t("sales_order.print.totals_discount", "Discount")}
              </td>
              <td className="so-print__total-value">
                −{formatCurrency(record.discountTotal ?? 0)}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="so-print__total-label">
                {t("sales_order.print.totals_tax", "Tax")}
              </td>
              <td className="so-print__total-value">
                {formatCurrency(record.taxTotal ?? 0)}
              </td>
            </tr>
            <tr className="so-print__grand">
              <td colSpan={6} className="so-print__total-label so-print__total-label--grand">
                {t("sales_order.print.totals_grand", "Grand total")}
              </td>
              <td className="so-print__total-value so-print__total-value--grand">
                {formatCurrency(record.grandTotal ?? 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {record.notes && (
        <section className="so-print__section">
          <h2 className="so-print__section-title">
            {t("sales_order.print.notes", "Notes")}
          </h2>
          <p className="so-print__notes">{record.notes}</p>
        </section>
      )}

      <section className="so-print__signatures">
        <SignatureBlock
          label={t("sales_order.print.signature_issuer", "Issued by")}
          name={record.createdBy?.name ?? "—"}
        />
        <SignatureBlock
          label={t("sales_order.print.signature_approver", "Approved by")}
          name={record.approvedBy?.name ?? "—"}
        />
        <SignatureBlock
          label={t("sales_order.print.signature_received", "Received by")}
          name=""
        />
      </section>

      <footer className="so-print__footer">
        <div className="so-print__footer-thanks">
          {t("sales_order.print.footer_thanks", "Thank you for your business.")}
        </div>
        <div className="so-print__footer-printed">
          {t(
            "sales_order.print.meta_printed",
            "Printed on {date}",
            { date: formatDateTime(new Date().toISOString()) },
          )}
        </div>
      </footer>
    </article>
  );
};

const MetaCell = ({ label, value }: { label: string; value: string }) => (
  <div className="so-print__meta">
    <div className="so-print__meta-label">{label}</div>
    <div className="so-print__meta-value">{value}</div>
  </div>
);

const SignatureBlock = ({ label, name }: { label: string; name: string }) => (
  <div className="so-print__signature">
    <div className="so-print__signature-line" aria-hidden="true" />
    <div className="so-print__signature-name">{name}</div>
    <div className="so-print__signature-label">{label}</div>
  </div>
);

/**
 * SalesOrderPdfPreview — modal that renders the sales-order PDF inline
 * using the browser's native PDF viewer (via an <iframe> pointing at a
 * blob URL). No download is triggered; the user gets a real preview
 * with zoom / print / download controls provided by the browser.
 *
 * The PDF is fetched as a blob with `credentials: 'include'` so the
 * httpOnly auth cookie is sent (no token in the URL).
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SOIcon } from "./SalesOrderIcons";
import { API_BASE_URL } from "@/lib/api-base";

const PDF_BASE_URL = API_BASE_URL;

interface SalesOrderPdfPreviewProps {
  orderId: string | null;
  onClose: () => void;
}

export const SalesOrderPdfPreview = ({ orderId, onClose }: SalesOrderPdfPreviewProps) => {
  const intl = useIntl();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    setBlobUrl(null);
    setError(null);

    fetch(`${PDF_BASE_URL}/api/sales-order/${orderId}/pdf`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load PDF");
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [orderId]);

  if (!orderId) return null;

  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  return createPortal(
    <div className="so-pdf-modal__backdrop" onClick={onClose}>
      <div className="so-pdf-modal" onClick={(e) => e.stopPropagation()}>
        <header className="so-pdf-modal__header">
          <h3>
            <SOIcon name="print" size={16} />
            {t("sales_order.preview.title", "PDF Preview")}
          </h3>
          <button
            className="so-btn so-btn--ghost so-btn--sm"
            onClick={onClose}
            aria-label={t("common.action.close", "Close")}
          >
            <SOIcon name="close" size={14} />
          </button>
        </header>
        <div className="so-pdf-modal__body">
          {!blobUrl && !error && (
            <div className="so-pdf-modal__loading">
              <span className="so-spinner so-spinner--lg" />
              <span>{t("sales_order.preview.loading", "Generating PDF…")}</span>
            </div>
          )}
          {error && (
            <div className="so-pdf-modal__error">
              <SOIcon name="alert" size={28} />
              <p>{error}</p>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              title={t("sales_order.preview.title", "PDF Preview")}
              className="so-pdf-modal__iframe"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
