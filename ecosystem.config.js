module.exports = {
  apps: [
    {
      name: 'frontend_smart_eat_staging',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: './dist',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
    },
  ],
}
