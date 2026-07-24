import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Pencil, Store, Trash2, UserRound } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type OutletDetail = {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  status: string;
  customer: { id: string; name: string } | null;
  area: { id: string; name: string; region: { id: string; name: string } } | null;
  contacts: { id: string; name: string; title: string | null; email: string | null; phone: string | null }[];
};

export const OutletDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("outlet@update");
  const canDelete = hasPermission("outlet@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["outletDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.outlet.detail.query({ id: id ?? "" }),
  });

  const outlet = data as OutletDetail | undefined;

  const handleDelete = async () => {
    if (!outlet || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.outlet.delete.mutate({ id: outlet.id });
      await queryClient.invalidateQueries({ queryKey: ["outletList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({ id: "outlet.detail.delete_success", defaultMessage: "Outlet deleted" }),
      );
      navigate("/outlet");
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
        data-ai-context={JSON.stringify({ section: "outlet-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!outlet) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "outlet-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/outlet")} />
          <PageHeader
            module="outlet"
            title={intl.formatMessage({
              id: "outlet.detail.not_found",
              defaultMessage: "Outlet not found",
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
        section: "outlet-detail",
        id: outlet.id,
        name: outlet.name,
        contactCount: outlet.contacts?.length ?? 0,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/outlet")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/outlet/${outlet.id}/edit`)}
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
          module="outlet"
          eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
          title={outlet.name}
          description={outlet.code ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-outlet)_14%,transparent)] text-[var(--module-outlet)]">
              <Store className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "outlet.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "outlet.detail.code_label", defaultMessage: "Code" })}
              </dt>
              <dd className="font-mono text-sm text-foreground">{outlet.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "outlet.detail.name_label", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-medium text-foreground">{outlet.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "outlet.detail.customer_label", defaultMessage: "Customer" })}
              </dt>
              <dd className="text-sm text-foreground">{outlet.customer?.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "outlet.detail.area_label", defaultMessage: "Area" })}
              </dt>
              <dd className="text-sm text-foreground">{outlet.area?.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "outlet.detail.region_label", defaultMessage: "Region" })}
              </dt>
              <dd className="text-sm text-foreground">{outlet.area?.region?.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "outlet.detail.status_label", defaultMessage: "Status" })}
              </dt>
              <dd>
                <StatusChip status={outlet.status} />
              </dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "outlet.form.field_address", defaultMessage: "Address" })}
              </dt>
              <dd className="text-sm text-foreground">{outlet.address ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-customer)_14%,transparent)] text-[var(--module-customer)]">
              <UserRound className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "outlet.detail.contacts_title", defaultMessage: "Contacts" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "outlet.detail.contacts_count",
                defaultMessage: "{count, plural, one {# contact} other {# contacts}}",
              },
              { count: outlet.contacts?.length ?? 0 },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {(outlet.contacts?.length ?? 0) === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "outlet.detail.no_contacts",
                defaultMessage: "No contacts yet",
              })}
            </p>
          ) : (
            <ul className="divide-y">
              {outlet.contacts?.map((contact) => (
                <li key={contact.id}>
                  <div className="flex w-full items-center gap-3 px-6 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-customer)_14%,transparent)] text-[var(--module-customer)]">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {contact.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[contact.title, contact.phone, contact.email].filter(Boolean).join(" · ") ||
                          "—"}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0" aria-hidden />
                  </div>
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
          id: "outlet.detail.delete_title",
          defaultMessage: "Delete outlet",
        })}
        description={intl.formatMessage(
          {
            id: "outlet.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: outlet.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
