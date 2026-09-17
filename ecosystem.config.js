module.exports = {
  apps: [
    {
      name: 'erp-server',
      cwd: '/workspaces/erp-sales/apps/server',
      script: 'bun',
      args: 'run dev',
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
      process_env_file: false,
      script: '/usr/local/bin/opencode',
      args: 'serve --hostname 0.0.0.0 --port 10023',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        OPENCODE_SERVER_USERNAME: 'fathoni',
        OPENCODE_SERVER_PASSWORD: 'Fathoni8A;',
        // Enables the built-in websearch tool for non-OpenCode providers
        // (e.g. routers9). Backend is OpenCode's hosted search, no extra key.
        OPENCODE_ENABLE_EXA: '1',
      },
    },
  ],
};
