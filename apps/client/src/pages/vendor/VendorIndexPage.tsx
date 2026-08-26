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

  const { data, isLoading, isError } = useQuery({
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
        header: intl.formatMessage({ id: "vendor.index.header_code", defaultMessage: "Code" }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.code ?? "—"}</span>
        ),
      },
      {
        id: "name",
        header: intl.formatMessage({ id: "vendor.index.header_name", defaultMessage: "Name" }),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        id: "contactName",
        header: intl.formatMessage({ id: "vendor.index.header_contact", defaultMessage: "Contact" }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.contactName ?? "—"}</span>
        ),
      },
      {
        id: "category",
        header: intl.formatMessage({ id: "vendor.index.header_category", defaultMessage: "Category" }),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.category ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: intl.formatMessage({ id: "vendor.index.header_status", defaultMessage: "Status" }),
        cell: ({ row }) => getStatusBadge(row.original.status),
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
    <div className="flex flex-col h-full gap-3">
      <PageHeader
        module="vendor"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "vendor.index.title", defaultMessage: "Vendors" })}
        description={intl.formatMessage({ id: "vendor.index.subtitle", defaultMessage: "Manage vendors and suppliers for events." })}
        actions={
          canCreate ? (
            <Button onClick={() => navigate("/vendor/create")}>
              <Plus className="size-4" />
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
          title={intl.formatMessage({ id: "vendor.index.empty_title", defaultMessage: "No vendors found" })}
          description={intl.formatMessage({ id: "vendor.index.empty_description", defaultMessage: "Create your first vendor to get started." })}
          action={
            canCreate ? (
              <Button onClick={() => navigate("/vendor/create")}>
                <Plus className="size-4 mr-2" />
                {intl.formatMessage({ id: "common.action.create", defaultMessage: "Create Vendor" })}
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
            onRowClick={(row) => navigate(`/vendor/${row.id}`)}
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
        title={intl.formatMessage({ id: "common.confirm.delete_title", defaultMessage: "Delete vendor?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};