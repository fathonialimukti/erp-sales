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
import { EventProposalIcon } from "./EventProposalIcons";

type EventProposalRow = { id: string; code: string | null; name: string; _count: { budget: number } };

export const EventProposalIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("eventProposal@create");
  const canUpdate = hasPermission("eventProposal@update");
  const canDelete = hasPermission("eventProposal@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EventProposalRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["eventProposalList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.eventProposal.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as EventProposalRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<EventProposalRow>[]>(() => [
    {
      id: "code", header: intl.formatMessage({ id: "event_proposal.index.header_code", defaultMessage: "Document" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.code ?? "—"}</span>
          </span>
        </span>
      ),
    },
    {
      id: "name", header: intl.formatMessage({ id: "event_proposal.index.header_name", defaultMessage: "Type" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.name}</span></span>,
    },
    {
      id: "budget", header: intl.formatMessage({ id: "event_proposal.index.header_budget", defaultMessage: "Budget" }),
      cell: ({ row }) => <span className="m-badge">{row.original._count.skus > 0 ? row.original._count.skus : "—"}</span>,
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <EventProposalIcon name="eye" size={16} />, onClick: () => navigate(`/eventProposal/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <EventProposalIcon name="edit" size={16} />, onClick: () => navigate(`/eventProposal/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <EventProposalIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
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
      await trpcClient.eventProposal.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      setDeleteModalOpen(false); setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "event_proposal.index.delete_success", defaultMessage: "Region deleted" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setIsDeleting(false); }
  };


  return (
    <ModulePage accent="#14B8A6" accentEnd="#0D948D" aiContext={{ section: "eventProposal-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.programs", defaultMessage: "Programs" })}
        title={intl.formatMessage({ id: "event_proposal.index.title", defaultMessage: "Event Proposal" })}
        subtitle={intl.formatMessage({ id: "event_proposal.index.subtitle", defaultMessage: "Manage geographical eventProposals and their areas." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "event_proposal.index.create_button", defaultMessage: "New eventProposal" }), icon: <EventProposalIcon name="plus" size={18} />, onClick: () => navigate("/eventProposal/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "event_proposal.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "event_proposal.index.search_placeholder", defaultMessage: "Search eventProposals…" })}
          searchIcon={<EventProposalIcon name="search" size={16} />}
          clearIcon={<EventProposalIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "event_proposal.index.count_label", defaultMessage: "{count, plural, one {# eventProposal} other {# eventProposals}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/eventProposal/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
                        title={search ? intl.formatMessage({ id: "event_proposal.index.empty_search", defaultMessage: "No eventProposals found" }) : intl.formatMessage({ id: "event_proposal.index.empty_title", defaultMessage: "No eventProposals yet" })}
            description={search ? intl.formatMessage({ id: "event_proposal.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "event_proposal.index.empty_desc", defaultMessage: "Create your first eventProposal to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "event_proposal.index.create_button", defaultMessage: "New eventProposal" }), icon: <EventProposalIcon name="plus" size={16} />, onClick: () => navigate("/eventProposal/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "event_proposal.index.delete_title", defaultMessage: "Delete eventProposal" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "event_proposal.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: itemToDelete?.name ?? "" })}</ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm" /> : intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};