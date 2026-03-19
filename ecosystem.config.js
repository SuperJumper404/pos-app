module.exports = {
  apps: [
    {
      name: 'frontend_smart_eat_staging',
      cwd: '/chemin/absolu/vers/ton/projet',
      script: './serve-dist-folder.js',
      interpreter: 'node',
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
