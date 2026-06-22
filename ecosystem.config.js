module.exports = {
  apps: [
    {
      name: 'healthconnect-backend',
      script: 'dist/index.js',
      cwd: '/var/www/Healthconnect/packages/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SMS_PROVIDER: 'smsLocalhost',
        REDIS_URL: 'redis://127.0.0.1:6379',
        FRONTEND_URL: 'http://212.90.121.97:8787',
      },
    },
  ],
};
