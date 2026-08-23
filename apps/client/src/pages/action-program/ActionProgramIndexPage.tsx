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
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActionProgramRow = {
  id: string;
  documentNumber: string | null;
  name: string;
  _count: { outlets: number };
};

export const ActionProgramIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("action-program@create");
  const canUpdate = hasPermission("action-program@update");
  const canDelete = hasPermission("action-program@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ActionProgramRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["actionProgramList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.actionProgram.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as ActionProgramRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<ActionProgramRow>[]>(
    () => [
      {
        id: "code",
        header: intl.formatMessage({
          id: "action_program.index.header_code",
          defaultMessage: "Document",
        }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.documentNumber ?? "—"}
          </span>
        ),
      },
      {
        id: "name",
        header: intl.formatMessage({
          id: "action_program.index.header_name",
          defaultMessage: "Type",
        }),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
      },
      {
        id: "budget",
        header: intl.formatMessage({
          id: "action_program.index.header_budget",
          defaultMessage: "Budget",
        }),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">
            {row.original._count.outlets > 0 ? row.original._count.outlets : "—"}
          </span>
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
                <DropdownMenuItem onClick={() => navigate(`/action-program/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem
                    onClick={() => navigate(`/action-program/${row.original.id}/edit`)}
                  >
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
      await trpcClient.actionProgram.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["actionProgramList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({
          id: "action_program.index.delete_success",
          defaultMessage: "Action program deleted",
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
        section: "action-program-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="planning"
        eyebrow={intl.formatMessage({ id: "nav.programs", defaultMessage: "Programs" })}
        title={intl.formatMessage({
          id: "action_program.index.title",
          defaultMessage: "Action Program",
        })}
        description={intl.formatMessage({
          id: "action_program.index.subtitle",
          defaultMessage: "Manage geographical actionPrograms and their areas.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/action-program/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "action_program.index.create_button",
                defaultMessage: "New actionProgram",
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
        onRowClick={(row) => navigate(`/action-program/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "action_program.index.search_placeholder",
              defaultMessage: "Search actionPrograms…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "action_program.index.count_label",
                defaultMessage:
                  "{count, plural, one {# actionProgram} other {# actionPrograms}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="planning"
            title={
              search
                ? intl.formatMessage({
                    id: "action_program.index.empty_search",
                    defaultMessage: "No actionPrograms found",
                  })
                : intl.formatMessage({
                    id: "action_program.index.empty_title",
                    defaultMessage: "No actionPrograms yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "action_program.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "action_program.index.empty_desc",
                    defaultMessage: "Create your first actionProgram to get started.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/action-program/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "action_program.index.create_button",
                    defaultMessage: "New actionProgram",
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
          id: "action_program.index.delete_title",
          defaultMessage: "Delete actionProgram",
        })}
        description={intl.formatMessage(
          {
            id: "action_program.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: itemToDelete?.name ?? "" },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
