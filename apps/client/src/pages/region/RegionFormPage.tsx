import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import './Region.css';
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
        <section className="reg-form">
          <PageHeader
            title={
              isEdit
                ? intl.formatMessage({ id: 'region.form.title_edit', defaultMessage: 'Edit Region' })
                : intl.formatMessage({ id: 'region.form.title_create', defaultMessage: 'Create Region' })
            }
            onBack={() => navigate(isEdit && regionId ? `/region/${regionId}` : '/region')}
          />

          <Card>
            <div className="reg-form__grid">
              <form.Field name="code" validators={{ onChange: ({ value }) => undefined }}>
                {(field) => (
                  <FormField isRequired label={intl.formatMessage({ id: 'region.form.code', defaultMessage: 'Code' })}>
                    <Input
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder={intl.formatMessage({ id: 'region.form.code_placeholder', defaultMessage: 'e.g. REG-JKT' })}
                    />
                  </FormField>
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
                  <FormField isRequired error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : undefined} label={intl.formatMessage({ id: 'region.form.name', defaultMessage: 'Name' })}>
                    <Input
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder={intl.formatMessage({ id: 'region.form.name_placeholder', defaultMessage: 'e.g. Jakarta Region' })}
                    />
                  </FormField>
                )}
              </form.Field>
            </div>
          </Card>

          {formError ? (
            <p className="reg-form__error-msg">{formError}</p>
          ) : null}

          <div className="reg-form__actions">
            <Button
              variant="ghost"
              onClick={() => navigate(isEdit && regionId ? `/region/${regionId}` : '/region')}
            >
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button variant="primary" type="submit" disabled={isPending}>
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

      <Modal isOpen={modalStage !== 'idle'} onClose={() => handleModalClose()}>
        <ModalContent>
          {modalStage === 'loading' ? (
            <ModalBody>
              <div className="reg-form__modal-spinner">
                <Spinner size="lg" />
              </div>
            </ModalBody>
          ) : modalStage === 'success' ? (
            <ModalBody>
              <div className="reg-form__modal-success">
                <div className="reg-form__modal-success-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="reg-form__modal-success-text">{resultMessage}</p>
              </div>
            </ModalBody>
          ) : modalStage === 'error' ? (
            <>
              <ModalHeader>
                {intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' })}
              </ModalHeader>
              <ModalBody>
                <p className="reg-form__error-msg">{resultMessage}</p>
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
      <div className="reg-form__loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEdit && !data) {
    return (
      <div className="reg-form__not-found">
        <p className="reg-form__not-found-msg">
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