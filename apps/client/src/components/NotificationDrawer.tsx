import { useMemo, useState, type ComponentType } from "react";
import { useIntl } from "react-intl";
import { useAtom } from "jotai";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationsOpenAtom } from "@/lib/atoms";
import { trpcClient } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type NotificationType =
  | "INFO"
  | "WARNING"
  | "SUCCESS"
  | "ERROR"
  | "APPROVAL"
  | string;

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

const TYPE_ICON: Record<
  string,
  {
    Icon: ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  INFO: {
    Icon: Info,
    className: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  WARNING: {
    Icon: AlertTriangle,
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  SUCCESS: {
    Icon: CheckCircle2,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  ERROR: {
    Icon: XCircle,
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  APPROVAL: {
    Icon: CircleAlert,
    className: "bg-primary/15 text-primary",
  },
};

const NotificationIcon = ({
  type,
  isRead,
}: {
  type: string;
  isRead: boolean;
}) => {
  const config = TYPE_ICON[type] ?? TYPE_ICON.INFO;
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
        config.className,
        isRead && "opacity-60",
      )}
      aria-hidden
    >
      <Icon className="size-4" />
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

  const invalidateNotifs = () => {
    void queryClient.invalidateQueries({
      queryKey: ["notifications-drawer"],
    });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({
      queryKey: ["notification-unread-count"],
    });
  };

  const markRead = useMutation({
    mutationFn: (id: string) =>
      trpcClient.notification.markAsRead.mutate({ id }),
    onSuccess: invalidateNotifs,
  });

  const markAllRead = useMutation({
    mutationFn: () => trpcClient.notification.markAllAsRead.mutate(),
    onSuccess: invalidateNotifs,
  });

  const clearAll = useMutation({
    mutationFn: () => trpcClient.notification.clearAll.mutate(),
    onSuccess: invalidateNotifs,
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        data-ai-context={JSON.stringify({
          section: "notification-drawer",
          open,
          tab,
          totalCount,
          unreadCount,
        })}
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <div className="flex items-center gap-2 pr-8">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-heading text-base">
                {intl.formatMessage({
                  id: "nav.notifications",
                  defaultMessage: "Notifications",
                })}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {intl.formatMessage(
                  {
                    id: "notifications.footer_count",
                    defaultMessage:
                      "{count, plural, one {# total} other {# total}}",
                  },
                  { count: totalCount },
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "all" | "unread")}
            className="min-w-0 flex-1"
          >
            <TabsList className="h-9 w-full">
              <TabsTrigger value="all" className="flex-1 text-xs">
                {intl.formatMessage({
                  id: "notifications.tab.all",
                  defaultMessage: "All",
                })}
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 gap-1.5 text-xs">
                {intl.formatMessage({
                  id: "notifications.tab.unread",
                  defaultMessage: "Unread",
                })}
                {unreadCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]"
                  >
                    {unreadCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-2 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            {markAllRead.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="size-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {intl.formatMessage({
                id: "notifications.mark_all_read",
                defaultMessage: "Mark all read",
              })}
            </span>
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 p-2">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Loader2
                  className="size-5 animate-spin text-muted-foreground"
                  aria-hidden
                />
                <span className="text-sm text-muted-foreground">
                  {intl.formatMessage({
                    id: "common.loading",
                    defaultMessage: "Loading…",
                  })}
                </span>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <BellOff className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {tab === "unread"
                    ? intl.formatMessage({
                        id: "notifications.empty.unread",
                        defaultMessage: "All caught up",
                      })
                    : intl.formatMessage({
                        id: "notifications.empty",
                        defaultMessage: "No notifications yet",
                      })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {intl.formatMessage({
                    id: "notifications.empty.desc",
                    defaultMessage:
                      "We'll let you know when something important happens.",
                  })}
                </span>
              </div>
            ) : (
              rows.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                    !n.isRead &&
                      "border-primary/15 bg-primary/4 hover:bg-primary/7",
                  )}
                  onClick={() => handleItemClick(n)}
                >
                  <NotificationIcon type={n.type} isRead={n.isRead} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm text-foreground",
                        !n.isRead && "font-semibold",
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                      {n.body}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{formatRelative(n.createdAt, intl.locale)}</span>
                      {n.createdBy?.name ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{n.createdBy.name}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  {!n.isRead ? (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      title={intl.formatMessage({
                        id: "notifications.unread",
                        defaultMessage: "Unread",
                      })}
                      aria-label={intl.formatMessage({
                        id: "notifications.unread",
                        defaultMessage: "Unread",
                      })}
                    />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="mt-0 flex-row items-center justify-between gap-2 border-t border-border px-4 py-3 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending || totalCount === 0}
          >
            {clearAll.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            {intl.formatMessage({
              id: "notifications.clear_all",
              defaultMessage: "Clear notifications",
            })}
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {intl.formatMessage(
              {
                id: "notifications.footer_count",
                defaultMessage:
                  "{count, plural, one {# total} other {# total}}",
              },
              { count: totalCount },
            )}
          </span>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
