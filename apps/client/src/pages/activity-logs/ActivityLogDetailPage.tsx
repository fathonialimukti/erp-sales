import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityLogDetail = {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
  detail: string | null;
  message?: string | null;
};

export const ActivityLogDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["activityLogDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.activityLog.detail.query({ id: id ?? "" }),
  });

  const record = data as ActivityLogDetail | undefined;

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "activity-log-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (!record) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "activity-log-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/activity-logs")} />
          <PageHeader
            module="user"
            title={intl.formatMessage({
              id: "activity_log.detail.not_found",
              defaultMessage: "Activity log not found",
            })}
          />
        </div>
      </section>
    );
  }

  const timestamp = record.createdAt;
  const details = record.detail ?? record.message ?? null;

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "activity-log-detail",
        id: record.id,
        action: record.action,
        resource: record.resource,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/activity-logs")} />
        <PageHeader
          module="user"
          eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
          title={new Date(timestamp).toLocaleString("id-ID")}
          description={`${record.action} · ${record.resource}`}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-user)_14%,transparent)] text-[var(--module-user)]">
              <ScrollText className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "activity_log.detail.summary",
              defaultMessage: "Summary",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "activity_log.detail.timestamp_label",
                  defaultMessage: "Timestamp",
                })}
              </dt>
              <dd className="font-mono text-sm text-foreground">
                {new Date(timestamp).toLocaleString("id-ID")}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "activity_log.detail.action_label",
                  defaultMessage: "Action",
                })}
              </dt>
              <dd>
                <Badge variant="secondary">{record.action}</Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "activity_log.detail.resource_label",
                  defaultMessage: "Resource",
                })}
              </dt>
              <dd className="text-sm text-foreground">{record.resource}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "activity_log.detail.resource_id_label",
                  defaultMessage: "Resource ID",
                })}
              </dt>
              <dd className="font-mono text-xs text-foreground">{record.resourceId}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "activity_log.detail.user_label",
                  defaultMessage: "User",
                })}
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {record.user.name ?? "—"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "activity_log.detail.email_label",
                  defaultMessage: "Email",
                })}
              </dt>
              <dd className="text-sm text-foreground">{record.user.email}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {details ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "activity_log.detail.details_label",
                defaultMessage: "Details",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-xs text-muted-foreground">
              {details}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
};
