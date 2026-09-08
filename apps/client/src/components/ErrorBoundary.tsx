import { Component, type ReactNode } from 'react';
import { API_BASE_URL } from '../lib/api-base';

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

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React error boundary caught:', error, info);
    reportClientError(error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="mt-2 text-muted-foreground">An unexpected error occurred.</p>
            <button
              onClick={this.handleReload}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
