module.exports = {
  apps: [
    {
      name: 'slv-barley-shop',
      script: 'npm',
      args: 'run start:prod',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      // Health check
      min_uptime: '10s',
      max_restarts: 5,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Monitoring
      instance_var: 'INSTANCE_ID',
      // Advanced features
      post_update: ['npm install'],
      // Crash recovery
      autorestart: true,
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/slv-barley-shop.git',
      path: '/var/www/slv-barley-shop',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};