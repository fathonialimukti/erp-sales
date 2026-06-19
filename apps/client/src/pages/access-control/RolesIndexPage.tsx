import './Role.css';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router';
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { Icon, Table, THead, TBody, TR, TH, TD, Button, Card, CardBody, CardHeader, Chip, EmptyState, Input, Pagination, Spinner, useToast } from '../../ui';

import { trpcClient } from '../../lib/trpc';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';
import { useAtomValue } from 'jotai';
import { hasPermissionAtom } from '../../lib/atoms';

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { users: number; permissions: number };
};

const RolesIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission('role@create');
  const canUpdate = hasPermission('role@update');
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

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
    queryKey: ['rolesList', pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.role.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : 'Failed to load roles');
  }, [isError, error, toast]);

  const rows = (data?.data ?? []) as unknown as RoleRow[];
  const totalPages = data?.meta?.totalPages ?? 0;

  const columns = useMemo<ColumnDef<RoleRow>[]>(() => [
    {
      id: 'name',
      header: intl.formatMessage({ id: 'roles.index.header_name', defaultMessage: 'Name' }),
      cell: ({ row }) => (
        <div className="role-name-cell">
          <span className="role-name-cell__name">{row.original.name}</span>
          {row.original.description ? <span className="role-name-cell__desc">{row.original.description}</span> : null}
        </div>
      ),
    },
    {
      id: 'isSystem',
      header: intl.formatMessage({ id: 'roles.index.header_type', defaultMessage: 'Type' }),
      cell: ({ row }) => (
        <Chip tone={row.original.isSystem ? 'accent' : 'neutral'}>
          {row.original.isSystem
            ? intl.formatMessage({ id: 'roles.index.system', defaultMessage: 'System' })
            : intl.formatMessage({ id: 'roles.index.custom', defaultMessage: 'Custom' })}
        </Chip>
      ),
    },
    {
      id: 'users',
      header: intl.formatMessage({ id: 'roles.index.header_users', defaultMessage: 'Users' }),
      cell: ({ row }) => <span className="role-count">{row.original._count.users}</span>,
    },
    {
      id: 'permissions',
      header: intl.formatMessage({ id: 'roles.index.header_permissions', defaultMessage: 'Permissions' }),
      cell: ({ row }) => <span className="role-count">{row.original._count.permissions}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        canUpdate && !row.original.isSystem ? (
          <div className="role-actions">
            <Button size="sm" variant="ghost" onClick={() => navigate(`/roles/${row.original.id}/edit`)} aria-label="Edit">
              <Icon icon="solar:pen-linear" />
            </Button>
          </div>
        ) : null,
    },
  ], [intl, navigate, canUpdate]);

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: totalPages,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <section
      className="role-page"
      data-ai-context={JSON.stringify({
        section: 'roles-index',
        page: pagination.pageIndex + 1,
        totalRoles: rows.length,
        canCreate,
      })}
    >
      <div className="role-header">
        <div>
          <h1 className="role-header__title">
            {intl.formatMessage({ id: 'roles.index.title', defaultMessage: 'Roles' })}
          </h1>
          <p className="role-header__desc">
            {intl.formatMessage({ id: 'roles.index.description', defaultMessage: 'Define what each role can do across the system.' })}
          </p>
        </div>
        {canCreate ? (
          <Button variant="primary" onClick={() => navigate('/roles/create')}>
            <Icon icon="solar:add-circle-linear" />
            {intl.formatMessage({ id: 'roles.index.create_button', defaultMessage: 'Create Role' })}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="role-search-wrap">
            <Input
              placeholder={intl.formatMessage({ id: 'roles.index.search_placeholder', defaultMessage: 'Search roles' })}
              value={searchInput}
              onValueChange={(v: string) => setSearchInput(v)}
              leftIcon={<Icon icon="solar:magnifer-linear" />}
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="role-loading">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <div className="role-empty-wrap">
              <EmptyState
                icon={<Icon icon="solar:shield-user-linear" className="size-8 text-slate-400" />}
                title={intl.formatMessage({ id: 'roles.index.empty_title', defaultMessage: 'No roles' })}
                description={intl.formatMessage({ id: 'roles.index.empty_state', defaultMessage: 'No roles found.' })}
              />
            </div>
          ) : (
            <Table aria-label={intl.formatMessage({ id: 'roles.index.title', defaultMessage: 'Roles' })}>
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
                  <TR key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TD key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          {totalPages > 1 ? (
            <div className="role-pagination-wrap">
              <Pagination
                page={pagination.pageIndex + 1}
                totalPages={totalPages}
                onChange={(p) => setPagination((prev) => ({ ...prev, pageIndex: p - 1 }))}
              />
            </div>
          ) : null}
        </CardBody>
      </Card>
    </section>
  );
};

export { RolesIndexPage };
