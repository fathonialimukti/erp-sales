import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from "../../ui";
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  FieldError,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useToast,
} from '../../ui';
import { PageHeader } from '../../components/PageHeader';
import { trpcClient } from '../../lib/trpc';

type RoleFormValues = {
  name: string;
  description: string;
  permissions: string[];
};

type RoleDetail = {
  id: string;
  name: string;
  description: string | null;
  permissions: { permission: { id: string; name: string; description: string | null } }[];
};

const defaultFormValues = (): RoleFormValues => ({
  name: '',
  description: '',
  permissions: [],
});

const transformDetailToFormValues = (detail: RoleDetail): RoleFormValues => ({
  name: detail.name,
  description: detail.description ?? '',
  permissions: detail.permissions.map((p) => p.permission.name),
});

const InnerForm = ({
  initialValues,
  isEdit,
  roleId,
}: {
  initialValues: RoleFormValues;
  isEdit: boolean;
  roleId?: string;
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');
  const successRedirectIdRef = useRef<string | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const [formState, setFormState] = useState<RoleFormValues>(initialValues);

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
    if (redirectId) navigate(`/roles`);
  };

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; permissionIds: string[] }) =>
      trpcClient.role.create.mutate(payload),
    onSuccess: async (created: { id: string }) => {
      await queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      successRedirectIdRef.current = created.id;
      setResultMessage(intl.formatMessage({ id: 'roles.form.success_created', defaultMessage: 'Role created successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : 'Failed to create role.');
      setModalStage('error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { currentId: string; name?: string; description?: string; permissionIds?: string[] }) =>
      trpcClient.role.update.mutate(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      successRedirectIdRef.current = roleId ?? null;
      setResultMessage(intl.formatMessage({ id: 'roles.form.success_updated', defaultMessage: 'Role updated successfully.' }));
      setModalStage('success');
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : 'Failed to update role.');
      setModalStage('error');
    },
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['permissionsList'],
    queryFn: () => trpcClient.permission.list.query({ page: 1, limit: 100 }),
  });

  const allPermissions = (permissionsData?.data ?? []) as { id: string; name: string; description: string | null }[];

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; description: string | null }[]>();
    for (const p of allPermissions) {
      const [resource] = p.name.split('@');
      const group = map.get(resource) ?? [];
      group.push(p);
      map.set(resource, group);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const nameError = !formState.name.trim() ? intl.formatMessage({ id: 'roles.form.error_name_required', defaultMessage: 'Role name is required.' }) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    const selectedIds = allPermissions.filter((p) => formState.permissions.includes(p.name)).map((p) => p.id);
    setModalStage('loading');
    if (isEdit && roleId) {
      updateMutation.mutate({
        currentId: roleId,
        name: formState.name,
        description: formState.description || undefined,
        permissionIds: selectedIds,
      });
    } else {
      createMutation.mutate({
        name: formState.name,
        description: formState.description || undefined,
        permissionIds: selectedIds,
      });
    }
  };

  const togglePermission = (name: string, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      permissions: checked ? Array.from(new Set([...prev.permissions, name])) : prev.permissions.filter((p) => p !== name),
    }));
  };

  const toggleGroup = (names: string[], checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      permissions: checked ? Array.from(new Set([...prev.permissions, ...names])) : prev.permissions.filter((p) => !names.includes(p)),
    }));
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <section className="space-y-6">
          <PageHeader
            title={
              isEdit
                ? intl.formatMessage({ id: 'roles.form.title_edit', defaultMessage: 'Edit role' })
                : intl.formatMessage({ id: 'roles.form.title_create', defaultMessage: 'Create role' })
            }
            onBack={() => navigate('/roles')}
          />

          <Card>
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'roles.form.identity', defaultMessage: 'Identity' })}</CardTitle>
              <CardDescription>{intl.formatMessage({ id: 'roles.form.identity_description', defaultMessage: 'Display name and description for the role.' })}</CardDescription>
            </CardHeader>
            <CardBody className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>
                  {intl.formatMessage({ id: 'roles.form.name', defaultMessage: 'Name' })}
                  <span className="ml-0.5 text-red-500">*</span>
                </Label>
                <Input value={formState.name} onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sales Manager" />
                {nameError ? <FieldError>{nameError}</FieldError> : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{intl.formatMessage({ id: 'roles.form.description', defaultMessage: 'Description' })}</Label>
                <Input value={formState.description} onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))} placeholder="What does this role do?" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'roles.form.permissions', defaultMessage: 'Permissions' })}</CardTitle>
              <CardDescription>{intl.formatMessage({ id: 'roles.form.permissions_description', defaultMessage: 'Pick the actions this role can perform on each resource.' })}</CardDescription>
            </CardHeader>
            <CardBody className="space-y-6">
              {grouped.map(([resource, perms]) => {
                const allChecked = perms.every((p) => formState.permissions.includes(p.name));
                const someChecked = perms.some((p) => formState.permissions.includes(p.name));
                return (
                  <div key={resource} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-mono text-xs uppercase tracking-wide text-slate-500">{resource}</div>
                      <Checkbox
                        checked={allChecked}
                        onChange={(checked) => toggleGroup(perms.map((p) => p.name), checked)}
                        label={allChecked ? 'All' : someChecked ? 'Some' : 'None'}
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {perms.map((p) => (
                        <Checkbox
                          key={p.id}
                          checked={formState.permissions.includes(p.name)}
                          onChange={(checked) => togglePermission(p.name, checked)}
                          label={<span className="font-mono text-xs">{p.name}</span>}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate('/roles')}>
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="primary" type="submit" disabled={isPending || !!nameError}>
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

const RoleFormPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const isEdit = Boolean(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['roleDetail', id],
    enabled: isEdit,
    queryFn: () => trpcClient.role.detail.query({ id: id ?? '' }),
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
          {error instanceof Error ? error.message : 'Failed to load role.'}
        </div>
      );
    }
    if (!data) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          {intl.formatMessage({ id: 'roles.form.not_found', defaultMessage: 'Role not found.' })}
        </div>
      );
    }
  }

  const initialValues = isEdit && data ? transformDetailToFormValues(data as RoleDetail) : defaultFormValues();

  return (
    <InnerForm
      key={isEdit ? (id ?? 'new') : 'new'}
      initialValues={initialValues}
      isEdit={isEdit}
      roleId={id}
    />
  );
};

export { RoleFormPage };
