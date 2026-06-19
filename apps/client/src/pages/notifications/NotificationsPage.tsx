import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from "../../ui";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  EmptyState,
  Pagination,
  Spinner,
  useToast,
} from '../../ui';
import { trpcClient } from '../../lib/trpc';
import { useAiFillForm } from '../../components/AiAssistant/useAiFillForm';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
};

const TYPE_ICON: Record<string, string> = {
  INFO: 'solar:info-circle-linear',
  WARNING: 'solar:shield-warning-linear',
  SUCCESS: 'solar:check-circle-linear',
  ERROR: 'solar:close-circle-linear',
  APPROVAL: 'solar:check-read-linear',
};

const TYPE_TONE: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'accent'> = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'danger',
  APPROVAL: 'accent',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const NotificationsPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useAiFillForm({
    unreadOnly: (v: unknown) => setUnreadOnly(Boolean(v)),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () => {
      const p = trpcClient.notification.list.query({ page, limit: 20, unreadOnly: unreadOnly || undefined }) as Promise<unknown>;
      return p as Promise<{ data: Notification[]; meta: { totalPages: number } }>;
    },
  });

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : 'Failed to load notifications');
  }, [isError, error, toast]);

  const rows = useMemo(() => ((data ?? {}) as { data?: Notification[] }).data ?? [] as Notification[], [data]);
const totalPages = ((data ?? {}) as { meta?: { totalPages?: number } }).meta?.totalPages ?? 0;

  const handleMarkAsRead = async (id: string) => {
    try {
      await trpcClient.notification.markAsRead.mutate({ id });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadRows = rows.filter((n) => !n.isRead);
      const markRead = (id: string) => trpcClient.notification.markAsRead.mutate({ id });
      const promises: Promise<unknown>[] = [];
      for (const n of unreadRows) promises.push(markRead(n.id));
      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark all as read');
    }
  };

  const unreadCount = useMemo(() => rows.filter((n) => !n.isRead).length, [rows]);

  return (
    <section
      className="space-y-5"
      data-ai-context={JSON.stringify({
        section: 'notifications',
        unreadCount,
        totalRows: rows.length,
        unreadOnly,
      })}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {intl.formatMessage({ id: 'notifications.title', defaultMessage: 'Notifications' })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {intl.formatMessage({ id: 'notifications.description', defaultMessage: 'System alerts and updates.' })}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Icon icon="solar:check-read-linear" />
            {intl.formatMessage({ id: 'notifications.mark_all_read', defaultMessage: 'Mark all as read' })}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <Checkbox
            checked={unreadOnly}
            onChange={(checked) => {
              setUnreadOnly(checked);
              setPage(1);
            }}
            label={intl.formatMessage({ id: 'notifications.unread_only', defaultMessage: 'Unread only' })}
          />
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-10">
              <EmptyState
                icon={<Icon icon="solar:bell-off-linear" className="size-8 text-slate-400" />}
                title={intl.formatMessage({ id: 'notifications.empty_title', defaultMessage: 'No notifications' })}
                description={intl.formatMessage({ id: 'notifications.empty_state', defaultMessage: 'You are all caught up.' })}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors ${n.isRead ? '' : 'bg-emerald-50/30 dark:bg-emerald-950/10'}`}
                >
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-${TYPE_TONE[n.type] ?? 'neutral'}-100 text-${TYPE_TONE[n.type] ?? 'neutral'}-600 dark:bg-${TYPE_TONE[n.type] ?? 'neutral'}-900/30`}>
                    <Icon icon={TYPE_ICON[n.type] ?? 'solar:bell-linear'} className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.isRead ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-50'}`}>
                        {n.title}
                      </p>
                      <span className="font-mono text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
                    {!n.isRead ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkAsRead(n.id)}
                        className="mt-2 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {intl.formatMessage({ id: 'notifications.mark_read', defaultMessage: 'Mark as read' })}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 ? (
            <div className="flex justify-end p-4">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          ) : null}
        </CardBody>
      </Card>
    </section>
  );
};

export { NotificationsPage };
