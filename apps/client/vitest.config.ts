import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Client render tests (SPEC §12). Playwright e2e lives under src/tests/e2e
    // and runs via `bunx playwright test`, not vitest.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["src/tests/e2e/**", "node_modules/**"],
    setupFiles: ["./vitest.setup.ts"],
    watch: false,
    globals: false,
  },
  resolve: {
    alias: {
      // Mirror vite.config.ts + tsconfig paths.
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
