module.exports = {
  apps: [
    {
      name: 'frontend_smart_eat_staging',
      script: './serve-dist-folder.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
      env_local: {
        NODE_ENV: 'local',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
    },
  ],
}
