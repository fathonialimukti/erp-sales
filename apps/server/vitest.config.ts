import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    // Sweep the rows a previous run leaked, once, before any worker forks.
    globalSetup: ['./src/tests/global-setup.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    watch: false,
    globals: false,
    // One test file at a time, and the reason is data, not CPU: the suite shares
    // a single database, `backup.test.ts` restores by rewriting every table, and
    // a file's teardown deletes rows by id. Overlapping two files puts one
    // file's DELETE in the middle of another's seed, which is what produced
    // `role_has_permissions_permission_id_fkey` / `backups_created_by_id_fkey`
    // violations and a skip count that moved run to run.
    fileParallelism: false,
    // Fresh module registry per file so vi.mock mocks do not leak across files.
    isolate: true,
  },
});
