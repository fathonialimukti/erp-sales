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

type CustomerRow = {
  id: string;
  code: string | null;
  name: string;
  taxId: string | null;
  status: string;
  _count: { outlets: number; salesOrders: number; contacts: number };
  createdAt: string;
};

function CustomerIndexPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('customer@create');
  const canUpdate = hasPermission('customer@update');
  const canDelete = hasPermission('customer@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CustomerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['customerList', pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.customer.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: intl.formatMessage({ id: 'customer.index.header_name', defaultMessage: 'Name' }),
      },
      {
        accessorKey: 'code',
        header: intl.formatMessage({ id: 'customer.index.header_code', defaultMessage: 'Code' }),
        cell: ({ row }) => <span>{row.original.code ?? '-'}</span>,
      },
      {
        accessorKey: 'taxId',
        header: intl.formatMessage({ id: 'customer.index.header_tax_id', defaultMessage: 'Tax ID' }),
        cell: ({ row }) => <span>{row.original.taxId ?? '-'}</span>,
      },
      {
        accessorKey: 'status',
        header: intl.formatMessage({ id: 'customer.index.header_status', defaultMessage: 'Status' }),
        cell: ({ row }) => (
          <span className={row.original.status === 'ACTIVE' ? 'text-success' : 'text-muted'}>
            {row.original.status}
          </span>
        ),
      },
      {
        id: 'outlets',
        header: intl.formatMessage({ id: 'customer.index.header_outlets', defaultMessage: 'Outlets' }),
        cell: ({ row }) => <span>{row.original._count.outlets}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/customer/${row.original.id}`)}
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
                      onClick={() => navigate(`/customer/${row.original.id}/edit`)}
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
    data: (data?.data ?? []) as CustomerRow[],
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
      await trpcClient.customer.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ['customerList'] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-5" data-ai-context={JSON.stringify({ section: 'customer-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {intl.formatMessage({ id: 'customer.index.title', defaultMessage: 'Customers' })}
          </h1>
          <p className="text-sm text-muted">
            {intl.formatMessage({ id: 'customer.index.description', defaultMessage: 'Manage your customer accounts, outlets, and contacts.' })}
          </p>
        </div>
        {canCreate && (
          <Button color="primary" onClick={() => navigate('/customer/create')}>
            <Icon icon="solar:add-circle-linear" />
            {intl.formatMessage({ id: 'customer.index.create_button', defaultMessage: 'Add Customer' })}
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4">
          <Input
            placeholder={intl.formatMessage({ id: 'customer.index.search_placeholder', defaultMessage: 'Search customers by name, code, or tax ID...' })}
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
            <Table aria-label={intl.formatMessage({ id: 'customer.index.title', defaultMessage: 'Customers' })}>
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
              <TBody emptyContent={intl.formatMessage({ id: 'customer.index.empty_state', defaultMessage: 'No customers found.' })}>
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

      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent>
          <ModalHeader>
            {intl.formatMessage({ id: 'customer.index.delete_title', defaultMessage: 'Delete Customer' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'customer.index.delete_confirm_body', defaultMessage: 'Are you sure you want to delete "{name}"? All outlets and associated data will also be removed.' },
              { name: itemToDelete?.name ?? '' },
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting
                ? intl.formatMessage({ id: 'common.action.deleting', defaultMessage: 'Deleting...' })
                : intl.formatMessage({ id: 'common.action.delete', defaultMessage: 'Delete' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}

export { CustomerIndexPage };