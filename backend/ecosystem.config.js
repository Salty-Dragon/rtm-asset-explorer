export default {
  apps: [
    {
      name: 'rtm-api',
      script: './src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4004
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 4004
      },
      max_memory_restart: '1G',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'rtm-sync',
      script: './src/services/sync-daemon.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        SYNC_BATCH_SIZE: 100,
        SYNC_START_HEIGHT: 0,
        SYNC_IPFS_TIMEOUT: 10000,
        SYNC_RETRY_DELAY: 30000,
        SYNC_RETRY_ATTEMPTS: 3,
        SYNC_CHECKPOINT_INTERVAL: 100,
        SYNC_ENABLED: 'true'
      },
      error_file: 'logs/sync-error.log',
      out_file: 'logs/sync-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '2G',
      autorestart: true,
      restart_delay: 10000,
      max_restarts: 10,
      min_uptime: '30s'
    }
  ]
};
