import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Client render tests (SPEC §12). Playwright e2e lives under src/tests/e2e
    // and runs via `bunx playwright test`, not vitest.
    //
    // jsdom must stay on 30.0.x (package.json pins "~30.0.1"). From 30.1.0 jsdom
    // brands wrappers with a private `#impl` field instead of a public symbol;
    // a Proxy's get/has traps do not see private fields, so the WindowProxy
    // fails jsdom's own EventTarget brand check and every worker dies in
    // environment setup with "'addEventListener' called on an object that is not
    // a valid instance of EventTarget". Widening the range back to ^ will
    // re-break the whole suite.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["src/tests/e2e/**", "node_modules/**"],
    setupFiles: ["./vitest.setup.ts"],
    watch: false,
    globals: false,
  },
  resolve: {
    alias: {
      // Mirror vite.config.ts + tsconfig paths.
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
