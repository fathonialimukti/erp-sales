import { useLocation } from "react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useIntl } from "react-intl";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ICONS } from "../assets/chrome-icons";
import {
  authUserAtom,
  notificationsOpenAtom,
  sidebarOpenAtom,
  themeModeAtom,
} from "../lib/atoms";
import { useLocale } from "../lib/useLocale";
import { localeSymbols, supportedLocales } from "../lib/locale";
import { UserMenuTrigger } from "./UserMenuPopover";
import { NAV_MENU, type NavMenuItem } from "../constants/nav-menu";
import { trpcClient } from "../lib/trpc";
import "./Topbar.css";

const findPageMeta = (
  pathname: string,
): { kicker: string; title: string } => {
  const norm = (p: string) =>
    p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  const cur = norm(pathname);

  const walk = (items: NavMenuItem[]): { kicker: string; title: string } | null => {
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

  if (cur === "/dashboard") return { kicker: "Workspace", title: "nav.dashboard" };
  return walk(NAV_MENU) ?? { kicker: "Workspace", title: "Page" };
};

export const Topbar = () => {
  const location = useLocation();
  const intl = useIntl();
  const [theme, setTheme] = useAtom(themeModeAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const [notifsOpen, setNotifsOpen] = useAtom(notificationsOpenAtom);
  const { locale, setLocale } = useLocale();
  const user = useAtomValue(authUserAtom);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const meta = useMemo(() => findPageMeta(location.pathname), [location.pathname]);
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

  const time = now.toLocaleTimeString(intl.locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const toggleSidebar = () => setSidebarOpen((prev: boolean) => !prev);
  const toggleTheme = () =>
    setTheme((prev: "light" | "dark") => (prev === "dark" ? "light" : "dark"));

  return (
    <header className="ios-tb" role="banner">
      <div className="ios-tb__left">
        <button
          type="button"
          className="ios-tb__menu-btn"
          onClick={toggleSidebar}
          aria-label={intl.formatMessage({
            id: "nav.toggle_sidebar",
            defaultMessage: "Toggle sidebar",
          })}
        >
          <img src={ICONS.ui.menu} alt="" />
        </button>
        <div className="ios-tb__title">
          <span className="ios-tb__title-kicker">{kickerLabel}</span>
          <span className="ios-tb__title-main">{titleLabel}</span>
        </div>
      </div>

      <div className="ios-tb__center" />

      <div className="ios-tb__right">
        <div
          className="ios-tb__chip ios-tb__chip--static"
          aria-hidden="true"
          title={intl.formatMessage({ id: "common.time", defaultMessage: "Local time" })}
        >
          <img src={ICONS.ui.clock} alt="" className="ios-tb__chip-icon" />
          <span className="ios-tb__chip-text">{time}</span>
        </div>

        <div className="ios-tb__select-wrap">
          <select
            className="ios-tb__select"
            aria-label={intl.formatMessage({ id: "nav.language", defaultMessage: "Language" })}
            value={locale}
            onChange={(e) => setLocale(e.target.value as (typeof supportedLocales)[number])}
          >
            {supportedLocales.map((code) => (
              <option key={code} value={code}>
                {localeSymbols[code]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`ios-tb__icon-btn ${notifsOpen ? "ios-tb__icon-btn--active" : ""}`}
          aria-label={intl.formatMessage({
            id: "nav.notifications",
            defaultMessage: "Notifications",
          })}
          aria-expanded={notifsOpen}
          onClick={() => setNotifsOpen((prev) => !prev)}
        >
          <img src={ICONS.ui.bell} alt="" />
          {unreadCount > 0 && <span className="ios-tb__icon-dot" aria-hidden="true" />}
        </button>

        <button
          type="button"
          className={`ios-tb__icon-btn ${theme === "dark" ? "ios-tb__icon-btn--active" : ""}`}
          aria-label={intl.formatMessage({ id: "nav.theme", defaultMessage: "Theme" })}
          onClick={toggleTheme}
        >
          <img src={theme === "dark" ? ICONS.ui.sun : ICONS.ui.moon} alt="" />
        </button>

        {user && (
          <UserMenuTrigger
            className="ios-tb__avatar"
            aria-label={user.name}
          >
            <span aria-hidden="true">
              {user.name
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase() ?? "")
                .join("")}
            </span>
          </UserMenuTrigger>
        )}
      </div>
    </header>
  );
};
