import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { Bell, Clock, Languages, Menu, Moon, Server, Sun } from "lucide-react";

import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { NAV_MENU, ROUTE_META, type NavMenuItem } from "@/constants/nav-menu";
import {
  hasPermissionAtom,
  notificationsOpenAtom,
  sidebarOpenAtom,
  themeModeAtom,
} from "@/lib/atoms";
import { localeSymbols, supportedLocales } from "@/lib/locale";
import { showPushNotification } from "@/lib/push-notification";
import { trpcClient } from "@/lib/trpc";
import { useLocale } from "@/lib/useLocale";
import { cn } from "@/lib/utils";

const findPageMeta = (
  pathname: string,
): { kicker: string; title: string } => {
  const norm = (p: string) =>
    p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  const cur = norm(pathname);

  const walk = (
    items: NavMenuItem[],
  ): { kicker: string; title: string } | null => {
    for (const it of items) {
      if (it.href) {
        const t = norm(it.href);
        if (cur === t || cur.startsWith(`${t}/`)) {
          return { kicker: "Workspace", title: it.name };
        }
      }
      if (it.children) {
        const r = walk(it.children);
        if (r) return { kicker: it.name, title: r.title };
      }
    }
    return null;
  };

  if (cur === "/dashboard") {
    return { kicker: "Workspace", title: "nav.dashboard" };
  }
  // Utility routes reached outside the sidebar (user modal destinations)
  // still get real breadcrumb metadata instead of the generic fallback.
  const utility = ROUTE_META[cur];
  if (utility) return utility;
  return walk(NAV_MENU) ?? { kicker: "Workspace", title: "Page" };
};

export const Topbar = () => {
  const location = useLocation();
  const intl = useIntl();
  const [theme, setTheme] = useAtom(themeModeAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const [notifsOpen, setNotifsOpen] = useAtom(notificationsOpenAtom);
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  // Desktop: avatar lives in the sidebar (expanded or collapsed). Mobile: topbar.
  const showAvatarInSidebar = isLgUp;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const meta = useMemo(
    () => findPageMeta(location.pathname),
    [location.pathname],
  );
  const titleLabel = intl.formatMessage({
    id: meta.title,
    defaultMessage: meta.title.replace("nav.", ""),
  });
  const kickerLabel = intl.formatMessage({
    id: meta.kicker.startsWith("nav.") ? meta.kicker : `nav.${meta.kicker}`,
    defaultMessage: meta.kicker.replace("nav.", ""),
  });

  const { data: unread } = useQuery({
    queryKey: ["notification-unread-count"],
    queryFn: () => trpcClient.notification.unreadCount.query(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount =
    (unread as { count?: number } | undefined)?.count ?? 0;

  // Surface new notifications as native desktop toasts (Tauri advantage).
  const seenCountRef = useRef(0);
  useEffect(() => {
    if (unreadCount > seenCountRef.current) {
      void showPushNotification(
        intl.formatMessage({
          id: "notification.native_title",
          defaultMessage: "New notification",
        }),
        intl.formatMessage(
          {
            id: "notification.native_body",
            defaultMessage: "You have {count} unread notification(s)",
          },
          { count: unreadCount },
        ),
        "/notifications",
      );
    }
    seenCountRef.current = unreadCount;
  }, [unreadCount, intl]);

  const time = now.toLocaleTimeString(intl.locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const toggleSidebar = () => setSidebarOpen((prev: boolean) => !prev);
  const toggleTheme = () =>
    setTheme((prev: "light" | "dark") =>
      prev === "dark" ? "light" : "dark",
    );

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-3 shadow-sm sm:h-15 sm:px-4",
      )}
      data-ai-context={JSON.stringify({
        section: "topbar",
        path: location.pathname,
        showAvatarInTopbar: !showAvatarInSidebar,
      })}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label={intl.formatMessage({
            id: "nav.toggle_sidebar",
            defaultMessage: "Toggle sidebar",
          })}
          className="size-9 shrink-0 rounded-full"
        >
          <Menu className="size-4" aria-hidden />
        </Button>

        <div className="min-w-0 leading-tight">
          <span className="block truncate text-[11px] font-semibold tracking-wide text-primary uppercase">
            {kickerLabel}
          </span>
          <span className="block truncate font-heading text-sm font-semibold text-foreground sm:text-base">
            {titleLabel}
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div
          className="hidden items-center gap-1.5 rounded-full border border-border bg-primary/6 px-2.5 py-1.5 text-xs font-medium text-primary tabular-nums sm:inline-flex"
          aria-hidden
          title={intl.formatMessage({
            id: "common.time",
            defaultMessage: "Local time",
          })}
        >
          <Clock className="size-3.5" aria-hidden />
          <span>{time}</span>
        </div>

        <Select
          value={locale}
          onValueChange={(value) =>
            setLocale(value as (typeof supportedLocales)[number])
          }
        >
          <SelectTrigger
            size="sm"
            aria-label={intl.formatMessage({
              id: "nav.language",
              defaultMessage: "Language",
            })}
            className="h-9 w-auto gap-1.5 rounded-full border-border bg-card px-2.5 shadow-none"
          >
            <Languages className="size-3.5 text-muted-foreground" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {supportedLocales.map((code) => (
              <SelectItem key={code} value={code}>
                {localeSymbols[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={notifsOpen ? "secondary" : "outline"}
          size="icon"
          aria-label={intl.formatMessage({
            id: "nav.notifications",
            defaultMessage: "Notifications",
          })}
          aria-expanded={notifsOpen}
          onClick={() => setNotifsOpen((prev) => !prev)}
          className="relative size-9 rounded-full"
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>

        {hasPermission("settings@app@read") && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={intl.formatMessage({
              id: "user.menu.app_settings",
              defaultMessage: "App settings",
            })}
            onClick={() => navigate("/settings")}
            className="size-9 rounded-full"
          >
            <Server className="size-4" aria-hidden />
          </Button>
        )}

        <Button
          type="button"
          variant={theme === "dark" ? "secondary" : "outline"}
          size="icon"
          aria-label={intl.formatMessage({
            id: "nav.theme",
            defaultMessage: "Theme",
          })}
          onClick={toggleTheme}
          className="size-9 rounded-full"
        >
          {theme === "dark" ? (
            <Sun className="size-4" aria-hidden />
          ) : (
            <Moon className="size-4" aria-hidden />
          )}
        </Button>

        {/* P12: topbar avatar only when not shown in sidebar footer */}
        {!showAvatarInSidebar && <UserAvatarMenu variant="topbar" />}
      </div>
    </header>
  );
};
