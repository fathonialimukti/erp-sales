import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface SkuCategoryDetail {
  id: string; code: string | null; name: string; description: string | null;
  skus: { id: string; name: string; code: string | null }[];
  createdAt: string;
}

function SkuCategoryDetailPage() {
  const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission('sku@update'); const canDelete = hasPermission('sku@delete');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['skuCategoryDetail', id], enabled: Boolean(id), queryFn: () => trpcClient.skuCategory.detail.query({ id: id ?? '' }) });
  const record = data as SkuCategoryDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return; setIsDeleting(true);
    try { await trpcClient.skuCategory.delete.mutate({ id: record.id }); await queryClient.invalidateQueries({ queryKey: ['skuCategoryList'] }); setDeleteModalOpen(false); navigate('/sku-category'); }
    catch (error) { console.error(error); } finally { setIsDeleting(false); }
  };

  if (isLoading) return <p className="text-sm text-muted">{intl.formatMessage({ id: 'sku_category.detail.loading_detail', defaultMessage: 'Loading...' })}</p>;
  if (!record) return <div className="space-y-3"><p className="text-sm text-danger">{intl.formatMessage({ id: 'sku_category.detail.not_found', defaultMessage: 'Category not found.' })}</p><Button variant="ghost" onClick={() => navigate('/sku-category')}>{intl.formatMessage({ id: 'sku_category.detail.back', defaultMessage: 'Back' })}</Button></div>;

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'sku-category-detail', id: record.id, name: record.name, skuCount: record.skus.length })}>
      <PageHeader title={record.name} onBack={() => navigate('/sku-category')} onEdit={canUpdate ? () => navigate(`/sku-category/${record.id}/edit`) : undefined} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />
      <Card>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted">{intl.formatMessage({ id: 'sku_category.detail.code_label', defaultMessage: 'Code' })}</p><p>{record.code ?? '-'}</p></div>
          <div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted">{intl.formatMessage({ id: 'sku_category.detail.description_label', defaultMessage: 'Description' })}</p><p>{record.description ?? '-'}</p></div>
        </div>
      </Card>
      {record.skus.length > 0 && <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">{intl.formatMessage({ id: 'sku_category.detail.skus_title', defaultMessage: 'Products' })}</h3><div className="space-y-2">{record.skus.map((sku) => <div key={sku.id} className="flex items-center justify-between rounded-lg border p-3"><p className="font-medium">{sku.name}</p><p className="text-sm text-muted">{sku.code ?? '-'}</p></div>)}</div></div></Card>}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>{intl.formatMessage({ id: 'sku_category.detail.delete_title', defaultMessage: 'Delete Category' })}</ModalHeader><ModalBody>{intl.formatMessage({ id: 'sku_category.detail.delete_confirm_body', defaultMessage: 'Delete "{name}"? Products in this category will be uncategorized.' }, { name: record.name })}</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: 'common.action.cancel', defaultMessage: 'Cancel' })}</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? intl.formatMessage({ id: 'common.action.deleting', defaultMessage: 'Deleting...' }) : intl.formatMessage({ id: 'common.action.delete', defaultMessage: 'Delete' })}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { SkuCategoryDetailPage };