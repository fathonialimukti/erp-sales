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
import { VisitLogIcon } from "./VisitLogIcons";

type VisitLogRow = {
  id: string;
  date: string;
  salesman: { id: string; name: string };
  outlet: { id: string; name: string } | null;
  approvalStatus: string;
};

export const VisitLogIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("visitLog@create");
  const canUpdate = hasPermission("visitLog@update");
  const canDelete = hasPermission("visitLog@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VisitLogRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["visitLogList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.visitLog.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as VisitLogRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<VisitLogRow>[]>(() => [
    {
      id: "date", header: intl.formatMessage({ id: "visit_log.index.header_code", defaultMessage: "Date" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{new Date(row.original.date).toLocaleDateString()}</span>
          </span>
        </span>
      ),
    },
    {
      id: "salesman", header: intl.formatMessage({ id: "visit_log.index.header_name", defaultMessage: "Salesman" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.salesman.name}</span></span>,
    },
    {
      id: "outlet", header: intl.formatMessage({ id: "visit_log.index.header_outlet", defaultMessage: "Outlet" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.outlet?.name ?? "—"}</span></span>,
    },
    {
      id: "status", header: intl.formatMessage({ id: "visit_log.index.header_status", defaultMessage: "Status" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.approvalStatus}</span></span>,
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <VisitLogIcon name="eye" size={16} />, onClick: () => navigate(`/visitLog/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <VisitLogIcon name="edit" size={16} />, onClick: () => navigate(`/visitLog/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <VisitLogIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
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
      await trpcClient.visitLog.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      setDeleteModalOpen(false); setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "visit_log.index.delete_success", defaultMessage: "Region deleted" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setIsDeleting(false); }
  };


  return (
    <ModulePage accent="#8B5CF6" accentEnd="#6D28D9" aiContext={{ section: "visitLog-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.field_ops", defaultMessage: "Field Operations" })}
        title={intl.formatMessage({ id: "visit_log.index.title", defaultMessage: "Visit Log" })}
        subtitle={intl.formatMessage({ id: "visit_log.index.subtitle", defaultMessage: "Manage geographical visitLogs and their areas." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "visit_log.index.create_button", defaultMessage: "New visitLog" }), icon: <VisitLogIcon name="plus" size={18} />, onClick: () => navigate("/visitLog/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "visit_log.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "visit_log.index.search_placeholder", defaultMessage: "Search visitLogs…" })}
          searchIcon={<VisitLogIcon name="search" size={16} />}
          clearIcon={<VisitLogIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "visit_log.index.count_label", defaultMessage: "{count, plural, one {# visitLog} other {# visitLogs}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/visitLog/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
                        title={search ? intl.formatMessage({ id: "visit_log.index.empty_search", defaultMessage: "No visitLogs found" }) : intl.formatMessage({ id: "visit_log.index.empty_title", defaultMessage: "No visitLogs yet" })}
            description={search ? intl.formatMessage({ id: "visit_log.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "visit_log.index.empty_desc", defaultMessage: "Create your first visitLog to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "visit_log.index.create_button", defaultMessage: "New visitLog" }), icon: <VisitLogIcon name="plus" size={16} />, onClick: () => navigate("/visitLog/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "visit_log.index.delete_title", defaultMessage: "Delete visitLog" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "visit_log.index.delete_confirm_body", defaultMessage: 'Delete visit log for "{name}"? This action cannot be undone.' }, { name: itemToDelete?.outlet?.name ?? itemToDelete?.date ?? "" })}</ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm" /> : intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};