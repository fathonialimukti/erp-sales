import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, MoreHorizontal } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { DatePicker } from "../../components/DatePicker";
import { useMeta } from "../../lib/useMeta";
import { hasPermissionAtom } from "../../lib/atoms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "../../components/Pagination";

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

type AdminUserRow = { id: string; name: string | null; email: string };

const ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
] as const;

type ActivityAction = (typeof ACTION_OPTIONS)[number];

const formatActionLabel = (action: string): string =>
  action.charAt(0) + action.slice(1).toLowerCase();

export const ActivityLogsIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const isAdmin = hasPermission("activity_log@read");

  const titleMessage = isAdmin
    ? { id: "activity_log.admin.title", defaultMessage: "Activity Logs" }
    : { id: "activity_log.mine.title", defaultMessage: "My Activity" };
  const subtitleMessage = isAdmin
    ? {
        id: "activity_log.admin.subtitle",
        defaultMessage: "Audit trail of all system actions across all users.",
      }
    : {
        id: "activity_log.mine.subtitle",
        defaultMessage: "Your personal audit trail of actions you performed.",
      };

  useMeta({
    title: intl.formatMessage(titleMessage),
    description: intl.formatMessage(subtitleMessage),
  });

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "">("");
  const [resourceInput, setResourceInput] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [dateRange, setDateRange] = useState<[string, string]>(["", ""]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setResourceFilter(resourceInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [resourceInput]);

  const resetToFirstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const [startDate, endDate] = dateRange;

  // Split queries (not a ternary inside one queryFn): tRPC infers each
  // procedure's output separately — a union of two .query() calls trips
  // "Type instantiation is excessively deep".
  const { data: adminData, isLoading: adminLoading, isError: adminError } = useQuery({
    queryKey: [
      "activityLogAdminList",
      pagination.pageIndex,
      pagination.pageSize,
      search,
      userFilter,
      actionFilter,
      resourceFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      trpcClient.activityLog.adminList.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
        userId: userFilter || undefined,
        action: actionFilter || undefined,
        resource: resourceFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: isAdmin,
  });

  const { data: myData, isLoading: myLoading, isError: myError } = useQuery({
    queryKey: [
      "activityLogList",
      pagination.pageIndex,
      pagination.pageSize,
      search,
      actionFilter,
      resourceFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      trpcClient.activityLog.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
        action: actionFilter || undefined,
        resource: resourceFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: !isAdmin,
  });

  // Explicit payload type — a union of the two tRPC query outputs trips
  // "Type instantiation is excessively deep" (each output is a large inferred
  // Prisma shape). Both procedures return { data, pagination }.
  type ActivityLogListPayload = {
    data?: ActivityLogRow[];
    pagination?: { totalPages?: number; total?: number };
  };
  const payload = isAdmin
    ? (adminData as ActivityLogListPayload | undefined)
    : (myData as ActivityLogListPayload | undefined);
  const isLoading = isAdmin ? adminLoading : myLoading;
  const isError = isAdmin ? adminError : myError;

  // Admin-only directory for the user filter; disabled until permission confirmed.
  const { data: usersData } = useQuery({
    queryKey: ["activityLogUserOptions"],
    queryFn: () => trpcClient.user.list.query({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });
  const userOptions =
    ((usersData as { data?: AdminUserRow[] } | undefined)?.data ?? []) as AdminUserRow[];

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
          <span className="font-mono text-xs text-muted-foreground">
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
          id: isAdmin
            ? "activity_log.index.header_user"
            : "activity_log.index.header_user_me",
          defaultMessage: isAdmin ? "User" : "Me",
        }),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.user.name ?? "Unknown"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.original.user.email}</p>
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
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{row.original.resource}</p>
            {row.original.resourceId ? (
              <p className="truncate font-mono text-xs text-muted-foreground">
                {row.original.resourceId}
              </p>
            ) : null}
          </div>
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
    [intl, navigate, isAdmin],
  );

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: isAdmin ? "activity-logs-admin-index" : "activity-logs-my-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
        filters: {
          user: userFilter || null,
          action: actionFilter || null,
          resource: resourceFilter || null,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      })}
    >
      <PageHeader
        module="user"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage(titleMessage)}
        description={intl.formatMessage(subtitleMessage)}
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
            filters={
              <>
                {isAdmin ? (
                  <Select
                    value={userFilter || "all"}
                    onValueChange={(value) => {
                      setUserFilter(value === "all" ? "" : value);
                      resetToFirstPage();
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-44"
                      aria-label={intl.formatMessage({
                        id: "activity_log.admin.filter_user",
                        defaultMessage: "All users",
                      })}
                    >
                      <SelectValue
                        placeholder={intl.formatMessage({
                          id: "activity_log.admin.filter_user",
                          defaultMessage: "All users",
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {intl.formatMessage({
                          id: "activity_log.admin.filter_user",
                          defaultMessage: "All users",
                        })}
                      </SelectItem>
                      {userOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name ?? user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                <Select
                  value={actionFilter || "all"}
                  onValueChange={(value) => {
                    setActionFilter(value === "all" ? "" : (value as ActivityAction));
                    resetToFirstPage();
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-40"
                    aria-label={intl.formatMessage({
                      id: "activity_log.admin.filter_action",
                      defaultMessage: "All actions",
                    })}
                  >
                    <SelectValue
                      placeholder={intl.formatMessage({
                        id: "activity_log.admin.filter_action",
                        defaultMessage: "All actions",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {intl.formatMessage({
                        id: "activity_log.admin.filter_action",
                        defaultMessage: "All actions",
                      })}
                    </SelectItem>
                    {ACTION_OPTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {formatActionLabel(action)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  value={resourceInput}
                  onChange={(event) => setResourceInput(event.target.value)}
                  placeholder={intl.formatMessage({
                    id: "activity_log.admin.filter_resource",
                    defaultMessage: "Filter by resource…",
                  })}
                  aria-label={intl.formatMessage({
                    id: "activity_log.admin.filter_resource",
                    defaultMessage: "Filter by resource…",
                  })}
                  className="h-8 w-44"
                />

                <DatePicker
                  mode="daterange"
                  value={dateRange}
                  onChange={(value) => {
                    setDateRange(value as [string, string]);
                    resetToFirstPage();
                  }}
                  label={intl.formatMessage({
                    id: "activity_log.admin.filter_date_range",
                    defaultMessage: "Date range",
                  })}
                  placeholder={`${intl.formatMessage({
                    id: "activity_log.admin.filter_start_date",
                    defaultMessage: "From",
                  })} – ${intl.formatMessage({
                    id: "activity_log.admin.filter_end_date",
                    defaultMessage: "To",
                  })}`}
                />
              </>
            }
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
