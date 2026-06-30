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
import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { ModulePage, ModuleHero, ModuleSearch, ModuleTable, ModuleEmpty } from "../../components/ModulePage";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { users: number; permissions: number };
};

const RoleIcon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const paths: Record<string, string> = {
    plus: "M12 5v14 M5 12h14",
    search: "M11 11m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0 M21 21l-4.35-4.35",
    close: "M18 6L6 18 M6 6l12 12",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] ?? paths.search} />
    </svg>
  );
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

  const { data, isLoading } = useQuery({
    queryKey: ["rolesList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.role.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as unknown as RoleRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<RoleRow>[]>(() => [
    {
      id: "name", header: intl.formatMessage({ id: "roles.index.header_name", defaultMessage: "Role" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{row.original.name}</span>
          </span>
        </span>
      ),
    },
    {
      id: "description", header: intl.formatMessage({ id: "roles.index.header_description", defaultMessage: "Description" }),
      cell: ({ row }) => (
        <span className="m-cell">
          <span className="m-cell__primary">{row.original.description ?? "—"}</span>
        </span>
      ),
    },
    {
      id: "users", header: intl.formatMessage({ id: "roles.index.header_users", defaultMessage: "Users" }),
      cell: ({ row }) => <span className="m-badge">{row.original._count.users > 0 ? row.original._count.users : "—"}</span>,
    },
    {
      id: "permissions", header: intl.formatMessage({ id: "roles.index.header_permissions", defaultMessage: "Permissions" }),
      cell: ({ row }) => <span className="m-badge">{row.original._count.permissions > 0 ? row.original._count.permissions : "—"}</span>,
    },
  ], [intl]);

  const table = useReactTable({
    data: rows, columns, pageCount: totalPages,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <ModulePage accent="#22D3EE" accentEnd="#0E7490" aiContext={{ section: "access-control-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "roles.index.title", defaultMessage: "Access Control" })}
        subtitle={intl.formatMessage({ id: "roles.index.description", defaultMessage: "Define what each role can do across the system." })}
        cta={canCreate ? { label: intl.formatMessage({ id: "roles.index.create_button", defaultMessage: "Create role" }), icon: <RoleIcon name="plus" size={18} />, onClick: () => navigate("/access-control/create") } : undefined}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "roles.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "roles.index.search_placeholder", defaultMessage: "Search roles…" })}
          searchIcon={<RoleIcon name="search" size={16} />}
          clearIcon={<RoleIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "roles.index.count_label", defaultMessage: "{count, plural, one {# role} other {# roles}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        onRowClick={(row) => navigate(`/access-control/${row.id}`)}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
            title={search ? intl.formatMessage({ id: "roles.index.no_results", defaultMessage: "No roles found" }) : intl.formatMessage({ id: "roles.index.empty_title", defaultMessage: "No roles yet" })}
            description={search ? intl.formatMessage({ id: "roles.index.empty_search_sub", defaultMessage: "Try adjusting your search terms." }) : intl.formatMessage({ id: "roles.index.empty_state", defaultMessage: "Create your first role to get started." })}
            cta={canCreate && !search ? { label: intl.formatMessage({ id: "roles.index.create_button", defaultMessage: "Create role" }), icon: <RoleIcon name="plus" size={16} />, onClick: () => navigate("/access-control/create") } : undefined}
          />
        }
      />
    </ModulePage>
  );
};
