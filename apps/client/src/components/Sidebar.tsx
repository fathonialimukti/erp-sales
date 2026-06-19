import { useLocation, useNavigate } from "react-router";
import { useAtomValue } from "jotai";
import { Icon } from "../ui";
import { useIntl } from "react-intl";
import type { ReactNode } from "react";
import { hasPermissionAtom } from "../lib/atoms";
import { NAV_MENU, type NavMenuItem } from "../constants/nav-menu";
import { Button } from "../ui/Button";
import "./Sidebar.css";

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
    return <img src={icon} alt="" className="sidebar-item__icon" aria-hidden="true" />;
  }
  return <Icon icon={icon} />;
};

const filterByPermission = (
  items: NavMenuItem[],
  hasPermission: (p: string | string[]) => boolean,
): NavMenuItem[] => {
  return (
    items
      .map((item) => {
        const children = item.children ? filterByPermission(item.children, hasPermission) : undefined;
        const visibleChildren = children?.length ? children : undefined;
        const itemAllowed = !item.permission || hasPermission(item.permission);
        if (!itemAllowed && !visibleChildren) return null;
        return { ...item, children: visibleChildren };
      }) as (NavMenuItem | null)[]
  ).filter((item): item is NavMenuItem => item !== null);
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
          className="sidebar-item"
        >
          {renderIcon(item.icon || "solar:question-circle-linear")}
          <span className="sidebar-item__label">{intl.formatMessage({ id: item.name, defaultMessage: item.name })}</span>
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
      >
        {intl.formatMessage({ id: item.name, defaultMessage: item.name })}
      </Button>
    );
  };

  const renderItem = (item: NavMenuItem, parentKey: string): ReactNode => {
    const key = `${parentKey}/${item.name}`;
    if (item.children?.length) {
      return (
        <details key={key} className="sidebar-group">
          <summary className="sidebar-group__summary">
            {renderIcon(item.icon || "solar:question-circle-linear")}
            <span className="sidebar-item__label">
              {intl.formatMessage({ id: item.name, defaultMessage: item.name })}
            </span>
            <Icon
              icon="solar:alt-arrow-down-linear"
              className="sidebar-group__arrow"
            />
          </summary>
          <div className="sidebar-group__children">
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
          className="sidebar-overlay"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar-panel ${isOpen ? '' : 'sidebar-panel--closed'}`}
        aria-hidden={!isOpen}
      >
        <div className="sidebar-header">
          <span className="sidebar-header__title">
            {menuHeading}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <Icon icon="solar:close-circle-linear" />
          </Button>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map((item) => renderItem(item, "root"))}
        </nav>
      </aside>
    </>
  );
};
