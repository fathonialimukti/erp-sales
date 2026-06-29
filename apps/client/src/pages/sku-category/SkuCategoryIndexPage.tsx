import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { RowActions } from "../../components/RowActions";
import { ModulePage, ModuleHero, ModuleSearch, ModuleTable, ModuleEmpty } from "../../components/ModulePage";
import { SkuCategoryIcon } from "./SkuCategoryIcons";

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
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["skuCategoryList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.skuCategory.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as SkuCategoryRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<SkuCategoryRow>[]>(() => [
    {
      id: "code", header: intl.formatMessage({ id: "sku_category.index.header_code", defaultMessage: "Code" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.code ?? "—"}</span>
          </span>
        </span>
      ),
    },
    {
      id: "name", header: intl.formatMessage({ id: "sku_category.index.header_name", defaultMessage: "Name" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.name}</span></span>,
    },
    {
      id: "skus", header: intl.formatMessage({ id: "sku_category.index.header_skus", defaultMessage: "SKUs" }),
      cell: ({ row }) => <span className="m-badge">{row.original._count.skus > 0 ? row.original._count.skus : "—"}</span>,
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <SkuCategoryIcon name="eye" size={16} />, onClick: () => navigate(`/skuCategory/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <SkuCategoryIcon name="edit" size={16} />, onClick: () => navigate(`/skuCategory/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <SkuCategoryIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
          ]}
        />
      ),
    },
  ], [intl, navigate, canUpdate, canDelete]);

  const table = useReactTable({
    data: rows, columns, pageCount: totalPages,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.skuCategory.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["skuCategoryList"] });
      setDeleteModalOpen(false); setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "sku_category.index.delete_success", defaultMessage: "Region deleted" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setIsDeleting(false); }
  };


  return (
    <ModulePage accent="#F59E0B" accentEnd="#D97706" aiContext={{ section: "skuCategory-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "sku_category.index.title", defaultMessage: "Sku Category" })}
        subtitle={intl.formatMessage({ id: "sku_category.index.subtitle", defaultMessage: "Manage geographical skuCategorys and their areas." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "sku_category.index.create_button", defaultMessage: "New skuCategory" }), icon: <SkuCategoryIcon name="plus" size={18} />, onClick: () => navigate("/skuCategory/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "sku_category.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "sku_category.index.search_placeholder", defaultMessage: "Search skuCategorys…" })}
          searchIcon={<SkuCategoryIcon name="search" size={16} />}
          clearIcon={<SkuCategoryIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "sku_category.index.count_label", defaultMessage: "{count, plural, one {# skuCategory} other {# skuCategorys}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/skuCategory/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
                        title={search ? intl.formatMessage({ id: "sku_category.index.empty_search", defaultMessage: "No skuCategorys found" }) : intl.formatMessage({ id: "sku_category.index.empty_title", defaultMessage: "No skuCategorys yet" })}
            description={search ? intl.formatMessage({ id: "sku_category.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "sku_category.index.empty_desc", defaultMessage: "Create your first skuCategory to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "sku_category.index.create_button", defaultMessage: "New skuCategory" }), icon: <SkuCategoryIcon name="plus" size={16} />, onClick: () => navigate("/skuCategory/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "sku_category.index.delete_title", defaultMessage: "Delete skuCategory" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "sku_category.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: itemToDelete?.name ?? "" })}</ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm" /> : intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};