import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpcClient } from "../lib/trpc";
import { authUserAtom, hasPermissionAtom } from "../lib/atoms";
import { Skeleton } from "../ui/Skeleton";
import { icons } from "../assets/icons";
import "./Dashboard.css";

type SalesDashboard = {
  kpis: {
    openOrders: number;
    draftOrders: number;
    proposedOrders: number;
    approvedOrders: number;
    rejectedOrders: number;
    monthRevenue: number;
    prevMonthRevenue: number;
    revenueDelta: number;
    revenueDeltaPercent: number | null;
    customerCount: number;
    skuCount: number;
    activeSkuCount: number;
    visitCount: number;
    orderItemsThisMonth: number;
  };
  revenueTrend: { date: string; total: number; count: number }[];
  topCustomers: { id: string; name: string; total: number }[];
  recentActivity: {
    id: string;
    action: string;
    message: string;
    resource: string;
    resourceId: string;
    createdAt: string | Date;
    userName: string;
  }[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const formatShortDate = (date: string | Date) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d);
};

const formatRelative = (date: string | Date) => {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d);
};

export const Dashboard = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const authUser = useAtomValue(authUserAtom);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard.sales"],
    queryFn: () => trpcClient.dashboard.sales.query(),
    staleTime: 30_000,
  });

  const sales = data as SalesDashboard | undefined;

  const revenueChartData = useMemo(
    () => (sales?.revenueTrend ?? []).map((p) => ({ date: p.date, label: formatShortDate(p.date), total: p.total })),
    [sales?.revenueTrend],
  );

  const quickActions = useMemo(
    () => [
      {
        id: "new-order",
        icon: icons.newOrder,
        label: intl.formatMessage({ id: "dashboard.action.new_order", defaultMessage: "New sales order" }),
        permission: "sales-order@create",
        href: "/sales-order/create",
        tint: "green" as const,
      },
      {
        id: "new-visit",
        icon: icons.newVisit,
        label: intl.formatMessage({ id: "dashboard.action.new_visit", defaultMessage: "Log a visit" }),
        permission: "visit-log@create",
        href: "/visit-log/create",
        tint: "purple" as const,
      },
      {
        id: "new-customer",
        icon: icons.newCustomer,
        label: intl.formatMessage({ id: "dashboard.action.new_customer", defaultMessage: "Add customer" }),
        permission: "customer@create",
        href: "/customer/create",
        tint: "pink" as const,
      },
      {
        id: "new-sku",
        icon: icons.newSku,
        label: intl.formatMessage({ id: "dashboard.action.new_sku", defaultMessage: "Add SKU" }),
        permission: "sku@create",
        href: "/sku/create",
        tint: "orange" as const,
      },
      {
        id: "new-program",
        icon: icons.newProgram,
        label: intl.formatMessage({ id: "dashboard.action.new_program", defaultMessage: "New action program" }),
        permission: "action-program@create",
        href: "/action-program/create",
        tint: "red" as const,
      },
      {
        id: "new-event",
        icon: icons.newEvent,
        label: intl.formatMessage({ id: "dashboard.action.new_event", defaultMessage: "New event proposal" }),
        permission: "event-proposal@create",
        href: "/event-proposal/create",
        tint: "teal" as const,
      },
    ],
    [intl],
  );

  const greetingKey = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "dashboard.greeting.night";
    if (h < 12) return "dashboard.greeting.morning";
    if (h < 17) return "dashboard.greeting.afternoon";
    if (h < 21) return "dashboard.greeting.evening";
    return "dashboard.greeting.night";
  }, []);
  const greeting = intl.formatMessage({ id: greetingKey, defaultMessage: "Hello" });
  const userName = authUser?.name?.split(/\s+/)[0] ?? authUser?.username ?? "there";
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <section
      className="ios-dash"
      data-ai-context={JSON.stringify({
        section: "dashboard",
        greetingKey,
        userName,
        kpis: sales?.kpis,
        topCustomers: sales?.topCustomers?.map((c) => c.name),
        recentActivityCount: sales?.recentActivity?.length ?? 0,
      })}
    >
      {/* ============== HERO GREETING CARD ============== */}
      <header className="ios-dash__hero">
        <div className="ios-dash__hero-text">
          <span className="ios-dash__hero-eyebrow">{todayLabel}</span>
          <h1 className="ios-dash__hero-title">
            {greeting}, <span className="ios-dash__hero-name">{userName}</span>
          </h1>
          <p className="ios-dash__hero-sub">
            {intl.formatMessage({
              id: "dashboard.subtitle_v2",
              defaultMessage: "Sales performance, approvals, and customer activity at a glance.",
            })}
          </p>
        </div>
        <div className="ios-dash__hero-orb" aria-hidden="true">
          <img src={icons.sun} alt="" className="ios-dash__hero-sun" />
        </div>
      </header>

      {/* ============== LARGE PRIMARY METRIC — REVENUE ============== */}
      <section className="ios-dash__primary" aria-label="Month revenue">
        <div className="ios-dash__primary-label">
          <span className="ios-dash__primary-kicker">
            {intl.formatMessage({ id: "dashboard.kpi.month_revenue", defaultMessage: "Month revenue" })}
          </span>
          {sales?.kpis.revenueDeltaPercent !== null && sales?.kpis.revenueDeltaPercent !== undefined && (
            <span
              className={`ios-dash__chip ${
                sales.kpis.revenueDeltaPercent > 0
                  ? "ios-dash__chip--up"
                  : sales.kpis.revenueDeltaPercent < 0
                  ? "ios-dash__chip--down"
                  : "ios-dash__chip--flat"
              }`}
            >
              <img
                src={sales.kpis.revenueDeltaPercent > 0 ? icons.arrowUp : icons.arrowDown}
                alt=""
                className="ios-dash__chip-arrow"
              />
              {Math.abs(sales.kpis.revenueDeltaPercent).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="ios-dash__primary-value">
          {isLoading || !sales ? (
            <Skeleton style={{ height: 56, width: 240 }} />
          ) : (
            formatCurrency(sales.kpis.monthRevenue)
          )}
        </div>
        {sales?.kpis.prevMonthRevenue ? (
          <div className="ios-dash__primary-sub">
            {intl.formatMessage({ id: "dashboard.kpi.vs_prev_month", defaultMessage: "vs last month" })}
          </div>
        ) : null}

        <div className="ios-dash__primary-chart">
          {isLoading ? (
            <Skeleton style={{ height: 96, width: "100%", borderRadius: 12 }} />
          ) : revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={96}>
              <AreaChart data={revenueChartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="iosHeroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  fill="url(#iosHeroFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="ios-dash__primary-empty">
              <img src={icons.sparkle} alt="" />
              <span>
                {intl.formatMessage({ id: "dashboard.chart.no_data", defaultMessage: "No approved sales yet" })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ============== 3 SECONDARY METRIC ROWS (iOS list style) ============== */}
      <section className="ios-dash__metrics" aria-label="Key metrics">
        <IosMetricRow
          icon={icons.orders}
          tint="blue"
          label={intl.formatMessage({ id: "dashboard.kpi.open_orders", defaultMessage: "Open orders" })}
          value={sales ? formatCompact(sales.kpis.openOrders) : null}
          detail={
            sales
              ? `${sales.kpis.draftOrders} ${intl.formatMessage({ id: "dashboard.kpi.draft", defaultMessage: "draft" })} · ${sales.kpis.proposedOrders} ${intl.formatMessage({ id: "dashboard.kpi.proposed", defaultMessage: "proposed" })}`
              : null
          }
          isLoading={isLoading}
        />
        <IosMetricRow
          icon={icons.customers}
          tint="pink"
          label={intl.formatMessage({ id: "dashboard.kpi.customers", defaultMessage: "Customers" })}
          value={sales ? formatCompact(sales.kpis.customerCount) : null}
          detail={
            sales
              ? `${sales.kpis.skuCount} ${intl.formatMessage({ id: "dashboard.kpi.skus", defaultMessage: "SKUs" })} · ${sales.kpis.activeSkuCount} ${intl.formatMessage({ id: "dashboard.kpi.active", defaultMessage: "active" })}`
              : null
          }
          isLoading={isLoading}
        />
        <IosMetricRow
          icon={icons.visits}
          tint="orange"
          label={intl.formatMessage({ id: "dashboard.kpi.visits", defaultMessage: "Visit logs" })}
          value={sales ? formatCompact(sales.kpis.visitCount) : null}
          detail={
            sales
              ? `${sales.kpis.orderItemsThisMonth} ${intl.formatMessage({ id: "dashboard.kpi.line_items", defaultMessage: "line items this month" })}`
              : null
          }
          isLoading={isLoading}
        />
      </section>

      {/* ============== REVENUE TREND CARD ============== */}
      <section className="ios-dash__card" aria-label="Revenue trend">
        <header className="ios-dash__card-header">
          <div className="ios-dash__card-icon" data-tint="green">
            <img src={icons.chart} alt="" />
          </div>
          <div className="ios-dash__card-heading">
            <h2 className="ios-dash__card-title">
              {intl.formatMessage({ id: "dashboard.chart.revenue_trend", defaultMessage: "Revenue trend" })}
            </h2>
            <p className="ios-dash__card-sub">
              {intl.formatMessage({
                id: "dashboard.chart.revenue_trend_sub",
                defaultMessage: "Approved sales orders — last 30 days",
              })}
            </p>
          </div>
        </header>
        <div className="ios-dash__card-body">
          {isLoading ? (
            <Skeleton style={{ height: 200, width: "100%", borderRadius: 16 }} />
          ) : (
            <div style={{ height: 200, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="iosRevFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--ios-green)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--ios-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--ios-separator)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--ios-label-3)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: "var(--ios-label-3)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => formatCompact(Number(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--ios-bg-elevated)",
                      border: "1px solid var(--ios-separator)",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "var(--ios-shadow-card)",
                      color: "var(--ios-label)",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--ios-green)"
                    strokeWidth={2.5}
                    fill="url(#iosRevFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ============== TOP CUSTOMERS CARD ============== */}
      <section className="ios-dash__card" aria-label="Top customers">
        <header className="ios-dash__card-header">
          <div className="ios-dash__card-icon" data-tint="yellow">
            <img src={icons.trophy} alt="" />
          </div>
          <div className="ios-dash__card-heading">
            <h2 className="ios-dash__card-title">
              {intl.formatMessage({ id: "dashboard.chart.top_customers", defaultMessage: "Top customers" })}
            </h2>
            <p className="ios-dash__card-sub">
              {intl.formatMessage({
                id: "dashboard.chart.top_customers_sub",
                defaultMessage: "By approved revenue this month",
              })}
            </p>
          </div>
        </header>
        <div className="ios-dash__card-body">
          {isLoading ? (
            <Skeleton style={{ height: 220, width: "100%", borderRadius: 16 }} />
          ) : sales?.topCustomers?.length ? (
            <div style={{ height: 220, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sales.topCustomers}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--ios-separator)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--ios-label-3)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(Number(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "var(--ios-label-2)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--ios-bg-elevated)",
                      border: "1px solid var(--ios-separator)",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "var(--ios-shadow-card)",
                      color: "var(--ios-label)",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                  />
                  <Bar dataKey="total" fill="var(--ios-yellow)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="ios-dash__empty">
              <img src={icons.inbox} alt="" className="ios-dash__empty-icon" />
              <span className="ios-dash__empty-title">
                {intl.formatMessage({ id: "dashboard.chart.no_data", defaultMessage: "No approved sales yet" })}
              </span>
              <span className="ios-dash__empty-text">
                {intl.formatMessage({
                  id: "dashboard.chart.no_data_sub",
                  defaultMessage: "Once orders are approved, your top customers will appear here.",
                })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ============== QUICK ACTIONS — 2x3 app-icon grid ============== */}
      <section className="ios-dash__quick" aria-label="Quick actions">
        <h2 className="ios-dash__section-title">
          {intl.formatMessage({ id: "dashboard.section.quick_actions", defaultMessage: "Quick actions" })}
        </h2>
        <p className="ios-dash__section-sub">
          {intl.formatMessage({
            id: "dashboard.section.quick_actions_sub",
            defaultMessage: "Jump into a workflow",
          })}
        </p>
        <div className="ios-dash__quick-grid">
          {quickActions
            .filter((a) => hasPermission(a.permission))
            .map((a) => (
              <button
                key={a.id}
                type="button"
                className="ios-dash__quick-tile"
                onClick={() => navigate(a.href)}
              >
                <span className="ios-dash__quick-icon" data-tint={a.tint}>
                  <img src={a.icon} alt="" />
                </span>
                <span className="ios-dash__quick-label">{a.label}</span>
              </button>
            ))}
        </div>
      </section>

      {/* ============== RECENT ACTIVITY — iOS list ============== */}
      <section className="ios-dash__activity" aria-label="Recent activity">
        <header className="ios-dash__activity-header">
          <h2 className="ios-dash__section-title">
            {intl.formatMessage({ id: "dashboard.section.activity", defaultMessage: "Recent activity" })}
          </h2>
          <p className="ios-dash__section-sub">
            {intl.formatMessage({
              id: "dashboard.section.activity_sub",
              defaultMessage: "Latest system actions across all users",
            })}
          </p>
        </header>
        <div className="ios-dash__activity-list">
          {isLoading ? (
            <div className="ios-dash__activity-skeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="ios-dash__activity-skeleton-row">
                  <Skeleton style={{ width: 36, height: 36, borderRadius: 10 }} />
                  <div className="ios-dash__activity-skeleton-lines">
                    <Skeleton style={{ width: "60%", height: 12 }} />
                    <Skeleton style={{ width: "30%", height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : sales?.recentActivity?.length ? (
            sales.recentActivity.map((a, i) => (
              <div
                key={a.id}
                className={`ios-dash__activity-row ${i === 0 ? "ios-dash__activity-row--first" : ""}`}
              >
                <span className="ios-dash__activity-avatar" aria-hidden="true">
                  {a.userName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase() ?? "")
                    .join("")}
                </span>
                <div className="ios-dash__activity-body">
                  <span className="ios-dash__activity-name">{a.userName}</span>
                  <span className="ios-dash__activity-msg">{a.message}</span>
                </div>
                <div className="ios-dash__activity-meta">
                  <span className="ios-dash__activity-time">{formatRelative(a.createdAt)}</span>
                  <span className="ios-dash__activity-resource">{a.resource}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="ios-dash__empty">
              <img src={icons.clock} alt="" className="ios-dash__empty-icon" />
              <span className="ios-dash__empty-title">
                {intl.formatMessage({ id: "dashboard.activity_empty", defaultMessage: "No recent activity" })}
              </span>
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

/* ============================================================
 * iOS Metric Row — label + value + detail + chevron, no card chrome.
 * ============================================================ */
interface IosMetricRowProps {
  icon: string;
  tint: "blue" | "green" | "pink" | "orange" | "purple" | "red" | "yellow" | "teal" | "indigo";
  label: string;
  value: string | null;
  detail: string | null;
  isLoading?: boolean;
}

const IosMetricRow = ({ icon, tint, label, value, detail, isLoading }: IosMetricRowProps) => (
  <div className="ios-dash__metric">
    <span className="ios-dash__metric-icon" data-tint={tint}>
      <img src={icon} alt="" />
    </span>
    <div className="ios-dash__metric-body">
      <span className="ios-dash__metric-label">{label}</span>
      {isLoading || value === null ? (
        <Skeleton style={{ height: 22, width: 96 }} />
      ) : (
        <span className="ios-dash__metric-value">{value}</span>
      )}
      {detail && <span className="ios-dash__metric-detail">{detail}</span>}
    </div>
    <img src={icons.chevron} alt="" className="ios-dash__metric-chevron" />
  </div>
);
