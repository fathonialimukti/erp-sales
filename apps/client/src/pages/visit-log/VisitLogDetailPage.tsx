import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { ApprovalHistory } from '../../components/ApprovalHistory';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

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

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>;
  if (!record) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/visit-log')}>Back</Button></div>;

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'visit-log-detail', id: record.id, salesman: record.salesman.name, outlet: record.outlet.name, approvalStatus: record.approvalStatus })}>
      <PageHeader title={`Visit: ${new Date(record.date).toLocaleDateString()}`} onBack={() => navigate('/visit-log')} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />

      <div className="flex flex-wrap gap-2">
        <Chip size="sm" color={record.approvalStatus === 'APPROVED' ? 'success' : record.approvalStatus === 'REJECTED' ? 'danger' : record.approvalStatus === 'PROPOSED' ? 'primary' : 'default'} variant="flat">{record.approvalStatus}</Chip>
        {canSubmit && record.approvalStatus === 'DRAFT' && <Button size="sm" color="primary" onClick={() => submitMutation.mutate(record.id)} disabled={submitMutation.isPending}>Submit for Approval</Button>}
        {canApprove && record.approvalStatus === 'PROPOSED' && <Button size="sm" color="success" onClick={() => { setMessage(''); setApproveModalOpen(true); }}>Approve</Button>}
        {canApprove && (record.approvalStatus === 'PROPOSED' || record.approvalStatus === 'DRAFT') && <Button size="sm" color="danger" variant="flat" onClick={() => { setMessage(''); setRejectModalOpen(true); }}>Reject</Button>}
      </div>

      <Card><div className="grid gap-4 p-6 md:grid-cols-3">
        <Field label="Salesman" value={record.salesman.name} />
        <Field label="Outlet" value={record.outlet.name} />
        <Field label="Customer" value={record.outlet.customer.name} />
        <Field label="Area" value={record.outlet.area.name} />
        <Field label="Check In" value={record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString() : null} />
        <Field label="Check Out" value={record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString() : null} />
      </div></Card>

      {record.purpose && <Card><div className="p-6"><h3 className="mb-1 text-sm font-medium text-muted">Purpose</h3><p>{record.purpose}</p></div></Card>}
      {record.notes && <Card><div className="p-6"><h3 className="mb-1 text-sm font-medium text-muted">Notes</h3><p>{record.notes}</p></div></Card>}
      {record.feedback && <Card><div className="p-6"><h3 className="mb-1 text-sm font-medium text-muted">Feedback</h3><p>{record.feedback}</p></div></Card>}
      {record.salesOrder && <Card><div className="p-6"><h3 className="mb-1 text-sm font-medium text-muted">Sales Order</h3><p className="font-medium">{record.salesOrder.documentNumber} — IDR {(record.salesOrder.grandTotal ?? 0).toLocaleString()}</p></div></Card>}

      {record.approvalHistory && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Approval History</h3><ApprovalHistory history={Array.isArray(record.approvalHistory) ? record.approvalHistory : []} /></div></Card>}

      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}><ModalContent><ModalHeader>Delete Visit</ModalHeader><ModalBody>Delete this visit log?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button color="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={approveModalOpen} onOpenChange={setApproveModalOpen}><ModalContent><ModalHeader>Approve Visit</ModalHeader><ModalBody><TextArea label="Message (optional)" value={message} onChange={setMessage} placeholder="Approval note" /></ModalBody><ModalFooter><Button variant="ghost" onClick={() => setApproveModalOpen(false)}>Cancel</Button><Button color="success" onClick={() => approveMutation.mutate({ id: record.id, message: message || undefined })} disabled={approveMutation.isPending}>{approveMutation.isPending ? '...' : 'Approve'}</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={rejectModalOpen} onOpenChange={setRejectModalOpen}><ModalContent><ModalHeader>Reject Visit</ModalHeader><ModalBody><TextArea label="Reason" value={message} onChange={setMessage} placeholder="Reason for rejection" /></ModalBody><ModalFooter><Button variant="ghost" onClick={() => setRejectModalOpen(false)}>Cancel</Button><Button color="danger" onClick={() => rejectMutation.mutate({ id: record.id, message: message || undefined })} disabled={rejectMutation.isPending}>{rejectMutation.isPending ? '...' : 'Reject'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted">{label}</p><div className="text-sm">{value || '-'}</div></div>;
}

export { VisitLogDetailPage };