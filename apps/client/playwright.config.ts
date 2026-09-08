import { defineConfig } from '@playwright/test';

// Hermetic e2e: Playwright starts its OWN Vite dev server on port 10025 with
// VITE_TRPC_URL pointed at the LOCAL API. This avoids two traps:
//  1. reusing a dev server whose VITE_TRPC_URL points at the production API
//     (cross-site → SameSite=Lax cookies are blocked by Chromium → 401s), and
//  2. mutating production data from tests.
const E2E_PORT = 10025;
const AUTH_STATE = 'playwright/.auth/admin.json';

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 30000,
  retries: 0,
  // Serial: the suite runs against a Vite DEV server whose on-demand module
  // transforms collapse under parallel page loads (each module's first visit
  // compiles dozens of modules). Serial keeps each navigation <2s.
  workers: 1,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
  },
  projects: [
    // Login once → storageState; everything else reuses the session so the
    // suite never trips the login rate limiter (5/min/IP).
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { browserName: 'chromium', storageState: AUTH_STATE },
      dependencies: ['auth-setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: `bunx vite --port ${E2E_PORT} --strictPort`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      VITE_TRPC_URL: 'http://localhost:10022',
    },
  },
});
