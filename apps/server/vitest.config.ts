import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    watch: false,
    globals: false,
    // Sequential file execution (fileParallelism: false) — the suite shares one
    // database and restore tests wipe it, so test files must never run concurrently.
    // Per-file isolation (isolate: true) is required so vi.mock module
    // mocks don't leak across files.
    fileParallelism: false,
    isolate: true,
  },
});
