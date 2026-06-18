import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, FieldError, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, FormField } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { trpcClient } from '../../lib/trpc';

type RegionFormValues = {
  code: string;
  name: string;
};

type RegionDetail = {
  id: string;
  code: string | null;
  name: string;
};

const defaultFormValues = (): RegionFormValues => ({
  code: '',
  name: '',
});

const transformDetailToFormValues = (detail: RegionDetail): RegionFormValues => ({
  code: detail.code ?? '',
  name: detail.name,
});

function RegionForm({
  initialValues,
  isEdit,
  regionId,
}: {
  initialValues: RegionFormValues;
  isEdit: boolean;
  regionId?: string;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');
  const successRedirectIdRef = useRef<string | null>(null);
  const resultTimerRef = useRef<number | null>(null);

  const clearResultTimer = () => {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  };

  useEffect(() => () => clearResultTimer(), []);

  const handleModalClose = () => {
    if (modalStage === 'loading') return;
    clearResultTimer();
    const redirectId = successRedirectIdRef.current;
    successRedirectIdRef.current = null;
    setModalStage('idle');
    if (redirectId) navigate(`/region/${redirectId}`);
  };

  const createMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['region']['create']>>({
    mutationFn: (payload) => trpcClient.region.create.mutate(payload),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['regionList'] });
      queryClient.removeQueries({ queryKey: ['regionDetail', created.id] });
      successRedirectIdRef.current = created.id;
      setResultMessage(intl.formatMessage({ id: 'region.form.success_created', defaultMessage: 'Region created successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'region.form.error_create_failed', defaultMessage: 'Failed to create region.' }));
      setModalStage('error');
    },
  });

  const updateMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['region']['update']>>({
    mutationFn: (payload) => trpcClient.region.update.mutate(payload),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['regionList'] });
      queryClient.removeQueries({ queryKey: ['regionDetail', regionId] });
      successRedirectIdRef.current = updated.id;
      setResultMessage(intl.formatMessage({ id: 'region.form.success_updated', defaultMessage: 'Region updated successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'region.form.error_update_failed', defaultMessage: 'Failed to update region.' }));
      setModalStage('error');
    },
  });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setFormError(null);
      setModalStage('loading');
      if (isEdit && regionId) {
        updateMutation.mutate({ currentId: regionId, ...value });
      } else {
        createMutation.mutate(value);
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
                ? intl.formatMessage({ id: 'region.form.title_edit', defaultMessage: 'Edit Region' })
                : intl.formatMessage({ id: 'region.form.title_create', defaultMessage: 'Create Region' })
            }
            onBack={() => navigate(isEdit && regionId ? `/region/${regionId}` : '/region')}
          />

          <Card>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <form.Field name="code" validators={{ onChange: ({ value }) => undefined }}>
                {(field) => (
                  <TextField isRequired>
                    <Label>
                      {intl.formatMessage({ id: 'region.form.code', defaultMessage: 'Code' })}
                    </Label>
                    <Input
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder={intl.formatMessage({ id: 'region.form.code_placeholder', defaultMessage: 'e.g. REG-JKT' })}
                    />
                  </TextField>
                )}
              </form.Field>

              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return intl.formatMessage({ id: 'region.form.error_name_required', defaultMessage: 'Region name is required.' });
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <TextField isRequired isInvalid={field.state.meta.errors.length > 0}>
                    <Label>
                      {intl.formatMessage({ id: 'region.form.name', defaultMessage: 'Name' })}
                    </Label>
                    <Input
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder={intl.formatMessage({ id: 'region.form.name_placeholder', defaultMessage: 'e.g. Jakarta Region' })}
                    />
                    {field.state.meta.errors.map((error) => (
                      <FieldError key={error as string}>{error as string}</FieldError>
                    ))}
                  </TextField>
                )}
              </form.Field>
            </div>
          </Card>

          {formError ? (
            <p className="text-sm text-danger">{formError}</p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(isEdit && regionId ? `/region/${regionId}` : '/region')}
            >
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="primary" type="submit" disabled={isPending}>
              {isPending ? (
                <Spinner size="sm" />
              ) : isEdit ? (
                intl.formatMessage({ id: 'common.action.save', defaultMessage: 'Save' })
              ) : (
                intl.formatMessage({ id: 'common.action.create', defaultMessage: 'Create' })
              )}
            </Button>
          </div>
        </section>
      </form>

      <Modal isOpen={modalStage !== 'idle'} onOpenChange={() => handleModalClose()}>
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
                <Button onClick={handleModalClose}>
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

function RegionFormPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data, isLoading } = useQuery({
    queryKey: ['regionDetail', id],
    enabled: isEdit,
    queryFn: () => trpcClient.region.detail.query({ id: id ?? '' }),
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
          {intl.formatMessage({ id: 'region.form.not_found', defaultMessage: 'Region not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/region')}>
          {intl.formatMessage({ id: 'region.detail.back', defaultMessage: 'Back to Regions' })}
        </Button>
      </div>
    );
  }

  const initialValues = isEdit && data
    ? transformDetailToFormValues(data as RegionDetail)
    : defaultFormValues();

  return (
    <RegionForm
      initialValues={initialValues}
      isEdit={isEdit}
      regionId={id}
    />
  );
}

export { RegionFormPage };