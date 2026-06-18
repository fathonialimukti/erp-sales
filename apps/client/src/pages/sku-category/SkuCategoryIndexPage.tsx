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

type SkuCategoryRow = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  _count: { skus: number };
};

function SkuCategoryIndexPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('sku@create');
  const canUpdate = hasPermission('sku@update');
  const canDelete = hasPermission('sku@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SkuCategoryRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPagination((prev) => ({ ...prev, pageIndex: 0 })); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['skuCategoryList', pagination.pageIndex, pagination.pageSize, search],
    queryFn: () => trpcClient.skuCategory.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }),
  });

  const columns = useMemo<ColumnDef<SkuCategoryRow>[]>(() => [
    { accessorKey: 'name', header: intl.formatMessage({ id: 'sku_category.index.header_name', defaultMessage: 'Name' }) },
    { accessorKey: 'code', header: intl.formatMessage({ id: 'sku_category.index.header_code', defaultMessage: 'Code' }), cell: ({ row }) => <span>{row.original.code ?? '-'}</span> },
    { id: 'skus', header: intl.formatMessage({ id: 'sku_category.index.header_skus', defaultMessage: 'Products' }), cell: ({ row }) => <span>{row.original._count.skus}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/sku-category/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
          {(canUpdate || canDelete) && (
            <Dropdown><DropdownTrigger><Button size="sm" variant="ghost" isIconOnly><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger>
              <DropdownMenu>
                {canUpdate ? <DropdownItem key="edit" onClick={() => navigate(`/sku-category/${row.original.id}/edit`)}>{intl.formatMessage({ id: 'common.action.edit', defaultMessage: 'Edit' })}</DropdownItem> : null}
                {canDelete ? <DropdownItem key="delete" color="danger" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>{intl.formatMessage({ id: 'common.action.delete', defaultMessage: 'Delete' })}</DropdownItem> : null}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      ),
    },
  ], [intl, navigate, canUpdate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as SkuCategoryRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return; setIsDeleting(true);
    try { await trpcClient.skuCategory.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['skuCategoryList'] }); setDeleteModalOpen(false); setItemToDelete(null); }
    catch (error) { console.error(error); }
    finally { setIsDeleting(false); }
  };

  return (
    <section className="space-y-5" data-ai-context={JSON.stringify({ section: 'sku-category-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{intl.formatMessage({ id: 'sku_category.index.title', defaultMessage: 'Product Categories' })}</h1></div>
        {canCreate && <Button color="primary" onClick={() => navigate('/sku-category/create')}><Icon icon="solar:add-circle-linear" />{intl.formatMessage({ id: 'sku_category.index.create_button', defaultMessage: 'Add Category' })}</Button>}
      </div>
      <Card>
        <div className="p-4"><Input placeholder={intl.formatMessage({ id: 'sku_category.index.search_placeholder', defaultMessage: 'Search...' })} value={searchInput} onChange={setSearchInput} startContent={<Icon icon="solar:magnifer-linear" />} isClearable /></div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
          <>
            <Table aria-label="Product Categories"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead>
              <TBody emptyContent={intl.formatMessage({ id: 'sku_category.index.empty_state', defaultMessage: 'No categories found.' })}>{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((cell) => <TD key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TD>)}</TR>)}</TBody>
            </Table>
            <div className="flex justify-center p-4"><Pagination page={pagination.pageIndex + 1} total={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div>
          </>
        )}
      </Card>
      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}><ModalContent><ModalHeader>{intl.formatMessage({ id: 'sku_category.index.delete_title', defaultMessage: 'Delete Category' })}</ModalHeader><ModalBody>{intl.formatMessage({ id: 'sku_category.index.delete_confirm_body', defaultMessage: 'Delete this category?' }, { name: itemToDelete?.name ?? '' })}</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}</Button><Button color="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? intl.formatMessage({ id: 'common.action.deleting', defaultMessage: 'Deleting...' }) : intl.formatMessage({ id: 'common.action.delete', defaultMessage: 'Delete' })}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { SkuCategoryIndexPage };