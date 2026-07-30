import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  ChevronRight,
  Package,
  PackageCheck,
  Pencil,
  ShoppingCart,
  Tags,
  Trash2,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { KpiCard } from "../../components/KpiCard";
import { Stagger, StaggerItem } from "../../components/motion/Stagger";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SkuCategoryDetail = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  skus: { id: string; code: string | null; name: string }[];
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

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

export const SkuCategoryDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("skuCategory@update");
  const canDelete = hasPermission("skuCategory@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["skuCategoryDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.skuCategory.detail.query({ id: id ?? "" }),
  });

  const statsQuery = useQuery({
    queryKey: ["skuCategoryStats", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.skuCategory.stats.query({ id: id ?? "" }),
  });
  const stats = statsQuery.data;
  const statsLoading = statsQuery.isLoading;
  const revenueTrend = stats?.revenueTrend ?? [];
  const revenueChartData = revenueTrend.map((p) => ({
    label: formatShortDate(p.date),
    total: p.total,
  }));
  const hasRevenueData =
    revenueChartData.length > 0 && revenueChartData.some((p) => p.total > 0);
  const topSkus = stats?.topSkus ?? [];

  const skuCategory = data as SkuCategoryDetail | undefined;

  const handleDelete = async () => {
    if (!skuCategory || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.skuCategory.delete.mutate({ id: skuCategory.id });
      await queryClient.invalidateQueries({ queryKey: ["skuCategoryList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "sku_category.detail.delete_success",
          defaultMessage: "SKU category deleted",
        }),
      );
      navigate("/sku-category");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "skuCategory-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!skuCategory) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "skuCategory-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/sku-category")} />
          <PageHeader
            module="sku"
            title={intl.formatMessage({
              id: "sku_category.detail.not_found",
              defaultMessage: "Category not found",
            })}
          />
        </div>
      </section>
    );
  }

  const skus = skuCategory.skus ?? [];

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "skuCategory-detail",
        id: skuCategory.id,
        name: skuCategory.name,
        skuCount: skus.length,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/sku-category")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/sku-category/${skuCategory.id}/edit`)}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
            </Button>
          ) : null}
        </NavButtonGroup>

        <PageHeader
          module="sku"
          eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
          title={skuCategory.name}
          description={skuCategory.code ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_8%,transparent)] text-module-sku">
              <Tags className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "sku_category.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku_category.detail.code_label", defaultMessage: "Code" })}
              </dt>
              <dd className="font-mono text-sm text-foreground">{skuCategory.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku_category.detail.name_label", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{skuCategory.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku_category.detail.areas_label", defaultMessage: "SKUs" })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">{stats?.skuCount ?? skus.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Stagger
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label={intl.formatMessage({
          id: "sku_category.detail.kpi_section",
          defaultMessage: "Category metrics",
        })}
      >
        <StaggerItem>
          <KpiCard
            module="sku"
            icon={<Package className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "sku_category.detail.kpi_skus",
              defaultMessage: "SKUs",
            })}
            value={statsLoading ? <Skeleton className="h-7 w-16" /> : stats?.skuCount ?? 0}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            module="sku"
            icon={<PackageCheck className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "sku_category.detail.kpi_active",
              defaultMessage: "Active SKUs",
            })}
            value={statsLoading ? <Skeleton className="h-7 w-16" /> : stats?.activeSkuCount ?? 0}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            module="sku"
            icon={<Tags className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "sku_category.detail.kpi_catalog_value",
              defaultMessage: "Catalog value",
            })}
            value={
              statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatCurrency(stats?.catalogValue ?? 0)
              )
            }
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            module="order"
            icon={<ShoppingCart className="size-5" aria-hidden />}
            label={intl.formatMessage({
              id: "sku_category.detail.kpi_month_revenue",
              defaultMessage: "Month revenue",
            })}
            delta={stats?.revenueDeltaPercent ?? null}
            value={
              statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatCurrency(stats?.monthRevenue ?? 0)
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
                id: "sku_category.detail.chart_revenue_trend",
                defaultMessage: "Revenue trend",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "sku_category.detail.chart_revenue_trend_sub",
                defaultMessage: "Approved sales — last 30 days",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="w-full rounded-xl" style={{ height: 220 }} />
            ) : hasRevenueData ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="auroraCatRevFill" x1="0" y1="0" x2="0" y2="1">
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
                      formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={chartColors.primary}
                      strokeWidth={2.5}
                      fill="url(#auroraCatRevFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-1 text-center"
                style={{ height: 220 }}
              >
                <p className="text-sm font-medium text-foreground">
                  {intl.formatMessage({
                    id: "sku_category.detail.chart_no_data",
                    defaultMessage: "No approved sales yet",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "sku_category.detail.chart_top_skus",
                defaultMessage: "Top SKUs",
              })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({
                id: "sku_category.detail.chart_top_skus_sub",
                defaultMessage: "By approved revenue this month",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="w-full rounded-xl" style={{ height: 240 }} />
            ) : topSkus.length > 0 ? (
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSkus}
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
                      formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill={chartColors.secondary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-1 text-center"
                style={{ height: 240 }}
              >
                <p className="text-sm font-medium text-foreground">
                  {intl.formatMessage({
                    id: "sku_category.detail.chart_no_data",
                    defaultMessage: "No approved sales yet",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_8%,transparent)] text-module-sku">
              <Package className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "sku_category.detail.skus_title", defaultMessage: "SKUs" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "sku_category.detail.skus_count",
                defaultMessage: "{count, plural, one {# SKU} other {# SKUs}}",
              },
              { count: skus.length },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {skus.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "sku_category.detail.no_skus",
                defaultMessage: "No SKUs yet",
              })}
            </p>
          ) : (
            <ul className="divide-y">
              {skus.map((sku) => (
                <li key={sku.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/sku/${sku.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_8%,transparent)] text-module-sku">
                      <Package className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {sku.name}
                      </span>
                      {sku.code ? (
                        <span className="block font-mono text-xs text-foreground">
                          {sku.code}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "sku_category.detail.delete_title",
          defaultMessage: "Delete category",
        })}
        description={intl.formatMessage(
          {
            id: "sku_category.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: skuCategory.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
