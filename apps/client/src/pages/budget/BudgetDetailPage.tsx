import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2, ArrowLeft, Tag, MapPin, AlertCircle } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BudgetDetail = {
  id: string;
  budgetType: { id: string; name: string } | null;
  period: { id: string; name: string; code: string } | null;
  scope: string;
  region: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  amount: number;
  currency: string;
  summary: { allocated: number; committed: number; spent: number; remaining: number };
  actionPrograms: Array<{
    id: string;
    name: string;
    plannedCost: number;
    approvalStatus: string;
  }>;
  eventProposals: Array<{
    id: string;
    name: string;
    plannedCost: number;
    approvalStatus: string;
  }>;
};

export const BudgetDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("budget-line@update");
  const canDelete = hasPermission("budget-line@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["budgetDetail", id],
    queryFn: () => trpcClient.budget.detail.query({ id: id! }),
    enabled: !!id,
  });

  const budget = data as BudgetDetail | undefined;

  useMeta({
    title: budget?.budgetType?.name ?? intl.formatMessage({ id: "budget_line.detail.title", defaultMessage: "Budget Line Detail" }),
    description: budget?.period?.name ?? "",
  });

  const handleDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.budget.delete.mutate({ id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      navigate("/budget");
    } catch (error) {
      toast.error(error, intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge variant="default">{intl.formatMessage({ id: "common.status.approved", defaultMessage: "Approved" })}</Badge>;
      case "DRAFT": return <Badge variant="secondary">{intl.formatMessage({ id: "common.status.draft", defaultMessage: "Draft" })}</Badge>;
      case "VALIDATING": return <Badge variant="outline">{intl.formatMessage({ id: "common.status.validating", defaultMessage: "Validating" })}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRemainingColor = (remaining: number) => {
    if (remaining < 0) return "text-destructive";
    if (remaining === 0) return "text-orange-600";
    return "text-green-600";
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !budget) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {intl.formatMessage({ id: "common.error.not_found", defaultMessage: "Budget line not found" })}
          </h3>
          <Button variant="outline" onClick={() => navigate("/budget")} className="mt-4">
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
        module="budget"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={budget.budgetType?.name ?? intl.formatMessage({ id: "budget_line.detail.title", defaultMessage: "Budget Line Detail" })}
        description={budget.period?.name ?? ""}
        actions={
          <>
            {canUpdate && (
              <Button variant="outline" onClick={() => navigate(`/budget/${budget.id}/edit`)}>
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
              {intl.formatMessage({ id: "budget_line.detail.budget_type", defaultMessage: "Budget Type" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{budget.budgetType?.name ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="size-4" />
              {intl.formatMessage({ id: "budget_line.detail.period", defaultMessage: "Period" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{budget.period?.name ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="size-4" />
              {intl.formatMessage({ id: "budget_line.detail.scope", defaultMessage: "Scope" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{getScopeLabel(budget.scope)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="size-4" />
              {intl.formatMessage({ id: "budget_line.detail.region_area", defaultMessage: "Region / Area" })}
            </div>
            <div className="mt-1 font-medium text-foreground">
              {budget.region?.name ?? budget.area?.name ?? "—"}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {intl.formatMessage({ id: "budget_line.detail.summary", defaultMessage: "Budget Summary" })}
          </h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: "budget_line.detail.allocated", defaultMessage: "Allocated" })}
              </div>
              <div className="mt-1 font-mono text-foreground text-xl">
                {formatCurrency(budget.summary.allocated, budget.currency)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: "budget_line.detail.committed", defaultMessage: "Committed" })}
              </div>
              <div className="mt-1 font-mono text-foreground text-xl">
                {formatCurrency(budget.summary.committed, budget.currency)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: "budget_line.detail.spent", defaultMessage: "Spent" })}
              </div>
              <div className="mt-1 font-mono text-foreground text-xl">
                {formatCurrency(budget.summary.spent, budget.currency)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: "budget_line.detail.remaining", defaultMessage: "Remaining" })}
              </div>
              <div className="mt-1 font-mono text-foreground text-xl">
                <span className={getRemainingColor(budget.summary.remaining)}>
                  {formatCurrency(budget.summary.remaining, budget.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold text-foreground">
              {intl.formatMessage({ id: "budget_line.detail.programs_title", defaultMessage: "Action Programs" })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_line.detail.program_name", defaultMessage: "Name" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_line.detail.program_planned_cost", defaultMessage: "Planned Cost" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_line.detail.program_status", defaultMessage: "Status" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {budget.actionPrograms.map((program) => (
                  <tr key={program.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <Button variant="ghost" className="p-0 h-auto text-left" onClick={() => navigate(`/action-program/${program.id}`)}>
                        {program.name}
                      </Button>
                    </td>
                    <td className="p-4 font-mono text-foreground">
                      {formatCurrency(program.plannedCost)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(program.approvalStatus)}
                    </td>
                  </tr>
                ))}
                {budget.actionPrograms.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      {intl.formatMessage({ id: "budget_line.detail.no_programs", defaultMessage: "No action programs linked" })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold text-foreground">
              {intl.formatMessage({ id: "budget_line.detail.proposals_title", defaultMessage: "Event Proposals" })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_line.detail.proposal_name", defaultMessage: "Name" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_line.detail.proposal_planned_cost", defaultMessage: "Planned Cost" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "budget_line.detail.proposal_status", defaultMessage: "Status" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {budget.eventProposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <Button variant="ghost" className="p-0 h-auto text-left" onClick={() => navigate(`/event-proposal/${proposal.id}`)}>
                        {proposal.name}
                      </Button>
                    </td>
                    <td className="p-4 font-mono text-foreground">
                      {formatCurrency(proposal.plannedCost)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(proposal.approvalStatus)}
                    </td>
                  </tr>
                ))}
                {budget.eventProposals.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      {intl.formatMessage({ id: "budget_line.detail.no_proposals", defaultMessage: "No event proposals linked" })}
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
        title={intl.formatMessage({ id: "common.confirm.delete_title", defaultMessage: "Delete budget line?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};