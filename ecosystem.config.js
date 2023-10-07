module.exports = {
  apps: [
    {
      name: 'front_end_smart_eat_staging',
      script: 'npm run build',
      cwd: './',
      watch: false,
      autorestart: true,
      max_memory_restart: '2G',
      env: {
        PM2_SERVE_PATH: './dist/',
        PM2_SERVE_PORT: 8083,
      },
    },
  ],
}
