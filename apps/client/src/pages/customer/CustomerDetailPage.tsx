import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface CustomerDetail {
  id: string;
  code: string | null;
  name: string;
  taxId: string | null;
  paymentTerms: string | null;
  creditLimit: number | null;
  status: string;
  billingAddress: string | null;
  notes: string | null;
  outlets: { id: string; name: string; code: string | null; area: { id: string; name: string } }[];
  contacts: { id: string; name: string; title: string | null; email: string | null; phone: string | null; isPrimary: boolean }[];
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

function CustomerDetailPage() {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission('customer@update');
  const canDelete = hasPermission('customer@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customerDetail', id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.customer.detail.query({ id: id ?? '' }),
  });

  const record = data as CustomerDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.customer.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ['customerList'] });
      queryClient.removeQueries({ queryKey: ['customerDetail', record.id] });
      setDeleteModalOpen(false);
      navigate('/customer');
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
        {intl.formatMessage({ id: 'customer.detail.loading_detail', defaultMessage: 'Loading details...' })}
      </p>
    );
  }

  if (!record) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {intl.formatMessage({ id: 'customer.detail.not_found', defaultMessage: 'Customer not found.' })}
        </p>
        <Button variant="ghost" onClick={() => navigate('/customer')}>
          {intl.formatMessage({ id: 'customer.detail.back', defaultMessage: 'Back to Customers' })}
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'customer-detail', id: record.id, name: record.name, status: record.status, outletCount: record.outlets.length })}>
      <PageHeader
        title={record.name}
        onBack={() => navigate('/customer')}
        onEdit={canUpdate ? () => navigate(`/customer/${record.id}/edit`) : undefined}
        onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined}
      />

      <Card>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <DetailField
            label={intl.formatMessage({ id: 'customer.detail.code_label', defaultMessage: 'Code' })}
            value={record.code}
          />
          <DetailField
            label={intl.formatMessage({ id: 'customer.detail.tax_id_label', defaultMessage: 'Tax ID' })}
            value={record.taxId}
          />
          <DetailField
            label={intl.formatMessage({ id: 'customer.detail.status_label', defaultMessage: 'Status' })}
            value={record.status}
          />
          <DetailField
            label={intl.formatMessage({ id: 'customer.detail.payment_terms_label', defaultMessage: 'Payment Terms' })}
            value={record.paymentTerms}
          />
          <DetailField
            label={intl.formatMessage({ id: 'customer.detail.credit_limit_label', defaultMessage: 'Credit Limit' })}
            value={record.creditLimit ? `IDR ${record.creditLimit.toLocaleString()}` : '-'}
          />
          <DetailField
            label={intl.formatMessage({ id: 'customer.detail.billing_address_label', defaultMessage: 'Billing Address' })}
            value={record.billingAddress}
          />
        </div>
        {record.notes ? (
          <div className="border-t px-6 py-4">
            <DetailField
              label={intl.formatMessage({ id: 'customer.detail.notes_label', defaultMessage: 'Notes' })}
              value={record.notes}
            />
          </div>
        ) : null}
      </Card>

      {record.contacts.length > 0 ? (
        <Card>
          <div className="p-6">
            <h3 className="mb-3 text-lg font-semibold">
              {intl.formatMessage({ id: 'customer.detail.contacts_title', defaultMessage: 'Contacts' })}
            </h3>
            <div className="space-y-2">
              {record.contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">
                      {contact.name}
                      {contact.isPrimary ? (
                        <span className="ml-2 text-xs text-primary">
                          {intl.formatMessage({ id: 'customer.detail.primary_badge', defaultMessage: 'Primary' })}
                        </span>
                      ) : null}
                    </p>
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

      {record.outlets.length > 0 ? (
        <Card>
          <div className="p-6">
            <h3 className="mb-3 text-lg font-semibold">
              {intl.formatMessage({ id: 'customer.detail.outlets_title', defaultMessage: 'Outlets' })}
            </h3>
            <div className="space-y-2">
              {record.outlets.map((outlet) => (
                <div key={outlet.id} className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-default-50" onClick={() => navigate(`/outlet/${outlet.id}`)}>
                  <div>
                    <p className="font-medium">{outlet.name}</p>
                    {outlet.code ? <p className="text-sm text-muted">{outlet.code}</p> : null}
                  </div>
                  <p className="text-sm text-muted">{outlet.area.name}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            {intl.formatMessage({ id: 'customer.detail.delete_title', defaultMessage: 'Delete Customer' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'customer.detail.delete_confirm_body', defaultMessage: 'Are you sure you want to delete "{name}"? All outlets, contacts, and order history will also be removed.' },
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

export { CustomerDetailPage };