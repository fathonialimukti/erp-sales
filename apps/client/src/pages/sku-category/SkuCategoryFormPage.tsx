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
import './SkuCategory.css';

type FormValues = { code: string; name: string; description: string };
type DetailData = { id: string; code: string | null; name: string; description: string | null };

const defaults = (): FormValues => ({ code: '', name: '', description: '' });
const fromDetail = (d: DetailData): FormValues => ({ code: d.code ?? '', name: d.name, description: d.description ?? '' });

function SkuCategoryFormPage() {
  const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['skuCategoryDetail', id], enabled: isEdit, queryFn: () => trpcClient.skuCategory.detail.query({ id: id ?? '' }) });

  const createMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['skuCategory']['create']>>({
    mutationFn: (p) => trpcClient.skuCategory.create.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['skuCategoryList'] }); setResultMessage('Created.'); setModalStage('success'); setTimeout(() => navigate(`/sku-category/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });
  const updateMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['skuCategory']['update']>>({
    mutationFn: (p) => trpcClient.skuCategory.update.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['skuCategoryList'] }); queryClient.removeQueries({ queryKey: ['skuCategoryDetail', id] }); setResultMessage('Updated.'); setModalStage('success'); setTimeout(() => navigate(`/sku-category/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });

  const form = useForm({ defaultValues: (isEdit && data ? fromDetail(data as DetailData) : defaults()), onSubmit: async ({ value }) => { setFormError(null); setModalStage('loading'); if (isEdit && id) updateMutation.mutate({ currentId: id, ...value }); else createMutation.mutate(value); } });

  useAiFillForm({ name: (v: unknown) => form.setFieldValue('name', String(v)), code: (v: unknown) => form.setFieldValue('code', String(v)), description: (v: unknown) => form.setFieldValue('description', String(v)) });

  if (isEdit && isLoading) return <div className="skuc-form__loading"><Spinner size="lg" /></div>;
  if (isEdit && !data) return <div className="skuc-form__not-found"><p className="skuc-form__not-found-msg">Not found.</p><Button variant="ghost" onClick={() => navigate('/sku-category')}>Back</Button></div>;

  return (
    <section className="skuc-form" data-ai-context={JSON.stringify({ section: 'sku-category-form', mode: isEdit ? 'edit' : 'create', categoryId: id ?? null })}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <PageHeader title={isEdit ? 'Edit Category' : 'Create Category'} onBack={() => navigate(isEdit && id ? `/sku-category/${id}` : '/sku-category')} />
        <Card>
          <div className="skuc-form__grid">
            <form.Field name="name" validators={{ onChange: ({ value }) => !value?.trim() ? 'Required' : undefined }}>
              {(field) => <FormField isRequired error={field.state.meta.errors.length > 0 ? field.state.meta.errors[0] as string : undefined}><Label>Name</Label><Input value={field.state.value} onValueChange={field.handleChange} onBlur={field.handleBlur} placeholder="e.g. Beverages" />{field.state.meta.errors.map((e) => <FieldError key={e as string}>{e as string}</FieldError>)}</FormField>}
            </form.Field>
            <form.Field name="code">
              {(field) => <FormField><Label>Code</Label><Input value={field.state.value} onValueChange={field.handleChange} onBlur={field.handleBlur} placeholder="e.g. BEV" /></FormField>}
            </form.Field>
            <form.Field name="description">
              {(field) => <FormField className="skuc-form__grid--full"><Label>Description</Label><Textarea value={field.state.value} onValueChange={field.handleChange} onBlur={field.handleBlur} placeholder="Optional description" /></FormField>}
            </form.Field>
          </div>
        </Card>
        {formError && <p className="skuc-form__error-msg">{formError}</p>}
        <div className="skuc-form__actions">
          <Button variant="ghost" onClick={() => navigate(isEdit && id ? `/sku-category/${id}` : '/sku-category')}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Save' : 'Create'}</Button>
        </div>
      </form>
      <Modal isOpen={modalStage !== 'idle'} onClose={() => { if (modalStage !== 'loading') setModalStage('idle'); }}><ModalContent>{modalStage === 'loading' ? <ModalBody><div className="skuc-form__modal-spinner"><Spinner size="lg" /></div></ModalBody> : modalStage === 'success' ? <ModalBody><div className="skuc-form__modal-success"><div className="skuc-form__modal-success-icon"><svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><p className="skuc-form__modal-success-text">{resultMessage}</p></div></ModalBody> : <><ModalHeader>Error</ModalHeader><ModalBody><p className="skuc-form__modal-error-text">{resultMessage}</p></ModalBody><ModalFooter><Button onClick={() => setModalStage('idle')}>Close</Button></ModalFooter></>}</ModalContent></Modal>
    </section>
  );
}

export { SkuCategoryFormPage };