/* ============================================================
 * Custom colorful SVG icon registry for chrome elements
 * (sidebar / navbar / brand). Lives at src/assets/chrome-icons.ts
 * alongside dashboard's own icons.ts.
 *
 * Each path is importable as a URL via Vite's `?url` suffix:
 *   import brandLogo from "@/assets/chrome-icons";
 *   <img src={ICONS.brandLogo} />
 * ============================================================ */

import brandLogo from "./icons/brand-logo.svg?url";
import navDashboard from "./icons/nav-dashboard.svg?url";
import navRegion from "./icons/nav-region.svg?url";
import navArea from "./icons/nav-area.svg?url";
import navCustomer from "./icons/nav-customer.svg?url";
import navOutlet from "./icons/nav-outlet.svg?url";
import navSkuCategory from "./icons/nav-sku-category.svg?url";
import navSku from "./icons/nav-sku.svg?url";
import navSalesOrder from "./icons/nav-sales-order.svg?url";
import navVisit from "./icons/nav-visit.svg?url";
import navProgram from "./icons/nav-program.svg?url";
import navEvent from "./icons/nav-event.svg?url";
import navUsers from "./icons/nav-users.svg?url";
import navRoles from "./icons/nav-roles.svg?url";
import navActivity from "./icons/nav-activity.svg?url";
import navNotifications from "./icons/nav-notifications.svg?url";
import iconSearch from "./icons/icon-search.svg?url";
import iconSearchTile from "./icons/icon-search-tile.svg?url";
import iconBell from "./icons/icon-bell.svg?url";
import iconMenu from "./icons/icon-menu.svg?url";
import iconSun from "./icons/icon-sun.svg?url";
import iconMoon from "./icons/icon-moon.svg?url";
import iconSettings from "./icons/icon-settings.svg?url";
import iconLogout from "./icons/icon-logout.svg?url";
import iconClock from "./icons/icon-clock.svg?url";

export const ICONS = {
  brandLogo,
  nav: {
    dashboard: navDashboard,
    region: navRegion,
    area: navArea,
    customer: navCustomer,
    outlet: navOutlet,
    skuCategory: navSkuCategory,
    sku: navSku,
    salesOrder: navSalesOrder,
    visit: navVisit,
    program: navProgram,
    event: navEvent,
    users: navUsers,
    roles: navRoles,
    activity: navActivity,
    notifications: navNotifications,
  },
  ui: {
    search: iconSearch,
    searchTile: iconSearchTile,
    bell: iconBell,
    menu: iconMenu,
    sun: iconSun,
    moon: iconMoon,
    settings: iconSettings,
    logout: iconLogout,
    clock: iconClock,
  },
} as const;

export type IconKey = keyof typeof ICONS.nav;
