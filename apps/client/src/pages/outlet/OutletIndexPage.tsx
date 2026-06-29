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
import { OutletIcon } from "./OutletIcons";

type OutletRow = { id: string; code: string | null; name: string; customerName: string; areaName: string; _count: { visitLogs: number; salesOrders: number } };

export const OutletIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("outlet@create");
  const canUpdate = hasPermission("outlet@update");
  const canDelete = hasPermission("outlet@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OutletRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["outletList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.outlet.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as OutletRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<OutletRow>[]>(() => [
    {
      id: "code", header: intl.formatMessage({ id: "outlet.index.header_code", defaultMessage: "Code" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.code ?? "—"}</span>
          </span>
        </span>
      ),
    },
    {
      id: "name", header: intl.formatMessage({ id: "outlet.index.header_name", defaultMessage: "Name" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.name}</span></span>,
    },
    {
      id: "customer", header: intl.formatMessage({ id: "outlet.index.header_customer", defaultMessage: "Customer" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.customerName}</span></span>,
    },
    {
      id: "area", header: intl.formatMessage({ id: "outlet.index.header_area", defaultMessage: "Area" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.areaName}</span></span>,
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <OutletIcon name="eye" size={16} />, onClick: () => navigate(`/outlet/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <OutletIcon name="edit" size={16} />, onClick: () => navigate(`/outlet/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <OutletIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
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
      await trpcClient.outlet.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["outletList"] });
      setDeleteModalOpen(false); setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "outlet.index.delete_success", defaultMessage: "Region deleted" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setIsDeleting(false); }
  };


  return (
    <ModulePage accent="#34D399" accentEnd="#059669" aiContext={{ section: "outlet-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "outlet.index.title", defaultMessage: "Outlet" })}
        subtitle={intl.formatMessage({ id: "outlet.index.subtitle", defaultMessage: "Manage geographical outlets and their areas." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "outlet.index.create_button", defaultMessage: "New outlet" }), icon: <OutletIcon name="plus" size={18} />, onClick: () => navigate("/outlet/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "outlet.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "outlet.index.search_placeholder", defaultMessage: "Search outlets…" })}
          searchIcon={<OutletIcon name="search" size={16} />}
          clearIcon={<OutletIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "outlet.index.count_label", defaultMessage: "{count, plural, one {# outlet} other {# outlets}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/outlet/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
                        title={search ? intl.formatMessage({ id: "outlet.index.empty_search", defaultMessage: "No outlets found" }) : intl.formatMessage({ id: "outlet.index.empty_title", defaultMessage: "No outlets yet" })}
            description={search ? intl.formatMessage({ id: "outlet.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "outlet.index.empty_desc", defaultMessage: "Create your first outlet to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "outlet.index.create_button", defaultMessage: "New outlet" }), icon: <OutletIcon name="plus" size={16} />, onClick: () => navigate("/outlet/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "outlet.index.delete_title", defaultMessage: "Delete outlet" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "outlet.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: itemToDelete?.name ?? "" })}</ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm" /> : intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};