import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Button } from "../../ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { useToast } from "../../ui/useToast";
import { RowActions } from "../../components/RowActions";
import { ModulePage, ModuleHero, ModuleSearch, ModuleTable, ModuleEmpty } from "../../components/ModulePage";

type KnowledgeBaseRow = { id: string; title: string; source: string; content: string };

export const KnowledgeBaseIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("knowledge-base@create");
  const canUpdate = hasPermission("knowledge-base@update");
  const canDelete = hasPermission("knowledge-base@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBaseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["knowledgeBaseList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.knowledgeBase.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const rows = (data?.data ?? []) as KnowledgeBaseRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<KnowledgeBaseRow>[]>(() => [
    {
      id: "title",
      header: intl.formatMessage({ id: "knowledgeBase.index.header_title", defaultMessage: "Title" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.title}</span></span>,
    },
    {
      id: "source",
      header: intl.formatMessage({ id: "knowledgeBase.index.header_source", defaultMessage: "Source" }),
      cell: ({ row }) => <span className="m-badge">{row.original.source}</span>,
    },
    {
      id: "content",
      header: intl.formatMessage({ id: "knowledgeBase.index.header_content", defaultMessage: "Content" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.content.slice(0, 100)}{row.original.content.length > 100 ? "…" : ""}</span></span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), onClick: () => navigate(`/knowledge-base/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), onClick: () => navigate(`/knowledge-base/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), tone: "danger" as const, separator: true, onClick: () => { setItemToDelete(row.original); setDeleteModalOpen(true); } }] : []),
          ]}
        />
      ),
    },
  ], [intl, navigate, canUpdate, canDelete]);

  const table = useReactTable({ data: rows, columns, pageCount: totalPages, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.knowledgeBase.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(intl.formatMessage({ id: "knowledgeBase.index.delete_success", defaultMessage: "Knowledge entry deleted" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModulePage accent="#007AFF" accentEnd="#5856D6" aiContext={{ section: "knowledge-base-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "knowledgeBase.index.title", defaultMessage: "Knowledge base" })}
        subtitle={intl.formatMessage({ id: "knowledgeBase.index.subtitle", defaultMessage: "Manage knowledge snippets that feed the AI assistant." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "knowledgeBase.index.create_button", defaultMessage: "New entry" }), icon: <span>+</span>, onClick: () => navigate("/knowledge-base/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "knowledgeBase.hero.total", defaultMessage: "Entries" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput}
          onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "knowledgeBase.index.search_placeholder", defaultMessage: "Search entries…" })}
          searchIcon={<span>⌕</span>}
          clearIcon={<span>×</span>}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">{intl.formatMessage({ id: "knowledgeBase.index.count_label", defaultMessage: "{count, plural, one {# entry} other {# entries}}" }, { count: totalRows })}</span>
      </div>

      <ModuleTable
        table={table}
        totalRows={totalRows}
        totalPages={totalPages}
        isLoading={isLoading}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/knowledge-base/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
            title={search ? intl.formatMessage({ id: "knowledgeBase.index.empty_search", defaultMessage: "No entries found" }) : intl.formatMessage({ id: "knowledgeBase.index.empty_title", defaultMessage: "No knowledge entries yet" })}
            description={search ? intl.formatMessage({ id: "knowledgeBase.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "knowledgeBase.index.empty_desc", defaultMessage: "Create your first knowledge entry to improve the AI assistant." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "knowledgeBase.index.create_button", defaultMessage: "New entry" }), icon: <span>+</span>, onClick: () => navigate("/knowledge-base/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "knowledgeBase.index.delete_title", defaultMessage: "Delete knowledge entry" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "knowledgeBase.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: itemToDelete?.title ?? "" })}</ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>{intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</Button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};
