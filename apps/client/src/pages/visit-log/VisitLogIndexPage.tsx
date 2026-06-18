import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR } from '../../ui';
import { Icon } from "../../ui";
import { type ColumnDef, type PaginationState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

type VisitLogRow = {
  id: string; date: string; purpose: string | null; approvalStatus: string;
  salesman: { id: string; name: string | null };
  outlet: { id: string; name: string };
};

const statusColor: Record<string, 'default' | 'primary' | 'success' | 'danger'> = {
  DRAFT: 'default', PROPOSED: 'primary', APPROVED: 'success', REJECTED: 'danger',
};

function VisitLogIndexPage() {
  const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('visit-log@create'); const canDelete = hasPermission('visit-log@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState(''); const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [itemToDelete, setItemToDelete] = useState<VisitLogRow | null>(null); const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const { data, isLoading } = useQuery({ queryKey: ['visitLogList', pagination.pageIndex, pagination.pageSize, search], queryFn: () => trpcClient.visitLog.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize }) });

  const columns = useMemo<ColumnDef<VisitLogRow>[]>(() => [
    { id: 'date', header: 'Date', cell: ({ row }) => <span>{new Date(row.original.date).toLocaleDateString()}</span> },
    { id: 'salesman', header: 'Salesman', cell: ({ row }) => <span>{row.original.salesman.name ?? '-'}</span> },
    { id: 'outlet', header: 'Outlet', cell: ({ row }) => <span>{row.original.outlet.name}</span> },
    { id: 'purpose', header: 'Purpose', cell: ({ row }) => <span>{row.original.purpose ?? '-'}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <Chip size="sm" color={statusColor[row.original.approvalStatus] ?? 'default'} variant="flat">{row.original.approvalStatus}</Chip> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/visit-log/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
        {canDelete && <Dropdown><DropdownTrigger><Button size="sm" variant="ghost" isIconOnly><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger><DropdownMenu><DropdownItem key="delete" color="danger" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>Delete</DropdownItem></DropdownMenu></Dropdown>}
      </div>) },
  ], [navigate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as VisitLogRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const handleDelete = async () => { if (!itemToDelete || isDeleting) return; setIsDeleting(true); try { await trpcClient.visitLog.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['visitLogList'] }); setDeleteModalOpen(false); setItemToDelete(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  return (
    <section className="space-y-5" data-ai-context={JSON.stringify({ section: 'visit-log-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Visit Logs</h1></div>{canCreate && <Button color="primary" onClick={() => navigate('/visit-log/create')}><Icon icon="solar:add-circle-linear" />New Visit</Button>}</div>
      <Card>{isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (<><Table aria-label="Visit Logs"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead><TBody emptyContent="No visits found.">{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((c) => <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>)}</TR>)}</TBody></Table><div className="flex justify-center p-4"><Pagination page={pagination.pageIndex + 1} total={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div></>)}</Card>
      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}><ModalContent><ModalHeader>Delete Visit</ModalHeader><ModalBody>Delete this visit log?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button color="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { VisitLogIndexPage };