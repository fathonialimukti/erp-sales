import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2, Eye } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BudgetLineRow = { 
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

export const BudgetLineIndexPage = () => {
  const intl = useIntl();

  useMeta({
    title: intl.formatMessage({ id: "budget_line.index.title", defaultMessage: "Budget Lines" }),
    description: intl.formatMessage({ id: "budget_line.index.subtitle", defaultMessage: "Manage budget line allocations with scope and remaining tracking." }),
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
  const [itemToDelete, setItemToDelete] = useState<BudgetLineRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["budgetLineList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.budgetLine.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as BudgetLineRow[];
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

  const getRemainingColor = (remaining: number) => {
    if (remaining < 0) return "text-destructive";
    if (remaining === 0) return "text-orange-600";
    return "text-green-600";
  };

  const columns = useMemo<ColumnDef<BudgetLineRow>[]>(
    () => [
      {
        id: "budgetType",
        header: intl.formatMessage({ id: "budget_line.index.header_budget_type", defaultMessage: "Budget Type" }),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.budgetType?.name ?? "—"}</span>
        ),
      },
      {
        id: "period",
        header: intl.formatMessage({ id: "budget_line.index.header_period", defaultMessage: "Period" }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.period?.name ?? "—"}</span>
        ),
      },
      {
        id: "scope",
        header: intl.formatMessage({ id: "budget_line.index.header_scope", defaultMessage: "Scope" }),
        cell: ({ row }) => (
          <Badge variant="outline">{getScopeLabel(row.original.scope)}</Badge>
        ),
      },
      {
        id: "regionArea",
        header: intl.formatMessage({ id: "budget_line.index.header_region_area", defaultMessage: "Region / Area" }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.region?.name ?? row.original.area?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "allocated",
        header: intl.formatMessage({ id: "budget_line.index.header_allocated", defaultMessage: "Allocated" }),
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{formatCurrency(row.original.summary.allocated, row.original.currency)}</span>
        ),
      },
      {
        id: "committed",
        header: intl.formatMessage({ id: "budget_line.index.header_committed", defaultMessage: "Committed" }),
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{formatCurrency(row.original.summary.committed, row.original.currency)}</span>
        ),
      },
      {
        id: "spent",
        header: intl.formatMessage({ id: "budget_line.index.header_spent", defaultMessage: "Spent" }),
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{formatCurrency(row.original.summary.spent, row.original.currency)}</span>
        ),
      },
      {
        id: "remaining",
        header: intl.formatMessage({ id: "budget_line.index.header_remaining", defaultMessage: "Remaining" }),
        cell: ({ row }) => (
          <span className={`font-mono font-medium ${getRemainingColor(row.original.summary.remaining)}`}>
            {formatCurrency(row.original.summary.remaining, row.original.currency)}
          </span>
        ),
      },
      {
        id: "programs",
        header: intl.formatMessage({ id: "budget_line.index.header_programs", defaultMessage: "Programs" }),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">{row.original._count.actionPrograms}</span>
        ),
      },
      {
        id: "proposals",
        header: intl.formatMessage({ id: "budget_line.index.header_proposals", defaultMessage: "Proposals" }),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">{row.original._count.eventProposals}</span>
        ),
      },
      {
        id: "actions",
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
                <DropdownMenuItem onClick={() => navigate(`/budget-line/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem onClick={() => navigate(`/budget-line/${row.original.id}/edit`)}>
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
      await trpcClient.budgetLine.delete.mutate({ id: itemToDelete.id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      queryClient.invalidateQueries({ queryKey: ["budgetLineList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error, intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={intl.formatMessage({ id: "budget_line.index.title", defaultMessage: "Budget Lines" })}
        description={intl.formatMessage({ id: "budget_line.index.subtitle", defaultMessage: "Manage budget line allocations with scope and remaining tracking." })}
        actions={
          canCreate ? (
            <Button onClick={() => navigate("/budget-line/create")}>
              <Plus className="size-4 mr-2" />
              {intl.formatMessage({ id: "common.action.create", defaultMessage: "Create" })}
            </Button>
          ) : null
        }
      />
      <FilterBar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={intl.formatMessage({ id: "common.search.placeholder", defaultMessage: "Search..." })}
      />
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : isError ? (
        <EmptyState
          title={intl.formatMessage({ id: "common.error.load_failed", defaultMessage: "Failed to load data" })}
          description={intl.formatMessage({ id: "common.error.try_again", defaultMessage: "Please try again later" })}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={intl.formatMessage({ id: "budget_line.index.empty_title", defaultMessage: "No budget lines found" })}
          description={intl.formatMessage({ id: "budget_line.index.empty_description", defaultMessage: "Create your first budget line to get started." })}
          action={
            canCreate ? (
              <Button onClick={() => navigate("/budget-line/create")}>
                <Plus className="size-4 mr-2" />
                {intl.formatMessage({ id: "common.action.create", defaultMessage: "Create Budget Line" })}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/budget-line/${row.id}`)}
          />
          <Pagination
            page={pagination.pageIndex + 1}
            totalPages={totalPages}
            onChange={(page) => setPagination((p) => ({ ...p, pageIndex: page - 1 }))}
          />
        </div>
      )}
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