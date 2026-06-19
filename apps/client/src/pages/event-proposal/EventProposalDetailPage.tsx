import { useState } from 'react';
import { Button, Card, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { ApprovalHistory } from '../../components/ApprovalHistory';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface EventProposalDetail {
  id: string; documentNumber: string | null; name: string; eventType: string | null; description: string | null; venue: string | null; eventDate: string; eventEndDate: string | null; organizerName: string | null; organizerContact: string | null; observationDays: number; proposedBudget: number | null; currency: string; approvalStatus: string; approvalHistory: any; files: any;
  area: { id: string; name: string }; createdBy: { id: string; name: string | null } | null;
  skus: { sku: { id: string; name: string; code: string | null } }[];
  payments: { id: string; amount: number; paymentDate: string; method: string | null; reference: string | null }[];
  /** Per-tier approval timestamps. Surfaced once the server selects them. */
  areaManagerApprovedAt?: string | Date | null;
  regionManagerApprovedAt?: string | Date | null;
  financeManagerApprovedAt?: string | Date | null;
  directorApprovedAt?: string | Date | null;
}

function EventProposalDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canApproveArea = hasPermission('event-proposal@approve-area'); const canApproveRegion = hasPermission('event-proposal@approve-region');
  const canApproveFinance = hasPermission('event-proposal@approve-finance'); const canApproveDirector = hasPermission('event-proposal@approve-director');
  const canUpdate = hasPermission('event-proposal@update'); const canDelete = hasPermission('event-proposal@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [isDeleting, setIsDeleting] = useState(false);
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | null>(null); const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['eventProposalDetail', id], enabled: Boolean(id), queryFn: () => trpcClient.eventProposal.detail.query({ id: id ?? '' }) });
  const record = data as EventProposalDetail | undefined;

  const approveAreaMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.eventProposal.approveArea.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventProposalDetail', id] }); queryClient.invalidateQueries({ queryKey: ['eventProposalList'] }); setActionModal(null); } });
  const approveRegionMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.eventProposal.approveRegion.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventProposalDetail', id] }); setActionModal(null); } });
  const approveFinanceMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.eventProposal.approveFinance.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventProposalDetail', id] }); setActionModal(null); } });
  const approveDirectorMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.eventProposal.approveDirector.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventProposalDetail', id] }); setActionModal(null); } });
  const rejectMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.eventProposal.reject.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventProposalDetail', id] }); setActionModal(null); } });

  const handleDelete = async () => { if (!record || isDeleting) return; setIsDeleting(true); try { await trpcClient.eventProposal.delete.mutate({ id: record.id }); await queryClient.invalidateQueries({ queryKey: ['eventProposalList'] }); setDeleteModalOpen(false); navigate('/event-proposal'); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>;
  if (!record) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/event-proposal')}>Back</Button></div>;

  const tierApproved = (tier: any) => tier !== null && tier !== undefined;

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'event-proposal-detail', id: record.id, documentNumber: record.documentNumber, name: record.name, eventType: record.eventType, approvalStatus: record.approvalStatus, proposedBudget: record.proposedBudget })}>
      <PageHeader title={record.name} onBack={() => navigate('/event-proposal')} onEdit={canUpdate && record.approvalStatus === 'DRAFT' ? () => navigate(`/event-proposal/${record.id}/edit`) : undefined} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />

      <div className="flex flex-wrap gap-2">
        <Chip size="sm" tone={record.approvalStatus === 'APPROVED' ? 'success' : record.approvalStatus === 'REJECTED' ? 'danger' : record.approvalStatus === 'PROPOSED' ? 'accent' : 'neutral'}>{record.approvalStatus}</Chip>
        {record.eventType && <Chip size="sm">{record.eventType}</Chip>}
        {canApproveArea && record.approvalStatus === 'DRAFT' && <Button size="sm" variant="primary" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Area)</Button>}
        {canApproveRegion && record.approvalStatus === 'PROPOSED' && tierApproved(record.areaManagerApprovedAt) && !tierApproved(record.regionManagerApprovedAt) && <Button size="sm" variant="primary" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Region)</Button>}
        {canApproveFinance && tierApproved(record.regionManagerApprovedAt) && !tierApproved(record.financeManagerApprovedAt) && <Button size="sm" variant="primary" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Finance)</Button>}
        {canApproveDirector && tierApproved(record.financeManagerApprovedAt) && !tierApproved(record.directorApprovedAt) && <Button size="sm" variant="success" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Director)</Button>}
        <Button size="sm" variant="danger" onClick={() => { setMessage(''); setActionModal('reject'); }}>Reject</Button>
      </div>

      <Card><div className="p-4 flex gap-4 text-sm">
        {(['Area Manager', 'Regional Manager', 'Finance PIC', 'Director'] as const).map((t, i) => {
          const dates = [record.areaManagerApprovedAt, record.regionManagerApprovedAt, record.financeManagerApprovedAt, record.directorApprovedAt];
          const done = dates[i] !== null;
          const current = !done && (i === 0 || dates[i - 1] !== null) && record.approvalStatus !== 'REJECTED';
          return <div key={t} className={`flex-1 text-center p-2 rounded-lg ${done ? 'bg-success-soft text-success' : current ? 'bg-primary-soft text-primary font-semibold' : 'bg-default-100 text-muted'}`}>{t}{done ? ' ✓' : current ? ' ⟵' : ''}</div>;
        })}
      </div></Card>

      <Card><div className="grid gap-4 p-6 md:grid-cols-3">
        <Field label="Event Type" value={record.eventType} /><Field label="Area" value={record.area.name} /><Field label="Budget" value={record.proposedBudget ? `IDR ${record.proposedBudget.toLocaleString()}` : '-'} />
        <Field label="Event Date" value={new Date(record.eventDate).toLocaleDateString()} /><Field label="End Date" value={record.eventEndDate ? new Date(record.eventEndDate).toLocaleDateString() : '-'} /><Field label="Observation Days" value={record.observationDays} />
        <Field label="Venue" value={record.venue} /><Field label="Organizer" value={record.organizerName} /><Field label="Contact" value={record.organizerContact} />
        <Field label="Created By" value={record.createdBy?.name} />
      </div></Card>

      {record.description && <Card><div className="p-6"><h3 className="mb-1 text-sm font-medium text-muted">Description</h3><p>{record.description}</p></div></Card>}

      {record.skus.length > 0 && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Products ({record.skus.length})</h3><div className="flex flex-wrap gap-2">{record.skus.map((s) => <Chip key={s.sku.id} size="sm">{s.sku.name}</Chip>)}</div></div></Card>}
      {record.payments.length > 0 && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Payments</h3><div className="space-y-2">{record.payments.map((p) => <div key={p.id} className="flex justify-between text-sm"><span>IDR {p.amount.toLocaleString()} — {new Date(p.paymentDate).toLocaleDateString()}</span><span className="text-muted">{p.method} {p.reference}</span></div>)}</div></div></Card>}

      {record.approvalHistory && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Approval History</h3><ApprovalHistory history={Array.isArray(record.approvalHistory) ? record.approvalHistory : []} /></div></Card>}

      <Modal isOpen={actionModal !== null} onClose={() => setActionModal(null)}><ModalContent><ModalHeader>{actionModal === 'approve' ? 'Approve' : 'Reject'} Proposal</ModalHeader><ModalBody><Textarea label="Message" value={message} onValueChange={setMessage} placeholder="Enter note..." /></ModalBody><ModalFooter><Button variant="ghost" onClick={() => setActionModal(null)}>Cancel</Button><Button variant={actionModal === 'approve' ? 'success' : 'danger'} onClick={() => {
        const p = { id: record!.id, message: message || undefined };
        if (actionModal === 'reject') rejectMutation.mutate(p);
        else if (!tierApproved(record!.areaManagerApprovedAt)) approveAreaMutation.mutate(p);
        else if (!tierApproved(record!.regionManagerApprovedAt)) approveRegionMutation.mutate(p);
        else if (!tierApproved(record!.financeManagerApprovedAt)) approveFinanceMutation.mutate(p);
        else approveDirectorMutation.mutate(p);
      }}>{actionModal === 'approve' ? 'Approve' : 'Reject'}</Button></ModalFooter></ModalContent></Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Proposal</ModalHeader><ModalBody>Delete "{record.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted">{label}</p><div className="text-sm">{value || '-'}</div></div>;
}

export { EventProposalDetailPage };