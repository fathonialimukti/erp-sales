import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { trpcClient } from '../lib/trpc';

function Dashboard() {
  const intl = useIntl();

  const { isLoading } = useQuery({
    queryKey: ['dashboard.summary'],
    queryFn: () => trpcClient.dashboard.summary.query(),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {intl.formatMessage({ id: 'dashboard.title', defaultMessage: 'Dashboard' })}
        </h1>
        <p className="text-sm text-muted">
          {intl.formatMessage({ id: 'dashboard.subtitle', defaultMessage: 'Welcome to ERP SALES — your sales management system' })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <Card>
          <Card.Header>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary-soft">
                <Icon icon="solar:chart-2-linear" className="size-5 text-primary" />
              </div>
              <div>
                <Card.Title>
                  {intl.formatMessage({ id: 'dashboard.status', defaultMessage: 'System Status' })}
                </Card.Title>
                <Card.Description>
                  {intl.formatMessage({ id: 'dashboard.ready', defaultMessage: 'ERP SALES is ready. Build your sales management features here.' })}
                </Card.Description>
              </div>
            </div>
          </Card.Header>
        </Card>
      )}
    </div>
  );
}

export { Dashboard };
