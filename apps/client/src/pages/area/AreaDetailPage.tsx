import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Grid2x2, MapPin, Pencil, Store, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
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

type AreaDetail = {
  id: string;
  code: string | null;
  name: string;
  region: { id: string; name: string } | null;
  outlets: { id: string; code: string | null; name: string }[];
};

export const AreaDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("area@update");
  const canDelete = hasPermission("area@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["areaDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.area.detail.query({ id: id ?? "" }),
  });

  const area = data as AreaDetail | undefined;

  const handleDelete = async () => {
    if (!area || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.area.delete.mutate({ id: area.id });
      await queryClient.invalidateQueries({ queryKey: ["areaList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({ id: "area.detail.delete_success", defaultMessage: "Area deleted" }),
      );
      navigate("/area");
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
        data-ai-context={JSON.stringify({ section: "area-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!area) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "area-detail", notFound: true })}
      >
        <PageHeader
          module="area"
          title={intl.formatMessage({ id: "area.detail.not_found", defaultMessage: "Area not found" })}
          onBack={() => navigate("/area")}
        />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "area-detail",
        id: area.id,
        name: area.name,
        outletCount: area.outlets.length,
      })}
    >
      <PageHeader
        module="area"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={area.name}
        description={area.code ?? "—"}
        onBack={() => navigate("/area")}
        actions={
          <>
            {canUpdate ? (
              <Button type="button" variant="outline" onClick={() => navigate(`/area/${area.id}/edit`)}>
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
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Grid2x2 className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "area.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "area.detail.code_label", defaultMessage: "Code" })}
              </dt>
              <dd className="font-mono text-sm text-foreground">{area.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "area.detail.name_label", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-medium text-foreground">{area.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "area.form.field_region", defaultMessage: "Region" })}
              </dt>
              <dd className="text-sm text-foreground">{area.region?.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "area.detail.areas_label", defaultMessage: "Outlets" })}
              </dt>
              <dd className="text-sm tabular-nums text-foreground">{area.outlets.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-outlet)_14%,transparent)] text-[var(--module-outlet)]">
              <Store className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "area.detail.outlets_title", defaultMessage: "Outlets" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "area.detail.outlets_count",
                defaultMessage: "{count, plural, one {# outlet} other {# outlets}}",
              },
              { count: area.outlets.length },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {area.outlets.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({ id: "area.detail.no_outlets", defaultMessage: "No outlets yet" })}
            </p>
          ) : (
            <ul className="divide-y">
              {area.outlets.map((outlet) => (
                <li key={outlet.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/outlet/${outlet.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-outlet)_14%,transparent)] text-[var(--module-outlet)]">
                      <MapPin className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{outlet.name}</span>
                      {outlet.code ? (
                        <span className="block font-mono text-xs text-muted-foreground">{outlet.code}</span>
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
        title={intl.formatMessage({ id: "area.detail.delete_title", defaultMessage: "Delete area" })}
        description={intl.formatMessage(
          {
            id: "area.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: area.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
