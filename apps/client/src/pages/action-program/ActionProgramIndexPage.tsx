import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR, Icon } from '../../ui';

import { type ColumnDef, type PaginationState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

type ActionProgramRow = {
  id: string; documentNumber: string | null; name: string; type: string; startDate: string; endDate: string; approvalStatus: string; budgetAmount: number | null;
  area: { id: string; name: string }; pic: { id: string; name: string | null };
  _count: { outlets: number; skus: number };
};

const statusTone: Record<string, 'neutral' | 'accent' | 'success' | 'danger'> = { DRAFT: 'neutral', PROPOSED: 'accent', APPROVED: 'success', REJECTED: 'danger' };

function ActionProgramIndexPage() {
  const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('action-program@create'); const canUpdate = hasPermission('action-program@update'); const canDelete = hasPermission('action-program@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState(''); const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [itemToDelete, setItemToDelete] = useState<ActionProgramRow | null>(null); const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const { data, isLoading } = useQuery({ queryKey: ['actionProgramList', pagination.pageIndex, pagination.pageSize, search], queryFn: () => trpcClient.actionProgram.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }) });

  const columns = useMemo<ColumnDef<ActionProgramRow>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Chip size="sm">{row.original.type}</Chip> },
    { id: 'area', header: 'Area', cell: ({ row }) => <span>{row.original.area.name}</span> },
    { id: 'budget', header: 'Budget', cell: ({ row }) => <span>{row.original.budgetAmount ? `IDR ${row.original.budgetAmount.toLocaleString()}` : '-'}</span> },
    { id: 'outlets', header: 'Outlets', cell: ({ row }) => <span>{row.original._count.outlets}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <Chip size="sm" tone={statusTone[row.original.approvalStatus] ?? 'neutral'}>{row.original.approvalStatus}</Chip> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/action-program/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
        {(canUpdate || canDelete) && <Dropdown><DropdownTrigger><Button size="sm" variant="ghost"><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger><DropdownMenu>{canUpdate && row.original.approvalStatus === 'DRAFT' ? <DropdownItem key="edit" onClick={() => navigate(`/action-program/${row.original.id}/edit`)}>Edit</DropdownItem> : null}{canDelete ? <DropdownItem key="delete" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>Delete</DropdownItem> : null}</DropdownMenu></Dropdown>}
      </div>) },
  ], [navigate, canUpdate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as ActionProgramRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const handleDelete = async () => { if (!itemToDelete || isDeleting) return; setIsDeleting(true); try { await trpcClient.actionProgram.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['actionProgramList'] }); setDeleteModalOpen(false); setItemToDelete(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  return (
    <section className="space-y-5" data-ai-context={JSON.stringify({ section: 'action-program-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Action Programs</h1></div>{canCreate && <Button variant="primary" onClick={() => navigate('/action-program/create')}><Icon icon="solar:add-circle-linear" />New Program</Button>}</div>
      <Card><div className="p-4"><Input placeholder="Search programs..." value={searchInput} onValueChange={setSearchInput} leftIcon={<Icon icon="solar:magnifer-linear" />} /></div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (<><Table aria-label="Action Programs"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead><TBody emptyContent="No programs found.">{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((c) => <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>)}</TR>)}</TBody></Table><div className="flex justify-center p-4"><Pagination page={pagination.pageIndex + 1} totalPages={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div></>)}</Card>
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Program</ModalHeader><ModalBody>Delete "{itemToDelete?.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { ActionProgramIndexPage };