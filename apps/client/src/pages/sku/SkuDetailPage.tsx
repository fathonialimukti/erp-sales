import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface SkuDetail {
    id: string; code: string | null; name: string; description: string | null;
    category: { id: string; name: string } | null;
    basePrice: number | null; baseUnit: string; status: string;
    createdAt: string;
}

function SkuDetailPage() {
    const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
    const hasPermission = useAtomValue(hasPermissionAtom);
    const canUpdate = hasPermission('sku@update'); const canDelete = hasPermission('sku@delete');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [isDeleting, setIsDeleting] = useState(false);
    const { data, isLoading } = useQuery({ queryKey: ['skuDetail', id], enabled: Boolean(id), queryFn: () => trpcClient.sku.detail.query({ id: id ?? '' }) });
    const record = data as SkuDetail | undefined;

    const handleDelete = async () => { if (!record || isDeleting) return; setIsDeleting(true); try { await trpcClient.sku.delete.mutate({ id: record.id }); await queryClient.invalidateQueries({ queryKey: ['skuList'] }); setDeleteModalOpen(false); navigate('/sku'); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };
    if (isLoading) return <p className="text-sm text-muted">Loading...</p>;
    if (!record) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/sku')}>Back</Button></div>;

    return (
        <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'sku-detail', id: record.id, name: record.name, status: record.status, categoryId: record.category?.id ?? null })}>
            <PageHeader title={record.name} onBack={() => navigate('/sku')} onEdit={canUpdate ? () => navigate(`/sku/${record.id}/edit`) : undefined} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />
            <Card><div className="grid gap-4 p-6 md:grid-cols-3"><Field label="Code" value={record.code} /><Field label="Category" value={record.category?.name} /><Field label="Status" value={record.status} /><Field label="Base Price" value={record.basePrice ? `IDR ${record.basePrice.toLocaleString()}` : '-'} /><Field label="Unit" value={record.baseUnit} /><Field label="Description" value={record.description} /></div></Card>
            <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}><ModalContent><ModalHeader>Delete Product</ModalHeader><ModalBody>Delete "{record.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button color="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
        </section>
    );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
    return <div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted">{label}</p><p>{value ?? '-'}</p></div>;
}

export { SkuDetailPage };