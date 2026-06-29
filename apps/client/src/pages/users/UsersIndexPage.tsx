import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Button } from "../../ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { useToast } from "../../ui/useToast";
import { RowActions } from "../../components/RowActions";
import { ModulePage, ModuleHero, ModuleSearch, ModuleTable, ModuleEmpty } from "../../components/ModulePage";
import { EntityPhoto } from "../../components/EntityPhoto";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  photo?: string | null;
  role: { id: string; name: string } | null;
  createdAt: string;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const UserIcon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const paths: Record<string, string> = {
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
    edit: "M12 20h9 M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z",
    delete: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    plus: "M12 5v14 M5 12h14",
    search: "M11 11m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0 M21 21l-4.35-4.35",
    close: "M18 6L6 18 M6 6l12 12",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] ?? paths.eye} />
    </svg>
  );
};

export const UsersIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("user@create");
  const canUpdate = hasPermission("user@update");
  const canDelete = hasPermission("user@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useAiFillForm({
    search: (v: unknown) => {
      const s = String(v ?? "");
      setSearchInput(s);
      setSearch(s);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["userList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.user.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as UserRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<UserRow>[]>(() => [
    {
      id: "user", header: intl.formatMessage({ id: "users.index.header_user", defaultMessage: "User" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <EntityPhoto src={row.original.photo} alt={row.original.name ?? row.original.email} />
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.name ?? "—"}</span>
            <span className="m-doc__name">{row.original.email}</span>
          </span>
        </span>
      ),
    },
    {
      id: "role", header: intl.formatMessage({ id: "users.index.header_role", defaultMessage: "Role" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{row.original.role?.name ?? "—"}</span></span>,
    },
    {
      id: "createdAt", header: intl.formatMessage({ id: "users.index.header_created", defaultMessage: "Created" }),
      cell: ({ row }) => <span className="m-cell m-cell--single"><span className="m-cell__primary">{formatDate(row.original.createdAt)}</span></span>,
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <RowActions
          ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
          items={[
            { key: "view", label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }), icon: <UserIcon name="eye" size={16} />, onClick: () => navigate(`/users/${row.original.id}`) },
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <UserIcon name="edit" size={16} />, onClick: () => navigate(`/users/${row.original.id}/edit`) }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <UserIcon name="delete" size={16} />, tone: "danger" as const, separator: true, onClick: () => { setUserToDelete(row.original); setDeleteModalOpen(true); } }] : []),
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
    if (!userToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.user.delete.mutate({ id: userToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["userList"] });
      setDeleteModalOpen(false);
      setUserToDelete(null);
      toast.success(intl.formatMessage({ id: "users.index.delete_success", defaultMessage: "User deleted" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModulePage accent="#818CF8" accentEnd="#4338CA" aiContext={{ section: "users-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "users.index.title", defaultMessage: "Users" })}
        subtitle={intl.formatMessage({ id: "users.index.description", defaultMessage: "Manage system users and their assigned roles." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "users.index.create_button", defaultMessage: "Create user" }), icon: <UserIcon name="plus" size={18} />, onClick: () => navigate("/users/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "users.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "users.index.search_placeholder", defaultMessage: "Search by name, email, or role" })}
          searchIcon={<UserIcon name="search" size={16} />}
          clearIcon={<UserIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "users.index.count_label", defaultMessage: "{count, plural, one {# user} other {# users}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/users/${row.id}`)}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
            title={search ? intl.formatMessage({ id: "users.index.no_results", defaultMessage: "No users found" }) : intl.formatMessage({ id: "users.index.empty_title", defaultMessage: "No users yet" })}
            description={search ? intl.formatMessage({ id: "users.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "users.index.empty_state", defaultMessage: "Create your first user to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "users.index.create_button", defaultMessage: "Create user" }), icon: <UserIcon name="plus" size={16} />, onClick: () => navigate("/users/create") } : undefined}
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>{intl.formatMessage({ id: "users.index.delete_title", defaultMessage: "Delete user" })}</ModalHeader>
        <ModalBody>{intl.formatMessage({ id: "users.index.delete_confirm", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: userToDelete?.name ?? userToDelete?.email ?? "" })}</ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>{intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</Button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};
