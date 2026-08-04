import { useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Info } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pagination } from "../../components/Pagination";
import { cn } from "@/lib/utils";

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
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const typeTone = (type: string) => {
  switch (type) {
    case "WARNING":
      return "bg-warning/10 text-warning";
    case "SUCCESS":
    case "APPROVAL":
      return "bg-success/10 text-success";
    case "ERROR":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-[color-mix(in_srgb,var(--module-user)_8%,transparent)] text-[var(--module-user)]";
  }
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
      // ponytail: API shape differs slightly from local Notification type
      const p = trpcClient.notification.list.query({
        page,
        limit: 20,
        unreadOnly: unreadOnly || undefined,
      }) as Promise<unknown>;
      return p as Promise<{ data: Notification[]; meta: { totalPages: number; total: number } }>;
    },
  });

  const rows = useMemo(
    () => ((data ?? {}) as { data?: Notification[] }).data ?? ([] as Notification[]),
    [data],
  );
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
      toast.success(
        intl.formatMessage({
          id: "notifications.mark_all_read",
          defaultMessage: "All notifications marked as read",
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark all as read");
    }
  };

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "notifications-page",
        unreadCount,
        totalRows,
        unreadOnly,
      })}
    >
      <PageHeader
        module="user"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({ id: "notifications.title", defaultMessage: "Notifications" })}
        description={intl.formatMessage({
          id: "notifications.description",
          defaultMessage: "System alerts and updates.",
        })}
        actions={
          unreadCount > 0 ? (
            <Button type="button" variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="size-4" />
              {intl.formatMessage({
                id: "notifications.mark_all_read",
                defaultMessage: "Mark all as read",
              })}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="unread-only"
            checked={unreadOnly}
            onCheckedChange={(checked) => {
              setUnreadOnly(checked);
              setPage(1);
            }}
          />
          <Label htmlFor="unread-only" className="cursor-pointer text-sm">
            {intl.formatMessage({
              id: "notifications.unread_only",
              defaultMessage: "Unread only",
            })}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          {intl.formatMessage(
            {
              id: "notifications.count_label",
              defaultMessage: "{count, plural, one {# notification} other {# notifications}}",
            },
            { count: totalRows },
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          module="user"
          title={intl.formatMessage({
            id: "notifications.empty_title",
            defaultMessage: "No notifications",
          })}
          description={intl.formatMessage({
            id: "notifications.empty_state",
            defaultMessage: "You are all caught up.",
          })}
        />
      ) : (
        <Card className="shadow-sm">
          <CardContent className="divide-y p-0">
            {rows.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  !n.isRead && "bg-[color-mix(in_srgb,var(--module-user)_6%,transparent)]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                    typeTone(n.type),
                  )}
                  aria-hidden
                >
                  {n.type === "APPROVAL" ? (
                    <Bell className="size-4" />
                  ) : (
                    <Info className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "text-sm text-foreground",
                        !n.isRead ? "font-semibold" : "font-medium",
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage(
              { id: "common.pagination_info", defaultMessage: "Page {page} of {total}" },
              { page, total: totalPages },
            )}
          </p>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      ) : null}
    </section>
  );
};

export { NotificationsPage };
