import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useIntl } from "react-intl";
import { Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { icons } from "@/assets/icons";
import { BrandMark } from "@/components/BrandMark";
import { NavModuleTile } from "@/components/NavModuleTile";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  hasPermissionAtom,
  searchOpenAtom,
  sidebarOpenAtom,
} from "@/lib/atoms";
import { fadeIn, getMotionProps } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ModuleKey } from "@/types/module";
import { NAV_MENU, type NavMenuItem } from "@/constants/nav-menu";

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

/** href → Bold CRM module accent for active wash (P2 / NavModuleTile). */
const HREF_MODULE: Record<string, ModuleKey> = {
  "/customer": "customer",
  "/outlet": "outlet",
  "/sales-order": "order",
  "/visit-log": "visit",
  "/sku": "sku",
  "/sku-category": "sku",
  "/action-program": "planning",
  "/event-proposal": "event",
  "/budget": "budget",
  "/budget-type": "budgetType",
  "/budget-period": "budgetPeriod",
  "/budget-line": "budgetLine",
  "/action-type": "actionType",
  "/event-type": "eventType",
  "/vendor": "vendor",
  "/users": "user",
  "/access-control": "user",
  "/activity-logs": "user",
  "/backups": "settings",
  "/notifications": "user",
  "/reports": "report",
  "/email-crm": "email",
  "/knowledge-base": "knowledge",
  "/ai-admin": "ai",
  // geo master data — module tokens + PageHeader MODULE_ICON exist for these keys
  "/region": "region",
  "/area": "area",
  "/settings": "settings",
  "/settings/app-settings": "settings",
};

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const intl = useIntl();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const setSearchOpen = useSetAtom(searchOpenAtom);
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  const reducedMotion = useReducedMotion();

  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(
    null,
  );
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCollapsed = !sidebarOpen;
  // Always keep the avatar in the desktop sidebar (compact when collapsed).
  const showAvatarInSidebar = isLgUp;

  const showTooltip = useCallback((label: string, el: HTMLElement) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    const rect = el.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  }, []);

  const hideTooltip = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltip(null), 80);
  }, []);

  const sections = useMemo<NavSection[]>(() => {
    const visible = flattenLeaves(NAV_MENU).filter(
      (l) => !l.permission || hasPermission(l.permission),
    );
    return [
      {
        id: "main",
        name: intl.formatMessage({
          id: "nav.section.main",
          defaultMessage: "Workspace",
        }),
        items: visible.filter((l) =>
          [
            "/dashboard",
            "/reports",
            "/sales-order",
            "/email-crm",
            "/visit-log",
          ].includes(l.href),
        ),
      },
      {
        id: "master_data",
        name: intl.formatMessage({
          id: "nav.section.master_data",
          defaultMessage: "Master Data",
        }),
        items: visible.filter((l) =>
          [
            "/region",
            "/area",
            "/customer",
            "/outlet",
            "/vendor",
            "/sku-category",
            "/sku",
          ].includes(l.href),
        ),
      },
      {
        id: "programs",
        name: intl.formatMessage({
          id: "nav.section.programs",
          defaultMessage: "Programs",
        }),
        items: visible.filter((l) =>
          ["/action-program", "/action-type", "/event-proposal", "/event-type"].includes(
            l.href,
          ),
        ),
      },
      {
        id: "budgeting",
        name: intl.formatMessage({
          id: "nav.section.budgeting",
          defaultMessage: "Budgeting",
        }),
        items: visible.filter((l) =>
          ["/budget", "/budget-line", "/budget-type", "/budget-period"].includes(l.href),
        ),
      },
      {
        id: "ai_tools",
        name: intl.formatMessage({
          id: "nav.section.ai_tools",
          defaultMessage: "AI & Knowledge",
        }),
        items: visible.filter((l) => ["/ai-admin", "/knowledge-base"].includes(l.href)),
      },
      {
        id: "admin",
        name: intl.formatMessage({
          id: "nav.section.admin",
          defaultMessage: "Administration",
        }),
        items: visible.filter((l) =>
          [
            "/users",
            "/access-control",
            "/activity-logs",
            "/backups",
            "/notifications",
            "/settings/app-settings",
          ].includes(l.href),
        ),
      },
    ].filter((s) => s.items.length > 0);
  }, [hasPermission, intl]);

  const searchLabel = intl.formatMessage({
    id: "nav.search.label",
    defaultMessage: "Search",
  });
  const searchOpenLabel = intl.formatMessage({
    id: "nav.search.open",
    defaultMessage: "Open search",
  });

  return (
    <motion.aside
      aria-label="Sidebar"
      data-collapsed={isCollapsed || undefined}
      variants={fadeIn}
      {...getMotionProps(reducedMotion)}
      className={cn(
        // z-40: above sticky topbar (z-30), below dialog/sheet overlays (z-50)
        "fixed top-3 bottom-3 left-3 z-40 flex flex-col overflow-visible",
        "rounded-2xl border border-border bg-sidebar shadow-sm",
        "transition-[width] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        "motion-reduce:transition-none",
        isCollapsed ? "w-20" : "w-68",
      )}
    >
      {/* Header — brand + search */}
      <header
        className={cn(
          "flex shrink-0 flex-col gap-3 border-b border-border",
          isCollapsed ? "items-center px-2.5 py-4" : "px-3.5 py-4",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center",
          )}
        >
          <BrandMark
            className={isCollapsed ? "size-10" : "size-9"}
          />
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <span className="block truncate font-heading text-sm font-semibold text-foreground">
                {intl.formatMessage({
                  id: "nav.erp_sales",
                  defaultMessage: "CRM",
                })}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {intl.formatMessage({
                  id: "nav.brand_sub",
                  defaultMessage: "Sales OS",
                })}
              </span>
            </div>
          )}
        </div>

        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={searchOpenLabel}
            title={searchLabel}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-primary/10 text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring"
            onMouseEnter={(e) => showTooltip(searchLabel, e.currentTarget)}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(searchLabel, e.currentTarget)}
            onBlur={hideTooltip}
          >
            <Search className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={searchOpenLabel}
            className="group relative flex w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl border border-border bg-primary/6 px-2.5 py-2 text-left outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Search className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {searchLabel}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {intl.formatMessage({
                  id: "nav.search.hint",
                  defaultMessage: "pages, customers, SKUs…",
                })}
              </span>
            </span>
            <span
              className="hidden shrink-0 items-center gap-0.5 sm:inline-flex"
              aria-hidden
            >
              <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘
              </kbd>
              <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                K
              </kbd>
            </span>
          </button>
        )}
      </header>

      {/* Nav */}
      <nav
        aria-label="Primary"
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3"
      >
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section
              key={section.id}
              aria-labelledby={`aurora-sb-group-${section.id}`}
              className="flex flex-col gap-1.5"
            >
              {!isCollapsed && (
                <header
                  id={`aurora-sb-group-${section.id}`}
                  className="flex items-center justify-between px-2"
                >
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    {section.name}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {section.items.length}
                  </span>
                </header>
              )}
              <div
                className={cn(
                  "flex flex-col gap-0.5",
                  !isCollapsed &&
                    "rounded-xl border border-border bg-primary/3 p-1",
                )}
              >
                {section.items.map((item) => {
                  const label = intl.formatMessage({
                    id: item.name,
                    defaultMessage: item.name,
                  });
                  const active = isPathActive(location.pathname, item.href);
                  return (
                    <NavModuleTile
                      key={item.href}
                      label={label}
                      icon={item.icon}
                      active={active}
                      collapsed={isCollapsed}
                      module={HREF_MODULE[item.href]}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={
                        isCollapsed
                          ? (el) => showTooltip(label, el)
                          : undefined
                      }
                      onMouseLeave={isCollapsed ? hideTooltip : undefined}
                      onFocus={
                        isCollapsed
                          ? (el) => showTooltip(label, el)
                          : undefined
                      }
                      onBlur={isCollapsed ? hideTooltip : undefined}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      {/* Footer — avatar stays visible when collapsed (icon-only chrome) */}
      {showAvatarInSidebar && (
        <footer
          className={cn(
            "shrink-0 border-t border-border",
            isCollapsed ? "flex justify-center p-2" : "p-2.5",
          )}
        >
          <UserAvatarMenu variant="sidebar" compact={isCollapsed} />
        </footer>
      )}

      {/* Collapsed tooltip portal (escapes nav overflow) */}
      {tooltip && isCollapsed && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-40 -translate-y-1/2 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-md"
          style={{ top: tooltip.top, left: 92 }}
        >
          {tooltip.label}
        </div>
      )}

      {/* Hidden collapse control kept for any external hooks / a11y parity */}
      <button
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </motion.aside>
  );
};
