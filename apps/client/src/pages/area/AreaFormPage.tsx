import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, FieldError, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Spinner, FormField } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { trpcClient } from '../../lib/trpc';

type AreaFormValues = {
  regionId: string;
  code: string;
  name: string;
};

type AreaDetail = {
  id: string;
  code: string | null;
  name: string;
  region: { id: string; name: string };
};

type RegionOption = {
  id: string;
  name: string;
};

const defaultFormValues = (): AreaFormValues => ({
  regionId: '',
  code: '',
  name: '',
});

const transformDetailToFormValues = (detail: AreaDetail): AreaFormValues => ({
  regionId: detail.region.id,
  code: detail.code ?? '',
  name: detail.name,
});

function AreaForm({
  initialValues,
  isEdit,
  areaId,
  regions,
}: {
  initialValues: AreaFormValues;
  isEdit: boolean;
  areaId?: string;
  regions: RegionOption[];
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
    if (redirectId) navigate(`/area/${redirectId}`);
  };

  const createMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['area']['create']>>({
    mutationFn: (payload) => trpcClient.area.create.mutate(payload),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['areaList'] });
      queryClient.removeQueries({ queryKey: ['areaDetail', created.id] });
      successRedirectIdRef.current = created.id;
      setResultMessage(intl.formatMessage({ id: 'area.form.success_created', defaultMessage: 'Area created successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'area.form.error_create_failed', defaultMessage: 'Failed to create area.' }));
      setModalStage('error');
    },
  });

  const updateMutation = useMutation<{ id: string }, unknown, inferProcedureInput<AppRouter['area']['update']>>({
    mutationFn: (payload) => trpcClient.area.update.mutate(payload),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['areaList'] });
      queryClient.removeQueries({ queryKey: ['areaDetail', areaId] });
      successRedirectIdRef.current = updated.id;
      setResultMessage(intl.formatMessage({ id: 'area.form.success_updated', defaultMessage: 'Area updated successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: () => {
      setResultMessage(intl.formatMessage({ id: 'area.form.error_update_failed', defaultMessage: 'Failed to update area.' }));
      setModalStage('error');
    },
  });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setFormError(null);
      setModalStage('loading');
      if (isEdit && areaId) {
        updateMutation.mutate({ currentId: areaId, ...value });
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
        <section className="space-y-6">
          <PageHeader
            title={
              isEdit
                ? intl.formatMessage({ id: 'area.form.title_edit', defaultMessage: 'Edit Area' })
                : intl.formatMessage({ id: 'area.form.title_create', defaultMessage: 'Create Area' })
            }
            onBack={() => navigate(isEdit && areaId ? `/area/${areaId}` : '/area')}
          />

          <Card>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <form.Field
                name="regionId"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) {
                      return intl.formatMessage({ id: 'area.form.error_region_required', defaultMessage: 'Region is required.' });
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Select
                    isRequired
                    label={intl.formatMessage({ id: 'area.form.region', defaultMessage: 'Region' })}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  >
                    {regions.map((r) => (
                      <SelectItem key={r.id}>{r.name}</SelectItem>
                    ))}
                  </Select>
                )}
              </form.Field>

              <form.Field name="code" validators={{ onChange: ({ value }) => undefined }}>
                {(field) => (
                  <FormField
                    label={intl.formatMessage({ id: 'area.form.code', defaultMessage: 'Code' })}
                  >
                    <Input
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder={intl.formatMessage({ id: 'area.form.code_placeholder', defaultMessage: 'e.g. JKT-PUSAT' })}
                    />
                  </FormField>
                )}
              </form.Field>

              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return intl.formatMessage({ id: 'area.form.error_name_required', defaultMessage: 'Area name is required.' });
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <FormField
                    isRequired
                    label={intl.formatMessage({ id: 'area.form.name', defaultMessage: 'Name' })}
                    error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : undefined}
                  >
                    <Input
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder={intl.formatMessage({ id: 'area.form.name_placeholder', defaultMessage: 'e.g. Jakarta Pusat' })}
                    />
                  </FormField>
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
              onClick={() => navigate(isEdit && areaId ? `/area/${areaId}` : '/area')}
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
                <Button variant="secondary" onClick={handleModalClose}>
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

function AreaFormPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['areaDetail', id],
    enabled: isEdit,
    queryFn: () => trpcClient.area.detail.query({ id: id ?? '' }),
  });

  const { data: regionsData, isLoading: regionsLoading } = useQuery({
    queryKey: ['regionList', 0, 100, ''],
    queryFn: () => trpcClient.region.list.query({ page: 1, limit: 100 }),
  });

  if ((isEdit && detailLoading) || regionsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEdit && !detailData) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {intl.formatMessage({ id: 'area.form.not_found', defaultMessage: 'Area not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/area')}>
          {intl.formatMessage({ id: 'area.detail.back', defaultMessage: 'Back to Areas' })}
        </Button>
      </div>
    );
  }

  const initialValues = isEdit && detailData
    ? transformDetailToFormValues(detailData as AreaDetail)
    : defaultFormValues();

  const regions = (regionsData?.data ?? []) as RegionOption[];

  return (
    <AreaForm
      initialValues={initialValues}
      isEdit={isEdit}
      areaId={id}
      regions={regions}
    />
  );
}

export { AreaFormPage };