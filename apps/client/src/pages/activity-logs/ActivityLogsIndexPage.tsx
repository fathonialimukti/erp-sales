import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { trpcClient } from "../../lib/trpc";
import { ModulePage, ModuleHero, ModuleSearch, ModuleTable, ModuleEmpty } from "../../components/ModulePage";
import { ActivityLogIcon } from "./ActivityLogIcons";

type ActivityLogRow = {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
  detail: string | null;
};

export const ActivityLogsIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();

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

  const { data, isLoading } = useQuery<{
    data: ActivityLogRow[];
    pagination: { totalPages: number; total: number };
  }>({
    queryKey: ["activityLogList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: async () => {
      const result = await trpcClient.activityLog.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      });
      return result as any;
    },
  });

  const rows = (data?.data ?? []) as ActivityLogRow[];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const totalRows = data?.pagination?.total ?? 0;

  const columns = useMemo<ColumnDef<ActivityLogRow>[]>(() => [
    {
      id: "createdAt", header: intl.formatMessage({ id: "activity_log.index.header_timestamp", defaultMessage: "Timestamp" }),
      cell: ({ row }) => (
        <span className="m-doc">
          <span className="m-doc__text">
            <span className="m-doc__code">{new Date(row.original.createdAt).toLocaleString("id-ID")}</span>
          </span>
        </span>
      ),
    },
    {
      id: "action", header: intl.formatMessage({ id: "activity_log.index.header_action", defaultMessage: "Action" }),
      cell: ({ row }) => <span className="m-badge">{row.original.action}</span>,
    },
    {
      id: "user", header: intl.formatMessage({ id: "activity_log.index.header_user", defaultMessage: "User" }),
      cell: ({ row }) => (
        <span className="m-cell">
          <span className="m-cell__primary">{row.original.user.name ?? "Unknown"}</span>
          <span className="m-cell__secondary">{row.original.user.email}</span>
        </span>
      ),
    },
    {
      id: "resource", header: intl.formatMessage({ id: "activity_log.index.header_resource", defaultMessage: "Resource" }),
      cell: ({ row }) => (
        <span className="m-cell">
          <span className="m-cell__primary">{row.original.resource}</span>
        </span>
      ),
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
    <ModulePage accent="#A78BFA" accentEnd="#6D28D9" aiContext={{ section: "activity-logs-index", itemCount: totalRows, page: pagination.pageIndex + 1, search }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "activity_log.index.title", defaultMessage: "Activity Logs" })}
        subtitle={intl.formatMessage({ id: "activity_log.index.subtitle", defaultMessage: "View system activity and audit trail." })}
        stats={[{ value: totalRows, label: intl.formatMessage({ id: "activity_log.hero.total", defaultMessage: "Total" }) }]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput} onChange={setSearchInput}
          placeholder={intl.formatMessage({ id: "activity_log.index.search_placeholder", defaultMessage: "Search activity logs…" })}
          searchIcon={<ActivityLogIcon name="search" size={16} />}
          clearIcon={<ActivityLogIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage({ id: "activity_log.index.count_label", defaultMessage: "{count, plural, one {# log} other {# logs}}" }, { count: totalRows })}
        </span>
      </div>

      <ModuleTable
        table={table} totalRows={totalRows} totalPages={totalPages} isLoading={isLoading}
        pageIndex={pagination.pageIndex} pageSize={pagination.pageSize}
        onRowClick={(row) => navigate(`/activity-logs/${row.id}`)}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        paginationLabel={intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) })}
        emptyState={
          <ModuleEmpty
            title={intl.formatMessage({ id: "activity_log.index.empty_title", defaultMessage: "No activity logs found" })}
            description={intl.formatMessage({ id: "activity_log.index.empty_desc", defaultMessage: "Try adjusting your search." })}
          />
        }
      />
    </ModulePage>
  );
};
