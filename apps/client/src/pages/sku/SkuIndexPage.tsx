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
import { SkuIcon } from "./SkuIcons";

type SkuRow = { id: string; code: string | null; name: string; basePrice: number | null; _count: { salesOrderItems: number } };

export const SkuIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("sku@create");
  const canUpdate = hasPermission("sku@update");
  const canDelete = hasPermission("sku@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SkuRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["skuList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.sku.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as SkuRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<SkuRow>[]>(() => [
    {
      id: "code", header: intl.formatMessage({ id: "sku.index.header_code", defaultMessage: "Code" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.code ?? "—"}</span>
          </span>
        </span>
      ),
    },
    {
      id: "name", header: intl.formatMessage({ id: "sku.index.header_name", defaultMessage: "Name" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.name}</span></span>,
    },
    {
      id: "price", header: intl.formatMessage({ id: "sku.index.header_price", defaultMessage: "Price" }),
      cell: ({ row }) => (
        <span className="m-cell m-cell--single">
          <span className="m-cell__primary">
            {row.original.basePrice != null
              ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.original.basePrice)
              : "—"}
          </span>
        </span>
      ),
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <SkuIcon name="eye" size={16} />, onClick: () => navigate(`/sku/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <SkuIcon name="edit" size={16} />, onClick: () => navigate(`/sku/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <SkuIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
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
      await trpcClient.sku.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["skuList"] });
      setDeleteModalOpen(false); setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "sku.index.delete_success", defaultMessage: "Region deleted" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setIsDeleting(false); }
  };


  return (
    <ModulePage accent="#3B82F6" accentEnd="#2563EB" aiContext={{ section: "sku-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "sku.index.title", defaultMessage: "Sku" })}
        subtitle={intl.formatMessage({ id: "sku.index.subtitle", defaultMessage: "Manage geographical skus and their areas." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "sku.index.create_button", defaultMessage: "New sku" }), icon: <SkuIcon name="plus" size={18} />, onClick: () => navigate("/sku/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "sku.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "sku.index.search_placeholder", defaultMessage: "Search skus…" })}
          searchIcon={<SkuIcon name="search" size={16} />}
          clearIcon={<SkuIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "sku.index.count_label", defaultMessage: "{count, plural, one {# sku} other {# skus}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        density="crm"
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/sku/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
                        title={search ? intl.formatMessage({ id: "sku.index.empty_search", defaultMessage: "No skus found" }) : intl.formatMessage({ id: "sku.index.empty_title", defaultMessage: "No skus yet" })}
            description={search ? intl.formatMessage({ id: "sku.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "sku.index.empty_desc", defaultMessage: "Create your first sku to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "sku.index.create_button", defaultMessage: "New sku" }), icon: <SkuIcon name="plus" size={16} />, onClick: () => navigate("/sku/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "sku.index.delete_title", defaultMessage: "Delete sku" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "sku.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: itemToDelete?.name ?? "" })}</ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm" /> : intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};