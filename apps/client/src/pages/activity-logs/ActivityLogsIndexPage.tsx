import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import {
  CheckCircle2,
  CircleDashed,
  Download,
  Eye,
  Loader2,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { DatePicker } from "../../components/DatePicker";
import { useMeta } from "../../lib/useMeta";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import {
  useWorkbookExport,
  type WorkbookColumn,
} from "../../lib/export/useWorkbookExport";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import {
  fetchAllLogsForExport,
  formatDetailCell,
  toExportRow,
  EXPORT_PAGE_SIZE,
  EXPORT_ROW_CAP,
  type ActivityLogListPayload,
  type ActivityLogRow,
} from "./activityLogExport";

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

/**
 * Audit-trail verbs, in the UI language. The English title-case verb is the
 * fallback for anything not in this map (an action added server-side later).
 */
const ACTION_LABEL_ID: Record<string, { id: string; defaultMessage: string }> = {
  CREATE: { id: "activity_log.action.create", defaultMessage: "Create" },
  UPDATE: { id: "activity_log.action.update", defaultMessage: "Update" },
  DELETE: { id: "activity_log.action.delete", defaultMessage: "Delete" },
  APPROVE: { id: "activity_log.action.approve", defaultMessage: "Approve" },
  REJECT: { id: "activity_log.action.reject", defaultMessage: "Reject" },
  LOGIN: { id: "activity_log.action.login", defaultMessage: "Log in" },
  LOGOUT: { id: "activity_log.action.logout", defaultMessage: "Log out" },
  EXPORT: { id: "activity_log.action.export", defaultMessage: "Export" },
  IMPORT: { id: "activity_log.action.import", defaultMessage: "Import" },
};

/**
 * Audit-trail action → chip tone. Approve/reject/delete read as the outcome
 * they are (success / destructive), mutations are brand-soft, reads and
 * session events stay neutral. Icon always rides along, never color alone.
 */
const ACTION_CHIP_TONE: Record<
  string,
  { icon: LucideIcon; className: string }
> = {
  CREATE: { icon: Plus, className: "border-primary/25 bg-primary/12 text-primary" },
  UPDATE: { icon: Pencil, className: "border-primary/25 bg-primary/12 text-primary" },
  APPROVE: { icon: CheckCircle2, className: "border-success/30 bg-success/15 text-success" },
  REJECT: { icon: XCircle, className: "border-destructive/30 bg-destructive/12 text-destructive" },
  DELETE: { icon: Trash2, className: "border-destructive/30 bg-destructive/12 text-destructive" },
  EXPORT: { icon: Download, className: "border-primary/25 bg-primary/12 text-primary" },
  IMPORT: { icon: Upload, className: "border-primary/25 bg-primary/12 text-primary" },
  LOGIN: { icon: LogIn, className: "border-border/70 bg-muted text-foreground" },
  LOGOUT: { icon: LogOut, className: "border-border/70 bg-muted text-foreground" },
};

const ACTION_CHIP_FALLBACK = {
  icon: CircleDashed,
  className: "border-border bg-muted text-foreground",
};

/** Icon + semantic plate + the action word — the audit trail needs both. */
const ActionChip = ({ action }: { action: string }) => {
  const intl = useIntl();
  const tone = ACTION_CHIP_TONE[action] ?? ACTION_CHIP_FALLBACK;
  const Icon = tone.icon;
  const label = ACTION_LABEL_ID[action]
    ? intl.formatMessage(ACTION_LABEL_ID[action])
    : formatActionLabel(action);
  return (
    <Badge variant="outline" className={cn("gap-1 font-semibold shadow-sm", tone.className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
};

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

  // Payload shape shared by both list endpoints — see ./activityLogExport.
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

  // ── Excel export (mirrors the report sections' export pattern) ────────────
  const toast = useToast();
  const { exportWorkbook, isExporting } = useWorkbookExport();
  const [isPreparingExport, setIsPreparingExport] = useState(false);
  const isExportBusy = isExporting || isPreparingExport;

  const exportColumns: WorkbookColumn[] = [
    {
      key: "createdAt",
      header: intl.formatMessage({
        id: "activity_log.index.header_timestamp",
        defaultMessage: "Timestamp",
      }),
      // Same on-screen date/time convention as the table cell.
      format: (v) => new Date(String(v)).toLocaleString(intl.locale),
    },
    {
      key: "userName",
      header: intl.formatMessage(
        isAdmin
          ? {
              id: "activity_log.index.header_user",
              defaultMessage: "User",
            }
          : {
              id: "activity_log.index.header_user_me",
              defaultMessage: "Me",
            },
      ),
    },
    {
      key: "userEmail",
      header: intl.formatMessage({
        id: "activity_log.export.header_email",
        defaultMessage: "Email",
      }),
    },
    {
      key: "action",
      header: intl.formatMessage({
        id: "activity_log.index.header_action",
        defaultMessage: "Action",
      }),
    },
    {
      key: "resource",
      header: intl.formatMessage({
        id: "activity_log.index.header_resource",
        defaultMessage: "Resource",
      }),
    },
    {
      key: "resourceId",
      header: intl.formatMessage({
        id: "activity_log.export.header_resource_id",
        defaultMessage: "Resource ID",
      }),
    },
    {
      key: "message",
      header: intl.formatMessage({
        id: "activity_log.export.header_message",
        defaultMessage: "Message",
      }),
    },
    {
      key: "detail",
      header: intl.formatMessage({
        id: "activity_log.export.header_detail",
        defaultMessage: "Detail",
      }),
      format: formatDetailCell,
    },
  ];

  // Paginated fetch-all over the SAME endpoint + filters the table uses.
  // Inline literals (not a spread variable) so tRPC contextually types them —
  // a pre-built input object trips "Type instantiation is excessively deep".
  // Returns the raw promise cast through `unknown`: awaiting the tRPC output
  // type eagerly in a value position trips TS2589 (the useQuery paths resolve
  // it lazily instead), and the helper only needs the small payload shape.
  const fetchExportPage = (page: number): Promise<ActivityLogListPayload> =>
    isAdmin
      ? (trpcClient.activityLog.adminList.query({
          page,
          limit: EXPORT_PAGE_SIZE,
          search: search || undefined,
          userId: userFilter || undefined,
          action: actionFilter || undefined,
          resource: resourceFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }) as unknown as Promise<ActivityLogListPayload>)
      : (trpcClient.activityLog.list.query({
          page,
          limit: EXPORT_PAGE_SIZE,
          search: search || undefined,
          action: actionFilter || undefined,
          resource: resourceFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }) as unknown as Promise<ActivityLogListPayload>);

  const onExport = async () => {
    setIsPreparingExport(true);
    try {
      const { rows: exportRows, truncated } = await fetchAllLogsForExport(fetchExportPage);
      if (truncated) {
        toast.warning(
          intl.formatMessage(
            {
              id: "activity_log.export.truncated",
              defaultMessage:
                "Export is limited to the first {limit} logs. Narrow the filters to include older entries.",
            },
            { limit: EXPORT_ROW_CAP },
          ),
        );
      }
      const unknownUserLabel = intl.formatMessage({
        id: "activity_log.export.unknown_user",
        defaultMessage: "Unknown",
      });
      await exportWorkbook({
        prefix: "activity-log",
        sheetName: intl.formatMessage({
          id: "activity_log.export.sheet_name",
          defaultMessage: "Activity logs",
        }),
        columns: exportColumns,
        rows: exportRows.map((row) => toExportRow(row, unknownUserLabel)),
      });
    } catch (error) {
      // Fetch-all failures happen outside the shared hook — surface them here.
      toast.error(error);
    } finally {
      setIsPreparingExport(false);
    }
  };


  const columns = useMemo<ColumnDef<ActivityLogRow>[]>(
    () => [
      {
        id: "createdAt",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        enableSorting: true,
        header: intl.formatMessage({
          id: "activity_log.index.header_timestamp",
          defaultMessage: "Timestamp",
        }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString(intl.locale)}
          </span>
        ),
      },
      {
        id: "action",
        accessorKey: "action",
        enableSorting: true,
        header: intl.formatMessage({
          id: "activity_log.index.header_action",
          defaultMessage: "Action",
        }),
        cell: ({ row }) => <ActionChip action={row.original.action} />,
      },
      {
        id: "user",
        accessorFn: (row) => row.user.name ?? row.user.email,
        enableSorting: true,
        header: intl.formatMessage({
          id: isAdmin
            ? "activity_log.index.header_user"
            : "activity_log.index.header_user_me",
          defaultMessage: isAdmin ? "User" : "Me",
        }),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.user.name ??
                intl.formatMessage({
                  id: "activity_log.export.unknown_user",
                  defaultMessage: "Unknown",
                })}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.original.user.email}</p>
          </div>
        ),
      },
      {
        id: "resource",
        accessorKey: "resource",
        enableSorting: true,
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
        enableSorting: false,
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
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5"
                onClick={onExport}
                disabled={isExportBusy}
              >
                {isExportBusy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-3.5" aria-hidden />
                )}
                {intl.formatMessage(
                  isExportBusy
                    ? {
                        id: "activity_log.export.loading",
                        defaultMessage: "Preparing export…",
                      }
                    : {
                        id: "activity_log.export.excel",
                        defaultMessage: "Export Excel",
                      },
                )}
              </Button>
            }
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
