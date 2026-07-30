import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDownUp,
  Eye,
  Kanban,
  LayoutList,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { DatePicker } from "../../components/DatePicker";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../components/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SalesOrderPrint,
  printOrder,
  type SalesOrderPrintRecord,
} from "./SalesOrderPrint";
import { SalesOrderPipeline } from "./SalesOrderPipeline";

type SalesOrderRow = {
  id: string;
  documentNumber: string | null;
  date: string;
  customer: { id: string; name: string };
  outlet: { id: string; name: string } | null;
  area: { id: string; name: string };
  approvalStatus: string;
  grandTotal: number | null;
  _count: { items: number };
};

type IndexView = "table" | "pipeline";

const VIEW_STORAGE_KEY = "view:sales-order";

const STATUS_OPTIONS = ["DRAFT", "VALIDATING", "PROPOSED", "APPROVED", "REJECTED"] as const;

const readStoredView = (): IndexView => {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "pipeline" ? "pipeline" : "table";
  } catch {
    return "table";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

export const SalesOrderIndexPage = () => {
  const intl = useIntl();

  useMeta({
    title: intl.formatMessage({ id: "sales_order.index.title", defaultMessage: "Sales Orders" }),
    description: intl.formatMessage({ id: "sales_order.index.subtitle", defaultMessage: "Manage customer orders, line items, and approvals." }),
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("sales-order@create");
  const canUpdate = hasPermission("sales-order@update");
  const canDelete = hasPermission("sales-order@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const sorting = useMemo<SortingState>(
    () =>
      sortBy
        ? [
            {
              id: sortBy === "grandTotal" ? "total" : sortBy,
              desc: sortOrder === "desc",
            },
          ]
        : [],
    [sortBy, sortOrder],
  );
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const first = next[0];
    if (!first) {
      setSortBy("createdAt");
      setSortOrder("desc");
      setPagination((p) => ({ ...p, pageIndex: 0 }));
      return;
    }
    const id = first.id === "total" ? "grandTotal" : first.id;
    if (
      id === "createdAt" ||
      id === "date" ||
      id === "grandTotal" ||
      id === "documentNumber"
    ) {
      setSortBy(id);
      setSortOrder(first.desc ? "desc" : "asc");
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SalesOrderRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [view, setView] = useState<IndexView>(readStoredView);

  const selectView = (next: IndexView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ponytail: ignore storage failures (private mode)
    }
  };

  const [printRecord, setPrintRecord] = useState<SalesOrderPrintRecord | null>(null);
  const [isPrintLoading, setIsPrintLoading] = useState(false);

  const handlePrint = async (id: string) => {
    setIsPrintLoading(true);
    try {
      const detail = (await trpcClient.salesOrder.detail.query({
        id,
      })) as unknown as SalesOrderPrintRecord;
      setPrintRecord(detail);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          printOrder();
        });
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load order for print");
    } finally {
      setIsPrintLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "salesOrderList",
      pagination.pageIndex,
      pagination.pageSize,
      search,
      statusFilter,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      trpcClient.salesOrder.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
        approvalStatus: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      }),
  });

  const rows = (data?.data ?? []) as SalesOrderRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<SalesOrderRow>[]>(
    () => [
      {
        id: "documentNumber",
        accessorKey: "documentNumber",
        enableSorting: true,
        header: intl.formatMessage({
          id: "sales_order.index.header_doc",
          defaultMessage: "Doc #",
        }),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-semibold text-foreground">
              {row.original.documentNumber ?? row.original.id.slice(0, 8)}
            </p>
            <p className="text-[11px] text-foreground tabular-nums">
              {formatDate(row.original.date)}
            </p>
          </div>
        ),
      },
      {
        id: "customer",
        enableSorting: false,
        header: intl.formatMessage({
          id: "sales_order.index.header_customer",
          defaultMessage: "Customer",
        }),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.customer.name}
            </p>
            {row.original.outlet ? (
              <p className="truncate text-xs text-foreground">
                {row.original.outlet.name}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "area",
        enableSorting: false,
        header: intl.formatMessage({
          id: "sales_order.index.header_area",
          defaultMessage: "Area",
        }),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.area.name}</span>
        ),
      },
      {
        id: "items",
        enableSorting: false,
        header: intl.formatMessage({
          id: "sales_order.index.header_items",
          defaultMessage: "Items",
        }),
        cell: ({ row }) => (
          <span className="text-xs font-medium tabular-nums text-foreground">
            {row.original._count.items}
          </span>
        ),
      },
      {
        id: "total",
        accessorKey: "grandTotal",
        enableSorting: true,
        header: () => (
          <span className="block text-right">
            {intl.formatMessage({
              id: "sales_order.index.header_total",
              defaultMessage: "Total",
            })}
          </span>
        ),
        cell: ({ row }) =>
          row.original.grandTotal ? (
            <span className="block text-right font-medium tabular-nums text-foreground">
              {formatCurrency(row.original.grandTotal)}
            </span>
          ) : (
            <span className="block text-right text-foreground">—</span>
          ),
      },
      {
        id: "status",
        enableSorting: false,
        header: intl.formatMessage({
          id: "sales_order.index.header_status",
          defaultMessage: "Status",
        }),
        cell: ({ row }) => <StatusChip status={row.original.approvalStatus} />,
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
                <DropdownMenuItem onClick={() => navigate(`/sales-order/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate && row.original.approvalStatus === "DRAFT" ? (
                  <DropdownMenuItem
                    onClick={() => navigate(`/sales-order/${row.original.id}/edit`)}
                  >
                    <Pencil className="size-4" />
                    {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => handlePrint(row.original.id)}>
                  <Printer className="size-4" />
                  {intl.formatMessage({
                    id: "sales_order.action.print_label",
                    defaultMessage: "Print",
                  })}
                </DropdownMenuItem>
                {canDelete && row.original.approvalStatus === "DRAFT" ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setItemToDelete(row.original);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                      {intl.formatMessage({
                        id: "common.action.delete",
                        defaultMessage: "Delete",
                      })}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // ponytail: handlePrint is stable enough for this page; recreate on permission change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intl, navigate, canUpdate, canDelete],
  );

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.salesOrder.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({
          id: "sales_order.index.delete_success",
          defaultMessage: "Order deleted",
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(statusFilter || dateFrom || dateTo);
  const emptyFiltered = Boolean(search || statusFilter || dateFrom);

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "sales-order-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
        view,
      })}
    >
      <PageHeader
        module="order"
        eyebrow={intl.formatMessage({ id: "nav.sales", defaultMessage: "Sales" })}
        title={intl.formatMessage({
          id: "sales_order.index.title",
          defaultMessage: "Sales Orders",
        })}
        description={intl.formatMessage({
          id: "sales_order.index.subtitle",
          defaultMessage: "Manage customer orders, line items, and approvals.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/sales-order/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "sales_order.index.create_button",
                defaultMessage: "New order",
              })}
            </Button>
          ) : undefined
        }
      />

      <FilterBar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={intl.formatMessage({
          id: "sales_order.index.search_placeholder",
          defaultMessage: "Search orders…",
        })}
        countLabel={intl.formatMessage(
          {
            id: "sales_order.index.count_label",
            defaultMessage: "{count, plural, one {# order} other {# orders}}",
          },
          { count: totalRows },
        )}
        filters={
          <>
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
            >
              <SelectTrigger size="sm" className="w-40" aria-label={intl.formatMessage({ id: "sales_order.index.filter_status", defaultMessage: "Filter by status" })}>
                <SelectValue
                  placeholder={intl.formatMessage({
                    id: "sales_order.index.all_statuses",
                    defaultMessage: "All statuses",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {intl.formatMessage({
                    id: "sales_order.index.all_statuses",
                    defaultMessage: "All statuses",
                  })}
                </SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "VALIDATING"
                      ? "AI Processing"
                      : status.charAt(0) + status.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DatePicker
              mode="date"
              value={dateFrom}
              onChange={(val) => {
                const next = val as string;
                setDateFrom(next);
                setDateTo(next);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              placeholder={intl.formatMessage({
                id: "sales_order.index.filter_date",
                defaultMessage: "Select date",
              })}
            />

            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
            >
              <SelectTrigger size="sm" className="w-35" aria-label={intl.formatMessage({ id: "sales_order.index.sort_by", defaultMessage: "Sort by" })}>
                <SelectValue
                  placeholder={intl.formatMessage({
                    id: "sales_order.index.sort_by",
                    defaultMessage: "Sort by",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">
                  {intl.formatMessage({
                    id: "sales_order.index.sort_created",
                    defaultMessage: "Created",
                  })}
                </SelectItem>
                <SelectItem value="date">
                  {intl.formatMessage({
                    id: "sales_order.index.sort_date",
                    defaultMessage: "Order date",
                  })}
                </SelectItem>
                <SelectItem value="grandTotal">
                  {intl.formatMessage({
                    id: "sales_order.index.sort_total",
                    defaultMessage: "Total",
                  })}
                </SelectItem>
                <SelectItem value="documentNumber">
                  {intl.formatMessage({
                    id: "sales_order.index.sort_doc",
                    defaultMessage: "Doc #",
                  })}
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              aria-label={intl.formatMessage({
                id: "sales_order.index.toggle_sort",
                defaultMessage: "Toggle sort order",
              })}
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              <ArrowDownUp className="size-4" />
            </Button>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setStatusFilter("");
                  setDateFrom("");
                  setDateTo("");
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                aria-label={intl.formatMessage({
                  id: "common.action.clear_filters",
                  defaultMessage: "Clear filters",
                })}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </>
        }
        actions={
          <div
            className="inline-flex rounded-lg border bg-card p-0.5 shadow-xs"
            role="group"
            aria-label={intl.formatMessage({
              id: "sales_order.index.view_toggle",
              defaultMessage: "View mode",
            })}
          >
            <button
              type="button"
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                view === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => selectView("table")}
              aria-pressed={view === "table"}
            >
              <LayoutList className="size-3.5" aria-hidden />
              {intl.formatMessage({
                id: "sales_order.index.view_table",
                defaultMessage: "Table",
              })}
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                view === "pipeline"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => selectView("pipeline")}
              aria-pressed={view === "pipeline"}
            >
              <Kanban className="size-3.5" aria-hidden />
              {intl.formatMessage({
                id: "sales_order.index.view_pipeline",
                defaultMessage: "Pipeline",
              })}
            </button>
          </div>
        }
      />

      {view === "pipeline" ? (
        !isLoading && rows.length === 0 ? (
          <EmptyState
            module="order"
            title={
              emptyFiltered
                ? intl.formatMessage({
                    id: "sales_order.index.empty_search",
                    defaultMessage: "No orders found",
                  })
                : intl.formatMessage({
                    id: "sales_order.index.empty_state",
                    defaultMessage: "No orders yet",
                  })
            }
            description={
              emptyFiltered
                ? intl.formatMessage({
                    id: "sales_order.index.empty_search_sub",
                    defaultMessage: "Try adjusting your filters or search terms.",
                  })
                : intl.formatMessage({
                    id: "sales_order.index.empty_state_sub",
                    defaultMessage: "Create your first sales order to get started.",
                  })
            }
            action={
              canCreate && !emptyFiltered ? (
                <Button type="button" onClick={() => navigate("/sales-order/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "sales_order.index.create_button",
                    defaultMessage: "New order",
                  })}
                </Button>
              ) : undefined
            }
          />
        ) : isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
          </div>
        ) : (
          <SalesOrderPipeline items={rows} onOpen={(id) => navigate(`/sales-order/${id}`)} />
        )
      ) : (
        <DataTable
          density="crm"
          columns={columns}
          data={rows}
          isLoading={isLoading}
          isError={isError}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          manualSorting
          onRowClick={(row) => navigate(`/sales-order/${row.id}`)}
          empty={
            <EmptyState
              module="order"
              title={
                emptyFiltered
                  ? intl.formatMessage({
                      id: "sales_order.index.empty_search",
                      defaultMessage: "No orders found",
                    })
                  : intl.formatMessage({
                      id: "sales_order.index.empty_state",
                      defaultMessage: "No orders yet",
                    })
              }
              description={
                emptyFiltered
                  ? intl.formatMessage({
                      id: "sales_order.index.empty_search_sub",
                      defaultMessage: "Try adjusting your filters or search terms.",
                    })
                  : intl.formatMessage({
                      id: "sales_order.index.empty_state_sub",
                      defaultMessage: "Create your first sales order to get started.",
                    })
              }
              action={
                canCreate && !emptyFiltered ? (
                  <Button type="button" onClick={() => navigate("/sales-order/create")}>
                    <Plus className="size-4" />
                    {intl.formatMessage({
                      id: "sales_order.index.create_button",
                      defaultMessage: "New order",
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
                    {
                      id: "common.pagination_info",
                      defaultMessage: "Page {page} of {total}",
                    },
                    {
                      page: pagination.pageIndex + 1,
                      total: Math.max(totalPages, 1),
                    },
                  )}
                </p>
                <Pagination
                  page={pagination.pageIndex + 1}
                  totalPages={totalPages}
                  onChange={(p) =>
                    setPagination({ pageIndex: p - 1, pageSize: pagination.pageSize })
                  }
                />
              </div>
            ) : null
          }
        />
      )}

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "sales_order.index.delete_title",
          defaultMessage: "Delete order",
        })}
        description={intl.formatMessage(
          {
            id: "sales_order.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: itemToDelete?.documentNumber ?? "order" },
        )}
        confirmLabel={intl.formatMessage({
          id: "common.action.delete",
          defaultMessage: "Delete",
        })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />

      {printRecord ? <SalesOrderPrint record={printRecord} /> : null}

      <Dialog open={isPrintLoading}>
        <DialogContent showCloseButton={false} className="sm:max-w-xs">
          <DialogDescription className="py-4 text-center">
            {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </section>
  );
};
