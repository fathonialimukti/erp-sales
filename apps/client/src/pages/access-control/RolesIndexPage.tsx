import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Plus } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../ui/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { users: number; permissions: number };
};

export const RolesIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("role@create");
  const canUpdate = hasPermission("role@update");

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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
    queryKey: ["rolesList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.accessControl.role.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as unknown as RoleRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<RoleRow>[]>(
    () => [
      {
        id: "name",
        header: intl.formatMessage({ id: "roles.index.header_name", defaultMessage: "Role" }),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
      },
      {
        id: "description",
        header: intl.formatMessage({
          id: "roles.index.header_description",
          defaultMessage: "Description",
        }),
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-muted-foreground">
            {row.original.description ?? "—"}
          </span>
        ),
      },
      {
        id: "users",
        header: intl.formatMessage({ id: "roles.index.header_users", defaultMessage: "Users" }),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original._count.users > 0 ? row.original._count.users : "—"}
          </span>
        ),
      },
      {
        id: "permissions",
        header: intl.formatMessage({
          id: "roles.index.header_permissions",
          defaultMessage: "Permissions",
        }),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original._count.permissions > 0 ? row.original._count.permissions : "—"}
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
                <DropdownMenuItem onClick={() => navigate(`/access-control/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate && !row.original.isSystem ? (
                  <DropdownMenuItem
                    onClick={() => navigate(`/access-control/${row.original.id}/edit`)}
                  >
                    <Pencil className="size-4" />
                    {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [intl, navigate, canUpdate],
  );

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "access-control-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="user"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "roles.index.title", defaultMessage: "Access Control" })}
        description={intl.formatMessage({
          id: "roles.index.description",
          defaultMessage: "Define what each role can do across the system.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/access-control/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "roles.index.create_button",
                defaultMessage: "Create role",
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
        onRowClick={(row) => navigate(`/access-control/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "roles.index.search_placeholder",
              defaultMessage: "Search roles…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "roles.index.count_label",
                defaultMessage: "{count, plural, one {# role} other {# roles}}",
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
                    id: "roles.index.no_results",
                    defaultMessage: "No roles found",
                  })
                : intl.formatMessage({
                    id: "roles.index.empty_title",
                    defaultMessage: "No roles yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "roles.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "roles.index.empty_state",
                    defaultMessage: "Create your first role to get started.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/access-control/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "roles.index.create_button",
                    defaultMessage: "Create role",
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
    </section>
  );
};
