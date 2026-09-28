import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { DatePicker } from "../../components/DatePicker";
import { Pagination } from "../../components/Pagination";
import { useMeta } from "../../lib/useMeta";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AppLogRow = {
  id: string;
  createdAt: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  module: string;
  message: string;
  requestId: string | null;
  detail: unknown;
};

const LEVEL_BADGE: Record<
  AppLogRow["level"],
  { variant: "secondary" | "destructive" | "outline" | "default"; icon: typeof Info }
> = {
  DEBUG: { variant: "outline", icon: Info },
  INFO: { variant: "secondary", icon: Info },
  WARN: { variant: "default", icon: AlertTriangle },
  ERROR: { variant: "destructive", icon: CircleAlert },
};

export const SystemLogsIndexPage = () => {
  const intl = useIntl();

  const title = intl.formatMessage({ id: "system_log.title", defaultMessage: "System Logs" });
  const subtitle = intl.formatMessage({
    id: "system_log.subtitle",
    defaultMessage: "Operational events from the server and client — errors, warnings, and security events.",
  });

  useMeta({ title, description: subtitle });

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<AppLogRow["level"] | "">("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [dateRange, setDateRange] = useState<[string, string]>(["", ""]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [startDate, endDate] = dateRange;

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "systemLogList",
      pagination.pageIndex,
      pagination.pageSize,
      search,
      levelFilter,
      moduleFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      trpcClient.systemLog.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
        level: levelFilter || undefined,
        module: moduleFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const { data: modules } = useQuery({
    queryKey: ["systemLogModules"],
    queryFn: () => trpcClient.systemLog.modules.query(),
    staleTime: 5 * 60 * 1000,
  });

  const rows = (data?.data ?? []) as AppLogRow[];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const totalRows = data?.pagination?.total ?? 0;

  const columns = useMemo<ColumnDef<AppLogRow>[]>(
    () => [
      {
        id: "createdAt",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        enableSorting: true,
        header: intl.formatMessage({ id: "system_log.header_time", defaultMessage: "Time" }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString("id-ID")}
          </span>
        ),
      },
      {
        id: "level",
        accessorKey: "level",
        enableSorting: true,
        header: intl.formatMessage({ id: "system_log.header_level", defaultMessage: "Level" }),
        cell: ({ row }) => {
          const badge = LEVEL_BADGE[row.original.level];
          const Icon = badge.icon;
          return (
            <Badge variant={badge.variant} className="gap-1">
              <Icon className="size-3" aria-hidden />
              {row.original.level}
            </Badge>
          );
        },
      },
      {
        id: "module",
        accessorKey: "module",
        enableSorting: true,
        header: intl.formatMessage({ id: "system_log.header_module", defaultMessage: "Module" }),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">{row.original.module}</span>
        ),
      },
      {
        id: "message",
        accessorKey: "message",
        enableSorting: true,
        header: intl.formatMessage({ id: "system_log.header_message", defaultMessage: "Message" }),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{row.original.message}</p>
            {row.original.requestId ? (
              <p className="truncate font-mono text-xs text-muted-foreground">{row.original.requestId}</p>
            ) : null}
          </div>
        ),
      },
    ],
    [intl],
  );

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "system-logs-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
        filters: {
          level: levelFilter || null,
          module: moduleFilter || null,
          startDate: dateRange[0] || null,
          endDate: dateRange[1] || null,
        },
      })}
    >
      <PageHeader
        module="settings"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={title}
        description={subtitle}
      />

      <DataTable
        density="crm"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "system_log.search_placeholder",
              defaultMessage: "Search message, module, request ID…",
            })}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={levelFilter || "all"}
                  onValueChange={(v) => {
                    setLevelFilter(v === "all" ? "" : (v as AppLogRow["level"]));
                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                  }}
                >
                  <SelectTrigger className="w-[140px]" aria-label={intl.formatMessage({ id: "system_log.header_level", defaultMessage: "Level" })}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{intl.formatMessage({ id: "system_log.level_all", defaultMessage: "All levels" })}</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="DEBUG">DEBUG</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={moduleFilter || "all"}
                  onValueChange={(v) => {
                    setModuleFilter(v === "all" ? "" : v);
                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                  }}
                >
                  <SelectTrigger className="w-[160px]" aria-label={intl.formatMessage({ id: "system_log.header_module", defaultMessage: "Module" })}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{intl.formatMessage({ id: "system_log.module_all", defaultMessage: "All modules" })}</SelectItem>
                    {(modules ?? []).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DatePicker
                  value={dateRange}
                  onChange={(v) => {
                    if (Array.isArray(v)) {
                      setDateRange(v as [string, string]);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }
                  }}
                />
              </div>
            }
          />
        }
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2 className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {intl.formatMessage({ id: "system_log.empty", defaultMessage: "No log entries match the current filters." })}
            </p>
          </div>
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
                onChange={(page) => setPagination((p) => ({ ...p, pageIndex: page - 1 }))}
              />
            </div>
          ) : null
        }
      />
    </section>
  );
};
