import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR } from '../../ui';
import { Icon } from "../../ui";
import { type ColumnDef, type PaginationState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

type EventProposalRow = {
  id: string; documentNumber: string | null; name: string; eventType: string | null; eventDate: string; approvalStatus: string; proposedBudget: number | null;
  area: { id: string; name: string }; createdBy: { id: string; name: string | null } | null;
  _count: { skus: number };
};

const statusColor: Record<string, 'default' | 'primary' | 'success' | 'danger'> = { DRAFT: 'default', PROPOSED: 'primary', APPROVED: 'success', REJECTED: 'danger' };

function EventProposalIndexPage() {
  const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('event-proposal@create'); const canUpdate = hasPermission('event-proposal@update'); const canDelete = hasPermission('event-proposal@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState(''); const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [itemToDelete, setItemToDelete] = useState<EventProposalRow | null>(null); const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const { data, isLoading } = useQuery({ queryKey: ['eventProposalList', pagination.pageIndex, pagination.pageSize, search], queryFn: () => trpcClient.eventProposal.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }) });

  const columns = useMemo<ColumnDef<EventProposalRow>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { id: 'eventType', header: 'Type', cell: ({ row }) => <Chip size="sm" variant="flat">{row.original.eventType ?? '-'}</Chip> },
    { id: 'area', header: 'Area', cell: ({ row }) => <span>{row.original.area.name}</span> },
    { id: 'date', header: 'Event Date', cell: ({ row }) => <span>{new Date(row.original.eventDate).toLocaleDateString()}</span> },
    { id: 'budget', header: 'Budget', cell: ({ row }) => <span>{row.original.proposedBudget ? `IDR ${row.original.proposedBudget.toLocaleString()}` : '-'}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <Chip size="sm" color={statusColor[row.original.approvalStatus] ?? 'default'} variant="flat">{row.original.approvalStatus}</Chip> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/event-proposal/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
        {(canUpdate || canDelete) && <Dropdown><DropdownTrigger><Button size="sm" variant="ghost" isIconOnly><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger><DropdownMenu>{canUpdate && row.original.approvalStatus === 'DRAFT' ? <DropdownItem key="edit" onClick={() => navigate(`/event-proposal/${row.original.id}/edit`)}>Edit</DropdownItem> : null}{canDelete ? <DropdownItem key="delete" color="danger" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>Delete</DropdownItem> : null}</DropdownMenu></Dropdown>}
      </div>) },
  ], [navigate, canUpdate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as EventProposalRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const handleDelete = async () => { if (!itemToDelete || isDeleting) return; setIsDeleting(true); try { await trpcClient.eventProposal.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['eventProposalList'] }); setDeleteModalOpen(false); setItemToDelete(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  return (
    <section className="space-y-5" data-ai-context={JSON.stringify({ section: 'event-proposal-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Event Proposals</h1></div>{canCreate && <Button color="primary" onClick={() => navigate('/event-proposal/create')}><Icon icon="solar:add-circle-linear" />New Proposal</Button>}</div>
      <Card><div className="p-4"><Input placeholder="Search proposals..." value={searchInput} onChange={setSearchInput} startContent={<Icon icon="solar:magnifer-linear" />} isClearable /></div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (<><Table aria-label="Event Proposals"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead><TBody emptyContent="No proposals found.">{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((c) => <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>)}</TR>)}</TBody></Table><div className="flex justify-center p-4"><Pagination page={pagination.pageIndex + 1} total={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div></>)}</Card>
      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}><ModalContent><ModalHeader>Delete Proposal</ModalHeader><ModalBody>Delete "{itemToDelete?.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button color="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { EventProposalIndexPage };