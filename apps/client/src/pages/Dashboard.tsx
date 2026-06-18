import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { Icon } from "../ui";
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
import { hasPermissionAtom } from "../lib/atoms";
import { Button } from "../ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "../ui/cn";

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
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

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

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard.sales"],
    queryFn: () => trpcClient.dashboard.sales.query(),
    staleTime: 30_000,
  });

  const sales = data as SalesDashboard | undefined;

  const revenueChartData = useMemo(
    () =>
      (sales?.revenueTrend ?? []).map((p) => ({
        date: p.date,
        label: formatShortDate(p.date),
        total: p.total,
      })),
    [sales?.revenueTrend],
  );

  return (
    <section
      className="space-y-6"
      data-ai-context={JSON.stringify({
        section: "dashboard",
        kpis: sales?.kpis,
        topCustomers: sales?.topCustomers?.map((c) => c.name),
        recentActivityCount: sales?.recentActivity?.length ?? 0,
      })}
    >
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {intl.formatMessage({ id: "dashboard.title", defaultMessage: "Dashboard" })}
        </h1>
        <p className="text-sm text-slate-500">
          {intl.formatMessage({
            id: "dashboard.subtitle_v2",
            defaultMessage: "Sales performance, approvals, and customer activity at a glance.",
          })}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={intl.formatMessage({ id: "dashboard.kpi.month_revenue", defaultMessage: "Month revenue" })}
          value={sales ? formatCurrency(sales.kpis.monthRevenue) : null}
          icon="solar:dollar-minimalistic-linear"
          tone="accent"
          delta={sales?.kpis.revenueDeltaPercent ?? null}
          deltaLabel={
            sales?.kpis.prevMonthRevenue
              ? intl.formatMessage(
                  { id: "dashboard.kpi.vs_prev_month", defaultMessage: "vs last month" },
                )
              : null
          }
          isLoading={isLoading}
        />
        <KpiCard
          label={intl.formatMessage({ id: "dashboard.kpi.open_orders", defaultMessage: "Open orders" })}
          value={sales ? formatCompact(sales.kpis.openOrders) : null}
          icon="solar:cart-large-minimalistic-linear"
          tone="info"
          sub={
            sales
              ? `${sales.kpis.draftOrders} ${intl.formatMessage({ id: "dashboard.kpi.draft", defaultMessage: "draft" })} · ${sales.kpis.proposedOrders} ${intl.formatMessage({ id: "dashboard.kpi.proposed", defaultMessage: "proposed" })}`
              : null
          }
          isLoading={isLoading}
        />
        <KpiCard
          label={intl.formatMessage({ id: "dashboard.kpi.customers", defaultMessage: "Customers" })}
          value={sales ? formatCompact(sales.kpis.customerCount) : null}
          icon="solar:users-group-rounded-linear"
          tone="neutral"
          sub={
            sales
              ? `${sales.kpis.skuCount} ${intl.formatMessage({ id: "dashboard.kpi.skus", defaultMessage: "SKUs" })} (${sales.kpis.activeSkuCount} ${intl.formatMessage({ id: "dashboard.kpi.active", defaultMessage: "active" })})`
              : null
          }
          isLoading={isLoading}
        />
        <KpiCard
          label={intl.formatMessage({ id: "dashboard.kpi.visits", defaultMessage: "Visit logs" })}
          value={sales ? formatCompact(sales.kpis.visitCount) : null}
          icon="solar:map-point-wave-linear"
          tone="neutral"
          sub={
            sales
              ? `${sales.kpis.orderItemsThisMonth} ${intl.formatMessage({ id: "dashboard.kpi.line_items", defaultMessage: "line items this month" })}`
              : null
          }
          isLoading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>
                {intl.formatMessage({ id: "dashboard.chart.revenue_trend", defaultMessage: "Revenue trend" })}
              </CardTitle>
              <CardDescription>
                {intl.formatMessage({
                  id: "dashboard.chart.revenue_trend_sub",
                  defaultMessage: "Approved sales orders — last 30 days",
                })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-slate-200)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--color-slate-500)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: "var(--color-slate-500)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface-1)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--color-accent-500)"
                      strokeWidth={2}
                      fill="url(#revenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                {intl.formatMessage({ id: "dashboard.chart.top_customers", defaultMessage: "Top customers" })}
              </CardTitle>
              <CardDescription>
                {intl.formatMessage({
                  id: "dashboard.chart.top_customers_sub",
                  defaultMessage: "By approved revenue this month",
                })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : sales?.topCustomers?.length ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sales.topCustomers}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--color-slate-200)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "var(--color-slate-500)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "var(--color-slate-700)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface-1)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Bar dataKey="total" fill="var(--color-accent-500)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                {intl.formatMessage({ id: "dashboard.chart.no_data", defaultMessage: "No approved sales yet" })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>
                {intl.formatMessage({ id: "dashboard.section.activity", defaultMessage: "Recent activity" })}
              </CardTitle>
              <CardDescription>
                {intl.formatMessage({
                  id: "dashboard.section.activity_sub",
                  defaultMessage: "Latest system actions across all users",
                })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sales?.recentActivity?.length ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {sales.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
                      <Icon icon="solar:history-linear" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-900 dark:text-slate-100">
                        <span className="font-medium">{a.userName}</span>{" "}
                        <span className="text-slate-500">{a.message}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {a.resource} · {formatRelative(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center text-sm text-slate-500">
                {intl.formatMessage({ id: "dashboard.activity_empty", defaultMessage: "No recent activity" })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                {intl.formatMessage({ id: "dashboard.section.quick_actions", defaultMessage: "Quick actions" })}
              </CardTitle>
              <CardDescription>
                {intl.formatMessage({
                  id: "dashboard.section.quick_actions_sub",
                  defaultMessage: "Jump into a workflow",
                })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-2">
              <QuickAction
                icon="solar:document-add-linear"
                label={intl.formatMessage({ id: "dashboard.action.new_order", defaultMessage: "New sales order" })}
                visible={hasPermission("sales-order@create")}
                onClick={() => navigate("/sales-order/create")}
              />
              <QuickAction
                icon="solar:clipboard-list-linear"
                label={intl.formatMessage({ id: "dashboard.action.new_visit", defaultMessage: "Log a visit" })}
                visible={hasPermission("visit-log@create")}
                onClick={() => navigate("/visit-log/create")}
              />
              <QuickAction
                icon="solar:users-group-rounded-linear"
                label={intl.formatMessage({ id: "dashboard.action.new_customer", defaultMessage: "Add customer" })}
                visible={hasPermission("customer@create")}
                onClick={() => navigate("/customer/create")}
              />
              <QuickAction
                icon="solar:box-linear"
                label={intl.formatMessage({ id: "dashboard.action.new_sku", defaultMessage: "Add SKU" })}
                visible={hasPermission("sku@create")}
                onClick={() => navigate("/sku/create")}
              />
              <QuickAction
                icon="solar:ticket-sale-linear"
                label={intl.formatMessage({ id: "dashboard.action.new_program", defaultMessage: "New action program" })}
                visible={hasPermission("action-program@create")}
                onClick={() => navigate("/action-program/create")}
              />
              <QuickAction
                icon="solar:calendar-mark-linear"
                label={intl.formatMessage({ id: "dashboard.action.new_event", defaultMessage: "New event proposal" })}
                visible={hasPermission("event-proposal@create")}
                onClick={() => navigate("/event-proposal/create")}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
};

interface KpiCardProps {
  label: string;
  value: string | null;
  icon: string;
  tone: "accent" | "info" | "neutral";
  sub?: string | null;
  delta?: number | null;
  deltaLabel?: string | null;
  isLoading?: boolean;
}

const TONE: Record<KpiCardProps["tone"], { bg: string; fg: string }> = {
  accent: { bg: "bg-accent-50", fg: "text-accent-700" },
  info: { bg: "bg-state-info-bg", fg: "text-state-info" },
  neutral: { bg: "bg-slate-100", fg: "text-slate-700" },
};

const KpiCard = ({ label, value, icon, tone, sub, delta, deltaLabel, isLoading }: KpiCardProps) => {
  const t = TONE[tone];
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
            {isLoading || value === null ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {value}
              </p>
            )}
            {delta !== null && delta !== undefined && (
              <div className="flex items-center gap-1.5 pt-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                    delta >= 0 ? "bg-state-success-bg text-state-success" : "bg-state-danger-bg text-state-danger",
                  )}
                >
                  <Icon
                    icon={delta >= 0 ? "solar:arrow-up-linear" : "solar:arrow-down-linear"}
                    className="h-3 w-3"
                  />
                  {Math.abs(delta).toFixed(1)}%
                </span>
                {deltaLabel && <span className="text-xs text-slate-500">{deltaLabel}</span>}
              </div>
            )}
            {sub && !delta && (
              <p className="truncate text-xs text-slate-500">{sub}</p>
            )}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", t.bg, t.fg)}>
            <Icon icon={icon} className="h-5 w-5" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

interface QuickActionProps {
  icon: string;
  label: string;
  visible: boolean;
  onClick: () => void;
}

const QuickAction = ({ icon, label, visible, onClick }: QuickActionProps) => {
  if (!visible) return null;
  return (
    <Button
      variant="outline"
      fullWidth
      onClick={onClick}
      leftIcon={<Icon icon={icon} className="h-4 w-4" />}
      className="justify-start"
    >
      {label}
    </Button>
  );
};
