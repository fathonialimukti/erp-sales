import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  Mail,
  Package,
  Pencil,
  Printer,
  Send,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

import { ApprovalTimeline } from "../../components/ApprovalTimeline";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { hasPermissionAtom } from "../../lib/atoms";
import { trpcClient } from "../../lib/trpc";
import { useToast } from "../../components/useToast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  SalesOrderPrint,
  SalesOrderPdfPreview,
  type SalesOrderPrintRecord,
} from "./SalesOrderPrint";

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
  emailConversationId?: string | null;
  aiValidationStatus?: string | null;
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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="space-y-1">
    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
    <dd className="text-sm font-medium text-foreground">{value ?? "—"}</dd>
  </div>
);

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
        toast.success(
          intl.formatMessage({
            id: "sales_order.detail.proposed_toast",
            defaultMessage: "Order submitted for AI validation",
          }),
        );
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
      toast.success(
        intl.formatMessage({
          id: "sales_order.detail.retry_validation_toast",
          defaultMessage: "Retrying AI validation",
        }),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to retry validation"),
  });

  const validateMutation = useMutation({
    mutationFn: (soid: string) => trpcClient.salesOrder.validate.mutate({ id: soid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setValidateModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "sales_order.detail.validated_toast",
          defaultMessage: "Order validated successfully",
        }),
      );
    },
    onError: (e) => {
      setValidateModalOpen(false);
      toast.error(
        e instanceof Error
          ? `${intl.formatMessage({ id: "sales_order.detail.validate_failed", defaultMessage: "Validation failed" })}: ${e.message}`
          : intl.formatMessage({
              id: "sales_order.detail.validate_failed",
              defaultMessage: "Validation failed",
            }),
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
      toast.success(
        intl.formatMessage({
          id: "sales_order.detail.approved_toast",
          defaultMessage: "Order approved",
        }),
      );
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
      toast.success(
        intl.formatMessage({
          id: "sales_order.detail.rejected_toast",
          defaultMessage: "Order rejected",
        }),
      );
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
      toast.success(
        intl.formatMessage({
          id: "sales_order.detail.deleted_toast",
          defaultMessage: "Order deleted",
        }),
      );
      navigate("/sales-order");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "sales-order-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!record) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "sales-order-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/sales-order")} />
          <PageHeader
            module="order"
            title={intl.formatMessage({
              id: "sales_order.detail.not_found",
              defaultMessage: "Order not found.",
            })}
          />
        </div>
      </section>
    );
  }

  const editable = record.approvalStatus === "DRAFT" || record.approvalStatus === "REJECTED";
  const statusOrder = ["DRAFT", "VALIDATING", "PROPOSED", "APPROVED", "REJECTED"];
  const currentIdx = statusOrder.indexOf(record.approvalStatus);

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "sales-order-detail",
        id: record.id,
        documentNumber: record.documentNumber,
        customer: record.customer?.name,
        approvalStatus: record.approvalStatus,
        itemCount: record.items.length,
        grandTotal: record.grandTotal,
        emailConversationId: record.emailConversationId ?? null,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/sales-order")}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPdfPreviewId(record.id)}
            className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Printer className="size-3.5" aria-hidden />
            {intl.formatMessage({
              id: "sales_order.action.print_label",
              defaultMessage: "Print",
            })}
          </Button>
          {canUpdate && editable ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/sales-order/${record.id}/edit`)}
                className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" aria-hidden />
                {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigate("/sales-order/create", {
                    state: {
                      duplicateFrom: {
                        outletId: record.outlet.id,
                        items: record.items.map((item) => ({
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
                }}
                className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <Copy className="size-3.5" aria-hidden />
                {intl.formatMessage({
                  id: "sales_order.action.duplicate",
                  defaultMessage: "Duplicate",
                })}
              </Button>
            </>
          ) : null}
          {canDelete && editable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
            </Button>
          ) : null}
        </NavButtonGroup>

        <PageHeader
          module="order"
          eyebrow={intl.formatMessage({ id: "nav.sales_order", defaultMessage: "Sales Order" })}
          title={record.documentNumber ?? `SO #${record.id.slice(0, 8).toUpperCase()}`}
          description={record.customer?.name ?? record.outlet?.name ?? undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={record.approvalStatus} />
        {canPropose && editable ? (
          <Button type="button" onClick={() => setProposeModalOpen(true)}>
            <Send className="size-4" />
            {intl.formatMessage({ id: "sales_order.detail.propose", defaultMessage: "Propose" })}
          </Button>
        ) : null}
        {canValidate &&
        record.approvalStatus === "VALIDATING" &&
        record.aiValidationStatus === "FAILED" ? (
          <Button
            type="button"
            onClick={() => retryValidationMutation.mutate(record.id)}
            disabled={retryValidationMutation.isPending}
          >
            {retryValidationMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {intl.formatMessage({
              id: "sales_order.detail.retry_validation",
              defaultMessage: "Retry Validation",
            })}
          </Button>
        ) : null}
        {canApprove && record.approvalStatus === "PROPOSED" ? (
          <>
            <Button
              type="button"
              onClick={() => {
                setModalError(null);
                setApproveModalOpen(true);
              }}
            >
              <ThumbsUp className="size-4" />
              {intl.formatMessage({ id: "sales_order.detail.approve", defaultMessage: "Approve" })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setModalError(null);
                setRejectModalOpen(true);
              }}
            >
              <ThumbsDown className="size-4" />
              {intl.formatMessage({ id: "sales_order.detail.reject", defaultMessage: "Reject" })}
            </Button>
          </>
        ) : null}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)] text-module-order">
              <UserRound className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "sales_order.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({
              id: "sales_order.detail.summary_hint",
              defaultMessage: "Customer, location, and order details",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.document_number",
                defaultMessage: "Document number",
              })}
              value={record.documentNumber}
            />
            <Field
              label={intl.formatMessage({ id: "sales_order.detail.area", defaultMessage: "Area" })}
              value={record.area.name}
            />
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.customer",
                defaultMessage: "Customer",
              })}
              value={record.customer?.name}
            />
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.outlet",
                defaultMessage: "Outlet",
              })}
              value={record.outlet?.name}
            />
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.order_date",
                defaultMessage: "Order date",
              })}
              value={record.date ? new Date(record.date).toLocaleDateString() : null}
            />
            <Field
              label={intl.formatMessage({ id: "sales_order.detail.eta", defaultMessage: "ETA" })}
              value={
                record.expectedDeliveryDate
                  ? new Date(record.expectedDeliveryDate).toLocaleDateString()
                  : null
              }
            />
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.source",
                defaultMessage: "Source",
              })}
              value={record.source}
            />
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.payment_terms",
                defaultMessage: "Payment terms",
              })}
              value={record.paymentTerms}
            />
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.created_by",
                defaultMessage: "Created by",
              })}
              value={record.createdBy?.name}
            />
            <Field
              label={intl.formatMessage({
                id: "sales_order.detail.currency",
                defaultMessage: "Currency",
              })}
              value={record.currency}
            />
            {record.emailConversationId ? (
              <div className="space-y-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {intl.formatMessage({
                    id: "sales_order.detail.email_conversation",
                    defaultMessage: "Email conversation",
                  })}
                </dt>
                <dd>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/email-crm/${record.emailConversationId}`)}
                  >
                    <Mail className="size-4" />
                    {intl.formatMessage({
                      id: "sales_order.detail.email_conversation",
                      defaultMessage: "Email conversation",
                    })}
                  </Button>
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            {intl.formatMessage({
              id: "sales_order.detail.status_timeline",
              defaultMessage: "Status Timeline",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-4">
            {[
              { status: "DRAFT", label: "Draft" },
              { status: "VALIDATING", label: "AI Processing" },
              { status: "PROPOSED", label: "Pending Approval" },
              { status: "APPROVED", label: "Approved" },
            ].map((step, idx) => {
              const stepIdx = statusOrder.indexOf(step.status);
              const isCompleted = stepIdx < currentIdx;
              const isCurrent = stepIdx === currentIdx;
              const isRejected =
                record.approvalStatus === "REJECTED" && step.status === "PROPOSED";
              return (
                <li key={step.status} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border text-xs",
                      isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                      isCurrent && !isRejected && "border-module-order bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)] text-module-order",
                      isRejected && "border-destructive bg-destructive text-white",
                      !isCompleted && !isCurrent && !isRejected && "border-border text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-3.5" />
                    ) : isRejected ? (
                      <XCircle className="size-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)] text-module-order">
              <Package className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "sales_order.detail.items", defaultMessage: "Items" })}
          </CardTitle>
          <CardDescription>
            {record.items.length}{" "}
            {record.items.length === 1
              ? intl.formatMessage({
                  id: "sales_order.detail.item_one",
                  defaultMessage: "line item",
                })
              : intl.formatMessage({
                  id: "sales_order.detail.item_other",
                  defaultMessage: "line items",
                })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-card text-left text-xs tracking-wide text-foreground uppercase">
                  <th className="px-6 py-3 font-medium">
                    {intl.formatMessage({
                      id: "sales_order.detail.product",
                      defaultMessage: "Product",
                    })}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {intl.formatMessage({ id: "sales_order.detail.qty", defaultMessage: "Qty" })}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {intl.formatMessage({
                      id: "sales_order.detail.unit_price",
                      defaultMessage: "Unit price",
                    })}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {intl.formatMessage({
                      id: "sales_order.detail.disc",
                      defaultMessage: "Disc %",
                    })}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {intl.formatMessage({ id: "sales_order.detail.tax", defaultMessage: "Tax %" })}
                  </th>
                  <th className="px-6 py-3 text-right font-medium">
                    {intl.formatMessage({
                      id: "sales_order.detail.line_total",
                      defaultMessage: "Total",
                    })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_8%,transparent)] text-module-sku">
                          <Package className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.sku.name}</p>
                          {item.sku.code ? (
                            <p className="font-mono text-xs text-foreground">{item.sku.code}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {item.quantity}{" "}
                      <span className="text-foreground">{item.sku.baseUnit}</span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {item.discountPercent ?? 0}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {item.taxPercent ?? 0}%
                    </td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 border-t bg-card px-6 py-4">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-muted-foreground">
                {intl.formatMessage({
                  id: "sales_order.detail.subtotal",
                  defaultMessage: "Subtotal",
                })}
              </span>
              <span className="tabular-nums">{formatCurrency(record.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-muted-foreground">
                {intl.formatMessage({
                  id: "sales_order.detail.discount",
                  defaultMessage: "Discount",
                })}
              </span>
              <span className="tabular-nums">−{formatCurrency(record.discountTotal ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-muted-foreground">
                {intl.formatMessage({ id: "sales_order.detail.tax_total", defaultMessage: "Tax" })}
              </span>
              <span className="tabular-nums">{formatCurrency(record.taxTotal ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>
                {intl.formatMessage({
                  id: "sales_order.detail.grand_total",
                  defaultMessage: "Grand total",
                })}
              </span>
              <span className="tabular-nums text-module-order">
                {formatCurrency(record.grandTotal ?? 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {record.notes ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)] text-module-order">
                <StickyNote className="size-4" aria-hidden />
              </span>
              {intl.formatMessage({ id: "sales_order.detail.notes", defaultMessage: "Notes" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {record.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-6 py-4 text-left"
          onClick={() => setApprovalHistoryOpen((v) => !v)}
        >
          <span className="flex items-center gap-2 font-heading text-base font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)] text-module-order">
              <CheckCircle2 className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "sales_order.detail.approval_history",
              defaultMessage: "Approval history",
            })}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-150",
              approvalHistoryOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        {approvalHistoryOpen ? (
          <CardContent className="border-t pt-4">
            <ApprovalTimeline
              approvalHistory={Array.isArray(record.approvalHistory) ? record.approvalHistory : []}
            />
          </CardContent>
        ) : null}
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "sales_order.detail.delete_title",
          defaultMessage: "Delete order",
        })}
        description={intl.formatMessage(
          {
            id: "sales_order.detail.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: record.documentNumber ?? "this order" },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />

      <Dialog
        open={proposeModalOpen}
        onOpenChange={(open) => {
          if (!open && proposeStage === "confirm") {
            setProposeModalOpen(false);
            setModalError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {proposeStage === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({
                    id: "sales_order.detail.propose_title",
                    defaultMessage: "Propose order",
                  })}
                </DialogTitle>
                <DialogDescription>
                  {intl.formatMessage({
                    id: "sales_order.detail.propose_body",
                    defaultMessage:
                      "This will submit the order for AI validation. Add an optional message for the approval history.",
                  })}
                </DialogDescription>
              </DialogHeader>
              {modalError ? <p className="text-sm text-destructive">{modalError}</p> : null}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="propose-msg">
                  {intl.formatMessage({
                    id: "sales_order.detail.propose_message_label",
                    defaultMessage: "Message (optional)",
                  })}
                </Label>
                <Textarea
                  id="propose-msg"
                  value={proposeMessage}
                  onChange={(e) => setProposeMessage(e.target.value)}
                  placeholder={intl.formatMessage({
                    id: "sales_order.detail.propose_message_placeholder",
                    defaultMessage: "Add a note about this submission…",
                  })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProposeModalOpen(false)}>
                  {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setProposeStage("loading");
                    proposeMutation.mutate({
                      id: record.id,
                      message: proposeMessage || undefined,
                    });
                  }}
                  disabled={proposeMutation.isPending}
                >
                  {intl.formatMessage({
                    id: "sales_order.detail.propose",
                    defaultMessage: "Propose",
                  })}
                </Button>
              </DialogFooter>
            </>
          ) : null}
          {proposeStage === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="size-8 animate-spin text-primary" />
              <DialogDescription>
                {intl.formatMessage({
                  id: "sales_order.detail.proposing",
                  defaultMessage: "Proposing order…",
                })}
              </DialogDescription>
            </div>
          ) : null}
          {proposeStage === "success" ? (
            <DialogHeader>
              <DialogTitle>
                {intl.formatMessage({
                  id: "sales_order.detail.proposed_success",
                  defaultMessage: "Order proposed!",
                })}
              </DialogTitle>
              <DialogDescription>
                {intl.formatMessage({
                  id: "sales_order.detail.proposed_success_body",
                  defaultMessage: "Your order has been submitted for AI validation.",
                })}
              </DialogDescription>
            </DialogHeader>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={approveModalOpen}
        onOpenChange={(open) => {
          if (!open && !approveMutation.isPending) {
            setApproveModalOpen(false);
            setModalError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({
                id: "sales_order.detail.approve_title",
                defaultMessage: "Approve order",
              })}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage(
                {
                  id: "sales_order.detail.approve_confirm",
                  defaultMessage: 'Approve "{name}"?',
                },
                { name: record.documentNumber ?? "this order" },
              )}
            </DialogDescription>
          </DialogHeader>
          {modalError ? <p className="text-sm text-destructive">{modalError}</p> : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="approve-msg">
              {intl.formatMessage({
                id: "sales_order.detail.decision_message",
                defaultMessage: "Message (optional)",
              })}
            </Label>
            <Textarea
              id="approve-msg"
              value={decisionMessage}
              onChange={(e) => setDecisionMessage(e.target.value)}
              placeholder={intl.formatMessage({
                id: "sales_order.detail.decision_message_placeholder",
                defaultMessage: "Add an approval note…",
              })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApproveModalOpen(false)}>
              {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button
              type="button"
              onClick={() =>
                approveMutation.mutate({
                  id: record.id,
                  message: decisionMessage || undefined,
                })
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {intl.formatMessage({ id: "sales_order.detail.approve", defaultMessage: "Approve" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectModalOpen}
        onOpenChange={(open) => {
          if (!open && !rejectMutation.isPending) {
            setRejectModalOpen(false);
            setModalError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({
                id: "sales_order.detail.reject_title",
                defaultMessage: "Reject order",
              })}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage(
                {
                  id: "sales_order.detail.reject_confirm",
                  defaultMessage: 'Reject "{name}"?',
                },
                { name: record.documentNumber ?? "this order" },
              )}
            </DialogDescription>
          </DialogHeader>
          {modalError ? <p className="text-sm text-destructive">{modalError}</p> : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-msg">
              {intl.formatMessage({
                id: "sales_order.detail.decision_message",
                defaultMessage: "Reason",
              })}
            </Label>
            <Textarea
              id="reject-msg"
              value={decisionMessage}
              onChange={(e) => setDecisionMessage(e.target.value)}
              placeholder={intl.formatMessage({
                id: "sales_order.detail.reject_reason_placeholder",
                defaultMessage: "Why are you rejecting this order?",
              })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectModalOpen(false)}>
              {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                rejectMutation.mutate({
                  id: record.id,
                  message: decisionMessage || undefined,
                })
              }
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {intl.formatMessage({ id: "sales_order.detail.reject", defaultMessage: "Reject" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={validateModalOpen} onOpenChange={setValidateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({
                id: "sales_order.detail.validate_title",
                defaultMessage: "Validate order",
              })}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage(
                {
                  id: "sales_order.detail.validate_confirm",
                  defaultMessage: 'Validate "{name}"? This will run AI validation checks.',
                },
                { name: record.documentNumber ?? "this order" },
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setValidateModalOpen(false)}>
              {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button
              type="button"
              onClick={() => validateMutation.mutate(record.id)}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {intl.formatMessage({
                id: "sales_order.detail.validate",
                defaultMessage: "Validate",
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SalesOrderPrint record={record as SalesOrderPrintRecord} />
      <SalesOrderPdfPreview orderId={pdfPreviewId} onClose={() => setPdfPreviewId(null)} />
    </section>
  );
};
