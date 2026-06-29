import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtom, useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../lib/trpc";
import { notificationsOpenAtom } from "../lib/atoms";
import "./NotificationDrawer.css";

type NotificationType = "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "APPROVAL" | string;

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
  createdBy?: { id: string; name: string | null } | null;
};



// iOS-style notification icons
const NotificationIcon = ({ type, isRead }: { type: string; isRead: boolean }) => {
  const iconMap: Record<string, { bg: string; symbol: JSX.Element }> = {
    INFO: {
      bg: "var(--color-state-info-bg)",
      symbol: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      ),
    },
    WARNING: {
      bg: "var(--color-state-warning-bg)",
      symbol: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    SUCCESS: {
      bg: "var(--color-state-success-bg)",
      symbol: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    ERROR: {
      bg: "var(--color-state-danger-bg)",
      symbol: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    },
    APPROVAL: {
      bg: "var(--color-state-success-bg)",
      symbol: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  };

  const config = iconMap[type] || iconMap.INFO;
  const color = type === "INFO" ? "var(--color-state-info)" : 
                type === "WARNING" ? "var(--color-state-warning)" : 
                type === "SUCCESS" || type === "APPROVAL" ? "var(--color-state-success)" : 
                "var(--color-state-danger)";

  return (
    <span 
      className={`nd__item-icon nd__item-icon--${type}`}
      style={{ 
        background: config.bg,
        color: color,
        opacity: isRead ? 0.6 : 1,
      }}
    >
      {config.symbol}
    </span>
  );
};

const formatRelative = (iso: string, locale: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
};

export const NotificationDrawer = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useAtom(notificationsOpenAtom);
  const [tab, setTab] = useState<"all" | "unread">("all");

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Lock scroll on the content layer when open (not the page itself)
  useEffect(() => {
    if (!open) return;
    const layer = document.querySelector(".priv-layout__content");
    const prev = layer instanceof HTMLElement ? layer.style.overflow : "";
    if (layer instanceof HTMLElement) layer.style.overflow = "hidden";
    return () => {
      if (layer instanceof HTMLElement) layer.style.overflow = prev;
    };
  }, [open]);

  const unreadOnly = tab === "unread";

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-drawer", unreadOnly],
    queryFn: () =>
      trpcClient.notification.list.query({
        page: 1,
        limit: 30,
        unreadOnly: unreadOnly || undefined,
      }) as unknown as Promise<{ data: NotificationItem[] }>,
    enabled: open,
    staleTime: 30_000,
  });

  const rows = useMemo<NotificationItem[]>(
    () => (data as { data?: NotificationItem[] } | undefined)?.data ?? [],
    [data],
  );

  const markRead = useMutation({
    mutationFn: (id: string) => trpcClient.notification.markAsRead.mutate({ id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-drawer"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => trpcClient.notification.markAllAsRead.mutate(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-drawer"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const clearAll = useMutation({
    mutationFn: () => trpcClient.notification.clearAll.mutate(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-drawer"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const handleItemClick = (n: NotificationItem) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.actionUrl) {
      setOpen(false);
      navigate(n.actionUrl);
    }
  };

  const unreadCount = rows.filter((n) => !n.isRead).length;
  const totalCount = rows.length;

  return (
    <div
      className={`nd ${open ? "nd--open" : ""}`}
      aria-hidden={!open}
      role="dialog"
      aria-label={intl.formatMessage({ id: "nav.notifications", defaultMessage: "Notifications" })}
    >
      <div className="nd__backdrop" onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className="nd__panel" aria-modal={open ? "true" : undefined}>
        <div className="nd__header">
          <div className="nd__header-text">
            <span className="nd__title">
              {intl.formatMessage({ id: "nav.notifications", defaultMessage: "Notifications" })}
            </span>
          </div>
          <button
            type="button"
            className="nd__close"
            onClick={() => setOpen(false)}
            aria-label={intl.formatMessage({ id: "common.close", defaultMessage: "Close" })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="nd__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "all"}
            className={`nd__tab ${tab === "all" ? "nd__tab--active" : ""}`}
            onClick={() => setTab("all")}
          >
            <span>{intl.formatMessage({ id: "notifications.tab.all", defaultMessage: "All" })}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "unread"}
            className={`nd__tab ${tab === "unread" ? "nd__tab--active" : ""}`}
            onClick={() => setTab("unread")}
          >
            <span>
              {intl.formatMessage({ id: "notifications.tab.unread", defaultMessage: "Unread" })}
            </span>
            {unreadCount > 0 && <span className="nd__tab-count">{unreadCount}</span>}
          </button>
          <button
            type="button"
            className="nd__tab-mark-all"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            {intl.formatMessage({ id: "notifications.mark_all_read", defaultMessage: "Mark all read" })}
          </button>
        </div>

        <div className="nd__body">
          {isLoading ? (
            <div className="nd__state">
              <span className="nd__state-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <span className="nd__state-title">
                {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
              </span>
            </div>
          ) : rows.length === 0 ? (
            <div className="nd__state">
              <span className="nd__state-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 6a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </span>
              <span className="nd__state-title">
                {tab === "unread"
                  ? intl.formatMessage({ id: "notifications.empty.unread", defaultMessage: "All caught up" })
                  : intl.formatMessage({ id: "notifications.empty", defaultMessage: "No notifications yet" })}
              </span>
              <span className="nd__state-text">
                {intl.formatMessage({
                  id: "notifications.empty.desc",
                  defaultMessage: "We'll let you know when something important happens.",
                })}
              </span>
            </div>
          ) : (
            rows.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`nd__item ${!n.isRead ? "nd__item--unread" : ""}`}
                onClick={() => handleItemClick(n)}
              >
                <NotificationIcon type={n.type} isRead={n.isRead} />
                <span className="nd__item-body">
                  <span className="nd__item-title">{n.title}</span>
                  <span className="nd__item-message">{n.body}</span>
                  <span className="nd__item-meta">
                    <span>{formatRelative(n.createdAt, intl.locale)}</span>
                    {n.createdBy?.name && (
                      <>
                        <span className="nd__item-meta-dot" aria-hidden="true" />
                        <span>{n.createdBy.name}</span>
                      </>
                    )}
                  </span>
                </span>
                {!n.isRead && (
                  <span className="nd__item-actions">
                    <span
                      className="nd__item-action"
                      role="img"
                      aria-label={intl.formatMessage({ id: "notifications.unread", defaultMessage: "Unread" })}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    </span>
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="nd__footer">
          <button
            type="button"
            className="nd__footer-clear"
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending || totalCount === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            {intl.formatMessage({ id: "notifications.clear_all", defaultMessage: "Clear notifications" })}
          </button>
          <span className="nd__footer-count">
            {intl.formatMessage(
              { id: "notifications.footer_count", defaultMessage: "{count, plural, one {# total} other {# total}}" },
              { count: totalCount },
            )}
          </span>
        </div>
      </aside>
    </div>
  );
};
