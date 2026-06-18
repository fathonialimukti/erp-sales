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

type AreaRow = {
  id: string;
  code: string | null;
  name: string;
  region: { id: string; name: string };
  _count: { outlets: number; salesmen: number };
  createdAt: string;
};

function AreaIndexPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('area@create');
  const canUpdate = hasPermission('area@update');
  const canDelete = hasPermission('area@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AreaRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['areaList', pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.area.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const columns = useMemo<ColumnDef<AreaRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: intl.formatMessage({ id: 'area.index.header_name', defaultMessage: 'Name' }),
      },
      {
        accessorKey: 'code',
        header: intl.formatMessage({ id: 'area.index.header_code', defaultMessage: 'Code' }),
        cell: ({ row }) => <span>{row.original.code ?? '-'}</span>,
      },
      {
        accessorKey: 'region.name',
        header: intl.formatMessage({ id: 'area.index.header_region', defaultMessage: 'Region' }),
        cell: ({ row }) => <span>{row.original.region.name}</span>,
      },
      {
        accessorKey: '_count.outlets',
        header: intl.formatMessage({ id: 'area.index.header_outlets', defaultMessage: 'Outlets' }),
        cell: ({ row }) => <span>{row.original._count.outlets}</span>,
      },
      {
        accessorKey: '_count.salesmen',
        header: intl.formatMessage({ id: 'area.index.header_salesmen', defaultMessage: 'Salesmen' }),
        cell: ({ row }) => <span>{row.original._count.salesmen}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/area/${row.original.id}`)}
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
                      onClick={() => navigate(`/area/${row.original.id}/edit`)}
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
    data: (data?.data ?? []) as AreaRow[],
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
      await trpcClient.area.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ['areaList'] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {intl.formatMessage({ id: 'area.index.title', defaultMessage: 'Areas' })}
        </h1>
        {canCreate && (
          <Button color="primary" onClick={() => navigate('/area/create')}>
            <Icon icon="solar:add-circle-linear" />
            {intl.formatMessage({ id: 'area.index.action_create', defaultMessage: 'Add Area' })}
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4">
          <Input
            placeholder={intl.formatMessage({ id: 'common.search.placeholder', defaultMessage: 'Search...' })}
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
            <Table aria-label={intl.formatMessage({ id: 'area.index.title', defaultMessage: 'Areas' })}>
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
              <TBody>
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

            {data?.meta?.totalPages > 1 ? (
              <div className="flex justify-end p-4">
                <Pagination
                  page={pagination.pageIndex + 1}
                  total={data.meta.totalPages}
                  onChange={(p) => setPagination((prev) => ({ ...prev, pageIndex: p - 1 }))}
                />
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent>
          <ModalHeader>
            {intl.formatMessage({ id: 'area.index.delete_title', defaultMessage: 'Delete Area' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'area.index.delete_confirm', defaultMessage: 'Are you sure you want to delete "{name}"?' },
              { name: itemToDelete?.name },
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

export { AreaIndexPage };