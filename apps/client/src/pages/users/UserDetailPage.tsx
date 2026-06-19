import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from "../../ui";
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useToast,
} from '../../ui';
import { PageHeader } from '../../components/PageHeader';
import { EntityPhoto } from '../../components/EntityPhoto';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  photo?: string | null;
  phone?: string | null;
  role: { id: string; name: string; description: string | null } | null;
  permissions: string[];
  createdAt: string;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DetailField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <div className="text-sm">{value ?? '—'}</div>
  </div>
);

const UserDetailPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission('user@update');
  const canDelete = hasPermission('user@delete');
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['userDetail', id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.user.detail.query({ id: id ?? '' }),
  });

  if (isError) toast.error(error instanceof Error ? error.message : 'Failed to load user');

  const record = data as UserDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.user.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.removeQueries({ queryKey: ['userDetail', record.id] });
      setDeleteModalOpen(false);
      navigate('/users');
      toast.success('User deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <PageHeader
          title={intl.formatMessage({ id: 'users.detail.title', defaultMessage: 'User details' })}
          onBack={() => navigate('/users')}
        />
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="space-y-6">
        <PageHeader
          title={intl.formatMessage({ id: 'users.detail.title', defaultMessage: 'User details' })}
          onBack={() => navigate('/users')}
        />
        <Card>
          <CardBody>
            <p className="text-sm text-red-600">
              {intl.formatMessage({ id: 'users.detail.not_found', defaultMessage: 'User not found.' })}
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  return (
    <section
      className="space-y-6"
      data-ai-context={JSON.stringify({
        section: 'user-detail',
        id: record.id,
        email: record.email,
        roleId: record.role?.id,
      })}
    >
      <PageHeader
        title={record.name ?? record.email}
        onBack={() => navigate('/users')}
        onEdit={canUpdate ? () => navigate(`/users/${record.id}/edit`) : undefined}
        onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{intl.formatMessage({ id: 'users.detail.profile', defaultMessage: 'Profile' })}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
            <EntityPhoto src={record.photo ?? null} alt={record.name ?? record.email} className="h-20 w-20 rounded-full" />
            <div>
              <p className="text-lg font-semibold">{record.name ?? '—'}</p>
              <p className="text-sm text-slate-500">{record.email}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{intl.formatMessage({ id: 'users.detail.info', defaultMessage: 'Account information' })}</CardTitle>
            <CardDescription>{intl.formatMessage({ id: 'users.detail.info_description', defaultMessage: 'Identity and role assignment for this user.' })}</CardDescription>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <DetailField label={intl.formatMessage({ id: 'users.detail.name', defaultMessage: 'Name' })} value={record.name} />
            <DetailField label={intl.formatMessage({ id: 'users.detail.email', defaultMessage: 'Email' })} value={<span className="font-mono text-xs">{record.email}</span>} />
            <DetailField label={intl.formatMessage({ id: 'users.detail.phone', defaultMessage: 'Phone' })} value={record.phone} />
            <DetailField label={intl.formatMessage({ id: 'users.detail.role', defaultMessage: 'Role' })} value={record.role?.name ?? '—'} />
            <DetailField label={intl.formatMessage({ id: 'users.detail.created', defaultMessage: 'Created' })} value={formatDate(record.createdAt)} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{intl.formatMessage({ id: 'users.detail.permissions', defaultMessage: 'Permissions' })}</CardTitle>
            <CardDescription>{intl.formatMessage({ id: 'users.detail.permissions_description', defaultMessage: 'All permission keys granted to this user via their role.' })}</CardDescription>
          </CardHeader>
          <CardBody>
            {record.permissions.length === 0 ? (
              <p className="text-sm text-slate-500">{intl.formatMessage({ id: 'users.detail.no_permissions', defaultMessage: 'No permissions granted.' })}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {record.permissions.map((p) => (
                  <span key={p} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            {intl.formatMessage({ id: 'users.detail.delete_title', defaultMessage: 'Delete user' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'users.detail.delete_confirm', defaultMessage: 'Are you sure you want to delete "{name}"? This action cannot be undone.' },
              { name: record.name ?? record.email },
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting
                ? intl.formatMessage({ id: 'common.action.deleting', defaultMessage: 'Deleting...' })
                : intl.formatMessage({ id: 'common.action.delete', defaultMessage: 'Delete' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
};

export { UserDetailPage };
