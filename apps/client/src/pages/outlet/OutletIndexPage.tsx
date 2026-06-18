import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR } from '../../ui';
import { Icon } from "../../ui";
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

type OutletRow = {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  status: string;
  customer: { id: string; name: string };
  area: { id: string; name: string };
  _count: { visitLogs: number; salesOrders: number };
  createdAt: string;
};

function OutletIndexPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('outlet@create');
  const canUpdate = hasPermission('outlet@update');
  const canDelete = hasPermission('outlet@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OutletRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['outletList', pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.outlet.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const columns = useMemo<ColumnDef<OutletRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: intl.formatMessage({ id: 'outlet.index.header_name', defaultMessage: 'Name' }),
      },
      {
        accessorKey: 'code',
        header: intl.formatMessage({ id: 'outlet.index.header_code', defaultMessage: 'Code' }),
        cell: ({ row }) => <span>{row.original.code ?? '-'}</span>,
      },
      {
        id: 'customer',
        header: intl.formatMessage({ id: 'outlet.index.header_customer', defaultMessage: 'Customer' }),
        cell: ({ row }) => <span>{row.original.customer.name}</span>,
      },
      {
        id: 'area',
        header: intl.formatMessage({ id: 'outlet.index.header_area', defaultMessage: 'Area' }),
        cell: ({ row }) => <span>{row.original.area.name}</span>,
      },
      {
        id: 'sales',
        header: intl.formatMessage({ id: 'outlet.index.header_orders', defaultMessage: 'Orders' }),
        cell: ({ row }) => <span>{row.original._count.salesOrders}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/outlet/${row.original.id}`)}
            >
              <Icon icon="solar:eye-linear" />
            </Button>
            {(canUpdate || canDelete) && (
              <Dropdown>
                <DropdownTrigger>
                  <Button size="sm" variant="ghost" isIconOnly>
                    <Icon icon="solar:menu-dots-bold" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu>
                  {canUpdate ? (
                    <DropdownItem
                      key="edit"
                      onClick={() => navigate(`/outlet/${row.original.id}/edit`)}
                    >
                      {intl.formatMessage({ id: 'common.action.edit', defaultMessage: 'Edit' })}
                    </DropdownItem>
                  ) : null}
                  {canDelete ? (
                    <DropdownItem
                      key="delete"
                      color="danger"
                      onClick={() => {
                        setItemToDelete(row.original);
                        setDeleteModalOpen(true);
                      }}
                    >
                      {intl.formatMessage({ id: 'common.action.delete', defaultMessage: 'Delete' })}
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        ),
      },
    ],
    [intl, navigate, canUpdate, canDelete],
  );

  const table = useReactTable({
    data: (data?.data ?? []) as OutletRow[],
    columns,
    pageCount: data?.meta?.totalPages ?? 0,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.outlet.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ['outletList'] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-5" data-ai-context={JSON.stringify({ section: 'outlet-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {intl.formatMessage({ id: 'outlet.index.title', defaultMessage: 'Outlets' })}
          </h1>
          <p className="text-sm text-muted">
            {intl.formatMessage({ id: 'outlet.index.description', defaultMessage: 'Manage retail outlets and store locations.' })}
          </p>
        </div>
        {canCreate && (
          <Button color="primary" onClick={() => navigate('/outlet/create')}>
            <Icon icon="solar:add-circle-linear" />
            {intl.formatMessage({ id: 'outlet.index.create_button', defaultMessage: 'Add Outlet' })}
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4">
          <Input
            placeholder={intl.formatMessage({ id: 'outlet.index.search_placeholder', defaultMessage: 'Search outlets by name, code, or address...' })}
            value={searchInput}
            onChange={setSearchInput}
            startContent={<Icon icon="solar:magnifer-linear" />}
            isClearable
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <Table aria-label={intl.formatMessage({ id: 'outlet.index.title', defaultMessage: 'Outlets' })}>
              <THead>
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => (
                    <TH key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TH>
                  )),
                )}
              </THead>
              <TBody emptyContent={intl.formatMessage({ id: 'outlet.index.empty_state', defaultMessage: 'No outlets found.' })}>
                {table.getRowModel().rows.map((row) => (
                  <TR key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TD key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex justify-center p-4">
              <Pagination
                page={pagination.pageIndex + 1}
                total={data?.meta?.totalPages ?? 1}
                onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })}
              />
            </div>
          </>
        )}
      </Card>
    </section>
  );
}

export { OutletIndexPage };