import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR, Icon } from '../../ui';

import { type ColumnDef, type PaginationState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';
import './Sku.css';

type SkuRow = {
  id: string; code: string | null; name: string; basePrice: number | null; baseUnit: string; status: string;
  category: { id: string; name: string } | null;
  _count: { salesOrderItems: number };
};

function SkuIndexPage() {
  const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('sku@create'); const canUpdate = hasPermission('sku@update'); const canDelete = hasPermission('sku@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState(''); const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [itemToDelete, setItemToDelete] = useState<SkuRow | null>(null); const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const { data, isLoading } = useQuery({ queryKey: ['skuList', pagination.pageIndex, pagination.pageSize, search], queryFn: () => trpcClient.sku.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }) });

  const columns = useMemo<ColumnDef<SkuRow>[]>(() => [
    { accessorKey: 'name', header: intl.formatMessage({ id: 'sku.index.header_name', defaultMessage: 'Name' }) },
    { accessorKey: 'code', header: intl.formatMessage({ id: 'sku.index.header_code', defaultMessage: 'Code' }), cell: ({ row }) => <span>{row.original.code ?? '-'}</span> },
    { id: 'category', header: intl.formatMessage({ id: 'sku.index.header_category', defaultMessage: 'Category' }), cell: ({ row }) => <span>{row.original.category?.name ?? '-'}</span> },
    { accessorKey: 'basePrice', header: intl.formatMessage({ id: 'sku.index.header_price', defaultMessage: 'Price' }), cell: ({ row }) => <span>{row.original.basePrice ? `IDR ${row.original.basePrice.toLocaleString()}` : '-'}</span> },
    { accessorKey: 'status', header: intl.formatMessage({ id: 'sku.index.header_status', defaultMessage: 'Status' }), cell: ({ row }) => <span className={row.original.status === 'ACTIVE' ? 'sku-status-active' : 'sku-status-inactive'}>{row.original.status}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="sku-actions">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/sku/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
        {(canUpdate || canDelete) && <Dropdown><DropdownTrigger><Button size="icon" variant="ghost"><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger><DropdownMenu>{canUpdate ? <DropdownItem key="edit" onClick={() => navigate(`/sku/${row.original.id}/edit`)}>Edit</DropdownItem> : null}{canDelete ? <DropdownItem key="delete" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>Delete</DropdownItem> : null}</DropdownMenu></Dropdown>}
      </div>) },
  ], [intl, navigate, canUpdate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as SkuRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });

  const handleDelete = async () => { if (!itemToDelete || isDeleting) return; setIsDeleting(true); try { await trpcClient.sku.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['skuList'] }); setDeleteModalOpen(false); setItemToDelete(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  return (
    <section className="sku-page" data-ai-context={JSON.stringify({ section: 'sku-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="sku-header"><div><h1 className="sku-header__title">Products</h1></div>{canCreate && <Button variant="primary" onClick={() => navigate('/sku/create')}><Icon icon="solar:add-circle-linear" />Add Product</Button>}</div>
      <Card><div className="sku-search-wrap"><Input placeholder="Search products..." value={searchInput} onValueChange={setSearchInput} leftIcon={<Icon icon="solar:magnifer-linear" />} /></div>
        {isLoading ? <div className="sku-loading"><Spinner /></div> : (<><Table aria-label="Products"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead><TBody emptyContent="No products found.">{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((c) => <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>)}</TR>)}</TBody></Table><div className="sku-pagination-wrap"><Pagination page={pagination.pageIndex + 1} totalPages={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div></>)}</Card>
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Product</ModalHeader><ModalBody>Delete "{itemToDelete?.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { SkuIndexPage };
