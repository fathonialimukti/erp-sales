import { useState } from 'react';
import { Button, Card, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, Textarea, FormField } from '../../ui';
import { Icon } from "../../ui";
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';
import { trpcClient } from '../../lib/trpc';

interface FormValues { name: string; eventType: string; description: string; venue: string; areaId: string; eventDate: string; eventEndDate: string; organizerName: string; organizerContact: string; observationDays: number; proposedBudget: string; currency: string; skuIds: string[]; payments: { amount: string; paymentDate: string; method: string; reference: string }[]; }
const defaults = (): FormValues => ({ name: '', eventType: '', description: '', venue: '', areaId: '', eventDate: '', eventEndDate: '', organizerName: '', organizerContact: '', observationDays: 90, proposedBudget: '', currency: 'IDR', skuIds: [], payments: [] });

function EventProposalFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const isEdit = Boolean(id);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const { data: detail, isLoading: detailLoading } = useQuery({ queryKey: ['eventProposalDetail', id], enabled: isEdit, queryFn: () => trpcClient.eventProposal.detail.query({ id: id ?? '' }) });
  const { data: areas } = useQuery({ queryKey: ['areaSelect'], queryFn: () => trpcClient.area.list.query({ limit: 200 }), staleTime: 5 * 60 * 1000 });
  const { data: skus } = useQuery({ queryKey: ['skuSelect'], queryFn: () => trpcClient.sku.list.query({ limit: 500 }), staleTime: 5 * 60 * 1000 });
  const areaList = (areas as any)?.data ?? []; const skuList = (skus as any)?.data ?? [];

  const fromDetail = (d: any): FormValues => ({
    name: d.name, eventType: d.eventType ?? '', description: d.description ?? '', venue: d.venue ?? '', areaId: d.area.id,
    eventDate: new Date(d.eventDate).toISOString().slice(0, 10), eventEndDate: d.eventEndDate ? new Date(d.eventEndDate).toISOString().slice(0, 10) : '',
    organizerName: d.organizerName ?? '', organizerContact: d.organizerContact ?? '', observationDays: d.observationDays ?? 90,
    proposedBudget: d.proposedBudget?.toString() ?? '', currency: d.currency ?? 'IDR',
    skuIds: d.skus?.map((s: any) => s.sku.id) ?? [],
    payments: d.payments?.map((p: any) => ({ amount: String(p.amount), paymentDate: new Date(p.paymentDate).toISOString().slice(0, 10), method: p.method ?? '', reference: p.reference ?? '' })) ?? [],
  });

  const createMutation = useMutation<any, unknown, any>({ mutationFn: (p) => trpcClient.eventProposal.create.mutate(p), onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['eventProposalList'] }); setResultMessage('Created.'); setModalStage('success'); setTimeout(() => navigate(`/event-proposal/${r.id}`), 1500); }, onError: () => { setResultMessage('Failed.'); setModalStage('error'); } });
  const updateMutation = useMutation<any, unknown, any>({ mutationFn: (p) => trpcClient.eventProposal.update.mutate(p), onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['eventProposalList'] }); queryClient.removeQueries({ queryKey: ['eventProposalDetail', id] }); setResultMessage('Updated.'); setModalStage('success'); setTimeout(() => navigate(`/event-proposal/${r.id}`), 1500); }, onError: () => { setResultMessage('Failed.'); setModalStage('error'); } });

  const form = useForm({ defaultValues: (isEdit && detail ? fromDetail(detail) : defaults()), onSubmit: async ({ value }) => {
    setFormError(null); setModalStage('loading');
    const payload = { ...value, proposedBudget: value.proposedBudget ? Number(value.proposedBudget) : null, payments: value.payments.map((p: any) => ({ ...p, amount: Number(p.amount) })) };
    if (isEdit && id) updateMutation.mutate({ currentId: id, ...payload }); else createMutation.mutate(payload);
  }});
  useAiFillForm({ name: (v: unknown) => form.setFieldValue('name', String(v)), description: (v: unknown) => form.setFieldValue('description', String(v)), venue: (v: unknown) => form.setFieldValue('venue', String(v)), organizerName: (v: unknown) => form.setFieldValue('organizerName', String(v)) });

  if (isEdit && detailLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (isEdit && !detail) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/event-proposal')}>Back</Button></div>;

  const addPayment = () => { const p = form.getFieldValue('payments') as any[]; form.setFieldValue('payments', [...(p ?? []), { amount: '', paymentDate: '', method: '', reference: '' }]); };
  const removePayment = (i: number) => { const p = [...(form.getFieldValue('payments') as any[])]; p.splice(i, 1); form.setFieldValue('payments', p); };

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'event-proposal-form', mode: isEdit ? 'edit' : 'create', proposalId: id ?? null, availableAreas: areaList.map((a: any) => ({ id: a.id, name: a.name })), availableSkus: skuList.map((s: any) => ({ id: s.id, name: s.name })) })}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <PageHeader title={isEdit ? 'Edit Proposal' : 'Create Event Proposal'} onBack={() => navigate(isEdit && id ? `/event-proposal/${id}` : '/event-proposal')} />
        <Card><div className="p-6"><div className="grid gap-4 md:grid-cols-2">
          <form.Field name="name" validators={{ onChange: ({ value }) => !value?.trim() ? 'Required' : undefined }}>{(f) => <TextField isRequired isInvalid={!!f.state.meta.errors.length}><Label>Name</Label><Input value={f.state.value} onChange={f.handleChange} placeholder="e.g. Ramadan Bazaar" /></TextField>}</form.Field>
          <form.Field name="eventType">{(f) => <TextField><Label>Event Type</Label><Input value={f.state.value} onChange={f.handleChange} placeholder="e.g. Exhibition" /></TextField>}</form.Field>
          <form.Field name="areaId" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <div><label className="text-sm font-medium">Area *</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm mt-1"><option value="">Select...</option>{areaList.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}</form.Field>
          <form.Field name="venue">{(f) => <TextField><Label>Venue</Label><Input value={f.state.value} onChange={f.handleChange} placeholder="e.g. Mall Kelapa Gading" /></TextField>}</form.Field>
          <form.Field name="eventDate">{(f) => <TextField><Label>Event Date</Label><Input type="date" value={f.state.value} onChange={f.handleChange} /></TextField>}</form.Field>
          <form.Field name="eventEndDate">{(f) => <TextField><Label>End Date</Label><Input type="date" value={f.state.value} onChange={f.handleChange} /></TextField>}</form.Field>
          <form.Field name="organizerName">{(f) => <TextField><Label>Organizer</Label><Input value={f.state.value} onChange={f.handleChange} placeholder="Organizer name" /></TextField>}</form.Field>
          <form.Field name="organizerContact">{(f) => <TextField><Label>Contact</Label><Input value={f.state.value} onChange={f.handleChange} placeholder="Phone/email" /></TextField>}</form.Field>
          <form.Field name="proposedBudget">{(f) => <TextField><Label>Budget</Label><Input type="number" value={f.state.value} onChange={f.handleChange} placeholder="50000000" /></TextField>}</form.Field>
          <form.Field name="description">{(f) => <TextField className="md:col-span-2"><Label>Description</Label><TextArea value={f.state.value} onChange={f.handleChange} placeholder="Event description" /></TextField>}</form.Field>
        </div></div></Card>

        <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Products (SKUs)</h3>
          <form.Field name="skuIds">{(f) => {
            const selected = (f.state.value as string[]) ?? [];
            return <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">{skuList.map((s: any) => {
              const isSel = selected.includes(s.id);
              return <button key={s.id} type="button" className={`px-3 py-1 rounded-full text-xs border cursor-pointer ${isSel ? 'bg-primary text-white border-primary' : 'bg-default-50 border-default-200'}`} onClick={() => {
                const next = isSel ? selected.filter((x) => x !== s.id) : [...selected, s.id];
                f.handleChange(next);
              }}>{s.name}</button>;
            })}</div>;
          }}</form.Field>
        </div></Card>

        <Card><div className="p-6">
          <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-semibold">Payments</h3><Button size="sm" variant="ghost" onClick={addPayment}><Icon icon="solar:add-circle-linear" />Add</Button></div>
          <form.Field name="payments">{(f) => {
            const p = (f.state.value as any[]) ?? [];
            return <div className="space-y-2">{p.map((pmt, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-end p-2 border rounded-lg">
                <div><label className="text-xs text-muted">Amount</label><Input size="sm" type="number" value={pmt.amount} onChange={(v) => { const n = [...p]; n[idx] = { ...n[idx], amount: v }; f.handleChange(n); }} /></div>
                <div><label className="text-xs text-muted">Date</label><Input size="sm" type="date" value={pmt.paymentDate} onChange={(v) => { const n = [...p]; n[idx] = { ...n[idx], paymentDate: v }; f.handleChange(n); }} /></div>
                <div><label className="text-xs text-muted">Method</label><Input size="sm" value={pmt.method} onChange={(v) => { const n = [...p]; n[idx] = { ...n[idx], method: v }; f.handleChange(n); }} /></div>
                <div className="flex items-end gap-1"><div className="flex-1"><label className="text-xs text-muted">Ref</label><Input size="sm" value={pmt.reference} onChange={(v) => { const n = [...p]; n[idx] = { ...n[idx], reference: v }; f.handleChange(n); }} /></div><Button size="sm" variant="ghost" color="danger" isIconOnly onClick={() => removePayment(idx)}><Icon icon="solar:trash-bin-trash-linear" /></Button></div>
              </div>
            ))}</div>;
          }}</form.Field>
        </div></Card>

        {formError && <p className="text-sm text-danger">{formError}</p>}
        <div className="flex justify-end gap-3 mt-4"><Button variant="ghost" onClick={() => navigate(isEdit && id ? `/event-proposal/${id}` : '/event-proposal')}>Cancel</Button><Button color="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Save' : 'Create'}</Button></div>
      </form>
      <Modal isOpen={modalStage !== 'idle'} onOpenChange={() => { if (modalStage !== 'loading') setModalStage('idle'); }}><ModalContent>{modalStage === 'loading' ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : modalStage === 'success' ? <div className="flex flex-col items-center gap-3 py-6"><div className="flex size-12 items-center justify-center rounded-full bg-success-soft">✓</div><p>{resultMessage}</p></div> : <><ModalHeader>Error</ModalHeader><ModalBody><p className="text-sm text-danger">{resultMessage}</p></ModalBody><ModalFooter><Button onClick={() => setModalStage('idle')}>Close</Button></ModalFooter></>}</ModalContent></Modal>
    </section>
  );
}

export { EventProposalFormPage };