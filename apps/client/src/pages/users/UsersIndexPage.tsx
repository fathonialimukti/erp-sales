import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router';
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon, Table, THead, TBody, TR, TH, TD, Button, Card, CardBody, CardDescription, CardHeader, CardTitle, EmptyState, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Spinner, useToast } from '../../ui';

import { EntityPhoto } from '../../components/EntityPhoto';
import { hasPermissionAtom } from '../../lib/atoms';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';
import { trpcClient } from '../../lib/trpc';

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  photo?: string | null;
  role: { id: string; name: string } | null;
  createdAt: string;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const UsersIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('user@create');
  const canUpdate = hasPermission('user@update');
  const canDelete = hasPermission('user@delete');
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useAiFillForm({
    search: (v: unknown) => {
      const s = String(v ?? '');
      setSearchInput(s);
      setSearch(s);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['userList', pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.user.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : 'Failed to load users');
  }, [isError, error, toast]);

  const rows = (data?.data ?? []) as UserRow[];
  const totalPages = data?.meta?.totalPages ?? 0;

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: 'user',
        header: intl.formatMessage({ id: 'users.index.header_user', defaultMessage: 'User' }),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <EntityPhoto src={row.original.photo} alt={row.original.name ?? row.original.email} />
            <div>
              <p className="text-sm font-medium">{row.original.name ?? '—'}</p>
              <p className="text-xs text-slate-500">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'role',
        header: intl.formatMessage({ id: 'users.index.header_role', defaultMessage: 'Role' }),
        cell: ({ row }) => row.original.role?.name ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: intl.formatMessage({ id: 'users.index.header_created', defaultMessage: 'Created' }),
        cell: ({ row }) => <span className="font-mono text-xs">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate(`/users/${row.original.id}`)} aria-label="View">
              <Icon icon="solar:eye-linear" />
            </Button>
            {canUpdate ? (
              <Button size="sm" variant="ghost" onClick={() => navigate(`/users/${row.original.id}/edit`)} aria-label="Edit">
                <Icon icon="solar:pen-linear" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setUserToDelete(row.original);
                  setDeleteModalOpen(true);
                }}
                aria-label="Delete"
              >
                <Icon icon="solar:trash-bin-trash-linear" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [intl, navigate, canUpdate, canDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: totalPages,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleDelete = async () => {
    if (!userToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.user.delete.mutate({ id: userToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ['userList'] });
      setDeleteModalOpen(false);
      setUserToDelete(null);
      toast.success('User deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      className="space-y-5"
      data-ai-context={JSON.stringify({
        section: 'users-index',
        page: pagination.pageIndex + 1,
        totalUsers: rows.length,
        canCreate,
      })}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {intl.formatMessage({ id: 'users.index.title', defaultMessage: 'Users' })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {intl.formatMessage({ id: 'users.index.description', defaultMessage: 'Manage system users and their assigned roles.' })}
          </p>
        </div>
        {canCreate ? (
          <Button variant="primary" onClick={() => navigate('/users/create')}>
            <Icon icon="solar:add-circle-linear" />
            {intl.formatMessage({ id: 'users.index.create_button', defaultMessage: 'Create User' })}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="w-80">
            <Input
              placeholder={intl.formatMessage({ id: 'users.index.search_placeholder', defaultMessage: 'Search by name, email, or role' })}
              value={searchInput}
              onValueChange={setSearchInput}
              leftIcon={<Icon icon="solar:magnifer-linear" />}
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-10">
              <EmptyState
                icon={<Icon icon="solar:users-group-two-rounded-linear" className="size-8 text-slate-400" />}
                title={intl.formatMessage({ id: 'users.index.empty_title', defaultMessage: 'No users' })}
                description={
                  search
                    ? intl.formatMessage({ id: 'users.index.no_results', defaultMessage: 'No users match the search.' })
                    : intl.formatMessage({ id: 'users.index.empty_state', defaultMessage: 'No user data available.' })
                }
              />
            </div>
          ) : (
            <Table aria-label={intl.formatMessage({ id: 'users.index.title', defaultMessage: 'Users' })}>
              <THead>
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => (
                    <TH key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TH>
                  )),
                )}
              </THead>
              <TBody>
                {table.getRowModel().rows.map((row) => (
                  <TR key={row.id} onClick={() => navigate(`/users/${row.original.id}`)} className="cursor-pointer">
                    {row.getVisibleCells().map((cell) => (
                      <TD key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          {totalPages > 1 ? (
            <div className="flex justify-end p-4">
              <Pagination
                page={pagination.pageIndex + 1}
                totalPages={totalPages}
                onChange={(p) => setPagination((prev) => ({ ...prev, pageIndex: p - 1 }))}
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            {intl.formatMessage({ id: 'users.index.delete_title', defaultMessage: 'Delete user' })}
          </ModalHeader>
          <ModalBody>
            {intl.formatMessage(
              { id: 'users.index.delete_confirm', defaultMessage: 'Are you sure you want to delete "{name}"? This action cannot be undone.' },
              { name: userToDelete?.name ?? userToDelete?.email },
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

export { UsersIndexPage };
