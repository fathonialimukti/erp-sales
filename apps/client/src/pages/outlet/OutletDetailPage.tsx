import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface OutletDetail {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  customer: { id: string; name: string };
  area: { id: string; name: string; region: { id: string; name: string } };
  contacts: { id: string; name: string; title: string | null; email: string | null; phone: string | null }[];
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

function OutletDetailPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission('outlet@update');
  const canDelete = hasPermission('outlet@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['outletDetail', id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.outlet.detail.query({ id: id ?? '' }),
  });

  const record = data as OutletDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.outlet.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ['outletList'] });
      queryClient.removeQueries({ queryKey: ['outletDetail', record.id] });
      setDeleteModalOpen(false);
      navigate('/outlet');
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
        {intl.formatMessage({ id: 'outlet.detail.loading_detail', defaultMessage: 'Loading details...' })}
      </p>
    );
  }

  if (!record) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {intl.formatMessage({ id: 'outlet.detail.not_found', defaultMessage: 'Outlet not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/outlet')}>
          {intl.formatMessage({ id: 'outlet.detail.back', defaultMessage: 'Back to Outlets' })}
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'outlet-detail', id: record.id, name: record.name, customer: record.customer.name, area: record.area.name })}>
      <PageHeader
        title={record.name}
        onBack={() => navigate('/outlet')}
        onEdit={canUpdate ? () => navigate(`/outlet/${record.id}/edit`) : undefined}
        onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined}
      />

      <Card>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <DetailField
            label={intl.formatMessage({ id: 'outlet.detail.code_label', defaultMessage: 'Code' })}
            value={record.code}
          />
          <DetailField
            label={intl.formatMessage({ id: 'outlet.detail.customer_label', defaultMessage: 'Customer' })}
            value={record.customer.name}
          />
          <DetailField
            label={intl.formatMessage({ id: 'outlet.detail.status_label', defaultMessage: 'Status' })}
            value={record.status}
          />
          <DetailField
            label={intl.formatMessage({ id: 'outlet.detail.area_label', defaultMessage: 'Area' })}
            value={record.area.name}
          />
          <DetailField
            label={intl.formatMessage({ id: 'outlet.detail.region_label', defaultMessage: 'Region' })}
            value={record.area.region.name}
          />
          <DetailField
            label={intl.formatMessage({ id: 'outlet.detail.address_label', defaultMessage: 'Address' })}
            value={record.address}
          />
        </div>
        <div className="border-t px-6 py-4">
          <div className="grid gap-4 md:grid-cols-3">
            <DetailField
              label={intl.formatMessage({ id: 'outlet.detail.contact_name_label', defaultMessage: 'Contact Name' })}
              value={record.contactName}
            />
            <DetailField
              label={intl.formatMessage({ id: 'outlet.detail.contact_phone_label', defaultMessage: 'Contact Phone' })}
              value={record.contactPhone}
            />
            <DetailField
              label={intl.formatMessage({ id: 'outlet.detail.coordinates_label', defaultMessage: 'Coordinates' })}
              value={record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : null}
            />
          </div>
        </div>
      </Card>

      {record.contacts.length > 0 ? (
        <Card>
          <div className="p-6">
            <h3 className="mb-3 text-lg font-semibold">
              {intl.formatMessage({ id: 'outlet.detail.contacts_title', defaultMessage: 'Contacts' })}
            </h3>
            <div className="space-y-2">
              {record.contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted">{contact.title ?? '-'}</p>
                  </div>
                  <div className="text-right text-sm text-muted">
                    {contact.email ? <p>{contact.email}</p> : null}
                    {contact.phone ? <p>{contact.phone}</p> : null}
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
            {intl.formatMessage({ id: 'outlet.detail.delete_title', defaultMessage: 'Delete Outlet' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'outlet.detail.delete_confirm_body', defaultMessage: 'Are you sure you want to delete "{name}"? All visit logs and order history will also be removed.' },
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

export { OutletDetailPage };