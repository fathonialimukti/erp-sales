import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { Select } from "../../ui/Select";
import { Pagination } from "../../ui/Pagination";
import { Spinner } from "../../ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../ui/Table";
import { useToast } from "../../ui/useToast";
import { RowActions } from "../../components/RowActions";
import { DatePicker } from "../../components/DatePicker";
import { icons } from "../../assets/icons";
import {
  SalesOrderPrint,
  printOrder,
  type SalesOrderPrintRecord,
} from "./SalesOrderPrint";
import { SOIcon } from "./SalesOrderIcons";
import "./SalesOrder.css";

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

const STATUS_META: Record<
  string,
  { label: string; tint: "neutral" | "info" | "success" | "warning" | "danger"; tintClass: string }
> = {
  DRAFT:      { label: "Draft",              tint: "neutral", tintClass: "so-status--neutral" },
  VALIDATING: { label: "AI Processing",      tint: "warning", tintClass: "so-status--warning" },
  PROPOSED:   { label: "Pending Approval",   tint: "info",    tintClass: "so-status--info" },
  APPROVED:   { label: "Approved",           tint: "success", tintClass: "so-status--success" },
  REJECTED:   { label: "Rejected",           tint: "danger",  tintClass: "so-status--danger" },
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SalesOrderRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Print state — fetched on demand
  const [printRecord, setPrintRecord] = useState<SalesOrderPrintRecord | null>(null);
  const [isPrintLoading, setIsPrintLoading] = useState(false);

  const handlePrint = async (id: string) => {
    setIsPrintLoading(true);
    try {
      const detail = (await trpcClient.salesOrder.detail.query({ id })) as unknown as SalesOrderPrintRecord;
      setPrintRecord(detail);
      // Allow React to commit the print element before invoking the print dialog.
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

  const { data, isLoading } = useQuery({
    queryKey: ["salesOrderList", pagination.pageIndex, pagination.pageSize, search, statusFilter, dateFrom, dateTo, sortBy, sortOrder],
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
        header: intl.formatMessage({ id: "sales_order.index.header_doc", defaultMessage: "Doc #" }),
        cell: ({ row }) => (
          <span className="so-doc">
            <span className="so-doc__icon" data-tint="blue" aria-hidden="true">
              <img src={icons.dashOrders} alt="" />
            </span>
            <span className="so-doc__text">
              <span className="so-doc__number">
                {row.original.documentNumber ?? row.original.id.slice(0, 8)}
              </span>
              <span className="so-doc__date">{formatDate(row.original.date)}</span>
            </span>
          </span>
        ),
      },
      {
        id: "customer",
        header: intl.formatMessage({ id: "sales_order.index.header_customer", defaultMessage: "Customer" }),
        cell: ({ row }) => (
          <span className="so-cell">
            <span className="so-cell__primary">{row.original.customer.name}</span>
            {row.original.outlet ? (
              <span className="so-cell__secondary">{row.original.outlet.name}</span>
            ) : null}
          </span>
        ),
      },
      {
        id: "area",
        header: intl.formatMessage({ id: "sales_order.index.header_area", defaultMessage: "Area" }),
        cell: ({ row }) => (
          <span className="so-cell so-cell--single">
            <span className="so-cell__primary so-cell__primary--muted">
              {row.original.area.name}
            </span>
          </span>
        ),
      },
      {
        id: "items",
        header: intl.formatMessage({ id: "sales_order.index.header_items", defaultMessage: "Items" }),
        cell: ({ row }) => (
          <span className="so-count">
            <span className="so-count__badge">{row.original._count.items}</span>
          </span>
        ),
      },
      {
        id: "total",
        header: intl.formatMessage({ id: "sales_order.index.header_total", defaultMessage: "Total" }),
        cell: ({ row }) =>
          row.original.grandTotal ? (
            <span className="so-total">{formatCurrency(row.original.grandTotal)}</span>
          ) : (
            <span className="so-total so-total--muted">—</span>
          ),
      },
      {
        id: "status",
        header: intl.formatMessage({ id: "sales_order.index.header_status", defaultMessage: "Status" }),
        cell: ({ row }) => {
          const meta = STATUS_META[row.original.approvalStatus] ?? STATUS_META.DRAFT;
          return (
            <span className={`so-status ${meta.tintClass}`} data-tint={meta.tint}>
              <span className="so-status__dot" aria-hidden="true" />
              <span>{meta.label}</span>
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <RowActions
            ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
            items={[
              {
                key: "view",
                label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }),
                icon: <SOIcon name="eye" size={16} />,
                onClick: () => navigate(`/sales-order/${row.original.id}`),
              },
              ...(canUpdate && row.original.approvalStatus === "DRAFT"
                ? [
                    {
                      key: "edit",
                      label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }),
                      icon: <SOIcon name="edit" size={16} />,
                      onClick: () => navigate(`/sales-order/${row.original.id}/edit`),
                    },
                  ]
                : []),
              {
                key: "print",
                label: intl.formatMessage({ id: "sales_order.action.print_label", defaultMessage: "Print" }),
                icon: <SOIcon name="print" size={16} />,
                onClick: () => handlePrint(row.original.id),
              },
              ...(canDelete && row.original.approvalStatus === "DRAFT"
                ? [
                    {
                      key: "delete",
                      label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }),
                      icon: <SOIcon name="trash" size={16} />,
                      tone: "danger" as const,
                      separator: true,
                      onClick: () => {
                        setItemToDelete(row.original);
                        setDeleteModalOpen(true);
                      },
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [intl, navigate, canUpdate, canDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: totalPages,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.salesOrder.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({ id: "sales_order.index.delete_success", defaultMessage: "Order deleted" }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary stats for the hero strip
  const draftCount = rows.filter((r) => r.approvalStatus === "DRAFT").length;
  const approvedCount = rows.filter((r) => r.approvalStatus === "APPROVED").length;
  const proposedCount = rows.filter((r) => r.approvalStatus === "PROPOSED").length;

  return (
    <section
      className="so-page"
      data-ai-context={JSON.stringify({
        section: "sales-order-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      {/* iOS hero — two-row layout: title+CTA top, stats strip bottom */}
      <header className="so-hero">
        <div className="so-hero__top">
          <div className="so-hero__text">
            <span className="so-hero__kicker">
              {intl.formatMessage({ id: "nav.sales", defaultMessage: "Sales" })}
            </span>
            <h1 className="so-hero__title">
              {intl.formatMessage({ id: "sales_order.index.title", defaultMessage: "Sales Orders" })}
            </h1>
            <p className="so-hero__sub">
              {intl.formatMessage({
                id: "sales_order.index.subtitle",
                defaultMessage: "Manage customer orders, line items, and approvals.",
              })}
            </p>
          </div>

          {canCreate && (
            <button
              type="button"
              className="so-hero__cta"
              onClick={() => navigate("/sales-order/create")}
            >
              <img src={icons.dashNewOrder} alt="" className="so-hero__cta-icon" />
              {intl.formatMessage({ id: "sales_order.index.create_button", defaultMessage: "New order" })}
            </button>
          )}
        </div>

        <div className="so-hero__stats">
          <div className="so-hero__stat">
            <span className="so-hero__stat-value">{totalRows}</span>
            <span className="so-hero__stat-label">
              {intl.formatMessage({ id: "sales_order.hero.total", defaultMessage: "Total" })}
            </span>
          </div>
          <span className="so-hero__divider" aria-hidden="true" />
          <div className="so-hero__stat">
            <span className="so-hero__stat-value so-hero__stat-value--success">{approvedCount}</span>
            <span className="so-hero__stat-label">
              {intl.formatMessage({ id: "sales_order.hero.approved", defaultMessage: "Approved" })}
            </span>
          </div>
          <span className="so-hero__divider" aria-hidden="true" />
          <div className="so-hero__stat">
            <span className="so-hero__stat-value so-hero__stat-value--info">{proposedCount}</span>
            <span className="so-hero__stat-label">
              {intl.formatMessage({ id: "sales_order.hero.proposed", defaultMessage: "Proposed" })}
            </span>
          </div>
          <span className="so-hero__divider" aria-hidden="true" />
          <div className="so-hero__stat">
            <span className="so-hero__stat-value so-hero__stat-value--muted">{draftCount}</span>
            <span className="so-hero__stat-label">
              {intl.formatMessage({ id: "sales_order.hero.draft", defaultMessage: "Draft" })}
            </span>
          </div>
        </div>
      </header>

      {/* Toolbar — search + filters + result count */}
      <div className="so-toolbar">
        <div className="so-search">
          <span className="so-search__icon" aria-hidden="true">
            <img src={icons.dashSearchGlass} alt="" />
          </span>
          <Input
            className="so-search__input"
            value={searchInput}
            onValueChange={setSearchInput}
            placeholder={intl.formatMessage({
              id: "sales_order.index.search_placeholder",
              defaultMessage: "Search orders…",
            })}
            aria-label={intl.formatMessage({
              id: "sales_order.index.search_placeholder",
              defaultMessage: "Search orders…",
            })}
          />
          {searchInput && (
            <button
              type="button"
              className="so-search__clear"
              onClick={() => setSearchInput("")}
              aria-label={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
            >
              <SOIcon name="close" size={18} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="so-filters">
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as string);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            options={Object.entries(STATUS_META).map(([key, meta]) => ({ value: key, label: meta.label }))}
            placeholder={intl.formatMessage({ id: "sales_order.index.all_statuses", defaultMessage: "All statuses" })}
            ariaLabel={intl.formatMessage({ id: "sales_order.index.filter_status", defaultMessage: "Filter by status" })}
            fullWidth={false}
          />

          <DatePicker
            mode="date"
            value={dateFrom}
            onChange={(val) => {
              setDateFrom(val as string);
              setDateTo(val as string);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            placeholder="Select date"
          />

          <Select
            value={sortBy}
            onChange={(value) => {
              setSortBy(value as string);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            options={[
              { value: "createdAt", label: intl.formatMessage({ id: "sales_order.index.sort_created", defaultMessage: "Created" }) },
              { value: "date", label: intl.formatMessage({ id: "sales_order.index.sort_date", defaultMessage: "Order date" }) },
              { value: "grandTotal", label: intl.formatMessage({ id: "sales_order.index.sort_total", defaultMessage: "Total" }) },
              { value: "documentNumber", label: intl.formatMessage({ id: "sales_order.index.sort_doc", defaultMessage: "Doc #" }) },
            ]}
            placeholder={intl.formatMessage({ id: "sales_order.index.sort_by", defaultMessage: "Sort by" })}
            ariaLabel={intl.formatMessage({ id: "sales_order.index.sort_by", defaultMessage: "Sort by" })}
            fullWidth={false}
          />

          <button
            type="button"
            className="so-filter-sort-order"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            aria-label={intl.formatMessage({ id: "sales_order.index.toggle_sort", defaultMessage: "Toggle sort order" })}
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            <SOIcon name={sortOrder === "asc" ? "sort-asc" : "sort-desc"} size={18} />
          </button>

          {(statusFilter || dateFrom || dateTo) && (
            <button
              type="button"
              className="so-filter-clear"
              onClick={() => {
                setStatusFilter("");
                setDateFrom("");
                setDateTo("");
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              aria-label={intl.formatMessage({ id: "common.action.clear_filters", defaultMessage: "Clear filters" })}
            >
              <SOIcon name="close" size={16} />
            </button>
          )}
        </div>

        <span className="so-toolbar__count">
          {intl.formatMessage(
            { id: "sales_order.index.count_label", defaultMessage: "{count, plural, one {# order} other {# orders}}" },
            { count: totalRows },
          )}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="so-state so-state--loading">
          <Spinner />
          <span className="so-state__title">
            {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
          </span>
        </div>
      ) : rows.length === 0 ? (
        <div className="so-state">
          <div className="so-state__illustration">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="30" width="80" height="70" rx="8" fill="var(--ios-card-bg)" stroke="var(--ios-card-border)" strokeWidth="2"/>
              <rect x="30" y="45" width="60" height="8" rx="4" fill="var(--color-slate-300)"/>
              <rect x="30" y="60" width="45" height="8" rx="4" fill="var(--color-slate-300)"/>
              <rect x="30" y="75" width="50" height="8" rx="4" fill="var(--color-slate-300)"/>
              <circle cx="90" cy="30" r="15" fill="var(--color-state-info)" opacity="0.2"/>
              <path d="M85 30L88 33L95 26" stroke="var(--color-state-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="so-state__title">
            {search
              ? intl.formatMessage({ id: "sales_order.index.empty_search", defaultMessage: "No orders found" })
              : intl.formatMessage({ id: "sales_order.index.empty_state", defaultMessage: "No orders yet" })}
          </span>
          <span className="so-state__text">
            {search
              ? intl.formatMessage({
                  id: "sales_order.index.empty_search_sub",
                  defaultMessage: "Try adjusting your filters or search terms.",
                })
              : intl.formatMessage({
                  id: "sales_order.index.empty_state_sub",
                  defaultMessage: "Create your first sales order to get started.",
                })}
          </span>
          {canCreate && !search && (
            <button
              type="button"
              className="so-state__cta"
              onClick={() => navigate("/sales-order/create")}
            >
              <img src={icons.dashNewOrder} alt="" className="so-state__cta-icon" />
              {intl.formatMessage({ id: "sales_order.index.create_button", defaultMessage: "New order" })}
            </button>
          )}
        </div>
      ) : (
        <div className="so-table-card">
          <Table className="so-table">
            <THead>
              {table.getHeaderGroups().map((hg) => (
                <TR key={hg.id}>
                  {hg.headers.map((h) => (
                    <TH key={h.id}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TH>
                  ))}
                </TR>
              ))}
            </THead>
            <TBody>
              {table.getRowModel().rows.map((row) => (
                <TR
                  key={row.id}
                  className="so-row"
                  onClick={() => navigate(`/sales-order/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((c) => (
                    <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="so-pagination">
            <span className="so-pagination__info">
              {intl.formatMessage(
                { id: "common.pagination_info", defaultMessage: "Page {page} of {total}" },
                {
                  page: pagination.pageIndex + 1,
                  total: Math.max(totalPages, 1),
                },
              )}
            </span>
            <Pagination
              page={pagination.pageIndex + 1}
              totalPages={totalPages}
              onChange={(p) => setPagination({ pageIndex: p - 1, pageSize: pagination.pageSize })}
            />
          </div>
        </div>
      )}

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader onClose={() => setDeleteModalOpen(false)}>
          {intl.formatMessage({ id: "sales_order.index.delete_title", defaultMessage: "Delete order" })}
        </ModalHeader>
        <ModalBody>
          {intl.formatMessage(
            {
              id: "sales_order.index.delete_confirm_body",
              defaultMessage: 'Delete "{name}"? This action cannot be undone.',
            },
            { name: itemToDelete?.documentNumber ?? "order" },
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
            {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Print document — hidden on screen, visible when printing.
          Mounted as long as a print record exists so @media print can show it. */}
      {printRecord && <SalesOrderPrint record={printRecord} />}

      {/* Loading state for the print request — keeps the user informed
          while we fetch the full detail before opening the print dialog. */}
      <Modal isOpen={isPrintLoading} size="sm" closeOnBackdrop={false}>
        <ModalBody className="so-print__loading">
          <Spinner />
          <span className="so-print__loading-label">
            {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
          </span>
        </ModalBody>
      </Modal>
    </section>
  );
};
