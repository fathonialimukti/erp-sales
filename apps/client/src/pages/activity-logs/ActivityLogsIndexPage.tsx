import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, MoreHorizontal } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { useMeta } from "../../lib/useMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActivityLogRow = {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
  detail: string | null;
  message?: string | null;
};

export const ActivityLogsIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  useMeta({
    title: intl.formatMessage({ id: "activity_log.index.title", defaultMessage: "Activity Logs" }),
    description: intl.formatMessage({ id: "activity_log.index.subtitle", defaultMessage: "Audit trail of all system actions." }),
  });

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["activityLogList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.activityLog.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  // API returns { data, pagination: { total, totalPages, ... } }
  const payload = data as
    | { data?: ActivityLogRow[]; pagination?: { totalPages?: number; total?: number } }
    | undefined;
  const rows = (payload?.data ?? []) as ActivityLogRow[];
  const totalPages = payload?.pagination?.totalPages ?? 1;
  const totalRows = payload?.pagination?.total ?? 0;

  const columns = useMemo<ColumnDef<ActivityLogRow>[]>(
    () => [
      {
        id: "createdAt",
        header: intl.formatMessage({
          id: "activity_log.index.header_timestamp",
          defaultMessage: "Timestamp",
        }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {new Date(row.original.createdAt).toLocaleString("id-ID")}
          </span>
        ),
      },
      {
        id: "action",
        header: intl.formatMessage({
          id: "activity_log.index.header_action",
          defaultMessage: "Action",
        }),
        cell: ({ row }) => <Badge variant="secondary">{row.original.action}</Badge>,
      },
      {
        id: "user",
        header: intl.formatMessage({
          id: "activity_log.index.header_user",
          defaultMessage: "User",
        }),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.user.name ?? "Unknown"}
            </p>
            <p className="truncate text-xs text-foreground">{row.original.user.email}</p>
          </div>
        ),
      },
      {
        id: "resource",
        header: intl.formatMessage({
          id: "activity_log.index.header_resource",
          defaultMessage: "Resource",
        }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.resource}</span>
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
                <DropdownMenuItem onClick={() => navigate(`/activity-logs/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [intl, navigate],
  );

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "activity-logs-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="user"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({
          id: "activity_log.index.title",
          defaultMessage: "Activity Logs",
        })}
        description={intl.formatMessage({
          id: "activity_log.index.subtitle",
          defaultMessage: "View system activity and audit trail.",
        })}
      />

      <DataTable
        density="crm"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        onRowClick={(row) => navigate(`/activity-logs/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "activity_log.index.search_placeholder",
              defaultMessage: "Search activity logs…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "activity_log.index.count_label",
                defaultMessage: "{count, plural, one {# log} other {# logs}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="user"
            title={intl.formatMessage({
              id: "activity_log.index.empty_title",
              defaultMessage: "No activity logs found",
            })}
            description={intl.formatMessage({
              id: "activity_log.index.empty_desc",
              defaultMessage: "Try adjusting your search.",
            })}
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
