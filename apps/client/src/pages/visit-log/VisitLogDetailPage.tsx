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
