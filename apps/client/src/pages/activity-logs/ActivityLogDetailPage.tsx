import { type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Chip,
  EmptyState,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../ui';
import { Icon } from "../../ui";
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import { trpcClient } from '../../lib/trpc';

type JsonRecord = Record<string, unknown>;

type ActivityLogDetail = {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
  resource: string;
  resourceId: string;
  message: string;
  detail: unknown;
  createdAt: string;
  user: { id: string; name: string | null; email: string; photo?: string | null };
};

const ACTION_TONE: Record<ActivityLogDetail['action'], 'neutral' | 'accent' | 'warning' | 'danger' | 'success'> = {
  CREATE: 'success',
  UPDATE: 'accent',
  DELETE: 'danger',
  APPROVE: 'success',
  REJECT: 'danger',
  LOGIN: 'neutral',
  LOGOUT: 'warning',
  EXPORT: 'accent',
  IMPORT: 'neutral',
};

const isPlainObject = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const prettify = (value: unknown) => JSON.stringify(value, null, 2);

const formatLabel = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const DetailField = ({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) => (
  <div className="flex flex-col gap-1">
    <p className="text-sm text-slate-500">{label}</p>
    <div className={mono ? 'break-all font-mono text-sm' : 'text-sm'}>{value}</div>
  </div>
);

const PayloadPanel = ({ title, description, content }: { title: string; description: string; content: ReactNode }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardBody>{content}</CardBody>
  </Card>
);

const renderValueList = (values: unknown[] = []) => {
  if (!values.length) {
    return <p className="text-sm text-slate-500">No values.</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {values.map((item, index) => (
        <li key={index}>{String(item)}</li>
      ))}
    </ul>
  );
};

const isAddRemovePayload = (value: unknown): value is { add?: unknown[]; remove?: unknown[] } =>
  isPlainObject(value) && (Array.isArray((value as { add?: unknown[] }).add) || Array.isArray((value as { remove?: unknown[] }).remove));

const SimpleObjectTable = ({ data }: { data: JsonRecord }) => {
  const entries = Object.entries(data);
  if (!entries.length) {
    return (
      <EmptyState
        icon={<Icon icon="solar:document-text-linear" className="size-6 text-slate-400" />}
        title="No data"
        description="No data available."
      />
    );
  }
  return (
    <Table aria-label="Activity log detail object table">
      <THead>
        <TR>
          <TH>Field</TH>
          <TH>Value</TH>
        </TR>
      </THead>
      <TBody>
        {entries.map(([key, value]) => (
          <TR key={key}>
            <TD className="align-top font-medium">{formatLabel(key)}</TD>
            <TD>
              {isPlainObject(value) || Array.isArray(value) ? (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">
                  {prettify(value)}
                </pre>
              ) : (
                <span className="text-sm">{String(value ?? '-')}</span>
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
};

const DetailPayload = ({ action, detail, intl }: { action: string; detail: unknown; intl: ReturnType<typeof useIntl> }) => {
  if (detail == null) {
    return (
      <EmptyState
        icon={<Icon icon="solar:shield-check-linear" className="size-6 text-slate-400" />}
        title={intl.formatMessage({ id: 'activitylog_detail.nodetails_title', defaultMessage: 'No details' })}
        description={intl.formatMessage({ id: 'activitylog_detail.nodetails', defaultMessage: 'No details available.' })}
      />
    );
  }

  if (isAddRemovePayload(detail)) {
    const addValues = detail.add ?? [];
    const removeValues = detail.remove ?? [];

    if (action === 'UPDATE') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <PayloadPanel
            title={intl.formatMessage({ id: 'activitylog.addtitle', defaultMessage: 'Added' })}
            description={intl.formatMessage({ id: 'activitylog.adddescription', defaultMessage: 'Items added during this operation.' })}
            content={renderValueList(addValues)}
          />
          <PayloadPanel
            title={intl.formatMessage({ id: 'activitylog.removetitle', defaultMessage: 'Removed' })}
            description={intl.formatMessage({ id: 'activitylog.removedescription', defaultMessage: 'Items removed during this operation.' })}
            content={renderValueList(removeValues)}
          />
        </div>
      );
    }

    if (addValues.length > 0) {
      return (
        <PayloadPanel
          title={intl.formatMessage({ id: 'activitylog.addtitle', defaultMessage: 'Added' })}
          description={intl.formatMessage({ id: 'activitylog.adddescription', defaultMessage: 'Items added during this operation.' })}
          content={renderValueList(addValues)}
        />
      );
    }

    return (
      <EmptyState
        icon={<Icon icon="solar:document-text-linear" className="size-6 text-slate-400" />}
        title={intl.formatMessage({ id: 'activitylog_detail.nodetails_title', defaultMessage: 'No details' })}
        description={intl.formatMessage({ id: 'activitylog_detail.nodetails', defaultMessage: 'No details available.' })}
      />
    );
  }

  if (action === 'UPDATE' && isPlainObject(detail)) {
    const { changes, ...rest } = detail as JsonRecord & { changes?: JsonRecord };
    if (changes && isPlainObject(changes)) {
      return (
        <div className="space-y-4">
          <PayloadPanel
            title={intl.formatMessage({ id: 'activitylog.changestitle', defaultMessage: 'Field changes' })}
            description={intl.formatMessage({ id: 'activitylog.changesdescription', defaultMessage: 'Fields updated in this operation.' })}
            content={<SimpleObjectTable data={changes} />}
          />
          {Object.keys(rest).length > 0 ? (
            <PayloadPanel
              title={intl.formatMessage({ id: 'activitylog.additionaldetailstitle', defaultMessage: 'Additional details' })}
              description={intl.formatMessage({ id: 'activitylog.additionaldetailsdescription', defaultMessage: 'Other context recorded with this operation.' })}
              content={<SimpleObjectTable data={rest} />}
            />
          ) : null}
        </div>
      );
    }
  }

  if (isPlainObject(detail)) {
    return (
      <PayloadPanel
        title={intl.formatMessage({ id: 'activitylog.detailtitle', defaultMessage: 'Detail' })}
        description={intl.formatMessage({ id: 'activitylog.detaildescription', defaultMessage: 'Structured payload recorded for this operation.' })}
        content={<SimpleObjectTable data={detail} />}
      />
    );
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-xs dark:bg-slate-800">
      {prettify(detail)}
    </pre>
  );
};

const ActivityLogDetailPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['activityLogDetail', id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.activityLog.detail.query({ id: id ?? '' }),
  });

  const record = data as ActivityLogDetail | undefined;

  if (isLoading) {
    return (
      <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'activity-log-detail', id, loading: true })}>
        <PageHeader
          title={intl.formatMessage({ id: 'activitylog_detail.title', defaultMessage: 'Activity log' })}
          onBack={() => navigate('/activity-logs')}
        />
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="space-y-6" data-ai-context={JSON.stringify({ section: 'activity-log-detail', id, found: false })}>
        <PageHeader
          title={intl.formatMessage({ id: 'activitylog_detail.title', defaultMessage: 'Activity log' })}
          onBack={() => navigate('/activity-logs')}
        />
        <Card>
          <CardBody>
            <p className="text-sm text-red-600">
              {intl.formatMessage({ id: 'activitylog_detail.not_found', defaultMessage: 'Activity log not found.' })}
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  return (
    <section
      className="space-y-6"
      data-ai-context={JSON.stringify({
        section: 'activity-log-detail',
        id: record.id,
        action: record.action,
        resource: record.resource,
      })}
    >
      <PageHeader
        title={record.message}
        onBack={() => navigate('/activity-logs')}
      />
      <p className="-mt-4 text-sm text-slate-500">
        {record.user.name ?? record.user.email} • {formatDate(record.createdAt)}
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{intl.formatMessage({ id: 'activitylog_detail.summary', defaultMessage: 'Summary' })}</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <DetailField label={intl.formatMessage({ id: 'activitylog_detail.action', defaultMessage: 'Action' })} value={<Chip tone={ACTION_TONE[record.action]}>{record.action}</Chip>} />
            <DetailField label={intl.formatMessage({ id: 'activitylog_detail.resource', defaultMessage: 'Resource' })} value={<span className="font-mono text-xs">{record.resource}</span>} mono />
            <DetailField label={intl.formatMessage({ id: 'activitylog_detail.resource_id', defaultMessage: 'Resource ID' })} value={<span className="font-mono text-xs">{record.resourceId}</span>} mono />
            <DetailField label={intl.formatMessage({ id: 'activitylog_detail.when', defaultMessage: 'When' })} value={formatDate(record.createdAt)} mono />
            <DetailField label={intl.formatMessage({ id: 'activitylog_detail.user', defaultMessage: 'User' })} value={record.user.name ?? record.user.email} />
            <DetailField label={intl.formatMessage({ id: 'activitylog_detail.email', defaultMessage: 'Email' })} value={record.user.email} mono />
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{intl.formatMessage({ id: 'activitylog_detail.payload', defaultMessage: 'Payload' })}</CardTitle>
            <CardDescription>{intl.formatMessage({ id: 'activitylog_detail.payloaddescription', defaultMessage: 'Recorded changes or context for this event.' })}</CardDescription>
          </CardHeader>
          <CardBody>
            <DetailPayload action={record.action} detail={record.detail} intl={intl} />
          </CardBody>
        </Card>
      </div>
    </section>
  );
};

export { ActivityLogDetailPage };
