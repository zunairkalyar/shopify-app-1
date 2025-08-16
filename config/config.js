/**
 * Configuration Management
 * Loads and validates environment variables with defaults
 */

require('dotenv').config();

// Configuration with defaults and validation
const config = {
    // Server Configuration
    server: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost'
    },

    // Shop Configuration
    shop: {
        name: process.env.SHOP_NAME || 'Your Store',
        supportPhone: process.env.SUPPORT_PHONE || '+92-XXX-XXXXXXX',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@yourstore.com',
        websiteUrl: process.env.WEBSITE_URL || 'https://yourstore.com'
    },

    // Database Configuration
    database: {
        url: process.env.DATABASE_URL || null,
        enabled: process.env.ENABLE_DATABASE === 'true'
    },

    // Redis Configuration
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    },

    // WhatsApp Configuration
    whatsapp: {
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        phoneId: process.env.WHATSAPP_PHONE_ID || '',
        verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
        enabled: process.env.ENABLE_WHATSAPP_SENDING === 'true'
    },

    // Email Configuration
    email: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.FROM_EMAIL || 'noreply@yourstore.com',
        enabled: process.env.ENABLE_EMAIL_SENDING === 'true'
    },

    // SMS Configuration
    sms: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        enabled: process.env.ENABLE_SMS_SENDING === 'true'
    },

    // Security Configuration
    security: {
        jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key',
        apiKey: process.env.API_KEY || null,
        webhookSecret: process.env.WEBHOOK_SECRET || null
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log',
        enabled: process.env.ENABLE_LOGGING !== 'false'
    },

    // Feature Flags
    features: {
        database: process.env.ENABLE_DATABASE === 'true',
        authentication: process.env.ENABLE_AUTHENTICATION === 'true',
        rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
        cors: process.env.ENABLE_CORS !== 'false',
        metrics: process.env.ENABLE_METRICS === 'true',
        swagger: process.env.ENABLE_SWAGGER === 'true',
        debug: process.env.ENABLE_DEBUG === 'true'
    },

    // Storage Configuration
    storage: {
        directory: process.env.STORAGE_DIR || './data',
        maxWebhooks: parseInt(process.env.MAX_WEBHOOKS_STORED) || 10000
    },

    // Monitoring Configuration
    monitoring: {
        enabled: process.env.ENABLE_METRICS === 'true',
        port: parseInt(process.env.METRICS_PORT) || 9090
    }
};

/**
 * Validate required configuration
 */
function validateConfig() {
    const errors = [];

    // Check for production-specific requirements
    if (config.server.nodeEnv === 'production') {
        if (config.security.jwtSecret === 'change-this-secret-key') {
            errors.push('JWT_SECRET must be changed in production');
        }
        
        if (config.features.debug) {
            console.warn('⚠️ Debug mode is enabled in production');
        }
        
        if (config.features.swagger) {
            console.warn('⚠️ Swagger is enabled in production');
        }
    }

    // Check WhatsApp configuration if enabled
    if (config.whatsapp.enabled) {
        if (!config.whatsapp.accessToken || !config.whatsapp.phoneId) {
            errors.push('WhatsApp is enabled but missing required credentials');
        }
    }

    // Check Email configuration if enabled
    if (config.email.enabled) {
        if (!config.email.apiKey) {
            errors.push('Email is enabled but missing API key');
        }
    }

    // Check SMS configuration if enabled
    if (config.sms.enabled) {
        if (!config.sms.accountSid || !config.sms.authToken) {
            errors.push('SMS is enabled but missing credentials');
        }
    }

    // Check Database configuration if enabled
    if (config.features.database) {
        if (!config.database.url) {
            errors.push('Database is enabled but missing DATABASE_URL');
        }
    }

    if (errors.length > 0) {
        console.error('❌ Configuration Errors:');
        errors.forEach(error => console.error(`   • ${error}`));
        
        if (config.server.nodeEnv === 'production') {
            throw new Error('Configuration validation failed');
        } else {
            console.warn('⚠️ Configuration issues detected but continuing in development mode');
        }
    }
}

/**
 * Get configuration for specific service
 */
function getServiceConfig(serviceName) {
    const serviceConfigs = {
        whatsapp: {
            enabled: config.whatsapp.enabled,
            accessToken: config.whatsapp.accessToken,
            phoneId: config.whatsapp.phoneId,
            verifyToken: config.whatsapp.verifyToken
        },
        email: {
            enabled: config.email.enabled,
            apiKey: config.email.apiKey,
            fromEmail: config.email.fromEmail
        },
        sms: {
            enabled: config.sms.enabled,
            accountSid: config.sms.accountSid,
            authToken: config.sms.authToken,
            phoneNumber: config.sms.phoneNumber
        },
        database: {
            enabled: config.features.database,
            url: config.database.url
        }
    };

    return serviceConfigs[serviceName] || null;
}

/**
 * Print configuration summary
 */
function printConfigSummary() {
    if (config.server.nodeEnv === 'development' && config.features.debug) {
        console.log('🔧 Configuration Summary:');
        console.log(`   Environment: ${config.server.nodeEnv}`);
        console.log(`   Server: ${config.server.host}:${config.server.port}`);
        console.log(`   Shop: ${config.shop.name}`);
        console.log(`   Database: ${config.features.database ? '✅' : '❌'}`);
        console.log(`   WhatsApp: ${config.whatsapp.enabled ? '✅' : '❌'}`);
        console.log(`   Email: ${config.email.enabled ? '✅' : '❌'}`);
        console.log(`   SMS: ${config.sms.enabled ? '✅' : '❌'}`);
        console.log(`   Auth: ${config.features.authentication ? '✅' : '❌'}`);
        console.log(`   Logging: ${config.logging.enabled ? '✅' : '❌'}`);
        console.log('');
    }
}

// Validate configuration on load
validateConfig();

module.exports = {
    ...config,
    getServiceConfig,
    printConfigSummary,
    validateConfig
};
