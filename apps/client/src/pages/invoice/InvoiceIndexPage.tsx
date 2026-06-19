import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR, Icon } from '../../ui';

import { type ColumnDef, type PaginationState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

type InvoiceRow = {
  id: string; documentNumber: string | null; date: string; dueDate: string; status: string; grandTotal: number; balanceDue: number;
  customer: { id: string; name: string };
  salesOrder: { id: string; documentNumber: string | null } | null;
  _count: { payments: number };
};

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'neutral', PAID: 'success', PARTIAL: 'warning', OVERDUE: 'danger',
};

function InvoiceIndexPage() {
  const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('invoice@create'); const canUpdate = hasPermission('invoice@update'); const canDelete = hasPermission('invoice@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState(''); const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [itemToDelete, setItemToDelete] = useState<InvoiceRow | null>(null); const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const { data, isLoading } = useQuery({ queryKey: ['invoiceList', pagination.pageIndex, pagination.pageSize, search], queryFn: () => trpcClient.invoice.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }) });

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(() => [
    { id: 'documentNumber', header: intl.formatMessage({ id: 'invoice.index.header_doc', defaultMessage: 'Invoice #' }), cell: ({ row }) => <span className="font-mono text-sm">{row.original.documentNumber ?? row.original.id.slice(0, 8)}</span> },
    { id: 'customer', header: intl.formatMessage({ id: 'invoice.index.header_customer', defaultMessage: 'Customer' }), cell: ({ row }) => <span>{row.original.customer.name}</span> },
    { id: 'total', header: intl.formatMessage({ id: 'invoice.index.header_total', defaultMessage: 'Total' }), cell: ({ row }) => <span className="font-medium">IDR {row.original.grandTotal.toLocaleString()}</span> },
    { id: 'balanceDue', header: intl.formatMessage({ id: 'invoice.index.header_balance', defaultMessage: 'Balance Due' }), cell: ({ row }) => <span className={row.original.balanceDue > 0 ? 'text-warning' : 'text-success'}>IDR {row.original.balanceDue.toLocaleString()}</span> },
    { id: 'dueDate', header: intl.formatMessage({ id: 'invoice.index.header_due', defaultMessage: 'Due Date' }), cell: ({ row }) => <span>{new Date(row.original.dueDate).toLocaleDateString()}</span> },
    { id: 'status', header: intl.formatMessage({ id: 'invoice.index.header_status', defaultMessage: 'Status' }), cell: ({ row }) => <Chip size="sm" tone={statusTone[row.original.status] ?? 'neutral'}>{row.original.status}</Chip> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/invoice/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
        {(canUpdate || canDelete) && <Dropdown><DropdownTrigger><Button size="icon" variant="ghost"><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger><DropdownMenu>{canUpdate ? <DropdownItem key="edit" onClick={() => navigate(`/invoice/${row.original.id}/edit`)}>Edit</DropdownItem> : null}{canDelete ? <DropdownItem key="delete" tone="danger" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>Delete</DropdownItem> : null}</DropdownMenu></Dropdown>}
      </div>) },
  ], [intl, navigate, canUpdate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as unknown as InvoiceRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });

  const handleDelete = async () => { if (!itemToDelete || isDeleting) return; setIsDeleting(true); try { await trpcClient.invoice.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['invoiceList'] }); setDeleteModalOpen(false); setItemToDelete(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  return (
    <section className="space-y-5" data-ai-context={JSON.stringify({ section: 'invoice-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">{intl.formatMessage({ id: 'invoice.index.title', defaultMessage: 'Invoices' })}</h1></div>{canCreate && <Button variant="primary" onClick={() => navigate('/invoice/create')}><Icon icon="solar:add-circle-linear" />New Invoice</Button>}</div>
      <Card><div className="p-4"><Input placeholder="Search invoices..." value={searchInput} onValueChange={setSearchInput} leftIcon={<Icon icon="solar:magnifer-linear" />} /></div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (<><Table aria-label="Invoices"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead><TBody emptyContent="No invoices found.">{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((c) => <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>)}</TR>)}</TBody></Table><div className="flex justify-center p-4"><Pagination page={pagination.pageIndex + 1} totalPages={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div></>)}</Card>
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Invoice</ModalHeader><ModalBody>Delete "{itemToDelete?.documentNumber ?? 'invoice'}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { InvoiceIndexPage };