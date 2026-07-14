import { icons } from "../assets/icons";

export interface NavMenuItem {
  name: string;
  icon?: string;
  href?: string;
  permission?: string | string[];
  children?: NavMenuItem[];
}

export const NAV_MENU: NavMenuItem[] = [
  {
    name: "nav.dashboard",
    icon: icons.navDashboard,
    href: "/dashboard",
  },
  {
    name: "nav.reports",
    icon: icons.navReports,
    href: "/reports",
    permission: "report@read",
  },
  {
    name: "nav.master_data",
    icon: icons.navRegion,
    children: [
      {
        name: "nav.region",
        icon: icons.navRegion,
        href: "/region",
        permission: "region@read",
      },
      {
        name: "nav.area",
        icon: icons.navArea,
        href: "/area",
        permission: "area@read",
      },
      {
        name: "nav.customer",
        icon: icons.navCustomer,
        href: "/customer",
        permission: "customer@read",
      },
      {
        name: "nav.outlet",
        icon: icons.navOutlet,
        href: "/outlet",
        permission: "outlet@read",
      },
      {
        name: "nav.sku_category",
        icon: icons.navSkuCategory,
        href: "/sku-category",
        permission: "sku@read",
      },
      {
        name: "nav.sku",
        icon: icons.navSku,
        href: "/sku",
        permission: "sku@read",
      },
    ],
  },
  {
    name: "nav.sales",
    icon: icons.navSalesOrder,
    children: [
      {
        name: "nav.sales_order",
        icon: icons.navSalesOrder,
        href: "/sales-order",
        permission: "sales-order@read",
      },
    ],
  },
  {
    name: "nav.field_ops",
    icon: icons.navVisit,
    children: [
      {
        name: "nav.visit_log",
        icon: icons.navVisit,
        href: "/visit-log",
        permission: "visit-log@read",
      },
    ],
  },
  {
    name: "nav.programs",
    icon: icons.navProgram,
    children: [
      {
        name: "nav.action_program",
        icon: icons.navProgram,
        href: "/action-program",
        permission: "action-program@read",
      },
      {
        name: "nav.event_proposal",
        icon: icons.navEvent,
        href: "/event-proposal",
        permission: "event-proposal@read",
      },
    ],
  },
  {
    name: "nav.system",
    icon: icons.navUsers,
    children: [
      {
        name: "nav.users",
        icon: icons.navUsers,
        href: "/users",
        permission: "user@read",
      },
      {
        name: "nav.access_control",
        icon: icons.navRoles,
        href: "/access-control",
        permission: "role@read",
      },
      {
        name: "nav.activity_logs",
        icon: icons.navActivity,
        href: "/activity-logs",
        permission: "activity_log@read",
      },
      {
        name: "nav.notifications_admin",
        icon: icons.navNotifications,
        href: "/notifications",
        permission: "notification@read",
      },
    ],
  },
  {
    name: "nav.ai_admin",
    icon: icons.dashSparkle,
    href: "/ai-admin",
    permission: "ai-admin@access",
  },
];
