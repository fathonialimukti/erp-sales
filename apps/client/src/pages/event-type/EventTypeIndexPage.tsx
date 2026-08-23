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
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EventTypeRow = { id: string; code: string | null; name: string; description: string | null };

export const EventTypeIndexPage = () => {
  const intl = useIntl();

  useMeta({
    title: intl.formatMessage({ id: "event_type.index.title", defaultMessage: "Event Types" }),
    description: intl.formatMessage({ id: "event_type.index.subtitle", defaultMessage: "Manage event types and classifications." }),
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("event-type@create");
  const canUpdate = hasPermission("event-type@update");
  const canDelete = hasPermission("event-type@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EventTypeRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["eventTypeList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.eventType.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as EventTypeRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<EventTypeRow>[]>(
    () => [
      {
        id: "code",
        header: intl.formatMessage({ id: "event_type.index.header_code", defaultMessage: "Code" }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.code ?? "—"}</span>
        ),
      },
      {
        id: "name",
        header: intl.formatMessage({ id: "event_type.index.header_name", defaultMessage: "Name" }),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        id: "description",
        header: intl.formatMessage({ id: "event_type.index.header_description", defaultMessage: "Description" }),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.description ?? "—"}</span>
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
                <DropdownMenuItem onClick={() => navigate(`/event-type/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem onClick={() => navigate(`/event-type/${row.original.id}/edit`)}>
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
      await trpcClient.eventType.delete.mutate({ id: itemToDelete.id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      queryClient.invalidateQueries({ queryKey: ["eventTypeList"] });
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
        title={intl.formatMessage({ id: "event_type.index.title", defaultMessage: "Event Types" })}
        description={intl.formatMessage({ id: "event_type.index.subtitle", defaultMessage: "Manage event types and classifications." })}
        actions={
          canCreate ? (
            <Button onClick={() => navigate("/event-type/create")}>
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
          title={intl.formatMessage({ id: "event_type.index.empty_title", defaultMessage: "No event types found" })}
          description={intl.formatMessage({ id: "event_type.index.empty_description", defaultMessage: "Create your first event type to get started." })}
          action={
            canCreate ? (
              <Button onClick={() => navigate("/event-type/create")}>
                <Plus className="size-4 mr-2" />
                {intl.formatMessage({ id: "common.action.create", defaultMessage: "Create Event Type" })}
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
            onRowClick={(row) => navigate(`/event-type/${row.id}`)}
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
        title={intl.formatMessage({ id: "common.confirm.delete_title", defaultMessage: "Delete event type?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};