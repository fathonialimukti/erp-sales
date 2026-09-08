import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { useAtomValue } from 'jotai';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProviders } from './providers';
import { router } from './routes';
import { useAuthBootstrap } from './lib/useAuth';
import { themeModeAtom } from './lib/atoms';
import { RouteLoader } from './components/RouteLoader';

function ThemeSync() {
  const theme = useAtomValue(themeModeAtom);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

function AppContent() {
  useAuthBootstrap();

  return (
    <Suspense fallback={<RouteLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <ThemeSync />
        <AppContent />
      </AppProviders>
    </ErrorBoundary>
  );
}

export { App };
