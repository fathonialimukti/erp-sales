import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2, Eye } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../ui/useToast";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../ui/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SkuCategoryRow = { id: string; code: string | null; name: string; _count: { skus: number } };

export const SkuCategoryIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("skuCategory@create");
  const canUpdate = hasPermission("skuCategory@update");
  const canDelete = hasPermission("skuCategory@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SkuCategoryRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["skuCategoryList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.skuCategory.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as SkuCategoryRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<SkuCategoryRow>[]>(
    () => [
      {
        id: "code",
        header: intl.formatMessage({ id: "sku_category.index.header_code", defaultMessage: "Code" }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.code ?? "—"}</span>
        ),
      },
      {
        id: "name",
        header: intl.formatMessage({ id: "sku_category.index.header_name", defaultMessage: "Name" }),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        id: "skus",
        header: intl.formatMessage({ id: "sku_category.index.header_skus", defaultMessage: "SKUs" }),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original._count.skus > 0 ? row.original._count.skus : "—"}
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
                <DropdownMenuItem onClick={() => navigate(`/skuCategory/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem onClick={() => navigate(`/skuCategory/${row.original.id}/edit`)}>
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
      await trpcClient.skuCategory.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["skuCategoryList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({
          id: "sku_category.index.delete_success",
          defaultMessage: "SKU category deleted",
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "skuCategory-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="sku"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({
          id: "sku_category.index.title",
          defaultMessage: "SKU Category",
        })}
        description={intl.formatMessage({
          id: "sku_category.index.subtitle",
          defaultMessage: "Manage product categories.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/skuCategory/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "sku_category.index.create_button",
                defaultMessage: "New category",
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
        onRowClick={(row) => navigate(`/skuCategory/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "sku_category.index.search_placeholder",
              defaultMessage: "Search categories…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "sku_category.index.count_label",
                defaultMessage: "{count, plural, one {# category} other {# categories}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="sku"
            title={
              search
                ? intl.formatMessage({
                    id: "sku_category.index.empty_search",
                    defaultMessage: "No categories found",
                  })
                : intl.formatMessage({
                    id: "sku_category.index.empty_title",
                    defaultMessage: "No categories yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "sku_category.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "sku_category.index.empty_desc",
                    defaultMessage: "Create your first category to get started.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/skuCategory/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "sku_category.index.create_button",
                    defaultMessage: "New category",
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
          id: "sku_category.index.delete_title",
          defaultMessage: "Delete category",
        })}
        description={intl.formatMessage(
          {
            id: "sku_category.index.delete_confirm_body",
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
