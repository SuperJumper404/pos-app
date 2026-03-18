module.exports = {
  apps: [
    {
      name: 'frontend_smart_eat_staging',
      script: 'npm',
      args: 'run start:static',
      env: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
    },
  ],
}
