import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { Icon } from "../../ui";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/PageHeader";
import { ApprovalHistory } from "../../components/ApprovalHistory";
import { hasPermissionAtom } from "../../lib/atoms";
import { trpcClient } from "../../lib/trpc";
import { Button } from "../../ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../../ui/Card";
import { Chip } from "../../ui/Chip";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { Spinner } from "../../ui/Spinner";
import { Textarea } from "../../ui/Textarea";
import { useToast } from "../../ui/useToast";

interface SalesOrderDetail {
  id: string;
  documentNumber: string | null;
  date: string;
  currency: string;
  paymentTerms: string | null;
  customer: { id: string; name: string };
  outlet: { id: string; name: string } | null;
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

const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "danger"> = {
  DRAFT: "neutral",
  PROPOSED: "info",
  APPROVED: "success",
  REJECTED: "danger",
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
  const canUpdate = hasPermission("sales-order@update");
  const canDelete = hasPermission("sales-order@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["salesOrderDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.salesOrder.detail.query({ id: id ?? "" }),
  });
  const record = data as SalesOrderDetail | undefined;

  const proposeMutation = useMutation({
    mutationFn: (soid: string) => trpcClient.salesOrder.propose.mutate({ id: soid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      toast.success("Order proposed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to propose"),
  });

  const approveMutation = useMutation({
    mutationFn: (payload: { id: string; message?: string }) =>
      trpcClient.salesOrder.approve.mutate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setApproveModalOpen(false);
      setDecisionMessage("");
      toast.success("Order approved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: string; message?: string }) =>
      trpcClient.salesOrder.reject.mutate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrderDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setRejectModalOpen(false);
      setDecisionMessage("");
      toast.success("Order rejected");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to reject"),
  });

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.salesOrder.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setDeleteModalOpen(false);
      toast.success("Order deleted");
      navigate("/sales-order");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!record) {
    return (
      <Card className="mx-auto mt-12 max-w-md">
        <CardBody>
          <p className="text-sm text-state-danger">
            {intl.formatMessage({ id: "sales_order.detail.not_found", defaultMessage: "Order not found." })}
          </p>
          <Button variant="ghost" className="mt-3" onClick={() => navigate("/sales-order")}>
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <section
      className="space-y-6"
      data-ai-context={JSON.stringify({
        section: "sales-order-detail",
        id: record.id,
        documentNumber: record.documentNumber,
        customer: record.customer.name,
        approvalStatus: record.approvalStatus,
        itemCount: record.items.length,
        grandTotal: record.grandTotal,
      })}
    >
      <PageHeader
        title={record.documentNumber ?? `SO #${record.id.slice(0, 8)}`}
        onBack={() => navigate("/sales-order")}
        onEdit={canUpdate && record.approvalStatus === "DRAFT" ? () => navigate(`/sales-order/${record.id}/edit`) : undefined}
        onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={STATUS_TONE[record.approvalStatus] ?? "neutral"}>{record.approvalStatus}</Chip>
        {canPropose && record.approvalStatus === "DRAFT" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => proposeMutation.mutate(record.id)}
            isLoading={proposeMutation.isPending}
          >
            {intl.formatMessage({ id: "sales_order.detail.propose", defaultMessage: "Propose" })}
          </Button>
        )}
        {canApprove && record.approvalStatus === "PROPOSED" && (
          <Button size="sm" variant="success" onClick={() => setApproveModalOpen(true)}>
            {intl.formatMessage({ id: "sales_order.detail.approve", defaultMessage: "Approve" })}
          </Button>
        )}
        {canApprove && (record.approvalStatus === "PROPOSED" || record.approvalStatus === "DRAFT") && (
          <Button size="sm" variant="danger" onClick={() => setRejectModalOpen(true)}>
            {intl.formatMessage({ id: "sales_order.detail.reject", defaultMessage: "Reject" })}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {intl.formatMessage({ id: "sales_order.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label={intl.formatMessage({ id: "sales_order.detail.customer", defaultMessage: "Customer" })} value={record.customer.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.outlet", defaultMessage: "Outlet" })} value={record.outlet?.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.area", defaultMessage: "Area" })} value={record.area.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.source", defaultMessage: "Source" })} value={record.source} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.payment_terms", defaultMessage: "Payment terms" })} value={record.paymentTerms} />
            <Field
              label={intl.formatMessage({ id: "sales_order.detail.delivery_date", defaultMessage: "Delivery date" })}
              value={record.expectedDeliveryDate ? new Date(record.expectedDeliveryDate).toLocaleDateString() : null}
            />
            <Field label={intl.formatMessage({ id: "sales_order.detail.created_by", defaultMessage: "Created by" })} value={record.createdBy?.name} />
            <Field label={intl.formatMessage({ id: "sales_order.detail.currency", defaultMessage: "Currency" })} value={record.currency} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {intl.formatMessage({ id: "sales_order.detail.items", defaultMessage: "Items" })}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Table>
            <THead>
              <TR>
                <TH>{intl.formatMessage({ id: "sales_order.detail.product", defaultMessage: "Product" })}</TH>
                <TH className="text-right">{intl.formatMessage({ id: "sales_order.detail.qty", defaultMessage: "Qty" })}</TH>
                <TH className="text-right">{intl.formatMessage({ id: "sales_order.detail.unit_price", defaultMessage: "Unit price" })}</TH>
                <TH className="text-right">{intl.formatMessage({ id: "sales_order.detail.disc", defaultMessage: "Disc" })}</TH>
                <TH className="text-right">{intl.formatMessage({ id: "sales_order.detail.tax", defaultMessage: "Tax" })}</TH>
                <TH className="text-right">{intl.formatMessage({ id: "sales_order.detail.line_total", defaultMessage: "Total" })}</TH>
              </TR>
            </THead>
            <TBody>
              {record.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{item.sku.name}</p>
                    {item.sku.code && <p className="text-xs text-slate-500">{item.sku.code}</p>}
                  </TD>
                  <TD className="text-right">
                    {item.quantity} {item.sku.baseUnit}
                  </TD>
                  <TD className="text-right">{formatCurrency(item.unitPrice)}</TD>
                  <TD className="text-right">{item.discountPercent ?? 0}%</TD>
                  <TD className="text-right">{item.taxPercent ?? 0}%</TD>
                  <TD className="text-right font-medium">{formatCurrency(item.lineTotal)}</TD>
                </TR>
              ))}
            </TBody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-sm text-slate-500">
                  {intl.formatMessage({ id: "sales_order.detail.subtotal", defaultMessage: "Subtotal" })}
                </td>
                <td className="px-4 py-2 text-right text-sm">{formatCurrency(record.subtotal ?? 0)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-sm text-slate-500">
                  {intl.formatMessage({ id: "sales_order.detail.discount", defaultMessage: "Discount" })}
                </td>
                <td className="px-4 py-2 text-right text-sm">{formatCurrency(record.discountTotal ?? 0)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-sm text-slate-500">
                  {intl.formatMessage({ id: "sales_order.detail.tax_total", defaultMessage: "Tax" })}
                </td>
                <td className="px-4 py-2 text-right text-sm">{formatCurrency(record.taxTotal ?? 0)}</td>
              </tr>
              <tr className="font-semibold">
                <td colSpan={5} className="px-4 py-2 text-right text-slate-900 dark:text-slate-100">
                  {intl.formatMessage({ id: "sales_order.detail.grand_total", defaultMessage: "Grand total" })}
                </td>
                <td className="px-4 py-2 text-right text-slate-900 dark:text-slate-100">
                  {formatCurrency(record.grandTotal ?? 0)}
                </td>
              </tr>
            </tfoot>
          </Table>
        </CardBody>
      </Card>

      {record.notes && (
        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({ id: "sales_order.detail.notes", defaultMessage: "Notes" })}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
              {record.notes}
            </p>
          </CardBody>
        </Card>
      )}

      {record.approvalHistory && (
        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({
                id: "sales_order.detail.approval_history",
                defaultMessage: "Approval history",
              })}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ApprovalHistory
              approvalHistory={Array.isArray(record.approvalHistory) ? record.approvalHistory : []}
            />
          </CardBody>
        </Card>
      )}

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader onClose={() => setDeleteModalOpen(false)}>
          {intl.formatMessage({ id: "sales_order.detail.delete_title", defaultMessage: "Delete order" })}
        </ModalHeader>
        <ModalBody>
          {intl.formatMessage(
            {
              id: "sales_order.detail.delete_confirm_body",
              defaultMessage: 'Delete "{name}"? This action cannot be undone.',
            },
            { name: record.documentNumber ?? "this order" },
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
            {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={approveModalOpen} onClose={() => setApproveModalOpen(false)}>
        <ModalHeader onClose={() => setApproveModalOpen(false)}>
          {intl.formatMessage({ id: "sales_order.detail.approve_title", defaultMessage: "Approve order" })}
        </ModalHeader>
        <ModalBody className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {intl.formatMessage(
              {
                id: "sales_order.detail.approve_confirm",
                defaultMessage: 'Approve "{name}"?',
              },
              { name: record.documentNumber ?? "this order" },
            )}
          </p>
          <Textarea
            label={intl.formatMessage({ id: "sales_order.detail.decision_message", defaultMessage: "Message (optional)" })}
            value={decisionMessage}
            onChange={(e) => setDecisionMessage(e.target.value)}
            placeholder={intl.formatMessage({
              id: "sales_order.detail.decision_message_placeholder",
              defaultMessage: "Add an approval note…",
            })}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setApproveModalOpen(false)}>
            {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            variant="success"
            onClick={() => approveMutation.mutate({ id: record.id, message: decisionMessage || undefined })}
            isLoading={approveMutation.isPending}
          >
            {intl.formatMessage({ id: "sales_order.detail.approve", defaultMessage: "Approve" })}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)}>
        <ModalHeader onClose={() => setRejectModalOpen(false)}>
          {intl.formatMessage({ id: "sales_order.detail.reject_title", defaultMessage: "Reject order" })}
        </ModalHeader>
        <ModalBody className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {intl.formatMessage(
              {
                id: "sales_order.detail.reject_confirm",
                defaultMessage: 'Reject "{name}"?',
              },
              { name: record.documentNumber ?? "this order" },
            )}
          </p>
          <Textarea
            label={intl.formatMessage({ id: "sales_order.detail.decision_message", defaultMessage: "Reason" })}
            value={decisionMessage}
            onChange={(e) => setDecisionMessage(e.target.value)}
            placeholder={intl.formatMessage({
              id: "sales_order.detail.reject_reason_placeholder",
              defaultMessage: "Why are you rejecting this order?",
            })}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
            {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            variant="danger"
            onClick={() => rejectMutation.mutate({ id: record.id, message: decisionMessage || undefined })}
            isLoading={rejectMutation.isPending}
          >
            {intl.formatMessage({ id: "sales_order.detail.reject", defaultMessage: "Reject" })}
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
};

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
    <p className="text-sm text-slate-900 dark:text-slate-100">{value ?? "—"}</p>
  </div>
);
