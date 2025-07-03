module.exports = {
  apps: [
    {
      name: 'frontend_smart_eat_staging',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: './dist/',
        PM2_SERVE_PORT: 8083,
        PM2_SERVE_SPA: 'true',
      },
    },
  ],
}
