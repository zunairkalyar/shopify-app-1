/**
 * PM2 Ecosystem Configuration
 * Production-ready process management for webhook system
 */

module.exports = {
    apps: [
        {
            // Main webhook application
            name: 'webhook-system',
            script: 'app.js',
            instances: 'max', // Use all available CPUs
            exec_mode: 'cluster',
            
            // Environment configurations
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
                HOST: 'localhost'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: process.env.PORT || 3000,
                HOST: process.env.HOST || '0.0.0.0',
                SHOP_NAME: process.env.SHOP_NAME || 'MazayLO',
                SUPPORT_PHONE: process.env.SUPPORT_PHONE || '+92-300-1234567',
                SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@mazaylo.com',
                WEBSITE_URL: process.env.WEBSITE_URL || 'https://mazaylo.com',
                ENABLE_DATABASE: process.env.ENABLE_DATABASE || 'false',
                ENABLE_LOGGING: 'true'
            },
            env_staging: {
                NODE_ENV: 'staging',
                PORT: 3001,
                HOST: '0.0.0.0'
            },

            // Performance and reliability settings
            max_memory_restart: '1G',
            node_args: '--max_old_space_size=1024',
            
            // Auto restart settings
            autorestart: true,
            watch: false, // Disable in production
            max_restarts: 10,
            min_uptime: '10s',
            
            // Logging configuration
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/pm2-err.log',
            out_file: './logs/pm2-out.log',
            log_file: './logs/pm2-combined.log',
            time: true,
            
            // Advanced settings
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 3000,
            
            // Health monitoring
            health_check_grace_period: 3000,
            health_check_fatal_exceptions: true,
            
            // Instance variables (for cluster mode)
            instance_var: 'INSTANCE_ID'
        },
        
        // Background worker (if needed)
        {
            name: 'webhook-worker',
            script: 'scripts/worker.js',
            instances: 1,
            exec_mode: 'fork',
            
            env: {
                NODE_ENV: 'development',
                WORKER_TYPE: 'background'
            },
            env_production: {
                NODE_ENV: 'production',
                WORKER_TYPE: 'background',
                ENABLE_DATABASE: process.env.ENABLE_DATABASE || 'false'
            },
            
            // Worker-specific settings
            max_memory_restart: '512M',
            autorestart: true,
            watch: false,
            
            // Cron restart (restart worker daily at 2 AM)
            cron_restart: '0 2 * * *',
            
            // Logging
            error_file: './logs/worker-err.log',
            out_file: './logs/worker-out.log',
            log_file: './logs/worker-combined.log',
            
            // Disable if not needed
            instances: 0 // Set to 1 to enable
        }
    ],

    // Deployment configuration
    deploy: {
        production: {
            user: 'webhook',
            host: ['your-server.com'],
            ref: 'origin/main',
            repo: 'https://github.com/your-username/webhook-system.git',
            path: '/var/www/webhook-system',
            
            // Pre-deploy commands (run on server before deploy)
            'pre-deploy-local': '',
            'pre-deploy': 'git fetch --all',
            
            // Post-deploy commands (run on server after deploy)
            'post-deploy': [
                'npm install --production',
                'npm run build', // if you have a build step
                'pm2 reload ecosystem.config.js --env production',
                'pm2 save'
            ].join(' && '),
            
            // Environment
            env: {
                NODE_ENV: 'production'
            }
        },
        
        staging: {
            user: 'webhook',
            host: ['staging-server.com'],
            ref: 'origin/develop',
            repo: 'https://github.com/your-username/webhook-system.git',
            path: '/var/www/webhook-system-staging',
            
            'pre-deploy-local': '',
            'pre-deploy': 'git fetch --all',
            'post-deploy': [
                'npm install',
                'pm2 reload ecosystem.config.js --env staging'
            ].join(' && '),
            
            env: {
                NODE_ENV: 'staging'
            }
        }
    }
};
