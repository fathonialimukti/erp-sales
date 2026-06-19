import os

files = {}

files['pages/sku/SkuIndexPage.tsx'] = """import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, Table, TBody, TD, TH, THead, TR, Icon } from '../../ui';

import { type ColumnDef, type PaginationState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';
import './Sku.css';

type SkuRow = {
  id: string; code: string | null; name: string; basePrice: number | null; baseUnit: string; status: string;
  category: { id: string; name: string } | null;
  _count: { salesOrderItems: number };
};

function SkuIndexPage() {
  const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('sku@create'); const canUpdate = hasPermission('sku@update'); const canDelete = hasPermission('sku@delete');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState(''); const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); const [itemToDelete, setItemToDelete] = useState<SkuRow | null>(null); const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const { data, isLoading } = useQuery({ queryKey: ['skuList', pagination.pageIndex, pagination.pageSize, search], queryFn: () => trpcClient.sku.list.query({ page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined }) });

  const columns = useMemo<ColumnDef<SkuRow>[]>(() => [
    { accessorKey: 'name', header: intl.formatMessage({ id: 'sku.index.header_name', defaultMessage: 'Name' }) },
    { accessorKey: 'code', header: intl.formatMessage({ id: 'sku.index.header_code', defaultMessage: 'Code' }), cell: ({ row }) => <span>{row.original.code ?? '-'}</span> },
    { id: 'category', header: intl.formatMessage({ id: 'sku.index.header_category', defaultMessage: 'Category' }), cell: ({ row }) => <span>{row.original.category?.name ?? '-'}</span> },
    { accessorKey: 'basePrice', header: intl.formatMessage({ id: 'sku.index.header_price', defaultMessage: 'Price' }), cell: ({ row }) => <span>{row.original.basePrice ? `IDR ${row.original.basePrice.toLocaleString()}` : '-'}</span> },
    { accessorKey: 'status', header: intl.formatMessage({ id: 'sku.index.header_status', defaultMessage: 'Status' }), cell: ({ row }) => <span className={row.original.status === 'ACTIVE' ? 'sku-status-active' : 'sku-status-inactive'}>{row.original.status}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="sku-actions">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/sku/${row.original.id}`)}><Icon icon="solar:eye-linear" /></Button>
        {(canUpdate || canDelete) && <Dropdown><DropdownTrigger><Button size="icon" variant="ghost"><Icon icon="solar:menu-dots-bold" /></Button></DropdownTrigger><DropdownMenu>{canUpdate ? <DropdownItem key="edit" onClick={() => navigate(`/sku/${row.original.id}/edit`)}>Edit</DropdownItem> : null}{canDelete ? <DropdownItem key="delete" onClick={() => { setItemToDelete(row.original); setDeleteModalOpen(true); }}>Delete</DropdownItem> : null}</DropdownMenu></Dropdown>}
      </div>) },
  ], [intl, navigate, canUpdate, canDelete]);

  const table = useReactTable({ data: (data?.data ?? []) as SkuRow[], columns, pageCount: data?.meta?.totalPages ?? 0, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), manualPagination: true });

  const handleDelete = async () => { if (!itemToDelete || isDeleting) return; setIsDeleting(true); try { await trpcClient.sku.delete.mutate({ id: itemToDelete.id }); await queryClient.invalidateQueries({ queryKey: ['skuList'] }); setDeleteModalOpen(false); setItemToDelete(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); } };

  return (
    <section className="sku-page" data-ai-context={JSON.stringify({ section: 'sku-index', itemCount: data?.meta?.total ?? 0 })}>
      <div className="sku-header"><div><h1 className="sku-header__title">Products</h1></div>{canCreate && <Button variant="primary" onClick={() => navigate('/sku/create')}><Icon icon="solar:add-circle-linear" />Add Product</Button>}</div>
      <Card><div className="sku-search-wrap"><Input placeholder="Search products..." value={searchInput} onValueChange={setSearchInput} leftIcon={<Icon icon="solar:magnifer-linear" />} /></div>
        {isLoading ? <div className="sku-loading"><Spinner /></div> : (<><Table aria-label="Products"><THead>{table.getHeaderGroups().map((hg) => hg.headers.map((h) => <TH key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TH>))}</THead><TBody emptyContent="No products found.">{table.getRowModel().rows.map((row) => <TR key={row.id}>{row.getVisibleCells().map((c) => <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>)}</TR>)}</TBody></Table><div className="sku-pagination-wrap"><Pagination page={pagination.pageIndex + 1} totalPages={data?.meta?.totalPages ?? 1} onChange={(page) => setPagination({ pageIndex: page - 1, pageSize: pagination.pageSize })} /></div></>)}</Card>
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Product</ModalHeader><ModalBody>Delete "{itemToDelete?.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
    </section>
  );
}

export { SkuIndexPage };
"""

files['pages/sku/SkuDetailPage.tsx'] = """import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { hasPermissionAtom } from '../../lib/atoms';
import { trpcClient } from '../../lib/trpc';
import './Sku.css';

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
    if (isLoading) return <p className="sku-loading-text">Loading...</p>;
    if (!record) return <div className="sku-not-found"><p className="sku-not-found__text">Not found.</p><Button variant="ghost" onClick={() => navigate('/sku')}>Back</Button></div>;

    return (
        <section className="sku-page" data-ai-context={JSON.stringify({ section: 'sku-detail', id: record.id, name: record.name, status: record.status, categoryId: record.category?.id ?? null })}>
            <PageHeader title={record.name} onBack={() => navigate('/sku')} onEdit={canUpdate ? () => navigate(`/sku/${record.id}/edit`) : undefined} onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined} />
            <Card><div className="sku-detail-grid sku-detail-grid--3"><Field label="Code" value={record.code} /><Field label="Category" value={record.category?.name} /><Field label="Status" value={record.status} /><Field label="Base Price" value={record.basePrice ? `IDR ${record.basePrice.toLocaleString()}` : '-'} /><Field label="Unit" value={record.baseUnit} /><Field label="Description" value={record.description} /></div></Card>
            <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}><ModalContent><ModalHeader>Delete Product</ModalHeader><ModalBody>Delete "{record.name}"?</ModalBody><ModalFooter><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button></ModalFooter></ModalContent></Modal>
        </section>
    );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
    return <div className="sku-field"><p className="sku-field__label">{label}</p><p className="sku-field__value">{value ?? '-'}</p></div>;
}

export { SkuDetailPage };
"""

files['pages/sku/SkuFormPage.tsx'] = """import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Card, FieldError, Input, Label, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, Textarea, FormField } from '../../ui';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../../lib/trpc';
import { PageHeader } from '../../components/PageHeader';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';
import { trpcClient } from '../../lib/trpc';
import './Sku.css';

type FormValues = { code: string; name: string; description: string; categoryId: string; basePrice: string; baseUnit: string; status: string };
type DetailData = { id: string; code: string | null; name: string; description: string | null; categoryId?: string | null; basePrice: number | null; baseUnit: string; status: string };

const defaults = (): FormValues => ({ code: '', name: '', description: '', categoryId: '', basePrice: '', baseUnit: 'pcs', status: 'ACTIVE' });
const fromDetail = (d: DetailData): FormValues => ({ code: d.code ?? '', name: d.name, description: d.description ?? '', categoryId: d.categoryId ?? '', basePrice: d.basePrice?.toString() ?? '', baseUnit: d.baseUnit, status: d.status });

function SkuFormPage() {
  const { id } = useParams(); const intl = useIntl(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['skuDetail', id], enabled: isEdit, queryFn: () => trpcClient.sku.detail.query({ id: id ?? '' }) });
  const { data: cats } = useQuery({ queryKey: ['skuCategorySelect'], queryFn: () => trpcClient.skuCategory.list.query({ limit: 200 }), staleTime: 5 * 60 * 1000 });

  const createMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['sku']['create']>>({
    mutationFn: (p) => trpcClient.sku.create.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['skuList'] }); setResultMessage('Created.'); setModalStage('success'); setTimeout(() => navigate(`/sku/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });
  const updateMutation = useMutation<any, unknown, inferProcedureInput<AppRouter['sku']['update']>>({
    mutationFn: (p) => trpcClient.sku.update.mutate(p),
    onSuccess: async (r) => { await queryClient.invalidateQueries({ queryKey: ['skuList'] }); queryClient.removeQueries({ queryKey: ['skuDetail', id] }); setResultMessage('Updated.'); setModalStage('success'); setTimeout(() => navigate(`/sku/${r.id}`), 1500); },
    onError: () => { setResultMessage('Failed.'); setModalStage('error'); },
  });

  const form = useForm({ defaultValues: (isEdit && data ? fromDetail(data as DetailData) : defaults()), onSubmit: async ({ value }) => { setFormError(null); setModalStage('loading'); const p = { ...value, basePrice: value.basePrice ? Number(value.basePrice) : null, categoryId: value.categoryId || null }; if (isEdit && id) updateMutation.mutate({ currentId: id, ...p }); else createMutation.mutate(p); } });
  useAiFillForm({ name: (v: unknown) => form.setFieldValue('name', String(v)), code: (v: unknown) => form.setFieldValue('code', String(v)), description: (v: unknown) => form.setFieldValue('description', String(v)), basePrice: (v: unknown) => form.setFieldValue('basePrice', String(v)), baseUnit: (v: unknown) => form.setFieldValue('baseUnit', String(v)) });
  if (isEdit && isLoading) return <div className="sku-loading"><Spinner size="lg" /></div>;
  if (isEdit && !data) return <div className="sku-not-found"><p className="sku-not-found__text">Not found.</p><Button variant="ghost" onClick={() => navigate('/sku')}>Back</Button></div>;
  const catList = (cats as any)?.data ?? [];

  return (
    <section className="sku-page" data-ai-context={JSON.stringify({ section: 'sku-form', mode: isEdit ? 'edit' : 'create', skuId: id ?? null, availableCategories: catList.map((c: any) => ({ id: c.id, name: c.name })) })}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <PageHeader title={isEdit ? 'Edit Product' : 'Create Product'} onBack={() => navigate(isEdit && id ? `/sku/${id}` : '/sku')} />
        <Card><div className="sku-form-grid">
          <form.Field name="name" validators={{ onChange: ({ value }) => !value?.trim() ? 'Required' : undefined }}>{(f) => <FormField isRequired error={f.state.meta.errors.length > 0 ? f.state.meta.errors[0] as string : undefined}><Label>Name</Label><Input value={f.state.value} onValueChange={f.handleChange} onBlur={f.handleBlur} placeholder="e.g. Teh Botol 250ml" />{f.state.meta.errors.map((e) => <FieldError key={e as string}>{e as string}</FieldError>)}</FormField>}</form.Field>
          <form.Field name="code">{(f) => <FormField><Label>Code</Label><Input value={f.state.value} onValueChange={f.handleChange} onBlur={f.handleBlur} placeholder="SKU-001" /></FormField>}</form.Field>
          <form.Field name="categoryId">{(f) => <FormField><Label>Category</Label><select value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} onBlur={f.handleBlur} className="sku-form-select"><option value="">None</option>{catList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>}</form.Field>
          <form.Field name="basePrice">{(f) => <FormField><Label>Base Price</Label><Input value={f.state.value} onValueChange={f.handleChange} onBlur={f.handleBlur} type="number" placeholder="25000" /></FormField>}</form.Field>
          <form.Field name="baseUnit">{(f) => <FormField><Label>Unit</Label><Input value={f.state.value} onValueChange={f.handleChange} onBlur={f.handleBlur} placeholder="pcs" /></FormField>}</form.Field>
          <form.Field name="status">{(f) => <FormField><Label>Status</Label><Input value={f.state.value} onValueChange={f.handleChange} onBlur={f.handleBlur} placeholder="ACTIVE" /></FormField>}</form.Field>
          <form.Field name="description">{(f) => <FormField className="sku-form-grid__full"><Label>Description</Label><Textarea value={f.state.value} onValueChange={f.handleChange} onBlur={f.handleBlur} placeholder="Product description" /></FormField>}</form.Field>
        </div></Card>
        {formError && <p className="sku-form-error">{formError}</p>}
        <div className="sku-form-actions"><Button variant="ghost" onClick={() => navigate(isEdit && id ? `/sku/${id}` : '/sku')}>Cancel</Button><Button variant="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Save' : 'Create'}</Button></div>
      </form>
      <Modal isOpen={modalStage !== 'idle'} onClose={() => { if (modalStage !== 'loading') setModalStage('idle'); }}><ModalContent>{modalStage === 'loading' ? <ModalBody><div className="sku-modal-loading"><Spinner size="lg" /></div></ModalBody> : modalStage === 'success' ? <ModalBody><div className="sku-modal-success"><div className="sku-modal-success__icon"><svg className="sku-modal-success__svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><p className="sku-modal-success__text">{resultMessage}</p></div></ModalBody> : <><ModalHeader>Error</ModalHeader><ModalBody><p className="sku-form-error">{resultMessage}</p></ModalBody><ModalFooter><Button onClick={() => setModalStage('idle')}>Close</Button></ModalFooter></>}</ModalContent></Modal>
    </section>
  );
}

export { SkuFormPage };
"""

base = '/workspaces/erp-sales/apps/client/src'
for rel, content in files.items():
    filepath = os.path.join(base, rel)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f'Written {len(content)} chars to {filepath}')
