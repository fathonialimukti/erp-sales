module.exports = {
  apps: [
    {
      name: 'erp-server',
      cwd: 'apps/server',
      script: 'bun',
      args: 'run start',
      interpreter: 'none',
      env: { NODE_ENV: 'production', CORS_ORIGIN: 'https://erp-sales.aetherglo.com' },
      kill_timeout: 10000,
      listen_timeout: 8000,
      shutdown_with_message: true,
      wait_ready: true,
    },
    {
      name: 'erp-client',
      cwd: 'apps/client',
      script: 'bun',
      args: 'run preview',
      interpreter: 'none',
      env: { NODE_ENV: 'production' },
    },
  ],
};
