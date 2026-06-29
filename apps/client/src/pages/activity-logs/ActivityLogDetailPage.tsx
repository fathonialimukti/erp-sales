import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { Spinner } from "../../ui/Spinner";
import { ButtonGroup } from "../../components/ButtonGroup";

type ActivityLogDetail = {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  user: { id: string; name: string; email: string };
  details: string | null;
};

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

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
      <section className="m-page">
        <div className="m-state m-state--loading">
          <Spinner size="lg" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="m-page">
        <div className="m-card">
          <div className="m-card__body">
            <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
              {intl.formatMessage({ id: "activity_log.detail.not_found", defaultMessage: "Activity log not found" })}
            </p>
            <button type="button" className="m-btn m-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/activity-logs")}>
              <BackIcon />
              {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="m-page" data-ai-context={JSON.stringify({ section: "activity-log-detail", id: record.id, action: record.action, resource: record.resource })}>
      <header className="m-detail-hero">
        <div className="m-detail-hero__top">
          <ButtonGroup size="md" items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <BackIcon />, to: "/activity-logs" }]} />
        </div>
        <div className="m-detail-hero__title-block">
          <div className="m-detail-hero__title-row">
            <div className="m-detail-hero__title-stack">
              <span className="m-detail-hero__kicker">{intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}</span>
              <h1 className="m-detail-hero__title">{new Date(record.timestamp).toLocaleString("id-ID")}</h1>
              <span className="m-detail-hero__sub">{record.action} · {record.resource}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="m-card">
        <div className="m-card__header">
          <h2 className="m-card__title">{intl.formatMessage({ id: "activity_log.detail.summary", defaultMessage: "Summary" })}</h2>
        </div>
        <div className="m-card__body">
          <div className="m-section m-section--2">
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "activity_log.detail.timestamp_label", defaultMessage: "Timestamp" })}</span>
              <span className="m-field__value">{new Date(record.timestamp).toLocaleString("id-ID")}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "activity_log.detail.action_label", defaultMessage: "Action" })}</span>
              <span className="m-field__value">{record.action}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "activity_log.detail.resource_label", defaultMessage: "Resource" })}</span>
              <span className="m-field__value">{record.resource}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "activity_log.detail.resource_id_label", defaultMessage: "Resource ID" })}</span>
              <span className="m-field__value">{record.resourceId}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "activity_log.detail.user_label", defaultMessage: "User" })}</span>
              <span className="m-field__value">{record.user.name}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "activity_log.detail.email_label", defaultMessage: "Email" })}</span>
              <span className="m-field__value">{record.user.email}</span>
            </div>
          </div>
        </div>
      </section>

      {record.details && (
        <section className="m-card">
          <div className="m-card__header">
            <h2 className="m-card__title">{intl.formatMessage({ id: "activity_log.detail.details_label", defaultMessage: "Details" })}</h2>
          </div>
          <div className="m-card__body">
            <pre style={{ padding: "1rem", background: "var(--ios-pill-bg)", borderRadius: "0.5rem", fontSize: "0.8125rem", overflow: "auto", maxHeight: "400px", color: "var(--ios-label-2)" }}>
              {record.details}
            </pre>
          </div>
        </section>
      )}
    </section>
  );
};
