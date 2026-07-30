import { parse } from 'cookie';

export type ServerLocale = 'en' | 'id';
export const DEFAULT_LOCALE: ServerLocale = 'en';
export const SUPPORTED_LOCALES: ServerLocale[] = ['en', 'id'];
export const LOCALE_COOKIE_NAME = 'app-locale';

type MessageParams = Record<string, string | number | boolean | null | undefined>;

const messages: Record<ServerLocale, Record<string, string>> = {
  en: {
    // Auth
    'auth.invalidCredentials': 'Invalid email or password',
    'auth.authenticationRequired': 'Authentication required',
    'auth.noRoleAssigned': 'No role assigned',
    'auth.insufficientPermissions': 'Insufficient permissions',
    'auth.rateLimitExceeded': 'Too many login attempts. Please try again later.',
    'auth.csrfTokenInvalid': 'Invalid CSRF token',
    'notification.notFound': 'Notification not found',
    'notification.noAccess': 'You do not have access to this notification',
    'notification.noRecipients': 'No recipients specified.',

    // Upload
    'upload.invalidImageFormat': 'Invalid image format.',
    'upload.unsupportedImageFormat': 'Unsupported image format.',

    // SKU
    'sku.notFound': 'SKU not found',
    'sku.codeTaken': 'SKU code is already taken',

    // Activity Log
    'activityLog.notFound': 'Activity log not found',

    // Role
    'role.notFound': 'Role not found',

    // Permission
    'permission.notFound': 'Permission not found',

    // User
    'user.notFound': 'User not found',
    'user.emailExists': 'Email already exists',
    'user.cannotDeleteLastAdmin': 'Cannot delete the last system admin',
  },
  id: {
    // Auth
    'auth.invalidCredentials': 'Email atau kata sandi salah',
    'auth.authenticationRequired': 'Autentikasi diperlukan',
    'auth.noRoleAssigned': 'Tidak ada peran yang ditetapkan',
    'auth.insufficientPermissions': 'Izin tidak mencukupi',
    'auth.rateLimitExceeded': 'Terlalu banyak upaya login. Silakan coba lagi nanti.',
    'auth.csrfTokenInvalid': 'Token CSRF tidak valid',
    'notification.notFound': 'Notifikasi tidak ditemukan',
    'notification.noAccess': 'Anda tidak memiliki akses ke notifikasi ini',
    'notification.noRecipients': 'Tidak ada penerima yang ditentukan.',

    // Upload
    'upload.invalidImageFormat': 'Format gambar tidak valid.',
    'upload.unsupportedImageFormat': 'Format gambar tidak didukung.',

    // SKU
    'sku.notFound': 'SKU tidak ditemukan',
    'sku.codeTaken': 'Kode SKU sudah digunakan',

    // Activity Log
    'activityLog.notFound': 'Activity log tidak ditemukan',

    // Role
    'role.notFound': 'Role tidak ditemukan',

    // Permission
    'permission.notFound': 'Permission tidak ditemukan',

    // User
    'user.notFound': 'User tidak ditemukan',
    'user.emailExists': 'Email sudah ada',
    'user.cannotDeleteLastAdmin': 'Tidak dapat menghapus admin sistem terakhir',
  },
};

export const parseLocaleCookie = (cookieHeader?: string): ServerLocale => {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const cookies = parse(cookieHeader);
  const candidate = cookies[LOCALE_COOKIE_NAME];
  if (candidate === 'id') return 'id';
  return DEFAULT_LOCALE;
};

export const getMessage = (locale: ServerLocale, key: string, params?: MessageParams): string => {
  const template = messages[locale]?.[key] ?? messages[DEFAULT_LOCALE]?.[key] ?? key;
  if (!params) return template;
  return Object.entries(params).reduce((message, [paramName, paramValue]) => {
    return message.replace(new RegExp(`\\{${paramName}\\}`, 'g'), String(paramValue ?? ''));
  }, template);
};
