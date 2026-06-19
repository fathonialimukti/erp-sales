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
import { Card, CardBody } from "../../ui/Card";
import { Chip } from "../../ui/Chip";
import { Dropdown, DropdownItem, DropdownSeparator } from "../../ui/Dropdown";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { Pagination } from "../../ui/Pagination";
import { SearchField } from "../../ui/SearchField";
import { Spinner } from "../../ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../ui/Table";
import { useToast } from "../../ui/useToast";

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

const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  PROPOSED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

export const SalesOrderIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("sales-order@create");
  const canUpdate = hasPermission("sales-order@update");
  const canDelete = hasPermission("sales-order@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SalesOrderRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["salesOrderList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.salesOrder.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as SalesOrderRow[];
  const totalPages = data?.meta?.totalPages ?? 1;

  const columns = useMemo<ColumnDef<SalesOrderRow>[]>(
    () => [
      {
        id: "documentNumber",
        header: intl.formatMessage({ id: "sales_order.index.header_doc", defaultMessage: "Doc #" }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {row.original.documentNumber ?? row.original.id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: "date",
        header: intl.formatMessage({ id: "sales_order.index.header_date", defaultMessage: "Date" }),
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {new Date(row.original.date).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "customer",
        header: intl.formatMessage({ id: "sales_order.index.header_customer", defaultMessage: "Customer" }),
        cell: ({ row }) => row.original.customer.name,
      },
      {
        id: "outlet",
        header: intl.formatMessage({ id: "sales_order.index.header_outlet", defaultMessage: "Outlet" }),
        cell: ({ row }) => row.original.outlet?.name ?? "—",
      },
      {
        id: "total",
        header: intl.formatMessage({ id: "sales_order.index.header_total", defaultMessage: "Total" }),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.grandTotal
              ? new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(row.original.grandTotal)
              : "—"}
          </span>
        ),
      },
      {
        id: "items",
        header: intl.formatMessage({ id: "sales_order.index.header_items", defaultMessage: "Items" }),
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original._count.items}</span>,
      },
      {
        id: "status",
        header: intl.formatMessage({ id: "sales_order.index.header_status", defaultMessage: "Status" }),
        cell: ({ row }) => (
          <Chip tone={STATUS_TONE[row.original.approvalStatus] ?? "neutral"}>
            {row.original.approvalStatus}
          </Chip>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate(`/sales-order/${row.original.id}`)}
              aria-label="View"
            >
              <Icon icon="solar:eye-linear" className="h-4 w-4" />
            </Button>
            {(canUpdate || canDelete) && (
              <Dropdown
                trigger={
                  <Button size="icon" variant="ghost" aria-label="Actions">
                    <Icon icon="solar:menu-dots-bold" className="h-4 w-4" />
                  </Button>
                }
              >
                {canUpdate && row.original.approvalStatus === "DRAFT" && (
                  <DropdownItem
                    leftIcon={<Icon icon="solar:pen-linear" className="h-4 w-4" />}
                    onClick={() => navigate(`/sales-order/${row.original.id}/edit`)}
                  >
                    {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
                  </DropdownItem>
                )}
                {canDelete && (
                  <>
                    <DropdownSeparator />
                    <DropdownItem
                      tone="danger"
                      leftIcon={<Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />}
                      onClick={() => {
                        setItemToDelete(row.original);
                        setDeleteModalOpen(true);
                      }}
                    >
                      {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                    </DropdownItem>
                  </>
                )}
              </Dropdown>
            )}
          </div>
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
      toast.success("Order deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      className="space-y-5"
      data-ai-context={JSON.stringify({
        section: "sales-order-index",
        itemCount: data?.meta?.total ?? 0,
      })}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {intl.formatMessage({ id: "sales_order.index.title", defaultMessage: "Sales Orders" })}
          </h1>
          <p className="text-sm text-slate-500">
            {intl.formatMessage({
              id: "sales_order.index.subtitle",
              defaultMessage: "Manage customer orders, line items, and approvals",
            })}
          </p>
        </div>
        {canCreate && (
          <Button
            variant="primary"
            onClick={() => navigate("/sales-order/create")}
            leftIcon={<Icon icon="solar:add-circle-linear" className="h-4 w-4" />}
          >
            {intl.formatMessage({ id: "sales_order.index.create_button", defaultMessage: "New order" })}
          </Button>
        )}
      </div>

      <Card>
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <SearchField
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            onClear={() => setSearchInput("")}
            placeholder={intl.formatMessage({
              id: "sales_order.index.search_placeholder",
              defaultMessage: "Search orders…",
            })}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="solar:document-linear"
            title={intl.formatMessage({
              id: "sales_order.index.empty_state",
              defaultMessage: "No orders found",
            })}
            description={intl.formatMessage({
              id: "sales_order.index.empty_state_sub",
              defaultMessage: "Create your first sales order to get started",
            })}
            action={
              canCreate ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/sales-order/create")}
                  leftIcon={<Icon icon="solar:add-circle-linear" className="h-4 w-4" />}
                >
                  {intl.formatMessage({ id: "sales_order.index.create_button", defaultMessage: "New order" })}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                {table.getHeaderGroups().map((hg) => (
                  <TR key={hg.id}>
                    {hg.headers.map((h) => (
                      <TH key={h.id} className={h.id === "actions" ? "text-right" : ""}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TH>
                    ))}
                  </TR>
                ))}
              </THead>
              <TBody>
                {table.getRowModel().rows.map((row) => (
                  <TR key={row.id}>
                    {row.getVisibleCells().map((c) => (
                      <TD key={c.id} className={c.column.id === "actions" ? "text-right" : ""}>
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex justify-center border-t border-slate-200 dark:border-slate-800">
              <Pagination
                page={pagination.pageIndex + 1}
                totalPages={totalPages}
                onChange={(p) => setPagination({ pageIndex: p - 1, pageSize: pagination.pageSize })}
              />
            </div>
          </>
        )}
      </Card>

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
    </section>
  );
};
