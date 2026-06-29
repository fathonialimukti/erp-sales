import { ICONS } from "../assets/chrome-icons";

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
    icon: ICONS.nav.dashboard,
    href: "/dashboard",
  },
  {
    name: "nav.master_data",
    icon: ICONS.nav.region,
    children: [
      {
        name: "nav.region",
        icon: ICONS.nav.region,
        href: "/region",
        permission: "region@read",
      },
      {
        name: "nav.area",
        icon: ICONS.nav.area,
        href: "/area",
        permission: "area@read",
      },
      {
        name: "nav.customer",
        icon: ICONS.nav.customer,
        href: "/customer",
        permission: "customer@read",
      },
      {
        name: "nav.outlet",
        icon: ICONS.nav.outlet,
        href: "/outlet",
        permission: "outlet@read",
      },
      {
        name: "nav.sku_category",
        icon: ICONS.nav.skuCategory,
        href: "/sku-category",
        permission: "sku@read",
      },
      {
        name: "nav.sku",
        icon: ICONS.nav.sku,
        href: "/sku",
        permission: "sku@read",
      },
    ],
  },
  {
    name: "nav.sales",
    icon: ICONS.nav.salesOrder,
    children: [
      {
        name: "nav.sales_order",
        icon: ICONS.nav.salesOrder,
        href: "/sales-order",
        permission: "sales-order@read",
      },
    ],
  },
  {
    name: "nav.field_ops",
    icon: ICONS.nav.visit,
    children: [
      {
        name: "nav.visit_log",
        icon: ICONS.nav.visit,
        href: "/visit-log",
        permission: "visit-log@read",
      },
    ],
  },
  {
    name: "nav.programs",
    icon: ICONS.nav.program,
    children: [
      {
        name: "nav.action_program",
        icon: ICONS.nav.program,
        href: "/action-program",
        permission: "action-program@read",
      },
      {
        name: "nav.event_proposal",
        icon: ICONS.nav.event,
        href: "/event-proposal",
        permission: "event-proposal@read",
      },
    ],
  },
  {
    name: "nav.system",
    icon: ICONS.nav.users,
    children: [
      {
        name: "nav.users",
        icon: ICONS.nav.users,
        href: "/users",
        permission: "user@read",
      },
      {
        name: "nav.access_control",
        icon: ICONS.nav.roles,
        href: "/access-control",
        permission: "role@read",
      },
      {
        name: "nav.activity_logs",
        icon: ICONS.nav.activity,
        href: "/activity-logs",
        permission: "activity_log@read",
      },
      {
        name: "nav.notifications_admin",
        icon: ICONS.nav.notifications,
        href: "/notifications",
        permission: "notification@read",
      },
    ],
  },
];
