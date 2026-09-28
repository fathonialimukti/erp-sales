import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Bug,
  CircleAlert,
  Eye,
  Info,
  ScrollText,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { useMeta } from "../../lib/useMeta";
import { getMotionProps, pageEnter } from "../../lib/motion";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { DatePicker } from "../../components/DatePicker";
import { Pagination } from "../../components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const APPLICATION_LOG_LEVELS = ["info", "warn", "error", "debug"] as const;

export type ApplicationLogLevelFilter = (typeof APPLICATION_LOG_LEVELS)[number];

type ApplicationLogRow = {
  id: string;
  level: ApplicationLogLevelFilter;
  message: string;
  meta?: unknown;
  source?: string;
  createdAt: string | Date;
};

type ApplicationLogListPayload = {
  data: ApplicationLogRow[];
  meta: { total: number; totalPages: number; page: number; limit: number };
};

export const APPLICATION_LOG_LEVEL_BADGE: Record<
  ApplicationLogLevelFilter,
  {
    variant: "secondary" | "destructive" | "outline" | "default";
    className: string;
    icon: typeof Info;
    labelId: string;
    defaultLabel: string;
  }
> = {
  error: {
    variant: "outline",
    className: "border-destructive/30 bg-destructive/12 text-destructive",
    icon: CircleAlert,
    labelId: "applicationLog.level.error",
    defaultLabel: "Error",
  },
  warn: {
    variant: "outline",
    className: "border-warning/35 bg-warning/15 text-warning-foreground",
    icon: AlertTriangle,
    labelId: "applicationLog.level.warn",
    defaultLabel: "Warning",
  },
  info: {
    variant: "outline",
    className: "border-primary/25 bg-primary/12 text-primary",
    icon: Info,
    labelId: "applicationLog.level.info",
    defaultLabel: "Info",
  },
  debug: {
    variant: "outline",
    className: "border-border/70 bg-muted text-foreground",
    icon: Bug,
    labelId: "applicationLog.level.debug",
    defaultLabel: "Debug",
  },
};

const formatTimestamp = (value: string | Date): string =>
  new Date(value).toLocaleString("id-ID");

const formatMeta = (meta: unknown): string =>
  typeof meta === "string" ? meta : JSON.stringify(meta, null, 2);

export const ApplicationLogIndexPage = () => {
  const intl = useIntl();
  const reducedMotion = useReducedMotion();

  const title = intl.formatMessage({
    id: "applicationLog.index.title",
    defaultMessage: "Application Logs",
  });
  const subtitle = intl.formatMessage({
    id: "applicationLog.index.subtitle",
    defaultMessage:
      "System runtime events — errors, warnings, and debug output. Read-only.",
  });

  useMeta({ title, description: subtitle });

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<ApplicationLogLevelFilter | "">("");
  const [sourceInput, setSourceInput] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateRange, setDateRange] = useState<[string, string]>(["", ""]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSourceFilter(sourceInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [sourceInput]);

  const resetToFirstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const [startDate, endDate] = dateRange;

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "applicationLogList",
      pagination.pageIndex,
      pagination.pageSize,
      search,
      levelFilter,
      sourceFilter,
      startDate,
      endDate,
    ],
    // Inline literals (not a spread variable) so tRPC contextually types them.
    // Cast through `unknown`: resolving the inferred output type eagerly
    // trips TS2589 (same pattern as activityLogExport's fetchExportPage).
    queryFn: (): Promise<ApplicationLogListPayload> =>
      trpcClient.applicationLog.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
        level: levelFilter || undefined,
        source: sourceFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }) as unknown as Promise<ApplicationLogListPayload>,
  });

  const {
    data: detail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useQuery({
    queryKey: ["applicationLogDetail", selectedId],
    enabled: selectedId !== null,
    queryFn: () => trpcClient.applicationLog.detail.query({ id: selectedId ?? "" }),
  });

  const rows = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;
  const detailRow = detail as ApplicationLogRow | undefined;

  const columns = useMemo<ColumnDef<ApplicationLogRow>[]>(
    () => [
      {
        id: "createdAt",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        enableSorting: true,
        header: intl.formatMessage({
          id: "applicationLog.index.header_time",
          defaultMessage: "Time",
        }),
        cell: ({ row }) => (
          <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
            {formatTimestamp(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "level",
        accessorKey: "level",
        enableSorting: true,
        header: intl.formatMessage({
          id: "applicationLog.index.header_level",
          defaultMessage: "Level",
        }),
        cell: ({ row }) => {
          const badge =
            APPLICATION_LOG_LEVEL_BADGE[row.original.level] ??
            APPLICATION_LOG_LEVEL_BADGE.info;
          const Icon = badge.icon;
          return (
            <Badge variant={badge.variant} className={cn("gap-1", badge.className)}>
              <Icon className="size-3" aria-hidden />
              {intl.formatMessage({
                id: badge.labelId,
                defaultMessage: badge.defaultLabel,
              })}
            </Badge>
          );
        },
      },
      {
        id: "source",
        accessorKey: "source",
        enableSorting: true,
        header: intl.formatMessage({
          id: "applicationLog.index.header_source",
          defaultMessage: "Source",
        }),
        cell: ({ row }) => (
          <span className="text-sm font-medium whitespace-nowrap text-foreground">
            {row.original.source ?? "—"}
          </span>
        ),
      },
      {
        id: "message",
        accessorKey: "message",
        enableSorting: true,
        header: intl.formatMessage({
          id: "applicationLog.index.header_message",
          defaultMessage: "Message",
        }),
        cell: ({ row }) => (
          <p className="max-w-xl truncate text-sm text-foreground">
            {row.original.message}
          </p>
        ),
      },
    ],
    [intl],
  );

  const detailBadge = detailRow
    ? (APPLICATION_LOG_LEVEL_BADGE[detailRow.level] ?? APPLICATION_LOG_LEVEL_BADGE.info)
    : null;
  const DetailIcon = detailBadge?.icon ?? Info;

  return (
    <motion.section
      className="flex flex-col gap-6 pt-2 pb-8"
      variants={pageEnter}
      {...getMotionProps(reducedMotion)}
      data-ai-context={JSON.stringify({
        section: "application-log-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
        filters: {
          level: levelFilter || null,
          source: sourceFilter || null,
          startDate: startDate || null,
          endDate: endDate || null,
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
        onRowClick={(row) => setSelectedId(row.id)}
        getRowClassName={(row) =>
          row.id === selectedId ? "bg-primary/5 border-l-[3px] border-l-primary" : undefined
        }
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "applicationLog.index.search_placeholder",
              defaultMessage: "Search message, source, request ID…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "applicationLog.index.count_label",
                defaultMessage: "{count, plural, one {# log} other {# logs}}",
              },
              { count: totalRows },
            )}
            filters={
              <>
                <Select
                  value={levelFilter || "all"}
                  onValueChange={(value) => {
                    setLevelFilter(
                      value === "all" ? "" : (value as ApplicationLogLevelFilter),
                    );
                    resetToFirstPage();
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-36"
                    aria-label={intl.formatMessage({
                      id: "applicationLog.index.filter_level",
                      defaultMessage: "Filter by level",
                    })}
                  >
                    <SelectValue
                      placeholder={intl.formatMessage({
                        id: "applicationLog.index.level_all",
                        defaultMessage: "All levels",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {intl.formatMessage({
                        id: "applicationLog.index.level_all",
                        defaultMessage: "All levels",
                      })}
                    </SelectItem>
                    {APPLICATION_LOG_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {intl.formatMessage({
                          id: APPLICATION_LOG_LEVEL_BADGE[level].labelId,
                          defaultMessage:
                            APPLICATION_LOG_LEVEL_BADGE[level].defaultLabel,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  value={sourceInput}
                  onChange={(event) => setSourceInput(event.target.value)}
                  placeholder={intl.formatMessage({
                    id: "applicationLog.index.filter_source",
                    defaultMessage: "Filter by source…",
                  })}
                  aria-label={intl.formatMessage({
                    id: "applicationLog.index.filter_source",
                    defaultMessage: "Filter by source…",
                  })}
                  className="h-8 w-44"
                />

                <DatePicker
                  mode="daterange"
                  value={dateRange}
                  onChange={(value) => {
                    if (Array.isArray(value)) {
                      setDateRange(value as [string, string]);
                      resetToFirstPage();
                    }
                  }}
                  label={intl.formatMessage({
                    id: "applicationLog.index.filter_date_range",
                    defaultMessage: "Date range",
                  })}
                />
              </>
            }
          />
        }
        empty={
          <EmptyState
            module="settings"
            icon={<ScrollText className="size-6" aria-hidden />}
            title={intl.formatMessage({
              id: "applicationLog.index.empty_title",
              defaultMessage: "No application logs found",
            })}
            description={intl.formatMessage({
              id: "applicationLog.index.empty_desc",
              defaultMessage: "Try adjusting your search or filters.",
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
                onChange={(page) =>
                  setPagination((p) => ({ ...p, pageIndex: page - 1 }))
                }
              />
            </div>
          ) : null
        }
      />

      <Sheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent side="right" className="w-[min(100%,28rem)] p-0">
          <SheetHeader className="border-b border-border px-5 py-5 text-left">
            <SheetTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "applicationLog.detail.title",
                defaultMessage: "Log detail",
              })}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs break-all">
              {selectedId}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
            {isDetailLoading ? (
              <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : isDetailError || !detailRow || !detailBadge ? (
              <p className="text-sm font-medium text-foreground">
                {intl.formatMessage({
                  id: "applicationLog.detail.not_found",
                  defaultMessage: "Application log not found.",
                })}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={detailBadge.variant}
                    className={`gap-1 ${detailBadge.className}`}
                  >
                    <DetailIcon className="size-3" aria-hidden />
                    {intl.formatMessage({
                      id: detailBadge.labelId,
                      defaultMessage: detailBadge.defaultLabel,
                    })}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(detailRow.createdAt)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    {intl.formatMessage({
                      id: "applicationLog.detail.source_label",
                      defaultMessage: "Source",
                    })}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {detailRow.source ?? "—"}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    {intl.formatMessage({
                      id: "applicationLog.detail.message_label",
                      defaultMessage: "Message",
                    })}
                  </p>
                  <p className="text-sm text-foreground">{detailRow.message}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    {intl.formatMessage({
                      id: "applicationLog.detail.meta_label",
                      defaultMessage: "Metadata",
                    })}
                  </p>
                  {detailRow.meta === undefined || detailRow.meta === null ? (
                    <p className="text-sm text-muted-foreground">
                      {intl.formatMessage({
                        id: "applicationLog.detail.meta_empty",
                        defaultMessage: "No metadata attached to this entry.",
                      })}
                    </p>
                  ) : (
                    <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs break-words whitespace-pre-wrap text-foreground">
                      {formatMeta(detailRow.meta)}
                    </pre>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="size-3.5" aria-hidden />
                  <span className="font-mono break-all">{detailRow.id}</span>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </motion.section>
  );
};
