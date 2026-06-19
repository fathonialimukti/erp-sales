import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, FieldError, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, Textarea, FormField, Select } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { trpcClient } from '../../lib/trpc';

type OutletFormValues = {
  customerId: string;
  areaId: string;
  code: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  latitude: string;
  longitude: string;
  status: string;
};

type OutletDetail = {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  customerId?: string;
  areaId?: string;
};

const defaultFormValues = (): OutletFormValues => ({
  customerId: '',
  areaId: '',
  code: '',
  name: '',
  address: '',
  contactName: '',
  contactPhone: '',
  latitude: '',
  longitude: '',
  status: 'ACTIVE',
});

const transformDetailToFormValues = (detail: OutletDetail): OutletFormValues => ({
  customerId: detail.customerId ?? '',
  areaId: detail.areaId ?? '',
  code: detail.code ?? '',
  name: detail.name,
  address: detail.address ?? '',
  contactName: detail.contactName ?? '',
  contactPhone: detail.contactPhone ?? '',
  latitude: detail.latitude?.toString() ?? '',
  longitude: detail.longitude?.toString() ?? '',
  status: detail.status,
});

function OutletForm({
  initialValues,
  isEdit,
  outletId,
}: {
  initialValues: OutletFormValues;
  isEdit: boolean;
  outletId?: string;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');
  const [redirectId, setRedirectId] = useState<string | null>(null);

  const { data: customerList } = useQuery({
    queryKey: ['customerSelect'],
    queryFn: () => trpcClient.customer.list.query({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: areaList } = useQuery({
    queryKey: ['areaSelect'],
    queryFn: () => trpcClient.area.list.query({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const handleNavSuccess = (newId: string) => {
    setTimeout(() => navigate(`/outlet/${newId}`), 1500);
  };

  const createMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['outlet']['create']>>({
    mutationFn: (payload) => trpcClient.outlet.create.mutate(payload),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['outletList'] });
      queryClient.removeQueries({ queryKey: ['outletDetail', created.id] });
      setRedirectId(created.id);
      setResultMessage(intl.formatMessage({ id: 'outlet.form.success_created', defaultMessage: 'Outlet created successfully.' }));
      setModalStage('success');
      handleNavSuccess(created.id);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'outlet.form.error_create_failed', defaultMessage: 'Failed to create outlet.' }));
      setModalStage('error');
    },
  });

  const updateMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['outlet']['update']>>({
    mutationFn: (payload) => trpcClient.outlet.update.mutate(payload),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['outletList'] });
      queryClient.removeQueries({ queryKey: ['outletDetail', outletId] });
      setRedirectId(updated.id);
      setResultMessage(intl.formatMessage({ id: 'outlet.form.success_updated', defaultMessage: 'Outlet updated successfully.' }));
      setModalStage('success');
      handleNavSuccess(updated.id);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'outlet.form.error_update_failed', defaultMessage: 'Failed to update outlet.' }));
      setModalStage('error');
    },
  });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setFormError(null);
      setModalStage('loading');
      const payload = {
        ...value,
        latitude: value.latitude ? Number(value.latitude) : null,
        longitude: value.longitude ? Number(value.longitude) : null,
      };
      if (isEdit && outletId) {
        updateMutation.mutate({ currentId: outletId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isPending = isLoading;

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <section className="space-y-6">
          <PageHeader
            title={
              isEdit
                ? intl.formatMessage({ id: 'outlet.form.title_edit', defaultMessage: 'Edit Outlet' })
                : intl.formatMessage({ id: 'outlet.form.title_create', defaultMessage: 'Create Outlet' })
            }
            onBack={() => navigate(isEdit && outletId ? `/outlet/${outletId}` : '/outlet')}
          />

          <Card>
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">
                {intl.formatMessage({ id: 'outlet.form.section_general', defaultMessage: 'General Information' })}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="name" validators={{ onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return intl.formatMessage({ id: 'outlet.form.error_name_required', defaultMessage: 'Outlet name is required.' });
                  }
                  return undefined;
                }}}>
                  {(field) => (
                    <FormField isRequired error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : undefined} label={intl.formatMessage({ id: 'outlet.form.field_name', defaultMessage: 'Name' })}>
                      <Input
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'outlet.form.field_name_placeholder', defaultMessage: 'e.g. Toko Makmur Jaya' })}
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="code" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <FormField label={intl.formatMessage({ id: 'outlet.form.field_code', defaultMessage: 'Code' })}>
                      <Input
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'outlet.form.field_code_placeholder', defaultMessage: 'e.g. OUT-001' })}
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="customerId" validators={{ onChange: ({ value }) => {
                  if (!value) return intl.formatMessage({ id: 'outlet.form.error_customer_required', defaultMessage: 'Customer is required.' });
                  return undefined;
                }}}>
                  {(field) => (
                    <FormField isRequired error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : undefined} label={intl.formatMessage({ id: 'outlet.form.field_customer', defaultMessage: 'Customer' })}>
                      <select
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm"
                      >
                        <option value="">{intl.formatMessage({ id: 'outlet.form.select_customer', defaultMessage: 'Select a customer...' })}</option>
                        {(customerList as { data?: { id: string; name: string }[] })?.data?.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="areaId" validators={{ onChange: ({ value }) => {
                  if (!value) return intl.formatMessage({ id: 'outlet.form.error_area_required', defaultMessage: 'Area is required.' });
                  return undefined;
                }}}>
                  {(field) => (
                    <FormField isRequired error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : undefined} label={intl.formatMessage({ id: 'outlet.form.field_area', defaultMessage: 'Area' })}>
                      <select
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm"
                      >
                        <option value="">{intl.formatMessage({ id: 'outlet.form.select_area', defaultMessage: 'Select an area...' })}</option>
                        {(areaList as { data?: { id: string; name: string }[] })?.data?.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="status" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <FormField label={intl.formatMessage({ id: 'outlet.form.field_status', defaultMessage: 'Status' })}>
                      <Input
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder="ACTIVE"
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="address" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <FormField className="md:col-span-2" label={intl.formatMessage({ id: 'outlet.form.field_address', defaultMessage: 'Address' })}>
                      <Textarea
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'outlet.form.field_address_placeholder', defaultMessage: 'Full street address' })}
                      />
                    </FormField>
                  )}
                </form.Field>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">
                {intl.formatMessage({ id: 'outlet.form.section_contact', defaultMessage: 'Contact & Location' })}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="contactName" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <FormField label={intl.formatMessage({ id: 'outlet.form.field_contact_name', defaultMessage: 'Contact Name' })}>
                      <Input
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'outlet.form.field_contact_name_placeholder', defaultMessage: 'e.g. Budi Santoso' })}
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="contactPhone" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <FormField label={intl.formatMessage({ id: 'outlet.form.field_contact_phone', defaultMessage: 'Contact Phone' })}>
                      <Input
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'outlet.form.field_contact_phone_placeholder', defaultMessage: 'e.g. 08123456789' })}
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="latitude" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <FormField label={intl.formatMessage({ id: 'outlet.form.field_latitude', defaultMessage: 'Latitude' })}>
                      <Input
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        type="number"
                        placeholder={intl.formatMessage({ id: 'outlet.form.field_latitude_placeholder', defaultMessage: 'e.g. -6.2088' })}
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="longitude" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <FormField label={intl.formatMessage({ id: 'outlet.form.field_longitude', defaultMessage: 'Longitude' })}>
                      <Input
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        type="number"
                        placeholder={intl.formatMessage({ id: 'outlet.form.field_longitude_placeholder', defaultMessage: 'e.g. 106.8456' })}
                      />
                    </FormField>
                  )}
                </form.Field>
              </div>
            </div>
          </Card>

          {formError ? (
            <p className="text-sm text-danger">{formError}</p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(isEdit && outletId ? `/outlet/${outletId}` : '/outlet')}
            >
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" /> : isEdit ? intl.formatMessage({ id: 'common.action.save', defaultMessage: 'Save' }) : intl.formatMessage({ id: 'common.action.create', defaultMessage: 'Create' })}
            </Button>
          </div>
        </section>
      </form>

      <Modal isOpen={modalStage !== 'idle'} onClose={() => { if (modalStage !== 'loading') setModalStage('idle'); }}>
        <ModalContent>
          {modalStage === 'loading' ? (
            <ModalBody>
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            </ModalBody>
          ) : modalStage === 'success' ? (
            <ModalBody>
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-success-soft">
                  <svg className="size-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-center text-sm">{resultMessage}</p>
              </div>
            </ModalBody>
          ) : modalStage === 'error' ? (
            <>
              <ModalHeader>
                {intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' })}
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-danger">{resultMessage}</p>
              </ModalBody>
              <ModalFooter>
                <Button onClick={() => setModalStage('idle')}>
                  {intl.formatMessage({ id: 'common.action.close', defaultMessage: 'Close' })}
                </Button>
              </ModalFooter>
            </>
          ) : null}
        </ModalContent>
      </Modal>
    </>
  );
}

function OutletFormPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data, isLoading } = useQuery({
    queryKey: ['outletDetail', id],
    enabled: isEdit,
    queryFn: () => trpcClient.outlet.detail.query({ id: id ?? '' }),
  });

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEdit && !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {intl.formatMessage({ id: 'outlet.form.not_found', defaultMessage: 'Outlet not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/outlet')}>
          {intl.formatMessage({ id: 'outlet.detail.back', defaultMessage: 'Back to Outlets' })}
        </Button>
      </div>
    );
  }

  const initialValues = isEdit && data
    ? transformDetailToFormValues(data as OutletDetail)
    : defaultFormValues();

  return (
    <OutletForm
      initialValues={initialValues}
      isEdit={isEdit}
      outletId={id}
    />
  );
}

export { OutletFormPage };