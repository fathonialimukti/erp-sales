import type { PlateName } from "../assets/plates";

export interface NavMenuItem {
  name: string;
  icon?: PlateName;
  href?: string;
  permission?: string | string[];
  children?: NavMenuItem[];
}

export const NAV_MENU: NavMenuItem[] = [
  {
    name: "nav.dashboard",
    icon: "navDashboard",
    href: "/dashboard",
  },
  {
    name: "nav.reports",
    icon: "navReports",
    href: "/reports",
    permission: "report@read",
  },
  {
    name: "nav.master_data",
    icon: "navRegion",
    children: [
      {
        name: "nav.region",
        icon: "navRegion",
        href: "/region",
        permission: "region@read",
      },
      {
        name: "nav.area",
        icon: "navArea",
        href: "/area",
        permission: "area@read",
      },
      {
        name: "nav.customer",
        icon: "navCustomer",
        href: "/customer",
        permission: "customer@read",
      },
      {
        name: "nav.outlet",
        icon: "navOutlet",
        href: "/outlet",
        permission: "outlet@read",
      },
      {
        name: "nav.sku_category",
        icon: "navSkuCategory",
        href: "/sku-category",
        permission: "skuCategory@read",
      },
      {
        name: "nav.sku",
        icon: "navSku",
        href: "/sku",
        permission: "sku@read",
      },
    ],
  },
  {
    name: "nav.sales",
    icon: "navSalesOrder",
    children: [
      {
        name: "nav.sales_order",
        icon: "navSalesOrder",
        href: "/sales-order",
        permission: "sales-order@read",
      },
      {
        name: "nav.email_crm",
        icon: "navEmailCrm",
        href: "/email-crm",
        permission: "email-crm@read",
      },
    ],
  },
  {
    name: "nav.field_ops",
    icon: "navVisit",
    children: [
      {
        name: "nav.visit_log",
        icon: "navVisit",
        href: "/visit-log",
        permission: "visit-log@read",
      },
    ],
  },
  {
    name: "nav.programs",
    icon: "navPlanning",
    children: [
      {
        name: "nav.action_program",
        icon: "navPlanning",
        href: "/action-program",
        permission: "action-program@read",
      },
      {
        name: "nav.event_proposal",
        icon: "navEvent",
        href: "/event-proposal",
        permission: "event-proposal@read",
      },
    ],
  },
  {
    name: "nav.budgeting",
    icon: "navBudget",
    children: [
      {
        name: "nav.budget",
        icon: "navBudget",
        href: "/budget",
        permission: "budget-line@read",
      },
      {
        name: "nav.budget_type",
        icon: "navBudgetType",
        href: "/budget-type",
        permission: "budget-type@read",
      },
      {
        name: "nav.budget_period",
        icon: "navBudgetPeriod",
        href: "/budget-period",
        permission: "budget-period@read",
      },
      {
        name: "nav.budget_line",
        icon: "navBudgetLine",
        href: "/budget-line",
        permission: "budget-line@read",
      },
      {
        name: "nav.action_type",
        icon: "navActionType",
        href: "/action-type",
        permission: "action-type@read",
      },
      {
        name: "nav.event_type",
        icon: "navEventType",
        href: "/event-type",
        permission: "event-type@read",
      },
      {
        name: "nav.vendor",
        icon: "navVendor",
        href: "/vendor",
        permission: "vendor@read",
      },
    ],
  },
  {
    name: "nav.system",
    icon: "navUsers",
    children: [
      {
        name: "nav.users",
        icon: "navUsers",
        href: "/users",
        permission: "user@read",
      },
      {
        name: "nav.access_control",
        icon: "navRoles",
        href: "/access-control",
        permission: "role@read",
      },
      {
        name: "nav.activity_logs",
        icon: "navActivity",
        href: "/activity-logs",
        permission: "activity_log@read",
      },
      {
        name: "nav.system_logs",
        icon: "navLogs",
        href: "/system-logs",
        permission: "log@read",
      },
      {
        name: "backup.title",
        icon: "navLogs",
        href: "/backups",
        permission: "backup@read",
      },
      {
        name: "nav.notifications_admin",
        icon: "navNotifications",
        href: "/notifications",
        permission: "notification@read",
      },
      {
        name: "nav.knowledge_base",
        icon: "navKnowledge",
        href: "/knowledge-base",
        permission: "knowledge-base@read",
      },
    ],
  },
  {
    name: "nav.ai_admin",
    icon: "navAi",
    href: "/ai-admin",
    permission: "ai-admin@access",
  },
];

/**
 * Breadcrumb/title metadata for routes that are reachable from the UI but
 * intentionally absent from the sidebar (e.g. the user-modal destinations).
 * Topbar reads this so those pages never fall back to a generic "Page" title.
 *
 * `kicker` is a `nav.*` message id (Topbar prefixes raw strings with `nav.`);
 * `title` is any message id resolved directly by `intl.formatMessage`.
 */
export const ROUTE_META: Record<string, { kicker: string; title: string }> = {
  "/setting": { kicker: "nav.section.settings", title: "settings.user.title" },
  "/settings": { kicker: "nav.section.settings", title: "settings.app.title" },
  "/application-logs": {
    kicker: "nav.administration",
    title: "applicationLog.index.title",
  },
};
