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
import { Icon, Table, THead, TBody, TR, TH, TD, Card, CardBody, CardHeader, Chip, EmptyState, Input, Pagination, Spinner, useToast } from '../../ui';

import { trpcClient } from '../../lib/trpc';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';

type ActivityLog = {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
  resource: string;
  resourceId: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
};

type ActivityLogRow = ActivityLog;

const ACTION_TONE: Record<ActivityLog['action'], 'neutral' | 'success' | 'accent' | 'warning' | 'danger'> = {
  CREATE: 'success',
  UPDATE: 'accent',
  DELETE: 'danger',
  APPROVE: 'success',
  REJECT: 'danger',
  LOGIN: 'neutral',
  LOGOUT: 'warning',
  EXPORT: 'accent',
  IMPORT: 'neutral',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const ActivityLogsIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
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
    queryKey: ['activityLogs', pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.activityLog.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : 'Failed to load activity logs');
  }, [isError, error, toast]);

  const rows: ActivityLogRow[] = ((data as { data?: ActivityLogRow[] } | undefined)?.data ?? []) as ActivityLogRow[];
  const totalPages = (data as { pagination?: { totalPages?: number } } | undefined)?.pagination?.totalPages ?? 0;

  const columns = useMemo<ColumnDef<ActivityLogRow>[]>(
    () => [
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: intl.formatMessage({ id: 'activity_log.index.header_when', defaultMessage: 'When' }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'user',
        header: intl.formatMessage({ id: 'activity_log.index.header_user', defaultMessage: 'User' }),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.user.name ?? row.original.user.email}</span>
            {row.original.user.name ? (
              <span className="text-xs text-slate-500">{row.original.user.email}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'action',
        accessorKey: 'action',
        header: intl.formatMessage({ id: 'activity_log.index.header_action', defaultMessage: 'Action' }),
        cell: ({ row }) => <Chip tone={ACTION_TONE[row.original.action]}>{row.original.action}</Chip>,
      },
      {
        id: 'resource',
        accessorKey: 'resource',
        header: intl.formatMessage({ id: 'activity_log.index.header_resource', defaultMessage: 'Resource' }),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.resource}</span>,
      },
      {
        id: 'message',
        accessorKey: 'message',
        header: intl.formatMessage({ id: 'activity_log.index.header_message', defaultMessage: 'Message' }),
        cell: ({ row }) => <span className="line-clamp-2 text-sm">{row.original.message}</span>,
      },
    ],
    [intl],
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

  return (
    <section
      className="space-y-5"
      data-ai-context={JSON.stringify({
        section: 'activity-log-list',
        totalRecords: rows.length,
        currentPage: pagination.pageIndex + 1,
        totalPages,
      })}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {intl.formatMessage({ id: 'activity_log.index.title', defaultMessage: 'Activity logs' })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {intl.formatMessage({
              id: 'activity_log.index.description',
              defaultMessage: 'Audit trail for login, logout, and system data changes.',
            })}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="w-80">
            <Input
              placeholder={intl.formatMessage({
                id: 'activity_log.index.search_placeholder',
                defaultMessage: 'Search activity logs (user, message, resource, etc.)',
              })}
              value={searchInput}
              onValueChange={(v: string) => setSearchInput(v)}
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
                icon={<Icon icon="solar:clipboard-list-linear" className="size-8 text-slate-400" />}
                title={intl.formatMessage({ id: 'activity_log.index.empty_title', defaultMessage: 'No activity logs' })}
                description={intl.formatMessage({
                  id: 'activity_log.index.empty_state',
                  defaultMessage: 'No activity logs found.',
                })}
              />
            </div>
          ) : (
            <Table aria-label={intl.formatMessage({ id: 'activity_log.index.title', defaultMessage: 'Activity logs' })}>
              <THead>
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => (
                    <TH key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TH>
                  )),
                )}
              </THead>
              <TBody>
                {table.getRowModel().rows.map((row) => (
                  <TR
                    key={row.id}
                    onClick={() => navigate(`/activity-logs/${row.original.id}`)}
                    className="cursor-pointer"
                  >
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
    </section>
  );
};

export { ActivityLogsIndexPage };
