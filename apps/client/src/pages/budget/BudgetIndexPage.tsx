import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Download, Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Eye } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { getRemainingColor } from "../../lib/status-color";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import {
  useWorkbookExport,
  type WorkbookColumn,
} from "../../lib/export/useWorkbookExport";
import {
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  toBudgetExportRow,
} from "./budget-export";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BudgetRow = {
  id: string;
  budgetType: { id: string; name: string } | null;
  period: { id: string; name: string; code: string } | null;
  scope: string;
  region: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  amount: number | string;
  currency: string;
  summary: { allocated: number; committed: number; spent: number; remaining: number };
  _count: { actionPrograms: number; eventProposals: number };
};

export const BudgetIndexPage = () => {
  const intl = useIntl();

  useMeta({
    title: intl.formatMessage({ id: "budget.index.title", defaultMessage: "Budgets" }),
    description: intl.formatMessage({ id: "budget.index.subtitle", defaultMessage: "Manage budget allocations across types and periods." }),
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("budget-line@create");
  const canUpdate = hasPermission("budget-line@update");
  const canDelete = hasPermission("budget-line@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BudgetRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const { exportWorkbook } = useWorkbookExport();

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["budgetList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.budget.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as BudgetRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

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

  const columns = useMemo<ColumnDef<BudgetRow>[]>(
    () => [
      {
        id: "budgetType",
        accessorFn: (row) => row.budgetType?.name ?? "",
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_budget_type", defaultMessage: "Budget Type" }),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.budgetType?.name ?? "—"}</span>
        ),
      },
      {
        id: "period",
        accessorFn: (row) => row.period?.name ?? "",
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_period", defaultMessage: "Period" }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.period?.name ?? "—"}</span>
        ),
      },
      {
        id: "scope",
        accessorKey: "scope",
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_scope", defaultMessage: "Scope" }),
        cell: ({ row }) => (
          <Badge variant="outline">{getScopeLabel(row.original.scope)}</Badge>
        ),
      },
      {
        id: "regionArea",
        accessorFn: (row) => row.region?.name ?? row.area?.name ?? "",
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_region_area", defaultMessage: "Region / Area" }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.region?.name ?? row.original.area?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "allocated",
        accessorFn: (row) => row.summary.allocated,
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_allocated", defaultMessage: "Allocated" }),
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{formatCurrency(row.original.summary.allocated, row.original.currency)}</span>
        ),
      },
      {
        id: "committed",
        accessorFn: (row) => row.summary.committed,
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_committed", defaultMessage: "Committed" }),
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{formatCurrency(row.original.summary.committed, row.original.currency)}</span>
        ),
      },
      {
        id: "spent",
        accessorFn: (row) => row.summary.spent,
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_spent", defaultMessage: "Spent" }),
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{formatCurrency(row.original.summary.spent, row.original.currency)}</span>
        ),
      },
      {
        id: "remaining",
        accessorFn: (row) => row.summary.remaining,
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_remaining", defaultMessage: "Remaining" }),
        cell: ({ row }) => (
          <span className={cn("font-mono font-medium", getRemainingColor(row.original.summary.remaining))}>
            {formatCurrency(row.original.summary.remaining, row.original.currency)}
          </span>
        ),
      },
      {
        id: "programs",
        accessorFn: (row) => row._count.actionPrograms,
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_programs", defaultMessage: "Programs" }),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">{row.original._count.actionPrograms}</span>
        ),
      },
      {
        id: "proposals",
        accessorFn: (row) => row._count.eventProposals,
        enableSorting: true,
        header: intl.formatMessage({ id: "budget_line.index.header_proposals", defaultMessage: "Proposals" }),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">{row.original._count.eventProposals}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/budget/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem onClick={() => navigate(`/budget/${row.original.id}/edit`)}>
                    <Pencil className="size-4" />
                    {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setItemToDelete(row.original);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                      {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [intl, navigate, canUpdate, canDelete],
  );

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.budget.delete.mutate({ id: itemToDelete.id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      queryClient.invalidateQueries({ queryKey: ["budgetList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error, intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
    } finally {
      setIsDeleting(false);
    }
  };

  const onExport = async () => {
    setIsExportingAll(true);
    try {
      // Export the whole filtered dataset, not just the loaded page.
      const allRows = await fetchAllPages((page) =>
        trpcClient.budget.list.query({
          page,
          limit: EXPORT_PAGE_SIZE,
          search: search || undefined,
        }),
      );
      await exportWorkbook({
        prefix: "budgets",
        sheetName: intl.formatMessage({
          id: "budget_line.index.title",
          defaultMessage: "Budget Lines",
        }),
        columns: [
          {
            key: "budgetType",
            header: intl.formatMessage({ id: "budget_line.index.header_budget_type", defaultMessage: "Budget Type" }),
          },
          {
            key: "period",
            header: intl.formatMessage({ id: "budget_line.index.header_period", defaultMessage: "Period" }),
          },
          {
            key: "scope",
            header: intl.formatMessage({ id: "budget_line.index.header_scope", defaultMessage: "Scope" }),
          },
          {
            key: "regionArea",
            header: intl.formatMessage({ id: "budget_line.index.header_region_area", defaultMessage: "Region / Area" }),
          },
          {
            key: "currency",
            header: intl.formatMessage({ id: "budget_line.index.header_currency", defaultMessage: "Currency" }),
          },
          {
            key: "allocated",
            header: intl.formatMessage({ id: "budget_line.index.header_allocated", defaultMessage: "Allocated" }),
            format: (v) => Number(v),
          },
          {
            key: "committed",
            header: intl.formatMessage({ id: "budget_line.index.header_committed", defaultMessage: "Committed" }),
            format: (v) => Number(v),
          },
          {
            key: "spent",
            header: intl.formatMessage({ id: "budget_line.index.header_spent", defaultMessage: "Spent" }),
            format: (v) => Number(v),
          },
          {
            key: "remaining",
            header: intl.formatMessage({ id: "budget_line.index.header_remaining", defaultMessage: "Remaining" }),
            format: (v) => Number(v),
          },
          {
            key: "programs",
            header: intl.formatMessage({ id: "budget_line.index.header_programs", defaultMessage: "Programs" }),
            format: (v) => Number(v),
          },
          {
            key: "proposals",
            header: intl.formatMessage({ id: "budget_line.index.header_proposals", defaultMessage: "Proposals" }),
            format: (v) => Number(v),
          },
        ] satisfies WorkbookColumn[],
        rows: allRows.map((row) => toBudgetExportRow(row, getScopeLabel)),
      });
    } catch {
      // Fetch errors land here; workbook errors are already toasted by the hook.
      toast.error(
        intl.formatMessage({
          id: "budget_line.index.export_failed",
          defaultMessage: "Export failed. Please try again.",
        }),
      );
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "budget-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="budget"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "budget_line.index.title", defaultMessage: "Budget Lines" })}
        description={intl.formatMessage({ id: "budget_line.index.subtitle", defaultMessage: "Manage budget line allocations with scope and remaining tracking." })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/budget-line/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({ id: "common.action.create", defaultMessage: "Create" })}
            </Button>
          ) : undefined
        }
      />

      <DataTable
        density="crm"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        errorMessage={intl.formatMessage({
          id: "budget_line.index.load_failed",
          defaultMessage:
            "We could not load budget lines. Check your connection and try again.",
        })}
        onRowClick={(row) => navigate(`/budget/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "budget_line.index.search_placeholder",
              defaultMessage: "Search budget lines…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "budget_line.index.count_label",
                defaultMessage: "{count, plural, one {# budget line} other {# budget lines}}",
              },
              { count: totalRows },
            )}
            actions={
              <>
                {isError ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refetch()}
                  >
                    <RefreshCw className="size-3.5" aria-hidden />
                    {intl.formatMessage({ id: "common.action.retry", defaultMessage: "Retry" })}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5"
                  onClick={onExport}
                  disabled={isExportingAll}
                >
                  {isExportingAll ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-3.5" aria-hidden />
                  )}
                  {intl.formatMessage(
                    isExportingAll
                      ? {
                          id: "budget_line.index.export_loading",
                          defaultMessage: "Preparing export…",
                        }
                      : {
                          id: "budget_line.index.export_excel",
                          defaultMessage: "Export Excel",
                        },
                  )}
                </Button>
              </>
            }
          />
        }
        empty={
          <EmptyState
            module="budgetLine"
            title={
              search
                ? intl.formatMessage({
                    id: "budget_line.index.empty_search",
                    defaultMessage: "No budget lines found",
                  })
                : intl.formatMessage({
                    id: "budget_line.index.empty_title",
                    defaultMessage: "No budget lines yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "budget_line.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "budget_line.index.empty_description",
                    defaultMessage: "Create your first budget line to get started.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/budget-line/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({ id: "common.action.create", defaultMessage: "Create" })}
                </Button>
              ) : undefined
            }
          />
        }
        footer={
          totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage(
                  { id: "common.pagination_info", defaultMessage: "Page {page} of {total}" },
                  { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) },
                )}
              </p>
              <Pagination
                page={pagination.pageIndex + 1}
                totalPages={totalPages}
                onChange={(p) => setPagination({ pageIndex: p - 1, pageSize: pagination.pageSize })}
              />
            </div>
          ) : null
        }
      />

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({ id: "budget.confirm.delete_title", defaultMessage: "Delete budget line?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </section>
  );
};