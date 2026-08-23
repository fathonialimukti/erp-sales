import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Map, MapPin, Pencil, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
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

type RegionDetail = {
  id: string;
  code: string | null;
  name: string;
  areas: { id: string; code: string | null; name: string }[];
};

export const RegionDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("region@update");
  const canDelete = hasPermission("region@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["regionDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.region.detail.query({ id: id ?? "" }),
  });

  const region = data as RegionDetail | undefined;

  const handleDelete = async () => {
    if (!region || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.region.delete.mutate({ id: region.id });
      await queryClient.invalidateQueries({ queryKey: ["regionList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({ id: "region.detail.delete_success", defaultMessage: "Region deleted" }),
      );
      navigate("/region");
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "region-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!region) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "region-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/region")} />
          <PageHeader
            module="region"
            title={intl.formatMessage({
              id: "region.detail.not_found",
              defaultMessage: "Region not found",
            })}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "region-detail",
        id: region.id,
        name: region.name,
        areaCount: region.areas.length,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/region")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/region/${region.id}/edit`)}
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
          module="region"
          eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
          title={region.name}
          description={region.code ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-region)_8%,transparent)] text-[var(--module-region)]">
              <Map className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "region.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {intl.formatMessage({ id: "region.detail.code_label", defaultMessage: "Code" })}
            </dt>
            <dd className="font-mono text-sm font-normal text-foreground">{region.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {intl.formatMessage({ id: "region.detail.name_label", defaultMessage: "Name" })}
            </dt>
            <dd className="text-sm font-normal text-foreground">{region.name}</dd>
            </div>
            <div className="space-y-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "region.detail.areas_label", defaultMessage: "Areas" })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">{region.areas.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-region)_8%,transparent)] text-[var(--module-region)]">
              <MapPin className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "region.detail.areas_title", defaultMessage: "Areas" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "region.detail.areas_count",
                defaultMessage: "{count, plural, one {# area} other {# areas}}",
              },
              { count: region.areas.length },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {region.areas.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({ id: "region.detail.no_areas", defaultMessage: "No areas yet" })}
            </p>
          ) : (
            <ul className="divide-y">
              {region.areas.map((area) => (
                <li key={area.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/area/${area.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-region)_8%,transparent)] text-[var(--module-region)]">
                      <MapPin className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {area.name}
                      </span>
                      {area.code ? (
                        <span className="block font-mono text-xs text-muted-foreground">
                          {area.code}
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
          id: "region.detail.delete_title",
          defaultMessage: "Delete region",
        })}
        description={intl.formatMessage(
          {
            id: "region.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: region.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
