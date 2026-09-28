import { Component, type ReactNode } from 'react';
import { IntlProvider, useIntl } from 'react-intl';

import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '../lib/api-base';
import { getLocaleMessages } from '../lib/i18n';
import { useLocale } from '../lib/useLocale';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** Fire-and-forget report to the server's client-log endpoint (app_logs). */
function reportClientError(error: Error, info: React.ErrorInfo) {
  try {
    void fetch(`${API_BASE_URL}/api/log/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'ERROR',
        message: `React boundary: ${error.message}`.slice(0, 1000),
        stack: [error.stack, info.componentStack].filter(Boolean).join('\n---\n').slice(0, 8000),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let error reporting break error handling.
  }
}

/** The crash screen. Functional so it can read the active locale like any page. */
function CrashScreen() {
  const intl = useIntl();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">
          {intl.formatMessage({
            id: 'error_boundary.title',
            defaultMessage: 'Something went wrong',
          })}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {intl.formatMessage({
            id: 'error_generic',
            defaultMessage: 'An unexpected error occurred.',
          })}
        </p>
        <Button type="button" className="mt-4" onClick={() => window.location.reload()}>
          {intl.formatMessage({
            id: 'error_boundary.reload',
            defaultMessage: 'Reload Application',
          })}
        </Button>
      </div>
    </div>
  );
}

/**
 * This boundary sits ABOVE <AppProviders>, so on a crash there is no
 * IntlProvider in the tree to format with — the fallback brings its own, or an
 * Indonesian user reads the crash screen in English.
 */
function LocalizedCrashScreen() {
  const { locale } = useLocale();
  return (
    <IntlProvider locale={locale} messages={getLocaleMessages(locale)} defaultLocale="en">
      <CrashScreen />
    </IntlProvider>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React error boundary caught:', error, info);
    reportClientError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <LocalizedCrashScreen />;
    }
    return this.props.children;
  }
}
