import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, FieldError, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, Textarea, FormField } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { trpcClient } from '../../lib/trpc';

type CustomerFormValues = {
  code: string;
  name: string;
  taxId: string;
  paymentTerms: string;
  creditLimit: string;
  status: string;
  billingAddress: string;
  notes: string;
};

type CustomerDetail = {
  id: string;
  code: string | null;
  name: string;
  taxId: string | null;
  paymentTerms: string | null;
  creditLimit: number | null;
  status: string;
  billingAddress: string | null;
  notes: string | null;
};

const defaultFormValues = (): CustomerFormValues => ({
  code: '',
  name: '',
  taxId: '',
  paymentTerms: '',
  creditLimit: '',
  status: 'ACTIVE',
  billingAddress: '',
  notes: '',
});

const transformDetailToFormValues = (detail: CustomerDetail): CustomerFormValues => ({
  code: detail.code ?? '',
  name: detail.name,
  taxId: detail.taxId ?? '',
  paymentTerms: detail.paymentTerms ?? '',
  creditLimit: detail.creditLimit?.toString() ?? '',
  status: detail.status,
  billingAddress: detail.billingAddress ?? '',
  notes: detail.notes ?? '',
});

function CustomerForm({
  initialValues,
  isEdit,
  customerId,
}: {
  initialValues: CustomerFormValues;
  isEdit: boolean;
  customerId?: string;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');
  const successRedirectIdRef = useState<string | null>(null)[0] ?? null;
  const [redirectId, setRedirectId] = useState<string | null>(null);
  const resultTimerRef = useState<number | null>(null)[0] ?? null;

  const clearResultTimer = () => {
    // no-op; using setTimeout pattern
  };

  useEffect(() => () => {
    // cleanup
  }, []);

  const handleNavSuccess = (newId: string) => {
    setTimeout(() => {
      navigate(`/customer/${newId}`);
    }, 1500);
  };

  const createMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['customer']['create']>>({
    mutationFn: (payload) => trpcClient.customer.create.mutate(payload),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['customerList'] });
      queryClient.removeQueries({ queryKey: ['customerDetail', created.id] });
      setRedirectId(created.id);
      setResultMessage(intl.formatMessage({ id: 'customer.form.success_created', defaultMessage: 'Customer created successfully.' }));
      setModalStage('success');
      handleNavSuccess(created.id);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'customer.form.error_create_failed', defaultMessage: 'Failed to create customer.' }));
      setModalStage('error');
    },
  });

  const updateMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['customer']['update']>>({
    mutationFn: (payload) => trpcClient.customer.update.mutate(payload),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['customerList'] });
      queryClient.removeQueries({ queryKey: ['customerDetail', customerId] });
      setRedirectId(updated.id);
      setResultMessage(intl.formatMessage({ id: 'customer.form.success_updated', defaultMessage: 'Customer updated successfully.' }));
      setModalStage('success');
      handleNavSuccess(updated.id);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'customer.form.error_update_failed', defaultMessage: 'Failed to update customer.' }));
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
        creditLimit: value.creditLimit ? Number(value.creditLimit) : null,
      };
      if (isEdit && customerId) {
        updateMutation.mutate({ currentId: customerId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
  });

  const isLoading= createMutation.isPending || updateMutation.isPending;

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
                ? intl.formatMessage({ id: 'customer.form.title_edit', defaultMessage: 'Edit Customer' })
                : intl.formatMessage({ id: 'customer.form.title_create', defaultMessage: 'Create Customer' })
            }
            onBack={() => navigate(isEdit && customerId ? `/customer/${customerId}` : '/customer')}
          />

          <Card>
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">
                {intl.formatMessage({ id: 'customer.form.section_general', defaultMessage: 'General Information' })}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="name" validators={{ onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return intl.formatMessage({ id: 'customer.form.error_name_required', defaultMessage: 'Customer name is required.' });
                  }
                  return undefined;
                }}}>
                  {(field) => (
                    <TextField isRequired isInvalid={field.state.meta.errors.length > 0}>
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_name', defaultMessage: 'Name' })}
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'customer.form.field_name_placeholder', defaultMessage: 'e.g. PT Maju Bersama' })}
                      />
                      {field.state.meta.errors.map((error) => (
                        <FieldError key={error as string}>{error as string}</FieldError>
                      ))}
                    </TextField>
                  )}
                </form.Field>

                <form.Field name="code" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <TextField>
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_code', defaultMessage: 'Code' })}
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'customer.form.field_code_placeholder', defaultMessage: 'e.g. CUST-001' })}
                      />
                    </TextField>
                  )}
                </form.Field>

                <form.Field name="taxId" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <TextField>
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_tax_id', defaultMessage: 'Tax ID (NPWP)' })}
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'customer.form.field_tax_id_placeholder', defaultMessage: 'e.g. 12.345.678.9-123.000' })}
                      />
                    </TextField>
                  )}
                </form.Field>

                <form.Field name="status" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <TextField>
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_status', defaultMessage: 'Status' })}
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder="ACTIVE"
                      />
                    </TextField>
                  )}
                </form.Field>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">
                {intl.formatMessage({ id: 'customer.form.section_finance', defaultMessage: 'Finance & Billing' })}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="paymentTerms" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <TextField>
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_payment_terms', defaultMessage: 'Payment Terms' })}
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'customer.form.field_payment_terms_placeholder', defaultMessage: 'e.g. NET 30, 50/50' })}
                      />
                    </TextField>
                  )}
                </form.Field>

                <form.Field name="creditLimit" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <TextField>
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_credit_limit', defaultMessage: 'Credit Limit' })}
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        type="number"
                        placeholder={intl.formatMessage({ id: 'customer.form.field_credit_limit_placeholder', defaultMessage: 'e.g. 50000000' })}
                      />
                    </TextField>
                  )}
                </form.Field>

                <form.Field name="billingAddress" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <TextField className="md:col-span-2">
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_billing_address', defaultMessage: 'Billing Address' })}
                      </Label>
                      <TextArea
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'customer.form.field_billing_address_placeholder', defaultMessage: 'Full billing address' })}
                      />
                    </TextField>
                  )}
                </form.Field>

                <form.Field name="notes" validators={{ onChange: ({ value }) => undefined }}>
                  {(field) => (
                    <TextField className="md:col-span-2">
                      <Label>
                        {intl.formatMessage({ id: 'customer.form.field_notes', defaultMessage: 'Notes' })}
                      </Label>
                      <TextArea
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder={intl.formatMessage({ id: 'customer.form.field_notes_placeholder', defaultMessage: 'Internal notes about this customer' })}
                      />
                    </TextField>
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
              onClick={() => navigate(isEdit && customerId ? `/customer/${customerId}` : '/customer')}
            >
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="primary" type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" /> : isEdit ? intl.formatMessage({ id: 'common.action.save', defaultMessage: 'Save' }) : intl.formatMessage({ id: 'common.action.create', defaultMessage: 'Create' })}
            </Button>
          </div>
        </section>
      </form>

      <Modal isOpen={modalStage !== 'idle'} onOpenChange={() => { if (modalStage !== 'loading') setModalStage('idle'); }}>
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

function CustomerFormPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data, isLoading } = useQuery({
    queryKey: ['customerDetail', id],
    enabled: isEdit,
    queryFn: () => trpcClient.customer.detail.query({ id: id ?? '' }),
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
          {intl.formatMessage({ id: 'customer.form.not_found', defaultMessage: 'Customer not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/customer')}>
          {intl.formatMessage({ id: 'customer.detail.back', defaultMessage: 'Back to Customers' })}
        </Button>
      </div>
    );
  }

  const initialValues = isEdit && data
    ? transformDetailToFormValues(data as CustomerDetail)
    : defaultFormValues();

  return (
    <CustomerForm
      initialValues={initialValues}
      isEdit={isEdit}
      customerId={id}
    />
  );
}

export { CustomerFormPage };