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
import { Button } from "../../ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { useToast } from "../../ui/useToast";
import { RowActions } from "../../components/RowActions";
import { ModulePage, ModuleHero, ModuleSearch, ModuleTable, ModuleEmpty } from "../../components/ModulePage";
import { RegionIcon } from "./RegionIcons";

type RegionRow = { id: string; code: string | null; name: string; _count: { areas: number } };

export const RegionIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("region@create");
  const canUpdate = hasPermission("region@update");
  const canDelete = hasPermission("region@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RegionRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["regionList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.region.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as RegionRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<RegionRow>[]>(() => [
    {
      id: "code", header: intl.formatMessage({ id: "region.index.header_code", defaultMessage: "Code" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.code ?? "—"}</span>
          </span>
        </span>
      ),
    },
    {
      id: "name", header: intl.formatMessage({ id: "region.index.header_name", defaultMessage: "Name" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.name}</span></span>,
    },
    {
      id: "areas", header: intl.formatMessage({ id: "region.index.header_areas", defaultMessage: "Areas" }),
      cell: ({ row }) => <span className="m-badge">{row.original._count.areas > 0 ? row.original._count.areas : "—"}</span>,
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <RegionIcon name="eye" size={16} />, onClick: () => navigate(`/region/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <RegionIcon name="edit" size={16} />, onClick: () => navigate(`/region/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <RegionIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
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
      await trpcClient.region.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["regionList"] });
      setDeleteModalOpen(false); setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "region.index.delete_success", defaultMessage: "Region deleted" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setIsDeleting(false); }
  };


  return (
    <ModulePage accent="#007AFF" accentEnd="#5856D6" aiContext={{ section: "region-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={intl.formatMessage({ id: "region.index.title", defaultMessage: "Regions" })}
        subtitle={intl.formatMessage({ id: "region.index.subtitle", defaultMessage: "Manage geographical regions and their areas." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "region.index.create_button", defaultMessage: "New region" }), icon: <RegionIcon name="plus" size={18} />, onClick: () => navigate("/region/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "region.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "region.index.search_placeholder", defaultMessage: "Search regions…" })}
          searchIcon={<RegionIcon name="search" size={16} />}
          clearIcon={<RegionIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "region.index.count_label", defaultMessage: "{count, plural, one {# region} other {# regions}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        density="crm"
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/region/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
                        title={search ? intl.formatMessage({ id: "region.index.empty_search", defaultMessage: "No regions found" }) : intl.formatMessage({ id: "region.index.empty_title", defaultMessage: "No regions yet" })}
            description={search ? intl.formatMessage({ id: "region.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "region.index.empty_desc", defaultMessage: "Create your first region to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "region.index.create_button", defaultMessage: "New region" }), icon: <RegionIcon name="plus" size={16} />, onClick: () => navigate("/region/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "region.index.delete_title", defaultMessage: "Delete region" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "region.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: itemToDelete?.name ?? "" })}</ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>{intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</Button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};