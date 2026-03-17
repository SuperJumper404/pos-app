module.exports = {
  apps: [
    {
      name: 'frontend_smart_eat_staging',
      script: './serve-dist-folder.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
    },
  ],
}
