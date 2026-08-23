import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type VisitLogRow = {
  id: string;
  date: string;
  salesman: { id: string; name: string };
  outlet: { id: string; name: string } | null;
  approvalStatus: string;
};

export const VisitLogIndexPage = () => {
  const intl = useIntl();

  useMeta({
    title: intl.formatMessage({ id: "visit_log.index.title", defaultMessage: "Visit Logs" }),
    description: intl.formatMessage({ id: "visit_log.index.subtitle", defaultMessage: "Track field visits with check-in, purpose, and notes tied to the right outlet." }),
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("visit-log@create");
  const canUpdate = hasPermission("visit-log@update");
  const canDelete = hasPermission("visit-log@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VisitLogRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["visitLogList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.visitLog.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as VisitLogRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<VisitLogRow>[]>(
    () => {
      const statusLabel = (status: string) => {
        const s = status.toUpperCase();
        if (s === "DRAFT")
          return intl.formatMessage({ id: "visit_log.index.status_draft", defaultMessage: "Draft" });
        if (s === "VALIDATING")
          return intl.formatMessage({
            id: "visit_log.index.status_validating",
            defaultMessage: "AI Processing",
          });
        if (s === "PROPOSED")
          return intl.formatMessage({
            id: "visit_log.index.status_proposed",
            defaultMessage: "Pending Approval",
          });
        if (s === "APPROVED")
          return intl.formatMessage({
            id: "visit_log.index.status_approved",
            defaultMessage: "Approved",
          });
        if (s === "REJECTED")
          return intl.formatMessage({
            id: "visit_log.index.status_rejected",
            defaultMessage: "Rejected",
          });
        return status;
      };

      return [
        {
          id: "date",
          header: intl.formatMessage({ id: "visit_log.index.header_code", defaultMessage: "Date" }),
          cell: ({ row }) => (
            <span className="font-mono text-xs text-muted-foreground">
              {new Date(row.original.date).toLocaleDateString()}
            </span>
          ),
        },
        {
          id: "salesman",
          header: intl.formatMessage({
            id: "visit_log.index.header_name",
            defaultMessage: "Salesman",
          }),
          cell: ({ row }) => (
            <span className="font-medium text-foreground">{row.original.salesman.name}</span>
          ),
        },
        {
          id: "outlet",
          header: intl.formatMessage({
            id: "visit_log.index.header_outlet",
            defaultMessage: "Outlet",
          }),
          cell: ({ row }) => (
            <span className="text-muted-foreground">{row.original.outlet?.name ?? "—"}</span>
          ),
        },
        {
          id: "status",
          header: intl.formatMessage({
            id: "visit_log.index.header_status",
            defaultMessage: "Status",
          }),
          cell: ({ row }) => (
            <StatusChip
              status={row.original.approvalStatus}
              label={statusLabel(row.original.approvalStatus)}
            />
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
                    aria-label={intl.formatMessage({
                      id: "common.action.actions",
                      defaultMessage: "Actions",
                    })}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/visit-log/${row.original.id}`)}>
                    <Eye className="size-4" />
                    {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                  </DropdownMenuItem>
                  {canUpdate ? (
                    <DropdownMenuItem onClick={() => navigate(`/visit-log/${row.original.id}/edit`)}>
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
      ];
    },
    [intl, navigate, canUpdate, canDelete],
  );

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.visitLog.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({
          id: "visit_log.index.delete_success",
          defaultMessage: "Visit log deleted",
        }),
      );
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "visit-log-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="visit"
        eyebrow={intl.formatMessage({ id: "nav.field_ops", defaultMessage: "Field Operations" })}
        title={intl.formatMessage({ id: "visit_log.index.title", defaultMessage: "Visit Log" })}
        description={intl.formatMessage({
          id: "visit_log.index.subtitle",
          defaultMessage: "Manage geographical visitLogs and their areas.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/visit-log/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "visit_log.index.create_button",
                defaultMessage: "New visitLog",
              })}
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
        onRowClick={(row) => navigate(`/visit-log/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "visit_log.index.search_placeholder",
              defaultMessage: "Search visitLogs…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "visit_log.index.count_label",
                defaultMessage: "{count, plural, one {# visitLog} other {# visitLogs}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="visit"
            title={
              search
                ? intl.formatMessage({
                    id: "visit_log.index.empty_search",
                    defaultMessage: "No visitLogs found",
                  })
                : intl.formatMessage({
                    id: "visit_log.index.empty_title",
                    defaultMessage: "No visitLogs yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "visit_log.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "visit_log.index.empty_desc",
                    defaultMessage: "Create your first visitLog to get started.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/visit-log/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "visit_log.index.create_button",
                    defaultMessage: "New visitLog",
                  })}
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
        title={intl.formatMessage({
          id: "visit_log.index.delete_title",
          defaultMessage: "Delete visitLog",
        })}
        description={intl.formatMessage(
          {
            id: "visit_log.index.delete_confirm_body",
            defaultMessage: 'Delete visit log for "{name}"? This action cannot be undone.',
          },
          { name: itemToDelete?.outlet?.name ?? itemToDelete?.date ?? "" },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
