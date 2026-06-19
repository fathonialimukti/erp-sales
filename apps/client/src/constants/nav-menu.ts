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
    icon: "solar:home-2-linear",
    href: "/dashboard",
  },
  {
    name: "nav.master_data",
    icon: "solar:database-linear",
    children: [
      {
        name: "nav.region",
        icon: "solar:map-point-linear",
        href: "/region",
        permission: "region@read",
      },
      {
        name: "nav.area",
        icon: "solar:map-linear",
        href: "/area",
        permission: "area@read",
      },
      {
        name: "nav.customer",
        icon: "solar:users-group-rounded-linear",
        href: "/customer",
        permission: "customer@read",
      },
      {
        name: "nav.outlet",
        icon: "solar:shop-linear",
        href: "/outlet",
        permission: "outlet@read",
      },
      {
        name: "nav.sku_category",
        icon: "solar:folder-with-files-linear",
        href: "/sku-category",
        permission: "sku@read",
      },
      {
        name: "nav.sku",
        icon: "solar:box-linear",
        href: "/sku",
        permission: "sku@read",
      },
    ],
  },
  {
    name: "nav.sales",
    icon: "solar:cart-5-linear",
    children: [
      {
        name: "nav.sales_order",
        icon: "solar:document-add-linear",
        href: "/sales-order",
        permission: "sales-order@read",
      },
      {
        name: "nav.invoice",
        icon: "solar:bill-list-linear",
        href: "/invoice",
        permission: "invoice@read",
      },
    ],
  },
  {
    name: "nav.field_ops",
    icon: "solar:map-point-wave-linear",
    children: [
      {
        name: "nav.visit_log",
        icon: "solar:clipboard-list-linear",
        href: "/visit-log",
        permission: "visit-log@read",
      },
    ],
  },
  {
    name: "nav.programs",
    icon: "solar:lightning-linear",
    children: [
      {
        name: "nav.action_program",
        icon: "solar:ticket-sale-linear",
        href: "/action-program",
        permission: "action-program@read",
      },
      {
        name: "nav.event_proposal",
        icon: "solar:calendar-mark-linear",
        href: "/event-proposal",
        permission: "event-proposal@read",
      },
    ],
  },
  {
    name: "nav.system",
    icon: "solar:settings-linear",
    children: [
      {
        name: "nav.users",
        icon: "solar:users-group-two-rounded-linear",
        href: "/users",
        permission: "user@read",
      },
      {
        name: "nav.roles",
        icon: "solar:shield-check-linear",
        href: "/roles",
        permission: "user@read",
      },
      {
        name: "nav.activity_logs",
        icon: "solar:history-linear",
        href: "/activity-logs",
        permission: "activity_log@read",
      },
      {
        name: "nav.notifications_admin",
        icon: "solar:bell-bing-linear",
        href: "/notifications",
        permission: "notification@read",
      },
    ],
  },
];
