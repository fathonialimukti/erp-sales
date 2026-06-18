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

interface FormValues { name: string; type: string; description: string; areaId: string; picId: string; startDate: string; endDate: string; budgetAmount: string; budgetCurrency: string; outletIds: string[]; skuIds: string[]; rules: string; payments: { amount: string; paymentDate: string; method: string; reference: string }[]; }
const defaults = (): FormValues => ({ name: '', type: 'DISCOUNT', description: '', areaId: '', picId: '', startDate: '', endDate: '', budgetAmount: '', budgetCurrency: 'IDR', outletIds: [], skuIds: [], rules: '{}', payments: [] });
const TYPES = ['DISCOUNT', 'BUNDLE', 'FREE_ITEM', 'REBATE', 'LOYALTY'];

function ActionProgramFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const isEdit = Boolean(id);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const { data: detail, isLoading: detailLoading } = useQuery({ queryKey: ['actionProgramDetail', id], enabled: isEdit, queryFn: () => trpcClient.actionProgram.detail.query({ id: id ?? '' }) });
  const { data: areas } = useQuery({ queryKey: ['areaSelect'], queryFn: () => trpcClient.area.list.query({ limit: 200 }), staleTime: 5 * 60 * 1000 });
  const { data: users } = useQuery({ queryKey: ['userSelect'], queryFn: () => trpcClient.user.list.query({ limit: 200 }), staleTime: 5 * 60 * 1000 });
  const { data: outlets } = useQuery({ queryKey: ['outletSelect'], queryFn: () => trpcClient.outlet.list.query({ limit: 500 }), staleTime: 5 * 60 * 1000 });
  const { data: skus } = useQuery({ queryKey: ['skuSelect'], queryFn: () => trpcClient.sku.list.query({ limit: 500 }), staleTime: 5 * 60 * 1000 });
  const areaList = (areas as any)?.data ?? []; const userList = (users as any)?.data ?? []; const outletList = (outlets as any)?.data ?? []; const skuList = (skus as any)?.data ?? [];

  const fromDetail = (d: any): FormValues => ({
    name: d.name, type: d.type, description: d.description ?? '', areaId: d.area.id, picId: d.pic.id,
    startDate: new Date(d.startDate).toISOString().slice(0, 10), endDate: new Date(d.endDate).toISOString().slice(0, 10),
    budgetAmount: d.budgetAmount?.toString() ?? '', budgetCurrency: d.budgetCurrency ?? 'IDR',
    outletIds: d.outlets?.map((o: any) => o.outlet.id) ?? [],
    skuIds: d.skus?.map((s: any) => s.sku.id) ?? [],
    rules: typeof d.rules === 'string' ? d.rules : JSON.stringify(d.rules ?? {}),
    payments: d.payments?.map((p: any) => ({ amount: String(p.amount), paymentDate: new Date(p.paymentDate).toISOString().slice(0, 10), method: p.method ?? '', reference: p.reference ?? '' })) ?? [],
  });

  const createMutation = useMutation<any, unknown, any>({ mutationFn: (p) => trpcClient.actionProgram.create.mutate(p), onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['actionProgramList'] }); setResultMessage('Created.'); setModalStage('success'); setTimeout(() => navigate(`/action-program/${r.id}`), 1500); }, onError: () => { setResultMessage('Failed.'); setModalStage('error'); } });
  const updateMutation = useMutation<any, unknown, any>({ mutationFn: (p) => trpcClient.actionProgram.update.mutate(p), onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['actionProgramList'] }); queryClient.removeQueries({ queryKey: ['actionProgramDetail', id] }); setResultMessage('Updated.'); setModalStage('success'); setTimeout(() => navigate(`/action-program/${r.id}`), 1500); }, onError: () => { setResultMessage('Failed.'); setModalStage('error'); } });

  const form = useForm({ defaultValues: (isEdit && detail ? fromDetail(detail) : defaults()), onSubmit: async ({ value }) => {
    setFormError(null); setModalStage('loading');
    const payload = { ...value, budgetAmount: value.budgetAmount ? Number(value.budgetAmount) : null, rules: JSON.parse(value.rules || '{}'), payments: value.payments.map((p: any) => ({ ...p, amount: Number(p.amount) })) };
    if (isEdit && id) updateMutation.mutate({ currentId: id, ...payload }); else createMutation.mutate(payload);
  }});
  useAiFillForm({ name: (v: unknown) => form.setFieldValue('name', String(v)), description: (v: unknown) => form.setFieldValue('description', String(v)) });

  if (isEdit && detailLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (isEdit && !detail) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/action-program')}>Back</Button></div>;

  const addPayment = () => { const p = form.getFieldValue('payments') as any[]; form.setFieldValue('payments', [...(p ?? []), { amount: '', paymentDate: '', method: '', reference: '' }]); };
  const removePayment = (i: number) => { const p = [...(form.getFieldValue('payments') as any[])]; p.splice(i, 1); form.setFieldValue('payments', p); };

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'action-program-form', mode: isEdit ? 'edit' : 'create', programId: id ?? null, availableAreas: areaList.map((a: any) => ({ id: a.id, name: a.name })), availableOutlets: outletList.map((o: any) => ({ id: o.id, name: o.name })), availableSkus: skuList.map((s: any) => ({ id: s.id, name: s.name })) })}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <PageHeader title={isEdit ? 'Edit Program' : 'Create Action Program'} onBack={() => navigate(isEdit && id ? `/action-program/${id}` : '/action-program')} />

        <Card><div className="p-6"><div className="grid gap-4 md:grid-cols-2">
          <form.Field name="name" validators={{ onChange: ({ value }) => !value?.trim() ? 'Required' : undefined }}>{(f) => <TextField isRequired isInvalid={!!f.state.meta.errors.length}><Label>Name</Label><Input value={f.state.value} onChange={f.handleChange} placeholder="e.g. Ramadan Discount" /></TextField>}</form.Field>
          <form.Field name="type">{(f) => <div><label className="text-sm font-medium">Type</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm mt-1">{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>}</form.Field>
          <form.Field name="areaId" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <div><label className="text-sm font-medium">Area *</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm mt-1"><option value="">Select...</option>{areaList.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}</form.Field>
          <form.Field name="picId" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <div><label className="text-sm font-medium">PIC *</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm mt-1"><option value="">Select...</option>{userList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}</form.Field>
          <form.Field name="startDate">{(f) => <TextField><Label>Start Date</Label><Input type="date" value={f.state.value} onChange={f.handleChange} /></TextField>}</form.Field>
          <form.Field name="endDate">{(f) => <TextField><Label>End Date</Label><Input type="date" value={f.state.value} onChange={f.handleChange} /></TextField>}</form.Field>
          <form.Field name="budgetAmount">{(f) => <TextField><Label>Budget Amount</Label><Input type="number" value={f.state.value} onChange={f.handleChange} placeholder="50000000" /></TextField>}</form.Field>
          <form.Field name="description">{(f) => <TextField className="md:col-span-2"><Label>Description</Label><TextArea value={f.state.value} onChange={f.handleChange} placeholder="Program description" /></TextField>}</form.Field>
        </div></div></Card>

        {/* Outlets multi-select */}
        <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Outlets</h3>
          <form.Field name="outletIds">{(f) => {
            const selected = (f.state.value as string[]) ?? [];
            return <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">{outletList.map((o: any) => {
              const isSel = selected.includes(o.id);
              return <button key={o.id} type="button" className={`px-3 py-1 rounded-full text-xs border cursor-pointer ${isSel ? 'bg-primary text-white border-primary' : 'bg-default-50 border-default-200'}`} onClick={() => {
                const next = isSel ? selected.filter((x) => x !== o.id) : [...selected, o.id];
                f.handleChange(next);
              }}>{o.name}</button>;
            })}</div>;
          }}</form.Field>
        </div></Card>

        {/* SKUs multi-select */}
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

        {/* Payments */}
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
        <div className="flex justify-end gap-3 mt-4"><Button variant="ghost" onClick={() => navigate(isEdit && id ? `/action-program/${id}` : '/action-program')}>Cancel</Button><Button color="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Save' : 'Create'}</Button></div>
      </form>
      <Modal isOpen={modalStage !== 'idle'} onOpenChange={() => { if (modalStage !== 'loading') setModalStage('idle'); }}><ModalContent>{modalStage === 'loading' ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : modalStage === 'success' ? <div className="flex flex-col items-center gap-3 py-6"><div className="flex size-12 items-center justify-center rounded-full bg-success-soft">✓</div><p>{resultMessage}</p></div> : <><ModalHeader>Error</ModalHeader><ModalBody><p className="text-sm text-danger">{resultMessage}</p></ModalBody><ModalFooter><Button onClick={() => setModalStage('idle')}>Close</Button></ModalFooter></>}</ModalContent></Modal>
    </section>
  );
}

export { ActionProgramFormPage };