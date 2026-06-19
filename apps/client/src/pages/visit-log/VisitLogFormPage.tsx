import { useState } from 'react';
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
