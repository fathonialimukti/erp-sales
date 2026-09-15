// CORS origin policy, extracted from the Express entrypoint so it can be
// unit-tested without booting the server (T13: prove the allow-list actually
// contains the production client origin instead of guessing).

/** Dev-only origins: any localhost port + the Tauri webview. */
export function isAllowedDevOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || origin === 'tauri://localhost';
}

/** `CORS_ORIGIN` may list multiple origins, comma-separated. */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Allowed when the request has no Origin (curl, same-origin, server-to-server),
 * matches the configured allow-list, or is a dev-only origin.
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return isAllowedDevOrigin(origin);
}