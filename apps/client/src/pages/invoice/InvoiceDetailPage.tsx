import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Chip, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, FormField } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';

interface InvoiceDetail {
  id: string; documentNumber: string | null; date: string; dueDate: string; status: string; currency: string;
  subtotal: number; taxTotal: number; grandTotal: number; balanceDue: number; notes: string | null;
  customer: { id: string; name: string };
  salesOrder: { id: string; documentNumber: string | null } | null;
  payments: { id: string; amount: number; date: string; method: string | null; reference: string | null; notes: string | null }[];
  createdAt: string;
}

function InvoiceDetailPage() {
  const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreatePayment = hasPermission('payment@create'); const canDeletePayment = hasPermission('payment@delete');
  const canUpdate = hasPermission('invoice@update'); const canDelete = hasPermission('invoice@delete');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [isDeleting, setIsDeleting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(''); const [paymentMethod, setPaymentMethod] = useState(''); const [paymentRef, setPaymentRef] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['invoiceDetail', id], enabled: Boolean(id), queryFn: () => trpcClient.invoice.detail.query({ id: id ?? '' }) });
  const record = data as InvoiceDetail | undefined;

  const paymentMutation = useMutation({ mutationFn: (payload: { invoiceId: string; customerId: string; amount: number; method?: string; reference?: string }) => trpcClient.payment.create.mutate(payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoiceDetail', id] }); queryClient.invalidateQueries({ queryKey: ['invoiceList'] }); setPaymentModalOpen(false); setPaymentAmount(''); setPaymentMethod(''); setPaymentRef(''); } });
  const deletePaymentMutation = useMutation({ mutationFn: (pid: string) => trpcClient.payment.delete.mutate({ id: pid }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoiceDetail', id] }); } });

  const handleDelete = async () => { if (!record || isDeleting) return; setIsDeleting(true); try { await trpcClient.invoice.delete.mutate({ id: record.id }); await queryClient.invalidateQueries({ queryKey: ['invoiceList'] }); setDeleteModalOpen(false); navigate('/invoice'); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  const handlePayment = async () => { if (!record || !paymentAmount || isPaying) return; setIsPaying(true); try { await paymentMutation.mutateAsync({ invoiceId: record.id, customerId: record.customer.id, amount: Number(paymentAmount), method: paymentMethod || undefined, reference: paymentRef || undefined }); } catch (e) { console.error(e); } finally { setIsPaying(false); } };

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>;
  if (!record) return <div className="space-y-3"><p className="text-sm text-danger">Not found.</p><Button variant="ghost" onClick={() => navigate('/invoice')}>Back</Button></div>;

  return (
    <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'invoice-detail', id: record.id, documentNumber: record.documentNumber, customer: record.customer.name, status: record.status, balanceDue: record.balanceDue, grandTotal: record.grandTotal })}>
      <PageHeader title={record.documentNumber ?? `INV #${record.id.slice(0, 8)}`} onBack={() => navigate('/invoice')} onEdit={canUpdate ? () => navigate(`/invoice/${record.id}/edit`) : undefined} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />

      <div className="flex flex-wrap gap-2">
        <Chip size="sm" tone={record.balanceDue === 0 ? 'success' : record.balanceDue < record.grandTotal ? 'warning' : 'danger'}>{record.status}</Chip>
        {canCreatePayment && record.balanceDue > 0 && <Button size="sm" variant="success" onClick={() => setPaymentModalOpen(true)}>Record Payment</Button>}
      </div>

      <Card>
        <div className="grid gap-4 p-6 md:grid-cols-4">
          <Field label="Customer" value={record.customer.name} />
          <Field label="Sales Order" value={record.salesOrder?.documentNumber} />
          <Field label="Due Date" value={new Date(record.dueDate).toLocaleDateString()} />
          <Field label="Currency" value={record.currency} />
          <Field label="Subtotal" value={`IDR ${record.subtotal.toLocaleString()}`} />
          <Field label="Tax" value={`IDR ${record.taxTotal.toLocaleString()}`} />
          <Field label="Grand Total" value={`IDR ${record.grandTotal.toLocaleString()}`} />
          <Field label="Balance Due" value={<span className={record.balanceDue > 0 ? 'text-warning font-semibold' : 'text-success font-semibold'}>IDR {record.balanceDue.toLocaleString()}</span>} />
        </div>
      </Card>

      {record.payments.length > 0 && (
        <Card><div className="p-6"><h3 className="mb-3 text-lg font-semibold">Payments</h3><div className="space-y-2">{record.payments.map((p) => (<div key={p.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">IDR {p.amount.toLocaleString()}</p><p className="text-sm text-muted">{new Date(p.date).toLocaleDateString()} {p.method ? `· ${p.method}` : ''} {p.reference ? `· ${p.reference}` : ''}</p></div>{canDeletePayment && <Button size="sm" variant="danger" onClick={() => deletePaymentMutation.mutate(p.id)} disabled={deletePaymentMutation.isPending}>Void</Button>}</div>))}</div></div></Card>
      )}

      {record.notes && <Card><div className="p-6"><h3 className="mb-2 text-sm font-medium text-muted">Notes</h3><p className="text-sm">{record.notes}</p></div></Card>}

      {/* Payment Modal */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}><ModalContent><ModalHeader>Record Payment</ModalHeader><ModalBody><div className="space-y-3"><p className="text-sm">Balance due: <strong>IDR {record.balanceDue.toLocaleString()}</strong></p>
        <FormField label="Amount"><Input type="number" value={paymentAmount} onValueChange={setPaymentAmount} placeholder={String(record.balanceDue)} /></FormField>
        <FormField label="Method"><Input value={paymentMethod} onValueChange={setPaymentMethod} placeholder="e.g. Transfer" /></FormField>
        <FormField label="Reference"><Input value={paymentRef} onValueChange={setPaymentRef} placeholder="e.g. receipt number" /></FormField>
      </div></ModalBody><ModalFooter><Button variant="ghost" onClick={() => setPaymentModalOpen(false)}>Cancel</Button><Button variant="success" onClick={handlePayment} disabled={isPaying || !paymentAmount}>{isPaying ? 'Processing...' : 'Record Payment'}</Button></ModalFooter></ModalContent></Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Invoice</ModalHeader><ModalBody>Delete "{record.documentNumber}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted">{label}</p><div className="text-sm">{value || '-'}</div></div>;
}

export { InvoiceDetailPage };