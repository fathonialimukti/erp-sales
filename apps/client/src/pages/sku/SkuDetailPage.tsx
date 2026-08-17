import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { formatCurrency } from "@/lib/format";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SkuDetail = {
  id: string;
  code: string | null;
  name: string;
  basePrice: number | null;
  baseUnit: string | null;
  status: string;
  category: { id: string; name: string } | null;
  description: string | null;
};

export const SkuDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("sku@update");
  const canDelete = hasPermission("sku@delete");
  const toast = useToast();
  const { currencyCode } = useGeneralSettings();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["skuDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.sku.detail.query({ id: id ?? "" }),
  });

  const sku = data as SkuDetail | undefined;

  const handleDelete = async () => {
    if (!sku || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.sku.delete.mutate({ id: sku.id });
      await queryClient.invalidateQueries({ queryKey: ["skuList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({ id: "sku.detail.delete_success", defaultMessage: "SKU deleted" }),
      );
      navigate("/sku");
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
        data-ai-context={JSON.stringify({ section: "sku-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (!sku) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "sku-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/sku")} />
          <PageHeader
            module="sku"
            title={intl.formatMessage({ id: "sku.detail.not_found", defaultMessage: "SKU not found" })}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "sku-detail",
        id: sku.id,
        name: sku.name,
        status: sku.status,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/sku")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/sku/${sku.id}/edit`)}
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
          title={sku.name}
          description={sku.code ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_8%,transparent)] text-module-sku">
              <Package className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "sku.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku.detail.code_label", defaultMessage: "Code" })}
              </dt>
              <dd className="font-mono text-sm text-foreground">{sku.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku.detail.name_label", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{sku.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku.detail.category_label", defaultMessage: "Category" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{sku.category?.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku.detail.price_label", defaultMessage: "Base price" })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">
                {sku.basePrice != null ? formatCurrency(sku.basePrice, currencyCode) : "—"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku.detail.unit_label", defaultMessage: "Base unit" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{sku.baseUnit ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "sku.detail.status_label", defaultMessage: "Status" })}
              </dt>
              <dd>
                <StatusChip status={sku.status} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {sku.description ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "sku.detail.description_title",
                defaultMessage: "Description",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{sku.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({ id: "sku.detail.delete_title", defaultMessage: "Delete SKU" })}
        description={intl.formatMessage(
          {
            id: "sku.detail.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: sku.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
