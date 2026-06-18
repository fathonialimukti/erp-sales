import { useLocation, useNavigate } from "react-router";
import { useAtomValue } from "jotai";
import { Icon } from "../ui";
import { useIntl } from "react-intl";
import type { ReactNode } from "react";
import { hasPermissionAtom } from "../lib/atoms";
import { NAV_MENU, type NavMenuItem } from "../constants/nav-menu";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalizePath = (path: string) =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

const isPathActive = (current: string, target: string) => {
  const c = normalizePath(current);
  const t = normalizePath(target);
  if (t === "/") return c === "/";
  return c === t || c.startsWith(`${t}/`);
};

const renderIcon = (icon: string) => {
  const isLocalAsset =
    /^(\/|https?:\/\/)/.test(icon) || /\.(svg|png|jpe?g|webp|gif)$/i.test(icon);
  if (isLocalAsset) {
    return <img src={icon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />;
  }
  return <Icon icon={icon} className="h-4 w-4" />;
};

const filterByPermission = (
  items: NavMenuItem[],
  hasPermission: (p: string | string[]) => boolean,
): NavMenuItem[] => {
  return items
    .map((item) => {
      const children = item.children ? filterByPermission(item.children, hasPermission) : undefined;
      const visibleChildren = children?.length ? children : undefined;
      const itemAllowed = !item.permission || hasPermission(item.permission);
      if (!itemAllowed && !visibleChildren) return undefined;
      return { ...item, children: visibleChildren };
    })
    .filter((item): item is NavMenuItem => item !== undefined);
};

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const intl = useIntl();
  const hasPermission = useAtomValue(hasPermissionAtom);

  const visibleItems = filterByPermission(NAV_MENU, hasPermission);
  const menuHeading = intl.formatMessage({ id: "nav.menu", defaultMessage: "Menu" });

  const renderLeaf = (item: NavMenuItem, key: string) => {
    if (!item.href) {
      return (
        <div
          key={key}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {renderIcon(item.icon || "solar:question-circle-linear")}
          <span>{intl.formatMessage({ id: item.name, defaultMessage: item.name })}</span>
        </div>
      );
    }
    const active = isPathActive(location.pathname, item.href);
    return (
      <Button
        key={key}
        variant={active ? "primary" : "ghost"}
        fullWidth
        onClick={() => {
          navigate(item.href!);
          onClose();
        }}
        leftIcon={renderIcon(item.icon || "solar:question-circle-linear")}
        className="justify-start"
      >
        {intl.formatMessage({ id: item.name, defaultMessage: item.name })}
      </Button>
    );
  };

  const renderItem = (item: NavMenuItem, parentKey: string): ReactNode => {
    const key = `${parentKey}/${item.name}`;
    if (item.children?.length) {
      return (
        <details key={key} className="group">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 [&::-webkit-details-marker]:hidden",
              "dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            {renderIcon(item.icon || "solar:question-circle-linear")}
            <span className="flex-1">
              {intl.formatMessage({ id: item.name, defaultMessage: item.name })}
            </span>
            <Icon
              icon="solar:alt-arrow-down-linear"
              className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-1 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">
            {item.children.map((child) => renderItem(child, key))}
          </div>
        </details>
      );
    }
    return renderLeaf(item, key);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-72 transform border-r border-slate-200 bg-surface-1 transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 dark:border-slate-800",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          !isOpen && "lg:hidden",
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {menuHeading}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close sidebar"
              onClick={onClose}
              className="lg:hidden"
            >
              <Icon icon="solar:close-circle-linear" className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {visibleItems.map((item) => renderItem(item, "root"))}
          </nav>
        </div>
      </aside>
    </>
  );
};
