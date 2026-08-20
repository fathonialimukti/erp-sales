import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Calendar, AlertCircle } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BudgetPeriodDetail = {
  id: string;
  code: string | null;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  budgetLines: Array<{
    id: string;
    budgetType: { id: string; name: string } | null;
    scope: string;
    region: { id: string; name: string } | null;
    area: { id: string; name: string } | null;
    amount: number;
    currency: string;
    summary: { allocated: number; committed: number; spent: number; remaining: number };
    _count: { actionPrograms: number; eventProposals: number };
  }>;
  _count: { budgetLines: number };
};

export const BudgetPeriodDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("budget-period@update");
  const canDelete = hasPermission("budget-period@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["budgetPeriodDetail", id],
    queryFn: () => trpcClient.budgetPeriod.detail.query({ id: id! }),
    enabled: !!id,
  });

  const period = data as BudgetPeriodDetail | undefined;

  useMeta({
    title: period?.name ?? intl.formatMessage({ id: "budget_period.detail.title", defaultMessage: "Budget Period Detail" }),
    description: "",
  });

  const handleDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.budgetPeriod.delete.mutate({ id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      navigate("/budget-period");
    } catch (error) {
      toast.error(intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number, currency = "IDR") => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency, minimumFractionDigits: 0 }).format(value);
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case "REGION": return intl.formatMessage({ id: "budget.scope.region", defaultMessage: "Region" });
      case "AREA": return intl.formatMessage({ id: "budget.scope.area", defaultMessage: "Area" });
      default: return scope;
    }
  };

  const getStatusBadge = (status: string) => <StatusChip status={status} />;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !period) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {intl.formatMessage({ id: "common.error.not_found", defaultMessage: "Budget period not found" })}
          </h3>
          <Button variant="outline" onClick={() => navigate("/budget-period")} className="mt-4">
            <ArrowLeft className="size-4 mr-2" />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back to list" })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={period.name}
        description={intl.formatMessage({ id: "budget_period.detail.subtitle", defaultMessage: "Budget period details and lines" })}
        actions={
          <>
            {canUpdate && (
              <Button variant="outline" onClick={() => navigate(`/budget-period/${period.id}/edit`)}>
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
              <Calendar className="size-4" />
              {intl.formatMessage({ id: "budget_period.detail.code", defaultMessage: "Code" })}
            </div>
            <div className="mt-1 font-medium text-foreground font-mono">{period.code ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="size-4" />
              {intl.formatMessage({ id: "budget_period.detail.start_date", defaultMessage: "Start Date" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{new Date(period.startDate).toLocaleDateString("id-ID")}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="size-4" />
              {intl.formatMessage({ id: "budget_period.detail.end_date", defaultMessage: "End Date" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{new Date(period.endDate).toLocaleDateString("id-ID")}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="size-4" />
              {intl.formatMessage({ id: "budget_period.detail.status", defaultMessage: "Status" })}
            </div>
            <div className="mt-1">{getStatusBadge(period.status)}</div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold text-foreground">
              {intl.formatMessage({ id: "budget_period.detail.lines_title", defaultMessage: "Budget Lines" })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_budget_type", defaultMessage: "Budget Type" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_scope", defaultMessage: "Scope" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_region_area", defaultMessage: "Region / Area" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_allocated", defaultMessage: "Allocated" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_committed", defaultMessage: "Committed" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_spent", defaultMessage: "Spent" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_remaining", defaultMessage: "Remaining" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_programs", defaultMessage: "Programs" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_period.detail.line_proposals", defaultMessage: "Proposals" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {period.budgetLines.map((line) => (
                  <tr key={line.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <span className="text-foreground">{line.budgetType?.name ?? "—"}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{getScopeLabel(line.scope)}</Badge>
                    </td>
                    <td className="p-4">
                      {line.region ? (
                        <span className="text-foreground">{line.region.name}</span>
                      ) : line.area ? (
                        <span className="text-foreground">{line.area.name}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-foreground">
                      {formatCurrency(line.summary.allocated, line.currency)}
                    </td>
                    <td className="p-4 font-mono text-foreground">
                      {formatCurrency(line.summary.committed, line.currency)}
                    </td>
                    <td className="p-4 font-mono text-foreground">
                      {formatCurrency(line.summary.spent, line.currency)}
                    </td>
                    <td className="p-4 font-mono text-foreground">
                      {formatCurrency(line.summary.remaining, line.currency)}
                    </td>
                    <td className="p-4 text-foreground">
                      {line._count.actionPrograms}
                    </td>
                    <td className="p-4 text-foreground">
                      {line._count.eventProposals}
                    </td>
                  </tr>
                ))}
                {period.budgetLines.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      {intl.formatMessage({ id: "budget_period.detail.no_lines", defaultMessage: "No budget lines defined" })}
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
        title={intl.formatMessage({ id: "common.confirm.delete_title", defaultMessage: "Delete budget period?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};