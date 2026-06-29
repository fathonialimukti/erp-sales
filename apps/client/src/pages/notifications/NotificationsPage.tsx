import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { useToast } from "../../ui/useToast";
import { Pagination } from "../../ui/Pagination";
import { ModulePage, ModuleHero, ModuleEmpty } from "../../components/ModulePage";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const TYPE_COLOR: Record<string, string> = {
  INFO: "var(--ios-state-info, #2563EB)",
  WARNING: "var(--ios-state-warning, #D97706)",
  SUCCESS: "var(--ios-state-success, #047857)",
  ERROR: "var(--ios-state-danger, #DC2626)",
  APPROVAL: "var(--ios-state-success, #047857)",
};

const TYPE_BG: Record<string, string> = {
  INFO: "var(--ios-state-info-bg, rgba(59, 130, 246, 0.10))",
  WARNING: "var(--ios-state-warning-bg, rgba(245, 158, 11, 0.10))",
  SUCCESS: "var(--ios-state-success-bg, rgba(16, 185, 129, 0.10))",
  ERROR: "var(--ios-state-danger-bg, rgba(239, 68, 68, 0.10))",
  APPROVAL: "var(--ios-state-success-bg, rgba(16, 185, 129, 0.10))",
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

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page, unreadOnly],
    queryFn: () => {
      const p = trpcClient.notification.list.query({ page, limit: 20, unreadOnly: unreadOnly || undefined }) as Promise<unknown>;
      return p as Promise<{ data: Notification[]; meta: { totalPages: number; total: number } }>;
    },
  });

  const rows = useMemo(() => ((data ?? {}) as { data?: Notification[] }).data ?? [] as Notification[], [data]);
  const totalPages = ((data ?? {}) as { meta?: { totalPages?: number } }).meta?.totalPages ?? 1;
  const totalRows = ((data ?? {}) as { meta?: { total?: number } }).meta?.total ?? 0;
  const unreadCount = useMemo(() => rows.filter((n) => !n.isRead).length, [rows]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await trpcClient.notification.markAsRead.mutate({ id });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await trpcClient.notification.markAllAsRead.mutate();
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(intl.formatMessage({ id: "notifications.mark_all_read", defaultMessage: "All notifications marked as read" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark all as read");
    }
  };

  return (
    <ModulePage accent="#F472B6" accentEnd="#9D174D" aiContext={{ section: "notifications-page", unreadCount, totalRows, unreadOnly }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "notifications.title", defaultMessage: "Notifications" })}
        subtitle={intl.formatMessage({ id: "notifications.description", defaultMessage: "System alerts and updates." })}
        stats={[
          { value: totalRows, label: intl.formatMessage({ id: "notifications.hero.total", defaultMessage: "Total" }) },
          { value: unreadCount, color: "info" as const, label: intl.formatMessage({ id: "notifications.hero.unread", defaultMessage: "Unread" }) },
        ]}
      />

      <div className="m-toolbar">
        <label className="m-search" style={{ cursor: "pointer", padding: "0 1rem", height: "2.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--ios-label-2)" }}>
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
            style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
          />
          {intl.formatMessage({ id: "notifications.unread_only", defaultMessage: "Unread only" })}
        </label>
        {unreadCount > 0 ? (
          <button type="button" className="m-btn m-btn--ghost m-btn--sm" onClick={handleMarkAllAsRead}>
            {intl.formatMessage({ id: "notifications.mark_all_read", defaultMessage: "Mark all as read" })}
          </button>
        ) : null}
        <span className="m-count">
          {intl.formatMessage({ id: "notifications.count_label", defaultMessage: "{count, plural, one {# notification} other {# notifications}}" }, { count: totalRows })}
        </span>
      </div>

      {isLoading ? (
        <div className="m-state m-state--loading">
          <span className="spin spin--md" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      ) : rows.length === 0 ? (
        <ModuleEmpty
          title={intl.formatMessage({ id: "notifications.empty_title", defaultMessage: "No notifications" })}
          description={intl.formatMessage({ id: "notifications.empty_state", defaultMessage: "You are all caught up." })}
        />
      ) : (
        <div className="m-table-card">
          <div className="m-items-table">
            <div className="m-items-table__body">
              {rows.map((n) => (
                <div
                  key={n.id}
                  className="m-items-table__row"
                  style={{ cursor: "pointer", background: n.isRead ? "transparent" : "var(--ios-row-active-bg, rgba(124, 58, 237, 0.04))" }}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                >
                  <div className="m-items-table__td m-items-table__td--product">
                    <span className="m-items-table__icon" style={{ background: TYPE_BG[n.type] ?? TYPE_BG.INFO, color: TYPE_COLOR[n.type] ?? TYPE_COLOR.INFO }} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4 M12 8h.01" />
                      </svg>
                    </span>
                    <div className="m-items-table__product">
                      <span className="m-items-table__product-name">{n.title}</span>
                      <span className="m-items-table__product-code">{n.body}</span>
                    </div>
                  </div>
                  <div className="m-items-table__td m-items-table__td--num m-items-table__td--muted">
                    {formatDate(n.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 ? (
            <div className="m-pagination">
              <span className="m-pagination__info">
                {intl.formatMessage({ id: "common.pagination_info", defaultMessage: "Page {page} of {total}" }, { page, total: totalPages })}
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          ) : null}
        </div>
      )}
    </ModulePage>
  );
};

export { NotificationsPage };
