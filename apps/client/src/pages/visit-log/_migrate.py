import os

files = {}

files['pages/visit-log/VisitLogIndexPage.tsx'] = """import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR, Icon } from '../../ui';

import { type ColumnDef, type PaginationState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';
import './VisitLog.css';

type VisitLogRow = {
  id: string; date: string; purpose: string | null; approvalStatus: string;
  salesman: { id: string; name: string | null };
  outlet: { id: string; name: string };
};

const statusColor: Record<string, 'neutral' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'neutral', PROPOSED: 'info', APPROVED: 'success', REJECTED: 'danger',
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
    { id: 'status', header: 'Status', cell: ({ row }) => <Chip size="sm" tone={statusColor[row.original.approvalStatus] ?? 'neutral'}>{row.original.approvalStatus}</Chip> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="vl-actions">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/visit-log/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
        {canDelete && <Dropdown><DropdownTrigger><Button size="icon" variant="ghost"><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger><DropdownMenu><DropdownItem key="delete" color="danger" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>Delete</DropdownItem></DropdownMenu></Dropdown>}
      </div>) },
  ], [navigate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as VisitLogRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const handleDelete = async () => { if (!itemToDelete || isDeleting) return; setIsDeleting(true); try { await trpcClient.visitLog.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['visitLogList'] }); setDeleteModalOpen(false); setItemToDelete(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  return (
    <section className="vl-page" data-ai-context={JSON.stringify({ section: 'visit-log-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="vl-header"><div><h1 className="vl-header__title">Visit Logs</h1></div>{canCreate && <Button variant="primary" onClick={() => navigate('/visit-log/create')}><Icon icon="solar:add-circle-linear" />New Visit</Button>}</div>
      <Card>{isLoading ? <div className="vl-loading"><Spinner /></div> : (<><Table aria-label="Visit Logs"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead><TBody emptyContent="No visits found.">{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((c) => <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>)}</TR>)}</TBody></Table><div className="vl-pagination-wrap"><Pagination page={pagination.pageIndex + 1} totalPages={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div></>)}</Card>
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Visit</ModalHeader><ModalBody>Delete this visit log?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { VisitLogIndexPage };
"""

files['pages/visit-log/VisitLogDetailPage.tsx'] = """import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { ApprovalHistory } from '../../components/ApprovalHistory';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';
import './VisitLog.css';

interface VisitLogDetail {
  id: string; date: string; checkInAt: string | null; checkOutAt: string | null; purpose: string | null; notes: string | null; feedback: string | null; photos: any; approvalStatus: string; approvalHistory: any;
  salesman: { id: string; name: string | null };
  outlet: { id: string; name: string; customer: { id: string; name: string }; area: { id: string; name: string } };
  salesOrder: { id: string; documentNumber: string | null; grandTotal: number | null } | null;
  createdAt: string;
}

function VisitLogDetailPage() {
  const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSubmit = hasPermission('visit-log@create'); const canApprove = hasPermission('visit-log@read'); const canDelete = hasPermission('visit-log@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [isDeleting, setIsDeleting] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false); const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['visitLogDetail', id], enabled: Boolean(id), queryFn: () => trpcClient.visitLog.detail.query({ id: id ?? '' }) });
  const record = data as VisitLogDetail | undefined;

  const submitMutation = useMutation({ mutationFn: (vid: string) => trpcClient.visitLog.submit.mutate({ id: vid }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['visitLogDetail', id] }); queryClient.invalidateQueries({ queryKey: ['visitLogList'] }); } });
  const approveMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.visitLog.approve.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['visitLogDetail', id] }); queryClient.invalidateQueries({ queryKey: ['visitLogList'] }); setApproveModalOpen(false); } });
  const rejectMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.visitLog.reject.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['visitLogDetail', id] }); queryClient.invalidateQueries({ queryKey: ['visitLogList'] }); setRejectModalOpen(false); } });

  const handleDelete = async () => { if (!record || isDeleting) return; setIsDeleting(true); try { await trpcClient.visitLog.delete.mutate({ id: record.id }); await queryClient.invalidateQueries({ queryKey: ['visitLogList'] }); setDeleteModalOpen(false); navigate('/visit-log'); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  if (isLoading) return <p className="vl-loading-text">Loading...</p>;
  if (!record) return <div className="vl-not-found"><p className="vl-not-found__text">Not found.</p><Button variant="ghost" onClick={() => navigate('/visit-log')}>Back</Button></div>;

  return (
    <section className="vl-page" data-ai-context={JSON.stringify({ section: 'visit-log-detail', id: record.id, salesman: record.salesman.name, outlet: record.outlet.name, approvalStatus: record.approvalStatus })}>
      <PageHeader title={`Visit: ${new Date(record.date).toLocaleDateString()}`} onBack={() => navigate('/visit-log')} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />

      <div className="vl-chips">
        <Chip size="sm" tone={record.approvalStatus === 'APPROVED' ? 'success' : record.approvalStatus === 'REJECTED' ? 'danger' : record.approvalStatus === 'PROPOSED' ? 'accent' : 'neutral'}>{record.approvalStatus}</Chip>
        {canSubmit && record.approvalStatus === 'DRAFT' && <Button size="sm" variant="primary" onClick={() => submitMutation.mutate(record.id)} disabled={submitMutation.isPending}>Submit for Approval</Button>}
        {canApprove && record.approvalStatus === 'PROPOSED' && <Button size="sm" variant="success" onClick={() => { setMessage(''); setApproveModalOpen(true); }}>Approve</Button>}
        {canApprove && (record.approvalStatus === 'PROPOSED' || record.approvalStatus === 'DRAFT') && <Button size="sm" variant="danger" onClick={() => { setMessage(''); setRejectModalOpen(true); }}>Reject</Button>}
      </div>

      <Card><div className="vl-detail-grid vl-detail-grid--3">
        <Field label="Salesman" value={record.salesman.name} />
        <Field label="Outlet" value={record.outlet.name} />
        <Field label="Customer" value={record.outlet.customer.name} />
        <Field label="Area" value={record.outlet.area.name} />
        <Field label="Check In" value={record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString() : null} />
        <Field label="Check Out" value={record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString() : null} />
      </div></Card>

      {record.purpose && <Card><div className="vl-section-card"><h3 className="vl-section-card__subtitle">Purpose</h3><p className="vl-section-card__text">{record.purpose}</p></div></Card>}
      {record.notes && <Card><div className="vl-section-card"><h3 className="vl-section-card__subtitle">Notes</h3><p className="vl-section-card__text">{record.notes}</p></div></Card>}
      {record.feedback && <Card><div className="vl-section-card"><h3 className="vl-section-card__subtitle">Feedback</h3><p className="vl-section-card__text">{record.feedback}</p></div></Card>}
      {record.salesOrder && <Card><div className="vl-section-card"><h3 className="vl-section-card__subtitle">Sales Order</h3><p className="vl-section-card__text vl-section-card__highlight">{record.salesOrder.documentNumber} — IDR {(record.salesOrder.grandTotal ?? 0).toLocaleString()}</p></div></Card>}

      {record.approvalHistory && <Card><div className="vl-section-card"><h3 className="vl-section-card__title">Approval History</h3><ApprovalHistory history={Array.isArray(record.approvalHistory) ? record.approvalHistory : []} /></div></Card>}

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Visit</ModalHeader><ModalBody>Delete this visit log?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={approveModalOpen} onClose={() => setApproveModalOpen(false)}><ModalContent><ModalHeader>Approve Visit</ModalHeader><ModalBody><Textarea label="Message (optional)" value={message} onValueChange={setMessage} placeholder="Approval note" /></ModalBody><ModalFooter><Button variant="ghost" onClick={() => setApproveModalOpen(false)}>Cancel</Button><Button variant="success" onClick={() => approveMutation.mutate({ id: record.id, message: message || undefined })} disabled={approveMutation.isPending}>{approveMutation.isPending ? '...' : 'Approve'}</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)}><ModalContent><ModalHeader>Reject Visit</ModalHeader><ModalBody><Textarea label="Reason" value={message} onValueChange={setMessage} placeholder="Reason for rejection" /></ModalBody><ModalFooter><Button variant="ghost" onClick={() => setRejectModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => rejectMutation.mutate({ id: record.id, message: message || undefined })} disabled={rejectMutation.isPending}>{rejectMutation.isPending ? '...' : 'Reject'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="vl-field"><p className="vl-field__label">{label}</p><div className="vl-field__value">{value || '-'}</div></div>;
}

export { VisitLogDetailPage };
"""

files['pages/visit-log/VisitLogFormPage.tsx'] = """import { useState } from 'react';
import { Button, Card, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, Textarea, FormField } from '../../ui';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';
import { trpcClient } from '../../lib/trpc';
import './VisitLog.css';

type FormValues = { salesmanId: string; outletId: string; date: string; checkInAt: string; checkOutAt: string; purpose: string; notes: string; feedback: string; salesOrderId: string; };
const defaults = (): FormValues => ({ salesmanId: '', outletId: '', date: new Date().toISOString().slice(0, 10), checkInAt: '', checkOutAt: '', purpose: '', notes: '', feedback: '', salesOrderId: '' });

function VisitLogFormPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const { data: users } = useQuery({ queryKey: ['userSelect'], queryFn: () => trpcClient.user.list.query({ limit: 200 }), staleTime: 5 * 60 * 1000 });
  const { data: outlets } = useQuery({ queryKey: ['outletSelect'], queryFn: () => trpcClient.outlet.list.query({ limit: 500 }), staleTime: 5 * 60 * 1000 });
  const userList = (users as any)?.data ?? []; const outletList = (outlets as any)?.data ?? [];

  const createMutation = useMutation<any, unknown, any>({
    mutationFn: (p) => trpcClient.visitLog.create.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['visitLogList'] }); setResultMessage('Created.'); setModalStage('success'); setTimeout(() => navigate(`/visit-log/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });

  const form = useForm({ defaultValues: defaults(), onSubmit: async ({ value }) => { setFormError(null); setModalStage('loading'); createMutation.mutate({ ...value, salesOrderId: value.salesOrderId || null }); } });
  useAiFillForm({ salesmanId: (v: unknown) => form.setFieldValue('salesmanId', String(v)), purpose: (v: unknown) => form.setFieldValue('purpose', String(v)), notes: (v: unknown) => form.setFieldValue('notes', String(v)), feedback: (v: unknown) => form.setFieldValue('feedback', String(v)) });

  return (
    <section className="vl-page" data-ai-context={JSON.stringify({ section: 'visit-log-form', mode: 'create', availableSalesmen: userList.map((u: any) => ({ id: u.id, name: u.name })), availableOutlets: outletList.map((o: any) => ({ id: o.id, name: o.name, customer: o.customer?.name })) })}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <PageHeader title="New Visit Log" onBack={() => navigate('/visit-log')} />
        <Card><div className="vl-form-grid">
          <form.Field name="salesmanId" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <div><label className="vl-form-label">Salesman *</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="vl-form-select"><option value="">Select...</option>{userList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}</form.Field>
          <form.Field name="outletId" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <div><label className="vl-form-label">Outlet *</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="vl-form-select"><option value="">Select...</option>{outletList.map((o: any) => <option key={o.id} value={o.id}>{o.name} ({o.customer?.name})</option>)}</select></div>}</form.Field>
          <form.Field name="date">{(f) => <FormField><Label>Date</Label><Input type="date" value={f.state.value} onValueChange={f.handleChange} /></FormField>}</form.Field>
          <form.Field name="checkInAt">{(f) => <FormField><Label>Check In</Label><Input type="time" value={f.state.value} onValueChange={f.handleChange} /></FormField>}</form.Field>
          <form.Field name="checkOutAt">{(f) => <FormField><Label>Check Out</Label><Input type="time" value={f.state.value} onValueChange={f.handleChange} /></FormField>}</form.Field>
          <form.Field name="salesOrderId">{(f) => <FormField><Label>Sales Order ID (optional)</Label><Input value={f.state.value} onValueChange={f.handleChange} placeholder="Paste SO ID" /></FormField>}</form.Field>
          <form.Field name="purpose">{(f) => <FormField><Label>Purpose</Label><Textarea value={f.state.value} onValueChange={f.handleChange} placeholder="Visit purpose" /></FormField>}</form.Field>
          <form.Field name="notes">{(f) => <FormField><Label>Notes</Label><Textarea value={f.state.value} onValueChange={f.handleChange} placeholder="Visit notes" /></FormField>}</form.Field>
          <form.Field name="feedback">{(f) => <FormField><Label>Feedback</Label><Textarea value={f.state.value} onValueChange={f.handleChange} placeholder="Post-visit feedback" /></FormField>}</form.Field>
        </div></Card>
        {formError && <p className="vl-form-error">{formError}</p>}
        <div className="vl-form-actions"><Button variant="ghost" onClick={() => navigate('/visit-log')}>Cancel</Button><Button variant="primary" type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? <Spinner size="sm" /> : 'Create'}</Button></div>
      </form>
      <Modal isOpen={modalStage !== 'idle'} onClose={() => { if (modalStage !== 'loading') setModalStage('idle'); }}><ModalContent>{modalStage === 'loading' ? <div className="vl-modal-loading"><Spinner size="lg" /></div> : modalStage === 'success' ? <div className="vl-modal-success"><div className="vl-modal-success__icon">&#10003;</div><p>{resultMessage}</p></div> : <><ModalHeader>Error</ModalHeader><ModalBody><p className="vl-form-error">{resultMessage}</p></ModalBody><ModalFooter><Button onClick={() => setModalStage('idle')}>Close</Button></ModalFooter></>}</ModalContent></Modal>
    </section>
  );
}

export { VisitLogFormPage };
"""

base = '/workspaces/erp-sales/apps/client/src'
for rel, content in files.items():
    filepath = os.path.join(base, rel)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f'Written {len(content)} chars to {filepath}')
