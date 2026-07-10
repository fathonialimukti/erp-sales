/**
 * Single icon registry for the whole app.
 *
 * All SVGs live in ./icons and use category prefixes so the folder is
 * self-documenting:
 *   nav-*    sidebar / chrome navigation
 *   ui-*     generic chrome controls (search, bell, theme…)
 *   brand-*  app brand mark
 *   dash-*   colorful iOS-style dashboard + hero glyphs
 *   action-* shared CRUD / table actions (back, edit, delete…)
 *   <domain>-*  domain-specific glyphs (region-*, sku-*, …)
 *
 * Vite returns an asset URL string for every `import`, so no `?url` suffix
 * is needed. Consume via `icons.<key>` (typed by `IconName`).
 */

/* ── Brand ── */
import brandLogo from "./icons/brand-logo.svg";

/* ── Navigation (sidebar) ── */
import navDashboard from "./icons/chrome-nav-dashboard.svg";
import navRegion from "./icons/chrome-nav-region.svg";
import navArea from "./icons/chrome-nav-area.svg";
import navCustomer from "./icons/chrome-nav-customer.svg";
import navOutlet from "./icons/chrome-nav-outlet.svg";
import navSkuCategory from "./icons/chrome-nav-sku-category.svg";
import navSku from "./icons/chrome-nav-sku.svg";
import navSalesOrder from "./icons/chrome-nav-sales-order.svg";
import navVisit from "./icons/chrome-nav-visit.svg";
import navProgram from "./icons/chrome-nav-program.svg";
import navEvent from "./icons/chrome-nav-event.svg";
import navUsers from "./icons/chrome-nav-users.svg";
import navRoles from "./icons/chrome-nav-roles.svg";
import navActivity from "./icons/chrome-nav-activity.svg";
import navNotifications from "./icons/chrome-nav-notifications.svg";

/* ── UI controls ── */
import uiSearch from "./icons/ui-search.svg";
import uiSearchTile from "./icons/ui-search-tile.svg";
import uiBell from "./icons/ui-bell.svg";
import uiMenu from "./icons/ui-menu.svg";
import uiSun from "./icons/ui-sun.svg";
import uiMoon from "./icons/ui-moon.svg";
import uiClock from "./icons/ui-clock.svg";

/* ── Dashboard / hero (colorful iOS style) ── */
import dashOrders from "./icons/dash-orders.svg";
import dashCustomers from "./icons/dash-customers.svg";
import dashVisits from "./icons/dash-visits.svg";
import dashNewOrder from "./icons/dash-new-order.svg";
import dashNewVisit from "./icons/dash-new-visit.svg";
import dashNewCustomer from "./icons/dash-new-customer.svg";
import dashNewSku from "./icons/dash-new-sku.svg";
import dashNewProgram from "./icons/dash-new-program.svg";
import dashNewEvent from "./icons/dash-new-event.svg";
import dashChart from "./icons/dash-chart.svg";
import navReports from "./icons/dash-chart.svg";
import dashTrophy from "./icons/dash-trophy.svg";
import dashInbox from "./icons/dash-inbox.svg";
import dashSparkle from "./icons/dash-sparkle.svg";
import dashSun from "./icons/dash-sun.svg";
import dashClock from "./icons/dash-clock.svg";
import dashChevron from "./icons/dash-chevron.svg";
import dashArrowUp from "./icons/dash-arrow-up.svg";
import dashArrowDown from "./icons/dash-arrow-down.svg";
import dashSearchGlass from "./icons/dash-search-glass.svg";

/* ── Shared actions ── */
import actionBack from "./icons/action-back.svg";
import actionEdit from "./icons/action-edit.svg";
import actionDelete from "./icons/action-delete.svg";
import actionPlus from "./icons/action-plus.svg";
import actionSearch from "./icons/action-search.svg";
import actionCheck from "./icons/action-check.svg";
import actionClose from "./icons/action-close.svg";
import actionChevronRight from "./icons/action-chevron-right.svg";
import actionChevronDown from "./icons/action-chevron-down.svg";
import actionChevronLeft from "./icons/action-chevron-left.svg";
import actionMenuDots from "./icons/action-menu-dots.svg";
import actionEye from "./icons/action-eye.svg";

/* ── Domain glyphs ── */
import regionMap from "./icons/region-map.svg";
import regionArea from "./icons/region-area.svg";
import regionBuilding from "./icons/region-building.svg";
import areaGrid from "./icons/area-grid.svg";
import areaOutlet from "./icons/area-outlet.svg";
import areaRegion from "./icons/area-region.svg";
import customerUser from "./icons/customer-user.svg";
import customerOutlet from "./icons/customer-outlet.svg";
import customerContacts from "./icons/customer-contacts.svg";
import customerCredit from "./icons/customer-credit.svg";
import customerAddress from "./icons/customer-address.svg";
import outletStore from "./icons/outlet-store.svg";
import outletLocation from "./icons/outlet-location.svg";
import outletPhone from "./icons/outlet-phone.svg";
import outletContact from "./icons/outlet-contact.svg";
import skuCategoryTag from "./icons/sku-category-tag.svg";
import skuCategoryBox from "./icons/sku-category-box.svg";
import skuPackage from "./icons/sku-package.svg";
import skuPrice from "./icons/sku-price.svg";
import visitClipboard from "./icons/visit-clipboard.svg";
import visitClock from "./icons/visit-clock.svg";
import visitLocation from "./icons/visit-location.svg";
import activityClipboard from "./icons/activity-clipboard.svg";
import activityClock from "./icons/activity-clock.svg";
import activityUser from "./icons/activity-user.svg";
import actionProgramDocument from "./icons/action-program-document.svg";
import actionProgramCalendar from "./icons/action-program-calendar.svg";
import actionProgramBudget from "./icons/action-program-budget.svg";
import eventProposalDocument from "./icons/event-proposal-document.svg";
import eventProposalCalendar from "./icons/event-proposal-calendar.svg";
import eventProposalBudget from "./icons/event-proposal-budget.svg";

export const icons = {
  /* Brand */
  brandLogo,

  /* Navigation */
  navDashboard,
  navRegion,
  navArea,
  navCustomer,
  navOutlet,
  navSkuCategory,
  navSku,
  navSalesOrder,
  navVisit,
  navProgram,
  navEvent,
  navUsers,
  navRoles,
  navActivity,
  navNotifications,

  /* UI controls */
  uiSearch,
  uiSearchTile,
  uiBell,
  uiMenu,
  uiSun,
  uiMoon,
  uiClock,

  /* Dashboard / hero */
  dashOrders,
  dashCustomers,
  dashVisits,
  dashNewOrder,
  dashNewVisit,
  dashNewCustomer,
  dashNewSku,
  dashNewProgram,
  dashNewEvent,
  dashChart,
  navReports,
  dashTrophy,
  dashInbox,
  dashSparkle,
  dashSun,
  dashClock,
  dashChevron,
  dashArrowUp,
  dashArrowDown,
  dashSearchGlass,

  /* Shared actions */
  actionBack,
  actionEdit,
  actionDelete,
  actionPlus,
  actionSearch,
  actionCheck,
  actionClose,
  actionChevronRight,
  actionChevronDown,
  actionChevronLeft,
  actionMenuDots,
  actionEye,

  /* Region */
  regionMap,
  regionArea,
  regionBuilding,

  /* Area */
  areaGrid,
  areaOutlet,
  areaRegion,

  /* Customer */
  customerUser,
  customerOutlet,
  customerContacts,
  customerCredit,
  customerAddress,

  /* Outlet */
  outletStore,
  outletLocation,
  outletPhone,
  outletContact,

  /* SKU Category */
  skuCategoryTag,
  skuCategoryBox,

  /* SKU */
  skuPackage,
  skuPrice,

  /* Visit Log */
  visitClipboard,
  visitClock,
  visitLocation,

  /* Activity Log */
  activityClipboard,
  activityClock,
  activityUser,

  /* Action Program */
  actionProgramDocument,
  actionProgramCalendar,
  actionProgramBudget,

  /* Event Proposal */
  eventProposalDocument,
  eventProposalCalendar,
  eventProposalBudget,
} as const;

export type IconName = keyof typeof icons;
