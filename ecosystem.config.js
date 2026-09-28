module.exports = {
  apps: [
    {
      name: 'erp-server',
      cwd: '/workspaces/erp-sales/apps/server',
      // Run the entrypoint directly, NOT `bun run dev`. `dev` is
      // `bun --watch src/index.ts`, so `bun run dev` makes the watcher pm2's
      // child and the real server its *grandchild*: `pm2 stop` left orphans on
      // PPID 1 that kept serving /healthz, and `pm2 restart` lost the port
      // bind to the old orphan while it kept serving stale code. This process
      // is now the server, so stop/restart are real.
      // Env is unaffected: `lib/prisma.ts` does `import "dotenv/config"`, which
      // resolves `apps/server/.env` against this same `cwd`.
      // Watching is a dev-only affordance; the production path must not watch
      // (the watcher also restarts on its own log writes). `bun run dev` at the
      // repo root is unchanged and still runs turbo dev for all apps.
      script: 'bun',
      args: 'src/index.ts',
      interpreter: 'none',
      env: { NODE_ENV: 'development' },
      kill_timeout: 10000,
      listen_timeout: 8000,
      shutdown_with_message: true,
    },
    {
      name: 'erp-client',
      cwd: '/workspaces/erp-sales/apps/client',
      script: 'bun',
      args: 'run dev',
      interpreter: 'none',
      env: { NODE_ENV: 'development' },
    },
    {
      name: 'opencode',
      cwd: '/workspaces/erp-sales',
      // Credentials are NOT inline here — this file is git-tracked. pm2 7 has
      // no `process_env_file` option (it ignores the key); the app env is the
      // pm2 daemon's process.env plus this config's `env`, so the secrets are
      // sourced from the git-ignored .env.opencode at spawn time. `exec` keeps
      // this process as pm2's child, and a missing .env.opencode fails closed
      // rather than starting the server unauthenticated.
      script: 'sh',
      args: [
        '-c',
        'set -a; . ./.env.opencode; set +a; exec /usr/local/bin/opencode serve --hostname 0.0.0.0 --port 10023',
      ],
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        // Enables the built-in websearch tool for non-OpenCode providers
        // (e.g. routers9). Backend is OpenCode's hosted search, no extra key.
        OPENCODE_ENABLE_EXA: '1',
      },
    },
  ],
};
