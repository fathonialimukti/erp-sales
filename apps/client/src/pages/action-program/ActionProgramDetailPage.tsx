import { useState } from 'react';
import { Button, Card, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { ApprovalHistory } from '../../components/ApprovalHistory';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface ActionProgramDetail {
  id: string; documentNumber: string | null; name: string; type: string; description: string | null; startDate: string; endDate: string; budgetAmount: number | null; budgetCurrency: string; rules: any; approvalStatus: string; approvalHistory: any;
  area: { id: string; name: string }; pic: { id: string; name: string | null }; createdBy: { id: string; name: string | null } | null;
  outlets: { outlet: { id: string; name: string; code: string | null } }[];
  skus: { sku: { id: string; name: string; code: string | null } }[];
  payments: { id: string; amount: number; paymentDate: string; method: string | null; reference: string | null }[];
  /** Per-tier approval timestamps. Surfaced once the server selects them. */
  areaManagerApprovedAt?: string | Date | null;
  regionManagerApprovedAt?: string | Date | null;
  financeManagerApprovedAt?: string | Date | null;
  directorApprovedAt?: string | Date | null;
}

function ActionProgramDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canApproveArea = hasPermission('action-program@approve-area'); const canApproveRegion = hasPermission('action-program@approve-region');
  const canApproveFinance = hasPermission('action-program@approve-finance'); const canApproveDirector = hasPermission('action-program@approve-director');
  const canUpdate = hasPermission('action-program@update'); const canDelete = hasPermission('action-program@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [isDeleting, setIsDeleting] = useState(false);
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['actionProgramDetail', id], enabled: Boolean(id), queryFn: () => trpcClient.actionProgram.detail.query({ id: id ?? '' }) });
  const record = data as ActionProgramDetail | undefined;

  const approveAreaMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.actionProgram.approveArea.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actionProgramDetail', id] }); queryClient.invalidateQueries({ queryKey: ['actionProgramList'] }); setActionModal(null); } });
  const approveRegionMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.actionProgram.approveRegion.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actionProgramDetail', id] }); setActionModal(null); } });
  const approveFinanceMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.actionProgram.approveFinance.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actionProgramDetail', id] }); setActionModal(null); } });
  const approveDirectorMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.actionProgram.approveDirector.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actionProgramDetail', id] }); setActionModal(null); } });
  const rejectMutation = useMutation({ mutationFn: (p: { id: string; message?: string }) => trpcClient.actionProgram.reject.mutate(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actionProgramDetail', id] }); setActionModal(null); } });

  const handleDelete = async () => { if (!record || isDeleting) return; setIsDeleting(true); try { await trpcClient.actionProgram.delete.mutate({ id: record.id }); await queryClient.invalidateQueries({ queryKey: ['actionProgramList'] }); setDeleteModalOpen(false); navigate('/action-program'); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>;
  if (!record) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/action-program')}>Back</Button></div>;

  const tierApproved = (tier: string | null) => tier !== null;

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'action-program-detail', id: record.id, documentNumber: record.documentNumber, name: record.name, type: record.type, approvalStatus: record.approvalStatus, outletCount: record.outlets.length, skuCount: record.skus.length, budgetAmount: record.budgetAmount })}>
      <PageHeader title={record.name} onBack={() => navigate('/action-program')} onEdit={canUpdate && record.approvalStatus === 'DRAFT' ? () => navigate(`/action-program/${record.id}/edit`) : undefined} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />

      <div className="flex flex-wrap gap-2">
        <Chip size="sm" tone={record.approvalStatus === 'APPROVED' ? 'success' : record.approvalStatus === 'REJECTED' ? 'danger' : record.approvalStatus === 'PROPOSED' ? 'accent' : 'neutral'}>{record.approvalStatus}</Chip>
        <Chip size="sm">{record.type}</Chip>
        {canApproveArea && record.approvalStatus === 'DRAFT' && <Button size="sm" variant="primary" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Area)</Button>}
        {canApproveRegion && record.approvalStatus === 'PROPOSED' && tierApproved(record.areaManagerApprovedAt as any) && !tierApproved(record.regionManagerApprovedAt as any) && <Button size="sm" variant="primary" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Region)</Button>}
        {canApproveFinance && tierApproved(record.regionManagerApprovedAt as any) && !tierApproved(record.financeManagerApprovedAt as any) && <Button size="sm" variant="primary" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Finance)</Button>}
        {canApproveDirector && tierApproved(record.financeManagerApprovedAt as any) && !tierApproved(record.directorApprovedAt as any) && <Button size="sm" variant="success" onClick={() => { setMessage(''); setActionModal('approve'); }}>Approve (Director)</Button>}
        <Button size="sm" variant="danger" onClick={() => { setMessage(''); setActionModal('reject'); }}>Reject</Button>
      </div>

      {/* Approval progress indicator */}
      <Card><div className="p-4 flex gap-4 text-sm">
        {(['Area Manager', 'Regional Manager', 'Finance PIC', 'Director'] as const).map((t, i) => {
          const dates = [record.areaManagerApprovedAt, record.regionManagerApprovedAt, record.financeManagerApprovedAt, record.directorApprovedAt];
          const done = dates[i] !== null;
          const current = !done && (i === 0 || dates[i - 1] !== null) && record.approvalStatus !== 'REJECTED';
          return <div key={t} className={`flex-1 text-center p-2 rounded-lg ${done ? 'bg-success-soft text-success' : current ? 'bg-primary-soft text-primary font-semibold' : 'bg-default-100 text-muted'}`}>{t}{done ? ' ✓' : current ? ' ⟵' : ''}</div>;
        })}
      </div></Card>

      <Card><div className="grid gap-4 p-6 md:grid-cols-4">
        <Field label="Type" value={record.type} /><Field label="Area" value={record.area.name} /><Field label="PIC" value={record.pic.name} /><Field label="Budget" value={record.budgetAmount ? `IDR ${record.budgetAmount.toLocaleString()}` : '-'} />
        <Field label="Start" value={new Date(record.startDate).toLocaleDateString()} /><Field label="End" value={new Date(record.endDate).toLocaleDateString()} /><Field label="Created By" value={record.createdBy?.name} />
      </div></Card>

      {record.outlets.length > 0 && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Outlets ({record.outlets.length})</h3><div className="flex flex-wrap gap-2">{record.outlets.map((o) => <Chip key={o.outlet.id} size="sm">{o.outlet.name}</Chip>)}</div></div></Card>}
      {record.skus.length > 0 && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Products ({record.skus.length})</h3><div className="flex flex-wrap gap-2">{record.skus.map((s) => <Chip key={s.sku.id} size="sm">{s.sku.name}</Chip>)}</div></div></Card>}
      {record.payments.length > 0 && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Payments</h3><div className="space-y-2">{record.payments.map((p) => <div key={p.id} className="flex justify-between text-sm"><span>IDR {p.amount.toLocaleString()} — {new Date(p.paymentDate).toLocaleDateString()}</span><span className="text-muted">{p.method} {p.reference}</span></div>)}</div></div></Card>}

      {record.approvalHistory && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Approval History</h3><ApprovalHistory history={Array.isArray(record.approvalHistory) ? record.approvalHistory : []} /></div></Card>}

      <Modal isOpen={actionModal !== null} onClose={() => setActionModal(null)}><ModalContent><ModalHeader>{actionModal === 'approve' ? 'Approve' : 'Reject'} Program</ModalHeader><ModalBody><Textarea label="Message" value={message} onValueChange={setMessage} placeholder="Enter note..." /></ModalBody><ModalFooter><Button variant="ghost" onClick={() => setActionModal(null)}>Cancel</Button><Button variant={actionModal === 'approve' ? 'success' : 'danger'} onClick={() => {
        const p = { id: record!.id, message: message || undefined };
        if (actionModal === 'reject') rejectMutation.mutate(p);
        else if (!tierApproved(record!.areaManagerApprovedAt as any)) approveAreaMutation.mutate(p);
        else if (!tierApproved(record!.regionManagerApprovedAt as any)) approveRegionMutation.mutate(p);
        else if (!tierApproved(record!.financeManagerApprovedAt as any)) approveFinanceMutation.mutate(p);
        else approveDirectorMutation.mutate(p);
      }}>{actionModal === 'approve' ? 'Approve' : 'Reject'}</Button></ModalFooter></ModalContent></Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Program</ModalHeader><ModalBody>Delete "{record.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted">{label}</p><div className="text-sm">{value || '-'}</div></div>;
}

export { ActionProgramDetailPage };