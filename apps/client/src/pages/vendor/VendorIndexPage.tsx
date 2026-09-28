import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Eye } from "lucide-react";

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

type VendorRow = { 
  id: string; 
  code: string | null; 
  name: string; 
  contactName: string | null;
  contactPhone: string | null;
  email: string | null;
  category: string | null;
  status: string;
};

export const VendorIndexPage = () => {
  const intl = useIntl();

  useMeta({
    title: intl.formatMessage({ id: "vendor.index.title", defaultMessage: "Vendors" }),
    description: intl.formatMessage({ id: "vendor.index.subtitle", defaultMessage: "Manage vendors and suppliers for events." }),
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("vendor@create");
  const canUpdate = hasPermission("vendor@update");
  const canDelete = hasPermission("vendor@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VendorRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vendorList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.vendor.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as VendorRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const getStatusBadge = (status: string) => <StatusChip status={status} />;

  const columns = useMemo<ColumnDef<VendorRow>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        enableSorting: true,
        header: intl.formatMessage({ id: "vendor.index.header_code", defaultMessage: "Code" }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.code ?? "—"}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        enableSorting: true,
        header: intl.formatMessage({ id: "vendor.index.header_name", defaultMessage: "Name" }),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        id: "contactName",
        accessorKey: "contactName",
        enableSorting: true,
        header: intl.formatMessage({ id: "vendor.index.header_contact", defaultMessage: "Contact" }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.contactName ?? "—"}</span>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        enableSorting: true,
        header: intl.formatMessage({ id: "vendor.index.header_category", defaultMessage: "Category" }),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.category ?? "—"}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        enableSorting: true,
        header: intl.formatMessage({ id: "vendor.index.header_status", defaultMessage: "Status" }),
        cell: ({ row }) => getStatusBadge(row.original.status),
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
                <DropdownMenuItem onClick={() => navigate(`/vendor/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem onClick={() => navigate(`/vendor/${row.original.id}/edit`)}>
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
      await trpcClient.vendor.delete.mutate({ id: itemToDelete.id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      queryClient.invalidateQueries({ queryKey: ["vendorList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error, intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "vendor-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="vendor"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "vendor.index.title", defaultMessage: "Vendors" })}
        description={intl.formatMessage({ id: "vendor.index.subtitle", defaultMessage: "Manage vendors and suppliers for events." })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/vendor/create")}>
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
          id: "vendor.index.load_failed",
          defaultMessage: "We could not load vendors. Check your connection and try again.",
        })}
        onRowClick={(row) => navigate(`/vendor/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "vendor.index.search_placeholder",
              defaultMessage: "Search vendors…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "vendor.index.count_label",
                defaultMessage: "{count, plural, one {# vendor} other {# vendors}}",
              },
              { count: totalRows },
            )}
            actions={
              isError ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                  <RefreshCw className="size-3.5" aria-hidden />
                  {intl.formatMessage({ id: "common.action.retry", defaultMessage: "Retry" })}
                </Button>
              ) : undefined
            }
          />
        }
        empty={
          <EmptyState
            module="vendor"
            title={
              search
                ? intl.formatMessage({
                    id: "vendor.index.empty_search",
                    defaultMessage: "No vendors found",
                  })
                : intl.formatMessage({
                    id: "vendor.index.empty_title",
                    defaultMessage: "No vendors yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "vendor.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "vendor.index.empty_description",
                    defaultMessage: "Create your first vendor to get started.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/vendor/create")}>
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
        title={intl.formatMessage({ id: "vendor.confirm.delete_title", defaultMessage: "Delete vendor?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </section>
  );
};