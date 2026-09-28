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

/**
 * WCAG 2.2 target size (minimum) for compact chrome: a transparent
 * pseudo-element gives the control a 44px target without changing what it
 * looks like or how densely the row packs.
 *
 * `HIT_44` puts an exact 44×44 box on a 36px control (icon buttons, avatar).
 * `HIT_TALL_44` is 44px tall across the control's *own* width — for controls
 * that are already ≥44px wide but short (a select trigger, a search input),
 * where widening would claim space horizontally from the neighbour's target.
 *
 * Both size from the padding box rather than the border box, so the target is
 * the same 44px on a bordered and a borderless variant, and both need
 * `relative` — without it the pseudo resolves against the topbar, not the
 * control. Centring is an explicit `calc` offset, not `m-auto`: a 44px box in
 * a 34px padding box is over-constrained, and auto margins resolve to 0 there,
 * which silently anchors the box to the top-left corner instead of centring.
 * Deliberately square: a `rounded-full` pseudo clips its own hit area to a
 * circle, and a 44px circle is not a 44×44 target.
 */
const HIT_44 =
  "relative after:absolute after:left-1/2 after:top-1/2 after:size-11 after:-ml-[22px] after:-mt-[22px] after:content-['']";
const HIT_TALL_44 =
  "relative after:absolute after:-left-px after:-right-px after:top-1/2 after:h-11 after:-mt-[22px] after:content-['']";

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
  // `Page` used to be a bare word here, so `title` held a literal that is not a
  // message id: the `*` route renders English "Page" in the Bahasa breadcrumb,
  // the same defect as the missing `nav.Workspace`, one line down. It has to be
  // a real id — the gate cannot read `title` (a variable), so a literal would
  // be the one string here no gate can check and no catalog can translate.
  return walk(NAV_MENU) ?? { kicker: "Workspace", title: "nav.page_fallback" };
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
  // Both branches are literals on purpose. `findPageMeta` returns either a
  // ready `nav.*` section id (from NAV_MENU / ROUTE_META) or the bare
  // "Workspace" segment this component owns, so a `nav.${…}` template would be
  // strictly less correct — and it hid the id from the i18n gate, which is how
  // `nav.Workspace` shipped in neither locale.
  const kickerLabel = intl.formatMessage({
    id: meta.kicker.startsWith("nav.") ? meta.kicker : "nav.Workspace",
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
          className={cn(
            "relative size-9 shrink-0 rounded-full",
            // 44px touch target without growing the 36px circle.
            HIT_44,
          )}
        >
          <Menu className="size-4" aria-hidden />
        </Button>

        {/* The breadcrumb shares this row with five controls; below 560px it
            cannot hold both, and the PageHeader h1 directly under it already
            carries the page name at 20px bold. */}
        <div className="hidden min-w-0 leading-tight min-[560px]:block">
          <span
            className="block truncate text-[11px] font-semibold tracking-wide text-primary uppercase"
            data-breadcrumb-kicker=""
          >
            {kickerLabel}
          </span>
          <span className="block truncate font-heading text-sm font-semibold text-foreground sm:text-base">
            {titleLabel}
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* gap-2 (8px) is the floor: each control claims 4px per side for its
          44px hit area, so 8px keeps neighbouring targets from overlapping. */}
      <div className="flex items-center gap-2">
        {/* The clock is aria-hidden chrome that costs ~88px of the row. At
            tablet widths the cluster plus the clock leaves the breadcrumb
            collapsed to a single glyph, so the clock gives way first. */}
        <div
          className="hidden items-center gap-1.5 rounded-full border border-border bg-primary/6 px-2.5 py-1.5 text-xs font-medium text-primary tabular-nums lg:inline-flex"
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
            className={cn(
              "h-9 w-auto gap-1.5 rounded-full border-border bg-card px-2.5 shadow-none",
              // 28px tall, already ≥44px wide — grow the height only, so the
              // trigger never reaches into the bell beside it.
              HIT_TALL_44,
            )}
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
          className={cn(
            "relative size-9 rounded-full",
            // The unread Badge is already -top-0.5; the hit area is a separate
            // layer so the badge keeps its own offset.
            HIT_44,
          )}
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
            className={cn("size-9 rounded-full", HIT_44)}
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
          className={cn("size-9 rounded-full", HIT_44)}
        >
          {theme === "dark" ? (
            <Sun className="size-4" aria-hidden />
          ) : (
            <Moon className="size-4" aria-hidden />
          )}
        </Button>

        {/* P12: topbar avatar only when not shown in sidebar footer.
            The hit area rides on the trigger's own className — a wrapper's
            pseudo-element would swallow the click without reaching it. */}
        {!showAvatarInSidebar && (
          <UserAvatarMenu variant="topbar" className={HIT_44} />
        )}
      </div>
    </header>
  );
};
