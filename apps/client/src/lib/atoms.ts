import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Locale } from './i18n';
import { getInitialLocale, persistLocale } from './locale';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
}

export interface UserWithPermissions extends User {
  permissions: string[];
  roleName: string;
}

// Auth state
export const authTokenAtom = atomWithStorage<string | null>('auth-token', null);
export const authUserAtom = atomWithStorage<UserWithPermissions | null>('auth-user', null);
export const authBootstrapReadyAtom = atom(false);
export const isAuthenticatedAtom = atom((get) => Boolean(get(authTokenAtom)));

// UI state
export const sidebarOpenAtom = atomWithStorage<boolean>('sidebar-open', true);
export const themeModeAtom = atomWithStorage<'light' | 'dark'>('theme-mode', 'light');
export const notificationsOpenAtom = atomWithStorage<boolean>('notifications-open', false);
export const searchOpenAtom = atomWithStorage<boolean>('search-open', false);
export const userMenuOpenAtom = atom(false);
export const localeAtom = atom<Locale>(getInitialLocale());
export const localeActionsAtom = atom(null, (_get, set, newLocale: Locale) => {
  set(localeAtom, newLocale);
  persistLocale(newLocale);
});

// Computed atom for user permissions
export const userPermissionsAtom = atom((get) => {
  const user = get(authUserAtom);
  return user?.permissions ?? [];
});

// All-access signal: the "System Admin" role is seeded with pattern "*" (full
// system access) and is the codebase's existing admin fallback (server libs
// resolve all-access via this role name; server hasPermission honors the same
// flag). A literal "*" in the permission list is honored too, so expanded and
// wildcard grants behave identically on the client.
const ALL_ACCESS_ROLE_NAME = "System Admin";
const ALL_ACCESS_WILDCARD = "*";

// Helper to check if user has permission
export const hasPermissionAtom = atom(
  (get) => (permission: string | string[]) => {
    const user = get(authUserAtom);
    if (user?.roleName === ALL_ACCESS_ROLE_NAME) return true;
    const permissions = user?.permissions ?? [];
    if (permissions.includes(ALL_ACCESS_WILDCARD)) return true;
    const required = Array.isArray(permission) ? permission : [permission];

    return required.some((requiredPermission) =>
      permissions.includes(requiredPermission),
    );
  },
);

export const clearAuthAtom = atom(null, (_get, set) => {
  set(authTokenAtom, null);
  set(authUserAtom, null);
});

// AI form-fill bridge: AI sets this atom; form pages read and apply values
export const aiFormFillAtom = atom<Record<string, unknown> | null>(null);
