import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, AlertCircle, Mail, Phone, MapPin, User, Tag } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type VendorDetail = {
  id: string;
  code: string | null;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  status: string;
  eventVendors: Array<{
    id: string;
    eventProposal: { id: string; name: string } | null;
    scope: string | null;
    amount: number;
    payments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      method: string | null;
    }>;
  }>;
  _count: { eventVendors: number };
};

export const VendorDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("vendor@update");
  const canDelete = hasPermission("vendor@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendorDetail", id],
    queryFn: () => trpcClient.vendor.detail.query({ id: id! }),
    enabled: !!id,
  });

  const vendor = data as VendorDetail | undefined;

  useMeta({
    title: vendor?.name ?? intl.formatMessage({ id: "vendor.detail.title", defaultMessage: "Vendor Detail" }),
    description: "",
  });

  const handleDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.vendor.delete.mutate({ id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      navigate("/vendor");
    } catch (error) {
      toast.error(error, intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  };

  const getStatusBadge = (status: string) => <StatusChip status={status} />;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {intl.formatMessage({ id: "vendor.error.not_found", defaultMessage: "Vendor not found" })}
          </h3>
          <Button variant="outline" onClick={() => navigate("/vendor")} className="mt-4">
            <ArrowLeft className="size-4 mr-2" />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back to list" })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      data-ai-context={JSON.stringify({
        section: "vendor-detail",
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        status: vendor.status,
        eventVendorCount: vendor._count.eventVendors,
      })}
    >
      <PageHeader
        module="vendor"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={vendor.name}
        description={vendor.category ?? intl.formatMessage({ id: "common.no_description", defaultMessage: "No description" })}
        actions={
          <>
            {canUpdate && (
              <Button variant="outline" onClick={() => navigate(`/vendor/${vendor.id}/edit`)}>
                <Pencil className="size-4 mr-2" />
                {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
              </Button>
            )}
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="size-4 mr-2" />
                    {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="size-4" />
              {intl.formatMessage({ id: "vendor.detail.code", defaultMessage: "Code" })}
            </div>
            <div className="mt-1 font-medium text-foreground font-mono">{vendor.code ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="size-4" />
              {intl.formatMessage({ id: "vendor.detail.contact", defaultMessage: "Contact" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{vendor.contactName ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="size-4" />
              {intl.formatMessage({ id: "vendor.detail.phone", defaultMessage: "Phone" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{vendor.contactPhone ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="size-4" />
              {intl.formatMessage({ id: "vendor.detail.email", defaultMessage: "Email" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{vendor.email ?? "—"}</div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {intl.formatMessage({ id: "vendor.detail.info", defaultMessage: "Vendor Information" })}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: "vendor.detail.category", defaultMessage: "Category" })}</div>
              <div className="mt-1 font-medium text-foreground">{vendor.category ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: "vendor.detail.status", defaultMessage: "Status" })}</div>
              <div className="mt-1">{getStatusBadge(vendor.status)}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: "vendor.detail.address", defaultMessage: "Address" })}</div>
              <div className="mt-1 font-medium text-foreground">{vendor.address ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold text-foreground">
              {intl.formatMessage({ id: "vendor.detail.events_title", defaultMessage: "Event Engagements" })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "vendor.detail.event_name", defaultMessage: "Event" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "vendor.detail.event_scope", defaultMessage: "Scope" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "vendor.detail.event_amount", defaultMessage: "Amount" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "vendor.detail.event_payments", defaultMessage: "Payments" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendor.eventVendors.map((ev) => {
                  const proposal = ev.eventProposal;
                  return (
                  <tr key={ev.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      {proposal ? (
                        <Button variant="ghost" className="p-0 h-auto text-left" onClick={() => navigate(`/event-proposal/${proposal.id}`)}>
                          {proposal.name}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 text-foreground">{ev.scope ?? "—"}</td>
                    <td className="p-4 font-mono text-foreground">{formatCurrency(ev.amount)}</td>
                    <td className="p-4">
                      {ev.payments.length > 0 ? (
                        <span className="font-mono text-foreground">
                          {formatCurrency(ev.payments.reduce((sum, p) => sum + p.amount, 0))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {vendor.eventVendors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      {intl.formatMessage({ id: "vendor.detail.no_events", defaultMessage: "No event engagements" })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({ id: "vendor.confirm.delete_title", defaultMessage: "Delete vendor?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};