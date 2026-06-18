import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, FieldError, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, Textarea, FormField } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';
import { trpcClient } from '../../lib/trpc';

type FormValues = { salesOrderId: string; customerId: string; dueDate: string; notes: string; subtotal: number; taxTotal: number; grandTotal: number; balanceDue: number; currency: string; };
type DetailData = { id: string; salesOrder: { id: string } | null; customer: { id: string }; dueDate: string; notes: string | null; subtotal: number; taxTotal: number; grandTotal: number; balanceDue: number; currency: string; };

const defaults = (): FormValues => ({ salesOrderId: '', customerId: '', dueDate: '', notes: '', subtotal: 0, taxTotal: 0, grandTotal: 0, balanceDue: 0, currency: 'IDR' });
const fromDetail = (d: DetailData): FormValues => ({ salesOrderId: d.salesOrder?.id ?? '', customerId: d.customer.id, dueDate: d.dueDate ? new Date(d.dueDate).toISOString().slice(0, 10) : '', notes: d.notes ?? '', subtotal: d.subtotal, taxTotal: d.taxTotal, grandTotal: d.grandTotal, balanceDue: d.balanceDue, currency: d.currency });

function InvoiceFormPage() {
  const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['invoiceDetail', id], enabled: isEdit, queryFn: () => trpcClient.invoice.detail.query({ id: id ?? '' }) });
  const { data: customers } = useQuery({ queryKey: ['customerSelect'], queryFn: () => trpcClient.customer.list.query({ limit: 200 }), staleTime: 5 * 60 * 1000 });
  const { data: salesOrders } = useQuery({ queryKey: ['salesOrderSelect'], queryFn: () => trpcClient.salesOrder.list.query({ limit: 200, approvalStatus: 'APPROVED' }), staleTime: 5 * 60 * 1000 });
  const custList = (customers as any)?.data ?? []; const soList = (salesOrders as any)?.data ?? [];

  const createMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['invoice']['create']>>({
    mutationFn: (p) => trpcClient.invoice.create.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['invoiceList'] }); setResultMessage('Created.'); setModalStage('success'); setTimeout(() => navigate(`/invoice/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });
  const updateMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['invoice']['update']>>({
    mutationFn: (p) => trpcClient.invoice.update.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['invoiceList'] }); queryClient.removeQueries({ queryKey: ['invoiceDetail', id] }); setResultMessage('Updated.'); setModalStage('success'); setTimeout(() => navigate(`/invoice/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });

  const form = useForm({ defaultValues: (isEdit && data ? fromDetail(data as DetailData) : defaults()), onSubmit: async ({ value }) => { setFormError(null); setModalStage('loading'); if (isEdit && id) updateMutation.mutate({ currentId: id, ...value }); else createMutation.mutate(value); } });
  useAiFillForm({ notes: (v: unknown) => form.setFieldValue('notes', String(v)) });
  if (isEdit && isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (isEdit && !data) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/invoice')}>Back</Button></div>;

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'invoice-form', mode: isEdit ? 'edit' : 'create', invoiceId: id ?? null, availableCustomers: custList.map((c: any) => ({ id: c.id, name: c.name })), availableOrders: soList.map((o: any) => ({ id: o.id, documentNumber: o.documentNumber })) })}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <PageHeader title={isEdit ? 'Edit Invoice' : 'Create Invoice'} onBack={() => navigate(isEdit && id ? `/invoice/${id}` : '/invoice')} />
        <Card><div className="grid gap-4 p-6 md:grid-cols-2">
          <form.Field name="salesOrderId" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <div><label className="text-sm font-medium">Sales Order *</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm mt-1"><option value="">Select...</option>{soList.map((o: any) => <option key={o.id} value={o.id}>{o.documentNumber ?? o.id.slice(0, 8)}</option>)}</select></div>}</form.Field>
          <form.Field name="customerId" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <div><label className="text-sm font-medium">Customer *</label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm mt-1"><option value="">Select...</option>{custList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}</form.Field>
          <form.Field name="dueDate" validators={{ onChange: ({ value }) => !value ? 'Required' : undefined }}>{(f) => <TextField isRequired><Label>Due Date</Label><Input type="date" value={f.state.value} onChange={f.handleChange} /></TextField>}</form.Field>
          <form.Field name="grandTotal">{(f) => <TextField><Label>Grand Total</Label><Input type="number" value={String(f.state.value)} onChange={(v) => f.handleChange(Number(v))} /></TextField>}</form.Field>
          <form.Field name="notes">{(f) => <TextField className="md:col-span-2"><Label>Notes</Label><TextArea value={f.state.value} onChange={f.handleChange} placeholder="Invoice notes" /></TextField>}</form.Field>
        </div></Card>
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <div className="flex justify-end gap-3 mt-4"><Button variant="ghost" onClick={() => navigate(isEdit && id ? `/invoice/${id}` : '/invoice')}>Cancel</Button><Button color="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Save' : 'Create'}</Button></div>
      </form>
      <Modal isOpen={modalStage !== 'idle'} onOpenChange={() => { if (modalStage !== 'loading') setModalStage('idle'); }}><ModalContent>{modalStage === 'loading' ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : modalStage === 'success' ? <div className="flex flex-col items-center gap-3 py-6"><div className="flex size-12 items-center justify-center rounded-full bg-success-soft">✓</div><p>{resultMessage}</p></div> : <><ModalHeader>Error</ModalHeader><ModalBody><p className="text-sm text-danger">{resultMessage}</p></ModalBody><ModalFooter><Button onClick={() => setModalStage('idle')}>Close</Button></ModalFooter></>}</ModalContent></Modal>
    </section>
  );
}

export { InvoiceFormPage };