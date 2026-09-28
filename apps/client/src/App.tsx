import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { useAtomValue } from 'jotai';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProviders } from './providers';
import { router } from './routes';
import { useAuthBootstrap } from './lib/useAuth';
import { useLocale } from './lib/useLocale';
import { themeModeAtom } from './lib/atoms';
import { RouteLoader } from './components/RouteLoader';

function ThemeSync() {
  const theme = useAtomValue(themeModeAtom);
  const { locale } = useLocale();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // WCAG 3.1.1/3.1.2: <html lang> must follow the active locale, else screen
    // readers apply English pronunciation to Indonesian copy.
    document.documentElement.lang = locale;
  }, [theme, locale]);
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
