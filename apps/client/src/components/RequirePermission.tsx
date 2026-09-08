import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { authBootstrapReadyAtom, hasPermissionAtom, isAuthenticatedAtom } from '../lib/atoms';
import { RouteLoader } from './RouteLoader';

/**
 * Route-level permission guard (defense in depth — the server remains the
 * source of truth). Waits for the auth bootstrap, requires authentication,
 * then redirects to the dashboard when the user lacks any of the required
 * `resource@action` permissions.
 */
export const RequirePermission = ({
  permission,
  children,
}: {
  permission: string | string[];
  children?: ReactNode;
}) => {
  const authBootstrapReady = useAtomValue(authBootstrapReadyAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const hasPermission = useAtomValue(hasPermissionAtom);
  const location = useLocation();
  const required = Array.isArray(permission) ? permission : [permission];

  if (!authBootstrapReady) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!required.some((p) => hasPermission(p))) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return children ?? <Outlet />;
};
