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

type FormValues = { code: string; name: string; description: string; categoryId: string; basePrice: string; baseUnit: string; status: string };
type DetailData = { id: string; code: string | null; name: string; description: string | null; categoryId?: string | null; basePrice: number | null; baseUnit: string; status: string };

const defaults = (): FormValues => ({ code: '', name: '', description: '', categoryId: '', basePrice: '', baseUnit: 'pcs', status: 'ACTIVE' });
const fromDetail = (d: DetailData): FormValues => ({ code: d.code ?? '', name: d.name, description: d.description ?? '', categoryId: d.categoryId ?? '', basePrice: d.basePrice?.toString() ?? '', baseUnit: d.baseUnit, status: d.status });

function SkuFormPage() {
  const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['skuDetail', id], enabled: isEdit, queryFn: () => trpcClient.sku.detail.query({ id: id ?? '' }) });
  const { data: cats } = useQuery({ queryKey: ['skuCategorySelect'], queryFn: () => trpcClient.skuCategory.list.query({ limit: 200 }), staleTime: 5 * 60 * 1000 });

  const createMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['sku']['create']>>({
    mutationFn: (p) => trpcClient.sku.create.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['skuList'] }); setResultMessage('Created.'); setModalStage('success'); setTimeout(() => navigate(`/sku/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });
  const updateMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['sku']['update']>>({
    mutationFn: (p) => trpcClient.sku.update.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['skuList'] }); queryClient.removeQueries({ queryKey: ['skuDetail', id] }); setResultMessage('Updated.'); setModalStage('success'); setTimeout(() => navigate(`/sku/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });

  const form = useForm({ defaultValues: (isEdit && data ? fromDetail(data as DetailData) : defaults()), onSubmit: async ({ value }) => { setFormError(null); setModalStage('loading'); const p = { ...value, basePrice: value.basePrice ? Number(value.basePrice) : null, categoryId: value.categoryId || null }; if (isEdit && id) updateMutation.mutate({ currentId: id, ...p }); else createMutation.mutate(p); } });
  useAiFillForm({ name: (v: unknown) => form.setFieldValue('name', String(v)), code: (v: unknown) => form.setFieldValue('code', String(v)), description: (v: unknown) => form.setFieldValue('description', String(v)), basePrice: (v: unknown) => form.setFieldValue('basePrice', String(v)), baseUnit: (v: unknown) => form.setFieldValue('baseUnit', String(v)) });
  if (isEdit && isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (isEdit && !data) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/sku')}>Back</Button></div>;
  const catList = (cats as any)?.data ?? [];

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'sku-form', mode: isEdit ? 'edit' : 'create', skuId: id ?? null, availableCategories: catList.map((c: any) => ({ id: c.id, name: c.name })) })}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <PageHeader title={isEdit ? 'Edit Product' : 'Create Product'} onBack={() => navigate(isEdit && id ? `/sku/${id}` : '/sku')} />
        <Card><div className="grid gap-4 p-6 md:grid-cols-2">
          <form.Field name="name" validators={{ onChange: ({ value }) => !value?.trim() ? 'Required' : undefined }}>{(f) => <TextField isRequired isInvalid={f.state.meta.errors.length > 0}><Label>Name</Label><Input value={f.state.value} onChange={f.handleChange} onBlur={f.handleBlur} placeholder="e.g. Teh Botol 250ml" />{f.state.meta.errors.map((e) => <FieldError key={e as string}>{e as string}</FieldError>)}</TextField>}</form.Field>
          <form.Field name="code">{(f) => <TextField><Label>Code</Label><Input value={f.state.value} onChange={f.handleChange} onBlur={f.handleBlur} placeholder="SKU-001" /></TextField>}</form.Field>
          <form.Field name="categoryId">{(f) => <TextField><Label>Category</Label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} onBlur={f.handleBlur} className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm"><option value="">None</option>{catList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></TextField>}</form.Field>
          <form.Field name="basePrice">{(f) => <TextField><Label>Base Price</Label><Input value={f.state.value} onChange={f.handleChange} onBlur={f.handleBlur} type="number" placeholder="25000" /></TextField>}</form.Field>
          <form.Field name="baseUnit">{(f) => <TextField><Label>Unit</Label><Input value={f.state.value} onChange={f.handleChange} onBlur={f.handleBlur} placeholder="pcs" /></TextField>}</form.Field>
          <form.Field name="status">{(f) => <TextField><Label>Status</Label><Input value={f.state.value} onChange={f.handleChange} onBlur={f.handleBlur} placeholder="ACTIVE" /></TextField>}</form.Field>
          <form.Field name="description">{(f) => <TextField className="md:col-span-2"><Label>Description</Label><TextArea value={f.state.value} onChange={f.handleChange} onBlur={f.handleBlur} placeholder="Product description" /></TextField>}</form.Field>
        </div></Card>
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <div className="flex justify-end gap-3 mt-4"><Button variant="ghost" onClick={() => navigate(isEdit && id ? `/sku/${id}` : '/sku')}>Cancel</Button><Button color="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Save' : 'Create'}</Button></div>
      </form>
      <Modal isOpen={modalStage !== 'idle'} onOpenChange={() => { if (modalStage !== 'loading') setModalStage('idle'); }}><ModalContent>{modalStage === 'loading' ? <ModalBody><div className="flex justify-center py-8"><Spinner size="lg" /></div></ModalBody> : modalStage === 'success' ? <ModalBody><div className="flex flex-col items-center gap-3 py-6"><div className="flex size-12 items-center justify-center rounded-full bg-success-soft"><svg className="size-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><p className="text-center text-sm">{resultMessage}</p></div></ModalBody> : <><ModalHeader>Error</ModalHeader><ModalBody><p className="text-sm text-danger">{resultMessage}</p></ModalBody><ModalFooter><Button onClick={() => setModalStage('idle')}>Close</Button></ModalFooter></>}</ModalContent></Modal>
    </section>
  );
}

export { SkuFormPage };