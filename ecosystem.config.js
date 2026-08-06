module.exports = {
  apps: [
    {
      name: 'erp-server',
      cwd: 'apps/server',
      script: 'bun',
      args: 'run start',
      interpreter: 'none',
      env: { NODE_ENV: 'production', CORS_ORIGIN: 'https://erp-sales.aetherglo.com' },
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
