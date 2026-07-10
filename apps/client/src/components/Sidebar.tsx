import { useLocation, useNavigate } from "react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useIntl } from "react-intl";
import { useMemo, useState, useCallback, useRef } from "react";
import { icons } from "../assets/icons";
import { Avatar } from "../ui";
import {
  authUserAtom,
  hasPermissionAtom,
  searchOpenAtom,
  sidebarOpenAtom,
} from "../lib/atoms";
import { UserMenuTrigger } from "./UserMenuPopover";
import { NAV_MENU, type NavMenuItem } from "../constants/nav-menu";
import "./Sidebar.css";

interface NavLeaf {
  name: string;
  href: string;
  icon?: string;
  permission?: string | string[];
}

interface NavSection {
  id: string;
  name: string;
  items: NavLeaf[];
}

const normalizePath = (path: string) =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

const isPathActive = (current: string, target: string) => {
  const c = normalizePath(current);
  const t = normalizePath(target);
  if (t === "/") return c === "/";
  return c === t || c.startsWith(`${t}/`);
};

const flattenLeaves = (items: NavMenuItem[]): NavLeaf[] => {
  const leaves: NavLeaf[] = [];
  for (const item of items) {
    if (item.href) {
      leaves.push({
        name: item.name,
        href: item.href,
        icon: item.icon,
        permission: item.permission,
      });
    }
    if (item.children?.length) {
      leaves.push(...flattenLeaves(item.children));
    }
  }
  return leaves;
};

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const intl = useIntl();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const user = useAtomValue(authUserAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const setSearchOpen = useSetAtom(searchOpenAtom);

  // Tooltip portal state — renders outside nav overflow
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((label: string, el: HTMLElement) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    const rect = el.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  }, []);

  const hideTooltip = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltip(null), 80);
  }, []);

  const isCollapsed = !sidebarOpen;

  const sections = useMemo<NavSection[]>(() => {
    const visible = flattenLeaves(NAV_MENU).filter(
      (l) => !l.permission || hasPermission(l.permission),
    );
    return [
      {
        id: "favorites",
        name: intl.formatMessage({ id: "nav.section.favorites", defaultMessage: "Favorites" }),
        items: visible.filter((l) => ["/dashboard", "/sales-order", "/invoice", "/visit-log"].includes(l.href)),
      },
      {
        id: "master_data",
        name: intl.formatMessage({ id: "nav.section.master_data", defaultMessage: "Master Data" }),
        items: visible.filter((l) =>
          ["/region", "/area", "/customer", "/outlet", "/sku-category", "/sku"].includes(l.href),
        ),
      },
      {
        id: "programs",
        name: intl.formatMessage({ id: "nav.section.programs", defaultMessage: "Programs" }),
        items: visible.filter((l) => ["/action-program", "/event-proposal"].includes(l.href)),
      },
      {
        id: "admin",
        name: intl.formatMessage({ id: "nav.section.admin", defaultMessage: "Administration" }),
        items: visible.filter((l) =>
          ["/users", "/access-control", "/activity-logs", "/notifications"].includes(l.href),
        ),
      },
    ].filter((s) => s.items.length > 0);
  }, [hasPermission, intl]);

  const renderItem = (item: NavLeaf) => {
    const active = isPathActive(location.pathname, item.href);
    const label = intl.formatMessage({ id: item.name, defaultMessage: item.name });
    return (
      <button
        type="button"
        key={item.href}
        className={`ios-sb__row ${active ? "ios-sb__row--active" : ""}`}
        onClick={() => navigate(item.href)}
        aria-current={active ? "page" : undefined}
        data-tooltip={label}
        onMouseEnter={(e) => isCollapsed && showTooltip(label, e.currentTarget)}
        onMouseLeave={isCollapsed ? hideTooltip : undefined}
        onFocus={(e) => isCollapsed && showTooltip(label, e.currentTarget)}
        onBlur={isCollapsed ? hideTooltip : undefined}
      >
        <span className="ios-sb__row-icon" aria-hidden="true">
          {item.icon ? <img src={item.icon} alt="" /> : null}
        </span>
        <span className="ios-sb__row-label">{label}</span>
        <span className="ios-sb__row-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
    );
  };

  return (
    <aside
      className={`ios-sb ${sidebarOpen ? "" : "ios-sb--collapsed"}`}
      aria-label="Sidebar"
    >
      {/* SECTION 1 — Header: app brand + search */}
      <header className="ios-sb__header">
        <div className="ios-sb__brand">
          <img src={icons.brandLogo} alt="" className="ios-sb__brand-logo" />
          <div className="ios-sb__brand-text">
            <span className="ios-sb__brand-title">
              {intl.formatMessage({ id: "nav.erp_sales", defaultMessage: "CRM" })}
            </span>
            <span className="ios-sb__brand-sub">
              {intl.formatMessage({ id: "nav.brand_sub", defaultMessage: "Sales OS" })}
            </span>
          </div>
        </div>

        <div className="ios-sb__search">
          {/* Full search trigger (expanded) */}
          <button
            type="button"
            className="ios-sb__search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label={intl.formatMessage({
              id: "nav.search.open",
              defaultMessage: "Open search",
            })}
          >
            <span className="ios-sb__search-icon-tile" aria-hidden="true">
              <img src={icons.uiSearchTile} alt="" />
            </span>
            <span className="ios-sb__search-text">
              <span className="ios-sb__search-label">
                {intl.formatMessage({
                  id: "nav.search.label",
                  defaultMessage: "Search",
                })}
              </span>
              <span className="ios-sb__search-hint">
                {intl.formatMessage({
                  id: "nav.search.hint",
                  defaultMessage: "pages, customers, SKUs…",
                })}
              </span>
            </span>
            <span className="ios-sb__search-kbd" aria-hidden="true">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
            <span className="ios-sb__search-shine" aria-hidden="true" />
          </button>
          {/* Compact search trigger (collapsed) */}
          <button
            type="button"
            className="ios-sb__search-compact"
            onClick={() => setSearchOpen(true)}
            aria-label={intl.formatMessage({
              id: "nav.search.open",
              defaultMessage: "Open search",
            })}
            title={intl.formatMessage({ id: "nav.search.label", defaultMessage: "Search" })}
          >
            <span className="ios-sb__search-compact-icon" aria-hidden="true">
              <img src={icons.uiSearchTile} alt="" />
            </span>
          </button>
        </div>
      </header>

      {/* SECTION 2 — Scrollable nav menu */}
      <nav className="ios-sb__nav" aria-label="Primary">
        <div className="ios-sb__nav-scroll">
          {sections.map((section) => (
            <section key={section.id} className="ios-sb__group" aria-labelledby={`ios-sb-group-${section.id}`}>
              <header className="ios-sb__group-header" id={`ios-sb-group-${section.id}`}>
                <span>{section.name}</span>
                <span className="ios-sb__group-count">{section.items.length}</span>
              </header>
              <div className="ios-sb__group-card">{section.items.map(renderItem)}</div>
            </section>
          ))}
        </div>
      </nav>

      {/* SECTION 3 — Profile / user footer */}
      {user && (
        <footer className="ios-sb__footer">
          <UserMenuTrigger
            className="ios-sb__user"
            aria-label={user.name}
          >
            <Avatar name={user.name} size="md" />
            <div className="ios-sb__user-text">
              <span className="ios-sb__user-name">{user.name}</span>
              <span className="ios-sb__user-role">{user.roleName}</span>
            </div>
          </UserMenuTrigger>
        </footer>
      )}

      {/* Compact user avatar (collapsed) — opens the same UserMenuPopover */}
      {user && (
        <UserMenuTrigger
          className="ios-sb__user-compact"
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

      {/* Tooltip portal — renders as direct child of <aside> to escape nav overflow */}
      {tooltip && isCollapsed && (
        <div
          className="ios-sb__tooltip-portal"
          style={{ top: tooltip.top }}
        >
          {tooltip.label}
        </div>
      )}

      <button
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="ios-sb__collapse-hidden"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </aside>
  );
};
