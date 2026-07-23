import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Package, Pencil, Tags, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../ui/useToast";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
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
      navigate("/skuCategory");
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
        <PageHeader
          module="sku"
          title={intl.formatMessage({
            id: "sku_category.detail.not_found",
            defaultMessage: "Category not found",
          })}
          onBack={() => navigate("/skuCategory")}
        />
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
      <PageHeader
        module="sku"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={skuCategory.name}
        description={skuCategory.code ?? "—"}
        onBack={() => navigate("/skuCategory")}
        actions={
          <>
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/skuCategory/${skuCategory.id}/edit`)}
              >
                <Pencil className="size-4" />
                {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
              </Button>
            ) : null}
            {canDelete ? (
              <Button type="button" variant="destructive" onClick={() => setDeleteModalOpen(true)}>
                <Trash2 className="size-4" />
                {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_14%,transparent)] text-[var(--module-sku)]">
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
              <dd className="text-sm font-medium text-foreground">{skuCategory.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku_category.detail.areas_label", defaultMessage: "SKUs" })}
              </dt>
              <dd className="text-sm tabular-nums text-foreground">{skus.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_14%,transparent)] text-[var(--module-sku)]">
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
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_14%,transparent)] text-[var(--module-sku)]">
                      <Package className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {sku.name}
                      </span>
                      {sku.code ? (
                        <span className="block font-mono text-xs text-muted-foreground">
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
