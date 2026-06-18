import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { Icon } from "../../ui";
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  useToast,
} from '../../ui';
import { PageHeader } from '../../components/PageHeader';
import { ImageUploadField } from '../../components/ImageUploadField';
import { trpcClient } from '../../lib/trpc';

type UserFormValues = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  photo: string;
};

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  photo?: string | null;
  role: { id: string; name: string } | null;
};

const defaultFormValues = (): UserFormValues => ({
  name: '',
  email: '',
  password: '',
  roleId: '',
  photo: '',
});

const transformDetailToFormValues = (detail: UserDetail): UserFormValues => ({
  name: detail.name ?? '',
  email: detail.email,
  password: '',
  roleId: detail.role?.id ?? '',
  photo: detail.photo ?? '',
});

const InnerForm = ({
  initialValues,
  isEdit,
  userId,
}: {
  initialValues: UserFormValues;
  isEdit: boolean;
  userId?: string;
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

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
    if (redirectId) navigate(`/users/${redirectId}`);
  };

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; email: string; password: string; roleId: string; photo?: string }) =>
      trpcClient.user.create.mutate(payload),
    onSuccess: async (created: { id: string }) => {
      await queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.removeQueries({ queryKey: ['userDetail', created.id] });
      successRedirectIdRef.current = created.id;
      setResultMessage(intl.formatMessage({ id: 'users.form.success_created', defaultMessage: 'User created successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : 'Failed to create user.');
      setModalStage('error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; name?: string; email?: string; password?: string; roleId?: string; photo?: string }) =>
      trpcClient.user.update.mutate(payload),
    onSuccess: async (updated: { id: string }) => {
      await queryClient.invalidateQueries({ queryKey: ['userList'] });
      await queryClient.invalidateQueries({ queryKey: ['userDetail', updated.id] });
      successRedirectIdRef.current = updated.id;
      setResultMessage(intl.formatMessage({ id: 'users.form.success_updated', defaultMessage: 'User updated successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : 'Failed to update user.');
      setModalStage('error');
    },
  });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const photo = value.photo || undefined;
      if (isEdit && userId) {
        updateMutation.mutate({
          id: userId,
          name: value.name,
          email: value.email,
          roleId: value.roleId,
          ...(value.password ? { password: value.password } : {}),
          ...(photo ? { photo } : {}),
        });
      } else {
        createMutation.mutate({
          name: value.name,
          email: value.email,
          password: value.password,
          roleId: value.roleId,
          photo,
        });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: rolesData } = useQuery({
    queryKey: ['rolesListForSelect'],
    queryFn: () => trpcClient.role.list.query({ page: 1, limit: 100 }),
  });

  const roleOptions = (rolesData?.data ?? []) as { id: string; name: string }[];

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <section className="space-y-6">
          <PageHeader
            title={
              isEdit
                ? intl.formatMessage({ id: 'users.form.title_edit', defaultMessage: 'Edit user' })
                : intl.formatMessage({ id: 'users.form.title_create', defaultMessage: 'Create user' })
            }
            onBack={() => navigate(isEdit && userId ? `/users/${userId}` : '/users')}
          />

          <Card>
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'users.form.identity', defaultMessage: 'Identity' })}</CardTitle>
              <CardDescription>{intl.formatMessage({ id: 'users.form.identity_description', defaultMessage: 'Display name and contact details.' })}</CardDescription>
            </CardHeader>
            <CardBody className="grid gap-6 md:grid-cols-2">
              <form.Field name="name" validators={{ onChange: ({ value }) => (value && value.trim().length > 0 ? undefined : 'Name is required.') }}>
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      {intl.formatMessage({ id: 'users.form.name', defaultMessage: 'Name' })}
                      <span className="ml-0.5 text-red-500">*</span>
                    </Label>
                    <Input value={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} />
                    {field.state.meta.errors.map((error, i) => (
                      <FieldError key={i}>{String(error)}</FieldError>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="email" validators={{ onChange: ({ value }) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? '') ? undefined : 'Invalid email address.') }}>
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      {intl.formatMessage({ id: 'users.form.email', defaultMessage: 'Email' })}
                      <span className="ml-0.5 text-red-500">*</span>
                    </Label>
                    <Input type="email" value={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} />
                    {field.state.meta.errors.map((error, i) => (
                      <FieldError key={i}>{String(error)}</FieldError>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    if (isEdit) return undefined;
                    return (value && value.length >= 6) || !value ? undefined : 'Password must be at least 6 characters.';
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      {intl.formatMessage({ id: 'users.form.password', defaultMessage: 'Password' })}
                      {!isEdit && <span className="ml-0.5 text-red-500">*</span>}
                    </Label>
                    <Input type="password" value={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} placeholder={isEdit ? 'Leave blank to keep current' : ''} />
                    {field.state.meta.errors.map((error, i) => (
                      <FieldError key={i}>{String(error)}</FieldError>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="roleId" validators={{ onChange: ({ value }) => (value ? undefined : 'Role is required.') }}>
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      {intl.formatMessage({ id: 'users.form.role', defaultMessage: 'Role' })}
                      <span className="ml-0.5 text-red-500">*</span>
                    </Label>
                    <Select
                      value={field.state.value}
                      onChange={(v: string) => field.handleChange(v)}
                      placeholder={intl.formatMessage({ id: 'users.form.role_placeholder', defaultMessage: 'Select a role' })}
                    >
                      {roleOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </Select>
                    {field.state.meta.errors.map((error, i) => (
                      <FieldError key={i}>{String(error)}</FieldError>
                    ))}
                  </div>
                )}
              </form.Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'users.form.photo', defaultMessage: 'Profile photo' })}</CardTitle>
              <CardDescription>{intl.formatMessage({ id: 'users.form.photo_description', defaultMessage: 'Square image, at least 256×256px.' })}</CardDescription>
            </CardHeader>
            <CardBody>
              <form.Field name="photo">
                {(field) => (
                  <ImageUploadField
                    value={field.state.value}
                    onChange={(v) => field.handleChange(v)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </CardBody>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(isEdit && userId ? `/users/${userId}` : '/users')}
            >
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="primary" type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" /> : isEdit ? (
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
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <Icon icon="solar:check-circle-bold" className="size-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-center text-sm">{resultMessage}</p>
              </div>
            </ModalBody>
          ) : (
            <>
              <ModalHeader>{intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' })}</ModalHeader>
              <ModalBody>
                <p className="text-sm text-red-600">{resultMessage}</p>
              </ModalBody>
              <ModalFooter>
                <Button onClick={handleModalClose}>
                  {intl.formatMessage({ id: 'common.action.close', defaultMessage: 'Close' })}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

const UserFormPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const isEdit = Boolean(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['userDetail', id],
    enabled: isEdit,
    queryFn: () => trpcClient.user.detail.query({ id: id ?? '' }),
  });

  if (isEdit) {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      );
    }
    if (isError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error instanceof Error ? error.message : 'Failed to load user.'}
        </div>
      );
    }
    if (!data) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          {intl.formatMessage({ id: 'users.form.not_found', defaultMessage: 'User not found.' })}
        </div>
      );
    }
  }

  const initialValues = isEdit && data ? transformDetailToFormValues(data as UserDetail) : defaultFormValues();

  return (
    <InnerForm
      key={isEdit ? (id ?? 'new') : 'new'}
      initialValues={initialValues}
      isEdit={isEdit}
      userId={id}
    />
  );
};

export { UserFormPage };
