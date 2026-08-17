import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  Package,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";

import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { useMeta } from "../lib/useMeta";
import { StatusChip } from "../components/StatusChip";
import { EmptyState } from "../components/EmptyState";
import { Stagger, StaggerItem } from "../components/motion/Stagger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api-base";
import { formatCurrency } from "@/lib/format";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";
import { trpcClient } from "../lib/trpc";
import { authUserAtom, hasPermissionAtom } from "../lib/atoms";
import { icons } from "../assets/icons";

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
  revenueByCategory: {
    id: string;
    name: string;
    revenue: number;
    skuCount: number;
  }[];
};

const chartColors = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
  tooltipBg: "var(--card)",
  border: "var(--border)",
} as const;

const chartTooltipStyle = {
  background: chartColors.tooltipBg,
  border: `1px solid ${chartColors.border}`,
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
  color: "var(--foreground)",
} as const;

const MAIN_CHART_HEIGHT = 280;

const formatCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatShortDate = (date: string | Date) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(d);
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
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(d);
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

export const Dashboard = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const authUser = useAtomValue(authUserAtom);
  const { currencyCode } = useGeneralSettings();

  useMeta({
    title: 'Dashboard',
    description: 'Sales dashboard — real-time KPIs, order trends, visit summaries, and AI-powered insights for your sales operation.',
    robots: 'noindex, follow',
  });

  const [insightLoading, setInsightLoading] = useState(false);
  const [insightResult, setInsightResult] = useState("");
  const [insightError, setInsightError] = useState("");

  const handleInsightClick = async (prompt: string) => {
    setInsightLoading(true);
    setInsightResult("");
    setInsightError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setInsightResult(accumulated);
      }
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setInsightLoading(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard.sales"],
    queryFn: () => trpcClient.dashboard.sales.query(),
    staleTime: 30_000,
  });

  const sales = data as SalesDashboard | undefined;
  const todayISO = new Date().toISOString().slice(0, 10);

  const todayVisitsQuery = useQuery({
    queryKey: ["dashboard.todayVisits", todayISO],
    queryFn: () =>
      trpcClient.visitLog.list.query({
        page: 1,
        limit: 10,
        search: "",
      }),
    staleTime: 30_000,
  });

  const draftOrdersQuery = useQuery({
    queryKey: ["dashboard.draftOrders", todayISO],
    queryFn: () =>
      trpcClient.salesOrder.list.query({
        page: 1,
        limit: 10,
        approvalStatus: "DRAFT",
      }),
    staleTime: 30_000,
  });

  const todayAgenda = useMemo(() => {
    type AgendaItem = {
      id: string;
      type: "visit" | "order";
      title: string;
      subtitle: string;
      href: string;
      time: string;
    };
    const visits = (todayVisitsQuery.data?.data ?? []).map<AgendaItem>((v) => ({
      id: v.id,
      type: "visit",
      title: v.outlet?.name ?? "Visit",
      subtitle: v.purpose ?? v.approvalStatus ?? "",
      href: `/visit-log/${v.id}`,
      time: v.date ?? "",
    }));
    const orders = (draftOrdersQuery.data?.data ?? []).map<AgendaItem>((o) => ({
      id: o.id,
      type: "order",
      title: o.documentNumber ?? "Draft order",
      subtitle: o.customer?.name ?? "Draft",
      href: `/sales-order/${o.id}`,
      time: o.date ?? "",
    }));
    return [...visits, ...orders]
      .sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0))
      .slice(0, 8);
  }, [todayVisitsQuery.data, draftOrdersQuery.data]);

  const revenueChartData = useMemo(
    () =>
      (sales?.revenueTrend ?? []).map((p) => ({
        date: p.date,
        label: formatShortDate(p.date),
        total: p.total,
      })),
    [sales?.revenueTrend],
  );

  const quickActions = useMemo(
    () => [
      {
        id: "new-order",
        icon: icons.dashNewOrder,
        label: intl.formatMessage({
          id: "dashboard.action.new_order",
          defaultMessage: "New sales order",
        }),
        permission: "sales-order@create",
        href: "/sales-order/create",
        tone: "bg-[color-mix(in_srgb,var(--module-order)_16%,transparent)]",
      },
      {
        id: "new-visit",
        icon: icons.dashNewVisit,
        label: intl.formatMessage({
          id: "dashboard.action.new_visit",
          defaultMessage: "Log a visit",
        }),
        permission: "visit-log@create",
        href: "/visit-log/create",
        tone: "bg-[color-mix(in_srgb,var(--module-visit)_16%,transparent)]",
      },
      {
        id: "new-customer",
        icon: icons.dashNewCustomer,
        label: intl.formatMessage({
          id: "dashboard.action.new_customer",
          defaultMessage: "Add customer",
        }),
        permission: "customer@create",
        href: "/customer/create",
        tone: "bg-[color-mix(in_srgb,var(--module-customer)_16%,transparent)]",
      },
      {
        id: "new-sku",
        icon: icons.dashNewSku,
        label: intl.formatMessage({
          id: "dashboard.action.new_sku",
          defaultMessage: "Add SKU",
        }),
        permission: "sku@create",
        href: "/sku/create",
        tone: "bg-[color-mix(in_srgb,var(--module-sku)_16%,transparent)]",
      },
      {
        id: "new-program",
        icon: icons.dashNewProgram,
        label: intl.formatMessage({
          id: "dashboard.action.new_program",
          defaultMessage: "New action program",
        }),
        permission: "action-program@create",
        href: "/action-program/create",
        tone: "bg-[color-mix(in_srgb,var(--module-planning)_16%,transparent)]",
      },
      {
        id: "new-event",
        icon: icons.dashNewEvent,
        label: intl.formatMessage({
          id: "dashboard.action.new_event",
          defaultMessage: "New event proposal",
        }),
        permission: "event-proposal@create",
        href: "/event-proposal/create",
        tone: "bg-[color-mix(in_srgb,var(--module-event)_16%,transparent)]",
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

  const delta = sales?.kpis.revenueDeltaPercent ?? null;
  const allowedActions = quickActions.filter((a) => hasPermission(a.permission));

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "dashboard",
        greetingKey,
        userName,
        kpis: sales?.kpis,
        topCustomers: sales?.topCustomers?.map((c) => c.name),
        recentActivityCount: sales?.recentActivity?.length ?? 0,
      })}
    >
      <PageHeader
        eyebrow={todayLabel}
        title={`${greeting}, ${userName}`}
        description={intl.formatMessage({
          id: "dashboard.subtitle_v2",
          defaultMessage:
            "Sales performance, approvals, and customer activity at a glance.",
        })}
        icon={
          <img src={icons.dashSun} alt="" className="size-7 object-contain sm:size-8" />
        }
      />

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "dashboard.kpi.month_revenue",
                  defaultMessage: "Month revenue",
                })}
              </p>
              <div className="font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {isLoading || !sales ? (
                  <Skeleton className="h-10 w-56" />
                ) : (
                  formatCurrency(sales.kpis.monthRevenue, currencyCode)
                )}
              </div>
              {sales?.kpis.prevMonthRevenue ? (
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({
                    id: "dashboard.kpi.vs_prev_month",
                    defaultMessage: "vs last month",
                  })}
                </p>
              ) : null}
            </div>
            {delta !== null && delta !== undefined ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                  delta > 0 && "bg-success/15 text-success",
                  delta < 0 && "bg-destructive/10 text-destructive",
                  delta === 0 && "bg-muted text-muted-foreground",
                )}
              >
                {delta > 0 ? (
                  <ArrowUpRight className="size-3.5" aria-hidden />
                ) : delta < 0 ? (
                  <ArrowDownRight className="size-3.5" aria-hidden />
                ) : null}
                {Math.abs(delta).toFixed(1)}%
              </span>
            ) : null}
          </div>

          <div className="h-24 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="auroraHeroFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={chartColors.primary}
                    strokeWidth={2.5}
                    fill="url(#auroraHeroFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 opacity-60" aria-hidden />
                {intl.formatMessage({
                  id: "dashboard.chart.no_data",
                  defaultMessage: "No approved sales yet",
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Stagger
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Key metrics"
      >
        <StaggerItem>
          <KpiCard
            module="order"
            icon={<ShoppingCart className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "dashboard.kpi.open_orders",
              defaultMessage: "Open orders",
            })}
            value={
              isLoading || !sales ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                formatCompact(sales.kpis.openOrders)
              )
            }
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            module="customer"
            icon={<Users className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "dashboard.kpi.customers",
              defaultMessage: "Customers",
            })}
            value={
              isLoading || !sales ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                formatCompact(sales.kpis.customerCount)
              )
            }
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            module="visit"
            icon={<ClipboardList className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "dashboard.kpi.visits",
              defaultMessage: "Visit logs",
            })}
            value={
              isLoading || !sales ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                formatCompact(sales.kpis.visitCount)
              )
            }
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            module="sku"
            icon={<Package className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "dashboard.kpi.skus",
              defaultMessage: "SKUs",
            })}
            value={
              isLoading || !sales ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                formatCompact(sales.kpis.skuCount)
              )
            }
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "dashboard.chart.revenue_trend",
                defaultMessage: "Revenue trend",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "dashboard.chart.revenue_trend_sub",
                defaultMessage: "Approved sales orders — last 30 days",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full rounded-xl" style={{ height: MAIN_CHART_HEIGHT }} />
            ) : (
              <div style={{ height: MAIN_CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="auroraRevFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [formatCurrency(Number(value), currencyCode), "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={chartColors.primary}
                      strokeWidth={2.5}
                      fill="url(#auroraRevFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "dashboard.chart.top_customers",
                defaultMessage: "Top customers",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "dashboard.chart.top_customers_sub",
                defaultMessage: "By approved revenue this month",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full rounded-xl" style={{ height: MAIN_CHART_HEIGHT }} />
            ) : sales?.topCustomers?.length ? (
              <div style={{ height: MAIN_CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sales.topCustomers}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: chartColors.axis, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [formatCurrency(Number(value), currencyCode), "Revenue"]}
                    />
                    <Bar dataKey="total" fill={chartColors.secondary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-70 flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-foreground">
                  {intl.formatMessage({
                    id: "dashboard.chart.no_data",
                    defaultMessage: "No approved sales yet",
                  })}
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {intl.formatMessage({
                    id: "dashboard.chart.no_data_sub",
                    defaultMessage:
                      "Once orders are approved, your top customers will appear here.",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({
                id: "dashboard.chart.revenue_by_category",
                defaultMessage: "Revenue by category",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "dashboard.chart.revenue_by_category_sub",
                defaultMessage: "Top 6 categories by approved revenue this month",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full rounded-xl" style={{ height: MAIN_CHART_HEIGHT }} />
            ) : sales?.revenueByCategory?.length ? (
              <div style={{ height: MAIN_CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sales.revenueByCategory}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: chartColors.axis, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [formatCurrency(Number(value), currencyCode), "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill={chartColors.secondary}
                      radius={[0, 6, 6, 0]}
                      cursor={
                        hasPermission("skuCategory@read") ? "pointer" : "default"
                      }
                      onClick={
                        hasPermission("skuCategory@read")
                          ? (payload: { id?: string }) => {
                              if (payload?.id) navigate(`/sku-category/${payload.id}`);
                            }
                          : undefined
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-70 flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-foreground">
                  {intl.formatMessage({
                    id: "dashboard.chart.no_data",
                    defaultMessage: "No approved sales yet",
                  })}
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {intl.formatMessage({
                    id: "dashboard.chart.revenue_by_category_empty_sub",
                    defaultMessage:
                      "Once orders are approved, revenue by category will appear here.",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({
                id: "dashboard.chart.catalog_by_category",
                defaultMessage: "Catalog by category",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "dashboard.chart.catalog_by_category_sub",
                defaultMessage: "Top 6 categories by SKU count",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full rounded-xl" style={{ height: MAIN_CHART_HEIGHT }} />
            ) : sales?.revenueByCategory?.length ? (
              <div style={{ height: MAIN_CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sales.revenueByCategory}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: chartColors.axis, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [String(value), "SKUs"]}
                    />
                    <Bar
                      dataKey="skuCount"
                      fill={chartColors.primary}
                      radius={[0, 6, 6, 0]}
                      cursor={
                        hasPermission("skuCategory@read") ? "pointer" : "default"
                      }
                      onClick={
                        hasPermission("skuCategory@read")
                          ? (payload: { id?: string }) => {
                              if (payload?.id) navigate(`/sku-category/${payload.id}`);
                            }
                          : undefined
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-70 flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-foreground">
                  {intl.formatMessage({
                    id: "dashboard.chart.no_data",
                    defaultMessage: "No approved sales yet",
                  })}
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {intl.formatMessage({
                    id: "dashboard.chart.revenue_by_category_empty_sub",
                    defaultMessage:
                      "Once orders are approved, categories will appear here.",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {allowedActions.length > 0 ? (
        <section
          className="space-y-3"
          aria-label={intl.formatMessage({
            id: "dashboard.section.quick_actions",
            defaultMessage: "Quick actions",
          })}
          data-ai-context={JSON.stringify({ section: "quick-actions", count: allowedActions.length })}
        >
          <div>
            <h2 className="font-heading text-base font-semibold">
              {intl.formatMessage({
                id: "dashboard.section.quick_actions",
                defaultMessage: "Quick actions",
              })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "dashboard.section.quick_actions_sub",
                defaultMessage: "Jump into a workflow",
              })}
            </p>
          </div>
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {allowedActions.map((a) => (
              <StaggerItem key={a.id} className="w-full">
                <button
                  type="button"
                  onClick={() => navigate(a.href)}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border bg-card p-3 text-center shadow-sm transition-colors duration-200 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center overflow-hidden rounded-xl",
                      a.tone,
                    )}
                  >
                    <img src={a.icon} alt="" className="size-full object-contain" />
                  </span>
                  <span className="text-xs font-semibold text-foreground leading-tight">{a.label}</span>
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : (
        <EmptyState
          module="order"
          icon={<ShoppingCart className="size-6" />}
          title={intl.formatMessage({
            id: "dashboard.quick_actions_empty",
            defaultMessage: "No quick actions available",
          })}
          description={intl.formatMessage({
            id: "dashboard.quick_actions_empty_sub",
            defaultMessage:
              "You don't have permission to create any of the listed resources yet.",
          })}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          className="shadow-sm"
          aria-label={intl.formatMessage({
            id: "dashboard.section_today",
            defaultMessage: "Today",
          })}
          data-ai-context={JSON.stringify({ section: "today-agenda", count: todayAgenda.length })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "dashboard.section_today",
                defaultMessage: "Today",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "dashboard.section_today_sub",
                defaultMessage: "Your visits and drafts for the day",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 px-3 pb-3 sm:px-4">
            {todayAgenda.length === 0 ? (
              <EmptyState
                module="visit"
                icon={<ClipboardList className="size-6" />}
                title={intl.formatMessage({
                  id: "dashboard.today_empty",
                  defaultMessage: "Nothing scheduled yet",
                })}
                description={intl.formatMessage({
                  id: "dashboard.today_empty_sub",
                  defaultMessage: "Log a visit or start a draft order to see it here.",
                })}
              />
            ) : (
              <Stagger>
                {todayAgenda.map((item) => (
                  <StaggerItem key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                          item.type === "visit"
                            ? "bg-[color-mix(in_srgb,var(--module-visit)_16%,transparent)]"
                            : "bg-[color-mix(in_srgb,var(--module-order)_16%,transparent)]",
                        )}
                        aria-hidden
                      >
                        <img
                          src={item.type === "visit" ? icons.dashVisits : icons.dashOrders}
                          alt=""
                          className="size-full object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      </span>
                      <StatusChip
                        status={item.type === "visit" ? "OPEN" : "DRAFT"}
                        className="shrink-0"
                      />
                    </button>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </CardContent>
        </Card>

        <Card
          className="shadow-sm"
          aria-label={intl.formatMessage({
            id: "dashboard.section_activity",
            defaultMessage: "Recent activity",
          })}
          data-ai-context={JSON.stringify({
            section: "recent-activity",
            count: sales?.recentActivity?.length ?? 0,
          })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "dashboard.section_activity",
                defaultMessage: "Recent activity",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "dashboard.section.activity_sub",
                defaultMessage: "Latest system actions across all users",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 px-3 pb-3 sm:px-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))
            ) : sales?.recentActivity?.length ? (
              <Stagger>
                {sales.recentActivity.map((a) => (
                  <StaggerItem key={a.id}>
                    <div className="flex items-start gap-3 rounded-lg px-2 py-2.5">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary"
                        aria-hidden
                      >
                        {initials(a.userName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{a.userName}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.message}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {formatRelative(a.createdAt)}
                        </p>
                        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                          {a.resource}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <EmptyState
                module="ai"
                icon={<Sparkles className="size-6" />}
                title={intl.formatMessage({
                  id: "dashboard.activity_empty",
                  defaultMessage: "No recent activity",
                })}
                description={intl.formatMessage({
                  id: "dashboard.activity_empty_sub",
                  defaultMessage: "System actions will appear here once they occur.",
                })}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        className="shadow-sm"
        data-ai-context={JSON.stringify({ section: "ai-insights", loading: insightLoading })}
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base">
            {intl.formatMessage({
              id: "dashboard.ai_insights_title",
              defaultMessage: "AI Insights",
            })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({
              id: "dashboard.ai_insights_sub",
              defaultMessage: "Ask about your sales data",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                {
                  id: "dashboard.ai_insight_top_customers",
                  defaultMessage: "Top 5 customers this month",
                },
                {
                  id: "dashboard.ai_insight_at_risk",
                  defaultMessage: "At-risk orders",
                },
                {
                  id: "dashboard.ai_insight_sales_trend",
                  defaultMessage: "Sales trend",
                },
              ] as const
            ).map((item) => {
              const label = intl.formatMessage(item);
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={insightLoading}
                  onClick={() => handleInsightClick(label)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
          {insightLoading ? (
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
            </p>
          ) : null}
          {insightError ? (
            <p className="text-sm text-destructive">{insightError}</p>
          ) : null}
          {insightResult ? (
            <div className="max-w-none break-words rounded-xl border bg-card p-4 text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ node, ...props }) => (
                    <p className="mb-2 last:mb-0" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="mb-2 ml-5 list-disc" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="mb-2 ml-5 list-decimal" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="mb-0.5" {...props} />
                  ),
                  h1: ({ node, ...props }) => (
                    <h1 className="font-heading mb-2 text-lg font-semibold" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="font-heading mb-2 text-base font-semibold" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="font-heading mb-1 text-sm font-semibold" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code
                      className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground"
                      {...props}
                    />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs" {...props} />
                  ),
                }}
              >
                {insightResult}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center opacity-60">
              <Sparkles className="size-5" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({
                  id: "dashboard.ai_insights_empty",
                  defaultMessage: "Select an insight prompt to get started",
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
