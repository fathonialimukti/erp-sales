import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApprovalTimeline } from "../../components/ApprovalTimeline";
import { ButtonGroup } from "../../components/ButtonGroup";
import { hasPermissionAtom } from "../../lib/atoms";
import { trpcClient } from "../../lib/trpc";
import { Spinner } from "../../ui/Spinner";
import { Textarea } from "../../ui/Textarea";
import { FormField } from "../../ui/FormField";
import { useToast } from "../../ui/useToast";
import { SalesOrderPrint, SalesOrderPdfPreview, type SalesOrderPrintRecord } from "./SalesOrderPrint";
import { SOIcon } from "./SalesOrderIcons";
import { SummarizePageButton } from "../../components/SummarizePageButton";
import "./SalesOrder.css";

interface SalesOrderDetail {
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
  approvalHistory: unknown;
  subtotal: number | null;
  discountTotal: number | null;
  taxTotal: number | null;
  grandTotal: number | null;
  notes: string | null;
  expectedDeliveryDate: string | null;
  source: string;
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
  createdAt: string;
}

const STATUS_META: Record<
  string,
  { label: string; tint: "neutral" | "info" | "success" | "warning" | "danger"; tintClass: string }
> = {
  DRAFT:       { label: "Draft",              tint: "neutral", tintClass: "so-status--neutral" },
  VALIDATING:  { label: "AI Processing",      tint: "warning", tintClass: "so-status--warning" },
  PROPOSED:    { label: "Pending Approval",   tint: "info",    tintClass: "so-status--info" },
  APPROVED:    { label: "Approved",           tint: "success", tintClass: "so-status--success" },
  REJECTED:    { label: "Rejected",           tint: "danger",  tintClass: "so-status--danger" },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

export const SalesOrderDetailPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canApprove = hasPermission("sales-order@approve");
  const canPropose = hasPermission("sales-order@propose");
  const canValidate = hasPermission("sales-order@validate");
  const canUpdate = hasPermission("sales-order@update");
  const canDelete = hasPermission("sales-order@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [proposeMessage, setProposeMessage] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [pdfPreviewId, setPdfPreviewId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [proposeStage, setProposeStage] = useState<"confirm" | "loading" | "success">("confirm");
  const [approvalHistoryOpen, setApprovalHistoryOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["salesOrderDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.salesOrder.detail.query({ id: id ?? "" }),
  });
  const record = data as SalesOrderDetail | undefined;

  const proposeMutation = useMutation({
    mutationFn: (payload: { id: string; message?: string }) =>
      trpcClient.salesOrder.propose.mutate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setProposeStage("success");
      setModalError(null);
      setTimeout(() => {
        setProposeModalOpen(false);
        setProposeStage("confirm");
        setProposeMessage("");
        toast.success(intl.formatMessage({ id: "sales_order.detail.proposed_toast", defaultMessage: "Order submitted for AI validation" }));
      }, 1000);
    },
    onError: (e) => {
      setModalError(e instanceof Error ? e.message : "Failed to propose");
      setProposeStage("confirm");
    },
  });

  const retryValidationMutation = useMutation({
    mutationFn: (soid: string) => trpcClient.salesOrder.retryValidation.mutate({ id: soid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      toast.success(intl.formatMessage({ id: "sales_order.detail.retry_validation_toast", defaultMessage: "Retrying AI validation" }));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to retry validation"),
  });

  const validateMutation = useMutation({
    mutationFn: (soid: string) => trpcClient.salesOrder.validate.mutate({ id: soid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setValidateModalOpen(false);
      toast.success(intl.formatMessage({ id: "sales_order.detail.validated_toast", defaultMessage: "Order validated successfully" }));
    },
    onError: (e) => {
      setValidateModalOpen(false);
      toast.error(
        e instanceof Error
          ? `${intl.formatMessage({ id: "sales_order.detail.validate_failed", defaultMessage: "Validation failed" })}: ${e.message}`
          : intl.formatMessage({ id: "sales_order.detail.validate_failed", defaultMessage: "Validation failed" }),
      );
    },
  });

  const approveMutation = useMutation({
    mutationFn: (payload: { id: string; message?: string }) =>
      trpcClient.salesOrder.approve.mutate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setApproveModalOpen(false);
      setDecisionMessage("");
      setModalError(null);
      toast.success(intl.formatMessage({ id: "sales_order.detail.approved_toast", defaultMessage: "Order approved" }));
    },
    onError: (e) => {
      setModalError(e instanceof Error ? e.message : "Failed to approve");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: string; message?: string }) =>
      trpcClient.salesOrder.reject.mutate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setRejectModalOpen(false);
      setDecisionMessage("");
      setModalError(null);
      toast.success(intl.formatMessage({ id: "sales_order.detail.rejected_toast", defaultMessage: "Order rejected" }));
    },
    onError: (e) => {
      setModalError(e instanceof Error ? e.message : "Failed to reject");
    },
  });

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.salesOrder.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "sales_order.detail.deleted_toast", defaultMessage: "Order deleted" }));
      navigate("/sales-order");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="so-page">
        <div className="so-loading">
          <Spinner size="lg" />
          <span>{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "sales_order.detail.not_found", defaultMessage: "Order not found." })}
              </p>
              <button
                type="button"
                className="so-btn so-btn--ghost"
                style={{ marginTop: 12 }}
                onClick={() => navigate("/sales-order")}
              >
                <SOIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[record.approvalStatus] ?? STATUS_META.DRAFT;

  return (
    <section
      className="so-page"
      data-ai-context={JSON.stringify({
        section: "sales-order-detail",
        id: record.id,
        documentNumber: record.documentNumber,
        customer: record.customer?.name,
        approvalStatus: record.approvalStatus,
        itemCount: record.items.length,
        grandTotal: record.grandTotal,
      })}
    >
      {/* iOS hero — toolbar row + title row */}
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[
              {
                key: "back",
                label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }),
                icon: <SOIcon name="back" size={14} />,
                to: "/sales-order",
              },
            ]}
          />
          <ButtonGroup
            size="md"
            items={[
              {
                key: "print",
                label: intl.formatMessage({ id: "sales_order.action.print_label", defaultMessage: "Print" }),
                icon: <SOIcon name="print" size={14} />,
                onClick: () => setPdfPreviewId(record.id),
              },
              ...(canUpdate && (record.approvalStatus === "DRAFT" || record.approvalStatus === "REJECTED")
                ? [
                    {
                      key: "edit",
                      label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }),
                      icon: <SOIcon name="edit" size={14} />,
                      to: `/sales-order/${record.id}/edit`,
                    },
                    {
                      key: "duplicate",
                      label: intl.formatMessage({ id: "sales_order.action.duplicate", defaultMessage: "Duplicate" }),
                      icon: <SOIcon name="duplicate" size={14} />,
                      onClick: () => {
                        // Navigate to create page with order data in state
                        navigate("/sales-order/create", {
                          state: {
                            duplicateFrom: {
                              outletId: record.outlet.id,
                              items: record.items.map(item => ({
                                skuId: item.sku.id,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                discountPercent: item.discountPercent,
                                taxPercent: item.taxPercent,
                                notes: item.notes,
                              })),
                              paymentTerms: record.paymentTerms,
                              notes: record.notes,
                            },
                          },
                        });
                        toast.success(
                          intl.formatMessage({
                            id: "sales_order.detail.duplicated_toast",
                            defaultMessage: "Order duplicated. Edit and save as new.",
                          }),
                        );
                      },
                    },
                  ]
                : []),
              ...(canDelete && (record.approvalStatus === "DRAFT" || record.approvalStatus === "REJECTED")
                ? [
                    {
                      key: "delete",
                      label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }),
                      icon: <SOIcon name="trash" size={14} />,
                      onClick: () => setDeleteModalOpen(true),
                      variant: "danger" as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">
                {intl.formatMessage({ id: "nav.sales_order", defaultMessage: "Sales Order" })}
              </span>
              <h1 className="so-detail-hero__title">
                {record.documentNumber ?? `SO #${record.id.slice(0, 8).toUpperCase()}`}
              </h1>
              <span className={`so-status ${meta.tintClass}`} data-tint={meta.tint}>
                <span className="so-status__dot" aria-hidden="true" />
                <span>{meta.label}</span>
              </span>
            </div>
            <ButtonGroup
              size="sm"
              items={[
                ...(canPropose && (record.approvalStatus === "DRAFT" || record.approvalStatus === "REJECTED")
                  ? [
                      {
                        key: "propose",
                        label: intl.formatMessage({ id: "sales_order.detail.propose", defaultMessage: "Propose" }),
                        icon: <SOIcon name="propose" size={12} />,
                        onClick: () => setProposeModalOpen(true),
                        variant: "primary" as const,
                      },
                    ]
                  : []),
                ...(canValidate && record.approvalStatus === "VALIDATING" && (record as any).aiValidationStatus === "FAILED"
                  ? [
                      {
                        key: "retry",
                        label: intl.formatMessage({ id: "sales_order.detail.retry_validation", defaultMessage: "Retry Validation" }),
                        icon: <SOIcon name="check" size={12} />,
                        onClick: () => retryValidationMutation.mutate(record.id),
                        disabled: retryValidationMutation.isPending,
                        isLoading: retryValidationMutation.isPending,
                        variant: "primary" as const,
                      },
                    ]
                  : []),
                ...(canApprove && record.approvalStatus === "PROPOSED"
                  ? [
                      {
                        key: "approve",
                        label: intl.formatMessage({ id: "sales_order.detail.approve", defaultMessage: "Approve" }),
                        icon: <SOIcon name="approve" size={12} />,
                        onClick: () => setApproveModalOpen(true),
                        variant: "success" as const,
                      },
                    ]
                  : []),
                ...(canApprove && record.approvalStatus === "PROPOSED"
                  ? [
                      {
                        key: "reject",
                        label: intl.formatMessage({ id: "sales_order.detail.reject", defaultMessage: "Reject" }),
                        icon: <SOIcon name="reject" size={12} />,
                        onClick: () => setRejectModalOpen(true),
                        variant: "danger" as const,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      </header>

      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><SOIcon name="user" size={14} /></span>
            {intl.formatMessage({ id: "sales_order.detail.summary", defaultMessage: "Summary" })}
          </h2>
          <p className="so-card__hint">
            {intl.formatMessage({ id: "sales_order.detail.summary_hint", defaultMessage: "Customer, location, and order details" })}
          </p>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <Field label={intl.formatMessage({ id: "sales_order.detail.document_number", defaultMessage: "Document number" })} value={record.documentNumber} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.area", defaultMessage: "Area" })} value={record.area.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.customer", defaultMessage: "Customer" })} value={record.customer?.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.outlet", defaultMessage: "Outlet" })} value={record.outlet?.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.order_date", defaultMessage: "Order date" })} value={record.date ? new Date(record.date).toLocaleDateString() : null} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.eta", defaultMessage: "ETA" })} value={record.expectedDeliveryDate ? new Date(record.expectedDeliveryDate).toLocaleDateString() : null} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.source", defaultMessage: "Source" })} value={record.source} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.payment_terms", defaultMessage: "Payment terms" })} value={record.paymentTerms} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.created_by", defaultMessage: "Created by" })} value={record.createdBy?.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.currency", defaultMessage: "Currency" })} value={record.currency} />
          </div>
        </div>
      </section>

      {/* Status Timeline */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><SOIcon name="check" size={14} /></span>
            {intl.formatMessage({ id: "sales_order.detail.status_timeline", defaultMessage: "Status Timeline" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-timeline">
            {[
              { status: "DRAFT", label: "Draft", icon: "edit" },
              { status: "VALIDATING", label: "AI Processing", icon: "check" },
              { status: "PROPOSED", label: "Pending Approval", icon: "propose" },
              { status: "APPROVED", label: "Approved", icon: "approve" },
            ].map((step, idx) => {
              const statusOrder = ["DRAFT", "VALIDATING", "PROPOSED", "APPROVED", "REJECTED"];
              const currentIdx = statusOrder.indexOf(record.approvalStatus);
              const stepIdx = statusOrder.indexOf(step.status);
              const isCompleted = stepIdx < currentIdx;
              const isCurrent = stepIdx === currentIdx;
              const isRejected = record.approvalStatus === "REJECTED" && step.status === "PROPOSED";

              return (
                <div key={step.status} className="so-timeline__step">
                  <div className={`so-timeline__dot ${isCompleted ? "so-timeline__dot--completed" : ""} ${isCurrent ? "so-timeline__dot--current" : ""} ${isRejected ? "so-timeline__dot--rejected" : ""}`}>
                    {isCompleted ? (
                      <SOIcon name="check" size={12} />
                    ) : isRejected ? (
                      <SOIcon name="reject" size={12} />
                    ) : (
                      <SOIcon name={step.icon as any} size={12} />
                    )}
                  </div>
                  {idx < 3 && <div className={`so-timeline__line ${isCompleted ? "so-timeline__line--completed" : ""}`} />}
                  <div className="so-timeline__label">
                    <span className={`so-timeline__label-text ${isCurrent ? "so-timeline__label-text--current" : ""}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><SOIcon name="box" size={14} /></span>
            {intl.formatMessage({ id: "sales_order.detail.items", defaultMessage: "Items" })}
          </h2>
          <p className="so-card__hint">
            {record.items.length}{" "}
            {record.items.length === 1
              ? intl.formatMessage({ id: "sales_order.detail.item_one", defaultMessage: "line item" })
              : intl.formatMessage({ id: "sales_order.detail.item_other", defaultMessage: "line items" })}
          </p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          <div className="so-items-table">
            <div className="so-items-table__header">
              <div className="so-items-table__th so-items-table__th--product">
                {intl.formatMessage({ id: "sales_order.detail.product", defaultMessage: "Product" })}
              </div>
              <div className="so-items-table__th so-items-table__th--num">
                {intl.formatMessage({ id: "sales_order.detail.qty", defaultMessage: "Qty" })}
              </div>
              <div className="so-items-table__th so-items-table__th--num">
                {intl.formatMessage({ id: "sales_order.detail.unit_price", defaultMessage: "Unit price" })}
              </div>
              <div className="so-items-table__th so-items-table__th--num">
                {intl.formatMessage({ id: "sales_order.detail.disc", defaultMessage: "Disc %" })}
              </div>
              <div className="so-items-table__th so-items-table__th--num">
                {intl.formatMessage({ id: "sales_order.detail.tax", defaultMessage: "Tax %" })}
              </div>
              <div className="so-items-table__th so-items-table__th--num">
                {intl.formatMessage({ id: "sales_order.detail.line_total", defaultMessage: "Total" })}
              </div>
            </div>
            <div className="so-items-table__body">
              {record.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`so-items-table__row ${idx % 2 === 1 ? "so-items-table__row--alt" : ""}`}
                >
                  <div className="so-items-table__td so-items-table__td--product">
                    <span className="so-items-table__icon" data-tint="blue" aria-hidden="true">
                      <SOIcon name="package" size={16} />
                    </span>
                    <div className="so-items-table__product">
                      <span className="so-items-table__product-name">{item.sku.name}</span>
                      {item.sku.code && (
                        <span className="so-items-table__product-code">{item.sku.code}</span>
                      )}
                    </div>
                  </div>
                  <div className="so-items-table__td so-items-table__td--num">
                    <span className="so-items-table__qty-num">{item.quantity}</span>
                    <span className="so-items-table__qty-unit">{item.sku.baseUnit}</span>
                  </div>
                  <div className="so-items-table__td so-items-table__td--num so-items-table__td--money">
                    {formatCurrency(item.unitPrice)}
                  </div>
                  <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                    {item.discountPercent ?? 0}%
                  </div>
                  <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                    {item.taxPercent ?? 0}%
                  </div>
                  <div className="so-items-table__td so-items-table__td--num so-items-table__td--money so-items-table__td--strong">
                    {formatCurrency(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals panel */}
            <div className="so-items-totals">
              <div className="so-items-totals__row">
                <span className="so-items-totals__label">
                  {intl.formatMessage({ id: "sales_order.detail.subtotal", defaultMessage: "Subtotal" })}
                </span>
                <span className="so-items-totals__value">{formatCurrency(record.subtotal ?? 0)}</span>
              </div>
              <div className="so-items-totals__row">
                <span className="so-items-totals__label">
                  {intl.formatMessage({ id: "sales_order.detail.discount", defaultMessage: "Discount" })}
                </span>
                <span className="so-items-totals__value">−{formatCurrency(record.discountTotal ?? 0)}</span>
              </div>
              <div className="so-items-totals__row">
                <span className="so-items-totals__label">
                  {intl.formatMessage({ id: "sales_order.detail.tax_total", defaultMessage: "Tax" })}
                </span>
                <span className="so-items-totals__value">{formatCurrency(record.taxTotal ?? 0)}</span>
              </div>
              <div className="so-items-totals__row so-items-totals__row--grand">
                <span className="so-items-totals__label so-items-totals__label--grand">
                  {intl.formatMessage({ id: "sales_order.detail.grand_total", defaultMessage: "Grand total" })}
                </span>
                <span className="so-items-totals__value so-items-totals__value--grand">
                  {formatCurrency(record.grandTotal ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {record.notes && (
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><SOIcon name="tag" size={14} /></span>
              {intl.formatMessage({ id: "sales_order.detail.notes", defaultMessage: "Notes" })}
            </h2>
          </div>
          <div className="so-card__body">
            <p style={{ whiteSpace: "pre-wrap", margin: 0, color: "var(--ios-label-2)", lineHeight: 1.6 }}>
              {record.notes}
            </p>
          </div>
        </section>
      )}

      <section className="so-card">
        <div
          className="so-card__header"
          style={{
            cursor: "pointer",
            userSelect: "none",
            borderBottom: approvalHistoryOpen ? "0.0625rem solid var(--ios-divider)" : "none",
          }}
          onClick={() => setApprovalHistoryOpen(!approvalHistoryOpen)}
        >
          <h2 className="so-card__title" style={{ flex: 1 }}>
            <span className="so-card__icon"><SOIcon name="check" size={14} /></span>
            {intl.formatMessage({ id: "sales_order.detail.approval_history", defaultMessage: "Approval history" })}
          </h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: approvalHistoryOpen ? "rotate(0deg)" : "rotate(-90deg)",
            }}
          >
            <SOIcon name="chevron-down" size={16} />
          </span>
        </div>
        <div
          style={{
            maxHeight: approvalHistoryOpen ? "2000px" : "0",
            overflow: "hidden",
            transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
            opacity: approvalHistoryOpen ? 1 : 0,
          }}
        >
          <div className="so-card__body">
            <ApprovalTimeline
              approvalHistory={Array.isArray(record.approvalHistory) ? record.approvalHistory : []}
            />
          </div>
        </div>
      </section>

      {/* Modals — render via portal so they escape any scrollable ancestor */}
      {deleteModalOpen && createPortal(
        <div className="so-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            <div className="so-modal__header">
              <h3>
                <SOIcon name="trash" size={16} />
                {intl.formatMessage({ id: "sales_order.detail.delete_title", defaultMessage: "Delete order" })}
              </h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <SOIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error">
                <SOIcon name="alert" size={28} />
              </div>
              <h3 className="so-modal__title">
                {intl.formatMessage({ id: "sales_order.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}
              </h3>
              <p className="so-modal__msg">
                {intl.formatMessage(
                  { id: "sales_order.detail.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' },
                  { name: record.documentNumber ?? "this order" },
                )}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="so-spinner" />}
                <SOIcon name="trash" size={14} />
                {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {proposeModalOpen && createPortal(
        <div className="so-modal__backdrop" onClick={() => proposeStage === "confirm" && setProposeModalOpen(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            {proposeStage === "confirm" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    <SOIcon name="propose" size={16} />
                    {intl.formatMessage({ id: "sales_order.detail.propose_title", defaultMessage: "Propose order" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setProposeModalOpen(false)} aria-label="Close">
                    <SOIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <SOIcon name="propose" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage(
                      { id: "sales_order.detail.propose_confirm", defaultMessage: 'Propose "{name}"?' },
                      { name: record.documentNumber ?? "this order" },
                    )}
                  </h3>
                  <p className="so-modal__msg">
                    {intl.formatMessage({
                      id: "sales_order.detail.propose_body",
                      defaultMessage: "This will submit the order for AI validation. Add an optional message for the approval history.",
                    })}
                  </p>
                  {modalError && (
                    <div className="so-modal__error">
                      <SOIcon name="alert" size={16} />
                      <span>{modalError}</span>
                    </div>
                  )}
                  <div style={{ width: "100%" }}>
                    <FormField label={intl.formatMessage({ id: "sales_order.detail.propose_message_label", defaultMessage: "Message (optional)" })}>
                      <Textarea
                        value={proposeMessage}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProposeMessage(e.target.value)}
                        placeholder={intl.formatMessage({ id: "sales_order.detail.propose_message_placeholder", defaultMessage: "Add a note about this submission…" })}
                      />
                    </FormField>
                  </div>
                </div>
                <div className="so-modal__footer">
                  <button className="so-btn so-btn--ghost" onClick={() => setProposeModalOpen(false)}>
                    {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
                  </button>
                  <button
                    className="so-btn so-btn--primary"
                    onClick={() => {
                      setProposeStage("loading");
                      proposeMutation.mutate({ id: record.id, message: proposeMessage || undefined });
                    }}
                    disabled={proposeMutation.isPending}
                  >
                    {intl.formatMessage({ id: "sales_order.detail.propose", defaultMessage: "Propose" })}
                  </button>
                </div>
              </>
            )}

            {proposeStage === "loading" && (
              <div className="so-modal__body">
                <div className="so-modal__icon so-modal__icon--success" style={{ background: "var(--so-surface-2)", color: "var(--so-accent)" }}>
                  <span className="so-spinner so-spinner--lg" />
                </div>
                <p className="so-modal__msg">
                  {intl.formatMessage({ id: "sales_order.detail.proposing", defaultMessage: "Proposing order…" })}
                </p>
              </div>
            )}

            {proposeStage === "success" && (
              <>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <SOIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "sales_order.detail.proposed_success", defaultMessage: "Order proposed!" })}
                  </h3>
                  <p className="so-modal__msg">
                    {intl.formatMessage({
                      id: "sales_order.detail.proposed_success_body",
                      defaultMessage: "Your order has been submitted for AI validation.",
                    })}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

      {approveModalOpen && createPortal(
        <div className="so-modal__backdrop" onClick={() => !approveMutation.isPending && setApproveModalOpen(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            <div className="so-modal__header">
              <h3>
                <SOIcon name="approve" size={16} />
                {intl.formatMessage({ id: "sales_order.detail.approve_title", defaultMessage: "Approve order" })}
              </h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setApproveModalOpen(false)} aria-label="Close">
                <SOIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--success">
                <SOIcon name="approve" size={28} />
              </div>
              <h3 className="so-modal__title">
                {intl.formatMessage(
                  { id: "sales_order.detail.approve_confirm", defaultMessage: 'Approve "{name}"?' },
                  { name: record.documentNumber ?? "this order" },
                )}
              </h3>
              {modalError && (
                <div className="so-modal__error">
                  <SOIcon name="alert" size={16} />
                  <span>{modalError}</span>
                </div>
              )}
              <div style={{ width: "100%" }}>
                <FormField label={intl.formatMessage({ id: "sales_order.detail.decision_message", defaultMessage: "Message (optional)" })}>
                  <Textarea
                    value={decisionMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionMessage(e.target.value)}
                    placeholder={intl.formatMessage({ id: "sales_order.detail.decision_message_placeholder", defaultMessage: "Add an approval note…" })}
                  />
                </FormField>
              </div>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setApproveModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button
                className="so-btn so-btn--primary"
                onClick={() => approveMutation.mutate({ id: record.id, message: decisionMessage || undefined })}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending && <span className="so-spinner" />}
                <SOIcon name="approve" size={14} />
                {intl.formatMessage({ id: "sales_order.detail.approve", defaultMessage: "Approve" })}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {rejectModalOpen && createPortal(
        <div className="so-modal__backdrop" onClick={() => !rejectMutation.isPending && setRejectModalOpen(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            <div className="so-modal__header">
              <h3>
                <SOIcon name="reject" size={16} />
                {intl.formatMessage({ id: "sales_order.detail.reject_title", defaultMessage: "Reject order" })}
              </h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setRejectModalOpen(false)} aria-label="Close">
                <SOIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error">
                <SOIcon name="reject" size={28} />
              </div>
              <h3 className="so-modal__title">
                {intl.formatMessage(
                  { id: "sales_order.detail.reject_confirm", defaultMessage: 'Reject "{name}"?' },
                  { name: record.documentNumber ?? "this order" },
                )}
              </h3>
              {modalError && (
                <div className="so-modal__error">
                  <SOIcon name="alert" size={16} />
                  <span>{modalError}</span>
                </div>
              )}
              <div style={{ width: "100%" }}>
                <FormField label={intl.formatMessage({ id: "sales_order.detail.decision_message", defaultMessage: "Reason" })}>
                  <Textarea
                    value={decisionMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionMessage(e.target.value)}
                    placeholder={intl.formatMessage({ id: "sales_order.detail.reject_reason_placeholder", defaultMessage: "Why are you rejecting this order?" })}
                  />
                </FormField>
              </div>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setRejectModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button
                className="so-btn so-btn--danger"
                onClick={() => rejectMutation.mutate({ id: record.id, message: decisionMessage || undefined })}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending && <span className="so-spinner" />}
                <SOIcon name="reject" size={14} />
                {intl.formatMessage({ id: "sales_order.detail.reject", defaultMessage: "Reject" })}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Validate modal */}
      {validateModalOpen && createPortal(
        <div className="so-modal__backdrop" onClick={() => !validateMutation.isPending && setValidateModalOpen(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            <div className="so-modal__header">
              <h3>
                <SOIcon name="check" size={16} />
                {intl.formatMessage({ id: "sales_order.detail.validate_title", defaultMessage: "Validate order" })}
              </h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setValidateModalOpen(false)} aria-label="Close">
                <SOIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--success">
                <SOIcon name="check" size={28} />
              </div>
              <h3 className="so-modal__title">
                {intl.formatMessage(
                  { id: "sales_order.detail.validate_confirm", defaultMessage: 'Validate "{name}"? This will run AI validation checks.' },
                  { name: record.documentNumber ?? "this order" },
                )}
              </h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "sales_order.detail.validate_running", defaultMessage: "Validating order…" })}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setValidateModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button
                className="so-btn so-btn--primary"
                onClick={() => validateMutation.mutate(record.id)}
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending && <span className="so-spinner" />}
                <SOIcon name="check" size={14} />
                {intl.formatMessage({ id: "sales_order.detail.validate", defaultMessage: "Validate" })}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Print document — hidden on screen, visible when printing */}
      <SalesOrderPrint record={record as SalesOrderPrintRecord} />

      {/* PDF preview modal — native browser PDF viewer in an iframe */}
      <SalesOrderPdfPreview orderId={pdfPreviewId} onClose={() => setPdfPreviewId(null)} />
      <SummarizePageButton
        contextData={{
          section: "sales-order-detail",
          id: record.id,
          documentNumber: record.documentNumber,
          customer: record.customer?.name,
          approvalStatus: record.approvalStatus,
          itemCount: record.items.length,
          grandTotal: record.grandTotal,
        }}
        recordData={record}
      />
    </section>
  );
};

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
    <span style={{
      fontSize: "0.6875rem",
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--ios-label-3)",
    }}>
      {label}
    </span>
    <span style={{
      fontSize: "0.875rem",
      fontWeight: 600,
      color: "var(--ios-label)",
      letterSpacing: "-0.005em",
      wordBreak: "break-word",
    }}>
      {value ?? "—"}
    </span>
  </div>
);
