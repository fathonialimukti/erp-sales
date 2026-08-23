import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type BudgetTypeDetail = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
};

type BudgetLineRow = {
  id: string;
  period: { id: string; name: string; code: string } | null;
  scope: string;
  region: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  amount: number | string;
  currency: string;
  summary: { allocated: number; committed: number; spent: number; remaining: number };
  _count: { actionPrograms: number; eventProposals: number };
};

export const BudgetTypeDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("budget-type@update");
  const canDelete = hasPermission("budget-type@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["budgetTypeDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.budgetType.detail.query({ id: id ?? "" }),
  });

  const budgetType = data as BudgetTypeDetail | undefined;

  const { data: budgetLinesData, isLoading: budgetLinesLoading } = useQuery({
    queryKey: ["budgetLineList", "byType", id],
    enabled: Boolean(id),
    queryFn: () =>
      trpcClient.budgetLine.list.query({
        page: 1,
        limit: 50,
        budgetTypeId: id ?? undefined,
      }),
  });

  const budgetLines = (budgetLinesData?.data ?? []) as BudgetLineRow[];

  const formatCurrency = (value: number, currency = "IDR") => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency, minimumFractionDigits: 0 }).format(value);
  };

  const handleDelete = async () => {
    if (!budgetType || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.budgetType.delete.mutate({ id: budgetType.id });
      await queryClient.invalidateQueries({ queryKey: ["budgetTypeList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({ id: "budget_type.detail.delete_success", defaultMessage: "Budget type deleted" }),
      );
      navigate("/budget-type");
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "budget-type-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (!budgetType) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "budget-type-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/budget-type")} />
          <PageHeader
            module="budgetType"
            title={intl.formatMessage({ id: "budget_type.detail.not_found", defaultMessage: "Budget type not found" })}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "budget-type-detail",
        id: budgetType.id,
        name: budgetType.name,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/budget-type")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/budget-type/${budgetType.id}/edit`)}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
            </Button>
          ) : null}
          {canDelete ? (
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
          module="budgetType"
          eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
          title={budgetType.name}
          description={budgetType.code ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-budget)_8%,transparent)] text-[var(--module-budget)]">
              <svg className="size-4" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            {intl.formatMessage({ id: "budget_type.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "budget_type.detail.code_label", defaultMessage: "Code" })}
              </dt>
              <dd className="font-mono text-sm font-normal text-foreground">{budgetType.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "budget_type.detail.name_label", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{budgetType.name}</dd>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "budget_type.detail.description_label", defaultMessage: "Description" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{budgetType.description ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-budget)_8%,transparent)] text-[var(--module-budget)]">
              <svg className="size-4" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            {intl.formatMessage({ id: "budget_type.detail.associated_lines", defaultMessage: "Associated Budget Lines" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {budgetLines.length === 0 ? (
            <EmptyState
              module="budgetType"
              title={intl.formatMessage({ id: "budget_type.detail.no_lines", defaultMessage: "No budget lines found" })}
              description={intl.formatMessage({ id: "budget_type.detail.no_lines_desc", defaultMessage: "This budget type has no associated budget lines yet." })}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pl-1">
                      {intl.formatMessage({ id: "budget_line.index.header_period", defaultMessage: "Period" })}
                    </th>
                    <th className="pb-2">
                      {intl.formatMessage({ id: "budget_line.index.header_scope", defaultMessage: "Scope" })}
                    </th>
                    <th className="pb-2">
                      {intl.formatMessage({ id: "budget_line.index.header_region_area", defaultMessage: "Region / Area" })}
                    </th>
                    <th className="pb-2 text-right">
                      {intl.formatMessage({ id: "budget_line.index.header_allocated", defaultMessage: "Allocated" })}
                    </th>
                    <th className="pb-2 text-right">
                      {intl.formatMessage({ id: "budget_line.index.header_remaining", defaultMessage: "Remaining" })}
                    </th>
                    <th className="pb-2 text-center">
                      {intl.formatMessage({ id: "budget_line.index.header_programs", defaultMessage: "Programs" })}
                    </th>
                    <th className="pb-2 text-center">
                      {intl.formatMessage({ id: "budget_line.index.header_proposals", defaultMessage: "Proposals" })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.map((line) => (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="py-2 pl-1">
                        <span className="font-medium text-foreground">{line.period?.name ?? "—"}</span>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">
                          {line.scope === "REGION"
                            ? intl.formatMessage({ id: "budget.scope.region", defaultMessage: "Region" })
                            : intl.formatMessage({ id: "budget.scope.area", defaultMessage: "Area" })}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <span className="text-sm text-foreground">
                          {line.region?.name ?? line.area?.name ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatCurrency(line.summary.allocated, line.currency)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatCurrency(line.summary.remaining, line.currency)}
                      </td>
                      <td className="py-2 text-center tabular-nums">{line._count.actionPrograms}</td>
                      <td className="py-2 text-center tabular-nums">{line._count.eventProposals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({ id: "budget_type.detail.delete_title", defaultMessage: "Delete budget type" })}
        description={intl.formatMessage(
          { id: "budget_type.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' },
          { name: budgetType.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
