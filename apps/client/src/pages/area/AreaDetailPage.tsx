import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface AreaDetail {
  id: string;
  code: string | null;
  name: string;
  region: { id: string; name: string };
  outlets: { id: string; name: string; code: string | null }[];
  salesmen: { id: string; name: string; email: string }[];
  createdAt: string;
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p>{value ?? '-'}</p>
    </div>
  );
}

function AreaDetailPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission('area@update');
  const canDelete = hasPermission('area@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['areaDetail', id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.area.detail.query({ id: id ?? '' }),
  });

  const record = data as AreaDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.area.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ['areaList'] });
      queryClient.removeQueries({ queryKey: ['areaDetail', record.id] });
      setDeleteModalOpen(false);
      navigate('/area');
    } catch (error) {
      console.error(error);
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted">
        {intl.formatMessage({ id: 'area.detail.loading', defaultMessage: 'Loading details...' })}
      </p>
    );
  }

  if (!record) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {intl.formatMessage({ id: 'area.detail.not_found', defaultMessage: 'Area not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/area')}>
          {intl.formatMessage({ id: 'area.detail.back', defaultMessage: 'Back to Areas' })}
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={record.name}
        onBack={() => navigate('/area')}
        onEdit={canUpdate ? () => navigate(`/area/${record.id}/edit`) : undefined}
        onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined}
      />

      <Card>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <DetailField
            label={intl.formatMessage({ id: 'area.detail.code', defaultMessage: 'Code' })}
            value={record.code}
          />
          <DetailField
            label={intl.formatMessage({ id: 'area.detail.name', defaultMessage: 'Name' })}
            value={record.name}
          />
          <DetailField
            label={intl.formatMessage({ id: 'area.detail.region', defaultMessage: 'Region' })}
            value={record.region.name}
          />
        </div>
      </Card>

      {record.outlets.length > 0 ? (
        <Card>
          <div className="p-6">
            <h3 className="mb-3 text-lg font-semibold">
              {intl.formatMessage({ id: 'area.detail.outlets', defaultMessage: 'Outlets' })}
            </h3>
            <div className="space-y-2">
              {record.outlets.map((outlet) => (
                <div key={outlet.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{outlet.name}</p>
                    {outlet.code ? <p className="text-sm text-muted">{outlet.code}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {record.salesmen.length > 0 ? (
        <Card>
          <div className="p-6">
            <h3 className="mb-3 text-lg font-semibold">
              {intl.formatMessage({ id: 'area.detail.salesmen', defaultMessage: 'Salesmen' })}
            </h3>
            <div className="space-y-2">
              {record.salesmen.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent>
          <ModalHeader>
            {intl.formatMessage({ id: 'area.detail.delete_title', defaultMessage: 'Delete Area' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'area.detail.delete_confirm', defaultMessage: 'Are you sure you want to delete "{name}"?' },
              { name: record.name },
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              {intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting
                ? intl.formatMessage({ id: 'common.action.deleting', defaultMessage: 'Deleting...' })
                : intl.formatMessage({ id: 'common.action.delete', defaultMessage: 'Delete' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}

export { AreaDetailPage };