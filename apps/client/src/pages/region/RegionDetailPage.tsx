import { useState } from 'react';
import { useIntl } from 'react-intl';
import './Region.css';
import { Button, Card, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface RegionDetail {
  id: string;
  code: string | null;
  name: string;
  areas: { id: string; name: string; code: string | null }[];
  createdAt: string;
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="reg-detail__field">
      <p className="reg-detail__field-label">{label}</p>
      <p>{value ?? '-'}</p>
    </div>
  );
}

function RegionDetailPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission('region@update');
  const canDelete = hasPermission('region@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['regionDetail', id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.region.detail.query({ id: id ?? '' }),
  });

  const record = data as RegionDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.region.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ['regionList'] });
      queryClient.removeQueries({ queryKey: ['regionDetail', record.id] });
      setDeleteModalOpen(false);
      navigate('/region');
    } catch (error) {
      console.error(error);
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <p className="reg-detail__loading-text">
        {intl.formatMessage({ id: 'region.detail.loading', defaultMessage: 'Loading details...' })}
      </p>
    );
  }

  if (!record) {
    return (
      <div className="reg-detail__not-found">
        <p className="reg-detail__not-found-msg">
          {intl.formatMessage({ id: 'region.detail.not_found', defaultMessage: 'Region not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/region')}>
          {intl.formatMessage({ id: 'region.detail.back', defaultMessage: 'Back to Regions' })}
        </Button>
      </div>
    );
  }

  return (
    <section className="reg-detail">
      <PageHeader
        title={record.name}
        onBack={() => navigate('/region')}
        onEdit={canUpdate ? () => navigate(`/region/${record.id}/edit`) : undefined}
        onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined}
      />

      <Card>
        <div className="reg-detail__grid">
          <DetailField
            label={intl.formatMessage({ id: 'region.detail.code', defaultMessage: 'Code' })}
            value={record.code}
          />
          <DetailField
            label={intl.formatMessage({ id: 'region.detail.name', defaultMessage: 'Name' })}
            value={record.name}
          />
        </div>
      </Card>

      {record.areas.length > 0 ? (
        <Card>
          <div className="reg-detail__card-body">
            <h3 className="reg-detail__section-title">
              {intl.formatMessage({ id: 'region.detail.areas', defaultMessage: 'Areas' })}
            </h3>
            <div className="reg-detail__item-list">
              {record.areas.map((area) => (
                <div key={area.id} className="reg-detail__item">
                  <div>
                    <p className="reg-detail__item-name">{area.name}</p>
                    {area.code ? <p className="reg-detail__item-sub">{area.code}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            {intl.formatMessage({ id: 'region.detail.delete_title', defaultMessage: 'Delete Region' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'region.detail.delete_confirm', defaultMessage: 'Are you sure you want to delete "{name}"? All areas under this region will also be deleted.' },
              { name: record.name },
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
}

export { RegionDetailPage };