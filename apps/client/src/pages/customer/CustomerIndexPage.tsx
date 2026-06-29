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
import { CustomerIcon } from "./CustomerIcons";

type CustomerRow = { id: string; code: string | null; name: string; _count: { outlets: number } };

export const CustomerIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("customer@create");
  const canUpdate = hasPermission("customer@update");
  const canDelete = hasPermission("customer@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CustomerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["customerList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.customer.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as CustomerRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<CustomerRow>[]>(() => [
    {
      id: "code", header: intl.formatMessage({ id: "customer.index.header_code", defaultMessage: "Code" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.code ?? "—"}</span>
          </span>
        </span>
      ),
    },
    {
      id: "name", header: intl.formatMessage({ id: "customer.index.header_name", defaultMessage: "Name" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.name}</span></span>,
    },
    {
      id: "outlets", header: intl.formatMessage({ id: "customer.index.header_outlets", defaultMessage: "Outlets" }),
      cell: ({ row }) => <span className="m-badge">{row.original._count.outlets > 0 ? row.original._count.outlets : "—"}</span>,
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <CustomerIcon name="eye" size={16} />, onClick: () => navigate(`/customer/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <CustomerIcon name="edit" size={16} />, onClick: () => navigate(`/customer/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <CustomerIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
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
      await trpcClient.customer.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["customerList"] });
      setDeleteModalOpen(false); setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "customer.index.delete_success", defaultMessage: "Region deleted" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setIsDeleting(false); }
  };


  return (
    <ModulePage accent="#AF52DE" accentEnd="#5856D6" aiContext={{ section: "customer-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "customer.index.title", defaultMessage: "Customer" })}
        subtitle={intl.formatMessage({ id: "customer.index.subtitle", defaultMessage: "Manage geographical customers and their areas." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "customer.index.create_button", defaultMessage: "New customer" }), icon: <CustomerIcon name="plus" size={18} />, onClick: () => navigate("/customer/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "customer.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "customer.index.search_placeholder", defaultMessage: "Search customers…" })}
          searchIcon={<CustomerIcon name="search" size={16} />}
          clearIcon={<CustomerIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "customer.index.count_label", defaultMessage: "{count, plural, one {# customer} other {# customers}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/customer/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
                        title={search ? intl.formatMessage({ id: "customer.index.empty_search", defaultMessage: "No customers found" }) : intl.formatMessage({ id: "customer.index.empty_title", defaultMessage: "No customers yet" })}
            description={search ? intl.formatMessage({ id: "customer.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "customer.index.empty_desc", defaultMessage: "Create your first customer to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "customer.index.create_button", defaultMessage: "New customer" }), icon: <CustomerIcon name="plus" size={16} />, onClick: () => navigate("/customer/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "customer.index.delete_title", defaultMessage: "Delete customer" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "customer.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: itemToDelete?.name ?? "" })}</ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm" /> : intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};