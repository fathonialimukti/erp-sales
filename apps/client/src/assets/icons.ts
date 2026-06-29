/**
 * Custom colorful iOS-style icon assets.
 * SVG paths are versioned here so the dashboard can reference them
 * via `<img src={...} />` or as CSS backgrounds.
 *
 * Each icon is 64x64, uses a soft top-left gradient + white glyph
 * to mimic iOS app icons (rounded square with subtle highlight).
 */
import iconRevenue from "./icon-revenue.svg";
import iconOrders from "./icon-orders.svg";
import iconCustomers from "./icon-customers.svg";
import iconVisits from "./icon-visits.svg";
import iconNewOrder from "./icon-new-order.svg";
import iconNewVisit from "./icon-new-visit.svg";
import iconNewCustomer from "./icon-new-customer.svg";
import iconNewSku from "./icon-new-sku.svg";
import iconNewProgram from "./icon-new-program.svg";
import iconNewEvent from "./icon-new-event.svg";
import iconChart from "./icon-chart.svg";
import iconTrophy from "./icon-trophy.svg";
import iconActivity from "./icon-activity.svg";
import iconBolt from "./icon-bolt.svg";
import iconInbox from "./icon-inbox.svg";
import iconClock from "./icon-clock.svg";
import iconSparkle from "./icon-sparkle.svg";
import iconSearchGlass from "./icon-search-glass.svg";
import iconSearchTileColor from "./icon-search-tile-color.svg";
import iconSun from "./icon-sun.svg";
import iconChevron from "./icon-chevron.svg";
import iconArrowUp from "./icon-arrow-up.svg";
import iconArrowDown from "./icon-arrow-down.svg";

/* ── Shared action icons (used by ALL modules) ── */
import iconActionBack from "./icons/icon-action-back.svg";
import iconActionEdit from "./icons/icon-action-edit.svg";
import iconActionDelete from "./icons/icon-action-delete.svg";
import iconActionPlus from "./icons/icon-action-plus.svg";
import iconActionSearch from "./icons/icon-action-search.svg";
import iconActionCheck from "./icons/icon-action-check.svg";
import iconActionClose from "./icons/icon-action-close.svg";
import iconActionChevronRight from "./icons/icon-action-chevron-right.svg";
import iconActionChevronDown from "./icons/icon-action-chevron-down.svg";
import iconActionChevronLeft from "./icons/icon-action-chevron-left.svg";
import iconActionMenuDots from "./icons/icon-action-menu-dots.svg";
import iconActionEye from "./icons/icon-action-eye.svg";

/* ── Domain-specific icons ── */
import iconRegionMap from "./icons/icon-region-map.svg";
import iconRegionArea from "./icons/icon-region-area.svg";
import iconRegionBuilding from "./icons/icon-region-building.svg";
import iconAreaGrid from "./icons/icon-area-grid.svg";
import iconAreaOutlet from "./icons/icon-area-outlet.svg";
import iconAreaRegion from "./icons/icon-area-region.svg";
import iconCustomerUser from "./icons/icon-customer-user.svg";
import iconCustomerOutlet from "./icons/icon-customer-outlet.svg";
import iconCustomerContacts from "./icons/icon-customer-contacts.svg";
import iconCustomerCredit from "./icons/icon-customer-credit.svg";
import iconCustomerAddress from "./icons/icon-customer-address.svg";
import iconOutletStore from "./icons/icon-outlet-store.svg";
import iconOutletLocation from "./icons/icon-outlet-location.svg";
import iconOutletPhone from "./icons/icon-outlet-phone.svg";
import iconOutletContact from "./icons/icon-outlet-contact.svg";
import iconSkuCategoryTag from "./icons/icon-sku-category-tag.svg";
import iconSkuCategoryBox from "./icons/icon-sku-category-box.svg";
import iconSkuPackage from "./icons/icon-sku-package.svg";
import iconSkuPrice from "./icons/icon-sku-price.svg";
import iconVisitClipboard from "./icons/icon-visit-clipboard.svg";
import iconVisitClock from "./icons/icon-visit-clock.svg";
import iconVisitLocation from "./icons/icon-visit-location.svg";
import iconActivityClipboard from "./icons/icon-activity-clipboard.svg";
import iconActivityClock from "./icons/icon-activity-clock.svg";
import iconActivityUser from "./icons/icon-activity-user.svg";
import iconActionProgramDocument from "./icons/icon-action-program-document.svg";
import iconActionProgramCalendar from "./icons/icon-action-program-calendar.svg";
import iconActionProgramBudget from "./icons/icon-action-program-budget.svg";
import iconEventProposalDocument from "./icons/icon-event-proposal-document.svg";
import iconEventProposalCalendar from "./icons/icon-event-proposal-calendar.svg";
import iconEventProposalBudget from "./icons/icon-event-proposal-budget.svg";

export const icons = {
  revenue: iconRevenue,
  orders: iconOrders,
  customers: iconCustomers,
  visits: iconVisits,
  newOrder: iconNewOrder,
  newVisit: iconNewVisit,
  newCustomer: iconNewCustomer,
  newSku: iconNewSku,
  newProgram: iconNewProgram,
  newEvent: iconNewEvent,
  chart: iconChart,
  trophy: iconTrophy,
  activity: iconActivity,
  bolt: iconBolt,
  inbox: iconInbox,
  clock: iconClock,
  sparkle: iconSparkle,
  searchGlass: iconSearchGlass,
  searchTileColor: iconSearchTileColor,
  sun: iconSun,
  chevron: iconChevron,
  arrowUp: iconArrowUp,
  arrowDown: iconArrowDown,

  /* Shared action icons */
  actionBack: iconActionBack,
  actionEdit: iconActionEdit,
  actionDelete: iconActionDelete,
  actionPlus: iconActionPlus,
  actionSearch: iconActionSearch,
  actionCheck: iconActionCheck,
  actionClose: iconActionClose,
  actionChevronRight: iconActionChevronRight,
  actionChevronDown: iconActionChevronDown,
  actionChevronLeft: iconActionChevronLeft,
  actionMenuDots: iconActionMenuDots,
  actionEye: iconActionEye,

  /* Region domain */
  regionMap: iconRegionMap,
  regionArea: iconRegionArea,
  regionBuilding: iconRegionBuilding,

  /* Area domain */
  areaGrid: iconAreaGrid,
  areaOutlet: iconAreaOutlet,
  areaRegion: iconAreaRegion,

  /* Customer domain */
  customerUser: iconCustomerUser,
  customerOutlet: iconCustomerOutlet,
  customerContacts: iconCustomerContacts,
  customerCredit: iconCustomerCredit,
  customerAddress: iconCustomerAddress,

  /* Outlet domain */
  outletStore: iconOutletStore,
  outletLocation: iconOutletLocation,
  outletPhone: iconOutletPhone,
  outletContact: iconOutletContact,

  /* SKU Category domain */
  skuCategoryTag: iconSkuCategoryTag,
  skuCategoryBox: iconSkuCategoryBox,

  /* SKU domain */
  skuPackage: iconSkuPackage,
  skuPrice: iconSkuPrice,

  /* Visit Log domain */
  visitClipboard: iconVisitClipboard,
  visitClock: iconVisitClock,
  visitLocation: iconVisitLocation,

  /* Activity Log domain */
  activityClipboard: iconActivityClipboard,
  activityClock: iconActivityClock,
  activityUser: iconActivityUser,

  /* Action Program domain */
  actionProgramDocument: iconActionProgramDocument,
  actionProgramCalendar: iconActionProgramCalendar,
  actionProgramBudget: iconActionProgramBudget,

  /* Event Proposal domain */
  eventProposalDocument: iconEventProposalDocument,
  eventProposalCalendar: iconEventProposalCalendar,
  eventProposalBudget: iconEventProposalBudget,
} as const;

export type IconName = keyof typeof icons;
