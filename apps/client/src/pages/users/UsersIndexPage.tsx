import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EntityPhoto } from "../../components/EntityPhoto";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

  const { data, isLoading, isError } = useQuery({
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

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: "user",
        header: intl.formatMessage({ id: "users.index.header_user", defaultMessage: "User" }),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <EntityPhoto src={row.original.photo} alt={row.original.name ?? row.original.email} className="mr-1" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.original.name ?? "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: "role",
        header: intl.formatMessage({ id: "users.index.header_role", defaultMessage: "Role" }),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.role?.name ?? "—"}</span>
        ),
      },
      {
        id: "createdAt",
        header: intl.formatMessage({ id: "users.index.header_created", defaultMessage: "Created" }),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-foreground">
            {formatDate(row.original.createdAt)}
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
                <DropdownMenuItem onClick={() => navigate(`/users/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem onClick={() => navigate(`/users/${row.original.id}/edit`)}>
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
                        setUserToDelete(row.original);
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
    if (!userToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.user.delete.mutate({ id: userToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["userList"] });
      setDeleteModalOpen(false);
      setUserToDelete(null);
      toast.success(
        intl.formatMessage({ id: "users.index.delete_success", defaultMessage: "User deleted" }),
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
        section: "users-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="user"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "users.index.title", defaultMessage: "Users" })}
        description={intl.formatMessage({
          id: "users.index.description",
          defaultMessage: "Manage system users and their assigned roles.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/users/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "users.index.create_button",
                defaultMessage: "Create user",
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
        onRowClick={(row) => navigate(`/users/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "users.index.search_placeholder",
              defaultMessage: "Search by name, email, or role",
            })}
            countLabel={intl.formatMessage(
              {
                id: "users.index.count_label",
                defaultMessage: "{count, plural, one {# user} other {# users}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="user"
            title={
              search
                ? intl.formatMessage({
                    id: "users.index.no_results",
                    defaultMessage: "No users found",
                  })
                : intl.formatMessage({
                    id: "users.index.empty_title",
                    defaultMessage: "No users yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "users.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "users.index.empty_state",
                    defaultMessage: "Create your first user to get started.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/users/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "users.index.create_button",
                    defaultMessage: "Create user",
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
          id: "users.index.delete_title",
          defaultMessage: "Delete user",
        })}
        description={intl.formatMessage(
          {
            id: "users.index.delete_confirm",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: userToDelete?.name ?? userToDelete?.email ?? "" },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
