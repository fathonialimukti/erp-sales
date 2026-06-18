import { Navigate } from "react-router";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { authBootstrapReadyAtom, isAuthenticatedAtom } from "../lib/atoms";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const authBootstrapReady = useAtomValue(authBootstrapReadyAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  if (!authBootstrapReady) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};
