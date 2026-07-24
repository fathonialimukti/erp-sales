import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin, Pencil, Trash2, UserRound } from "lucide-react";

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

type CustomerDetail = {
  id: string;
  code: string | null;
  name: string;
  status: string;
  outlets: { id: string; code: string | null; name: string }[];
  contacts: { id: string; name: string; title: string | null; email: string | null; phone: string | null }[];
};

export const CustomerDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("customer@update");
  const canDelete = hasPermission("customer@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customerDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.customer.detail.query({ id: id ?? "" }),
  });

  const customer = data as CustomerDetail | undefined;

  const handleDelete = async () => {
    if (!customer || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.customer.delete.mutate({ id: customer.id });
      await queryClient.invalidateQueries({ queryKey: ["customerList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "customer.detail.delete_success",
          defaultMessage: "Customer deleted",
        }),
      );
      navigate("/customer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex flex-col gap-6 pt-2 pb-8" data-ai-context={JSON.stringify({ section: "customer-detail", loading: true })}>
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="flex flex-col gap-6 pt-2 pb-8" data-ai-context={JSON.stringify({ section: "customer-detail", notFound: true })}>
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/customer")} />
          <PageHeader
            module="customer"
            title={intl.formatMessage({ id: "customer.detail.not_found", defaultMessage: "Customer not found" })}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "customer-detail",
        id: customer.id,
        name: customer.name,
        areaCount: customer.outlets?.length ?? 0,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/customer")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/customer/${customer.id}/edit`)}
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
          module="customer"
          eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
          title={customer.name}
          description={customer.code ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-customer)_14%,transparent)] text-[var(--module-customer)]">
              <UserRound className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "customer.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "customer.detail.code_label", defaultMessage: "Code" })}
              </dt>
              <dd className="font-mono text-sm text-foreground">{customer.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "customer.detail.name_label", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-medium text-foreground">{customer.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "customer.index.header_status", defaultMessage: "Status" })}
              </dt>
              <dd>
                <StatusChip status={customer.status} />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "customer.detail.areas_label", defaultMessage: "Outlets" })}
              </dt>
              <dd className="text-sm tabular-nums text-foreground">{customer.outlets?.length ?? 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-outlet)_14%,transparent)] text-[var(--module-outlet)]">
              <MapPin className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "customer.detail.outlets_title", defaultMessage: "Outlets" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "customer.detail.outlets_count",
                defaultMessage: "{count, plural, one {# outlet} other {# outlets}}",
              },
              { count: customer.outlets?.length ?? 0 },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {(customer.outlets?.length ?? 0) === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({ id: "customer.detail.no_outlets", defaultMessage: "No outlets yet" })}
            </p>
          ) : (
            <ul className="divide-y">
              {customer.outlets?.map((outlet) => (
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
        title={intl.formatMessage({
          id: "customer.detail.delete_title",
          defaultMessage: "Delete customer",
        })}
        description={intl.formatMessage(
          {
            id: "customer.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: customer.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
