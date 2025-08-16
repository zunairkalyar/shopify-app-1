/**
 * Webhook System Main Application
 * Integrates DataOrganizer and MessageTemplates with Express server
 * Provides RESTful API and web interface for webhook processing
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Import our custom modules
const DataOrganizer = require('./src/organizers/DataOrganizer');
const MessageTemplates = require('./src/templates/MessageTemplates');
const SupabaseAnalyticsService = require('./src/services/SupabaseAnalyticsService');

class WebhookApp {
    constructor(options = {}) {
        this.config = {
            port: options.port || 3000,
            host: options.host || 'localhost',
            shopName: options.shopName || 'MazayLO',
            supportPhone: options.supportPhone || '+92-300-1234567',
            supportEmail: options.supportEmail || 'support@mazaylo.com',
            websiteUrl: options.websiteUrl || 'https://mazaylo.com',
            storageDir: options.storageDir || './data',
            enableLogging: options.enableLogging !== false,
            ...options
        };

        // Initialize Express app
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();

        // Initialize components
        this.dataOrganizer = new DataOrganizer({
            currencySymbol: 'PKR',
            timezone: 'Asia/Karachi'
        });

        this.messageTemplates = new MessageTemplates({
            shopName: this.config.shopName,
            supportPhone: this.config.supportPhone,
            supportEmail: this.config.supportEmail,
            websiteUrl: this.config.websiteUrl
        });

        // Initialize analytics service
        this.analyticsService = new SupabaseAnalyticsService();

        // Storage for processed webhooks
        this.webhookStorage = new Map();
        this.stats = {
            total_received: 0,
            successful_processed: 0,
            failed_processed: 0,
            start_time: new Date().toISOString()
        };

        this.ensureStorageDir();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // CORS
        this.app.use(cors());

        // JSON parsing
        this.app.use(express.json({ limit: '10mb' }));

        // URL encoded
        this.app.use(express.urlencoded({ extended: true }));

        // Static files
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
        this.app.use('/assets', express.static(path.join(__dirname, 'public')));

        // Logging middleware
        if (this.config.enableLogging) {
            this.app.use((req, res, next) => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] ${req.method} ${req.url}`);
                next();
            });
        }

        // Error handling
        this.app.use((err, req, res, next) => {
            console.error('Server Error:', err);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: err.message
            });
        });
    }

    /**
     * Setup Express routes
     */
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                webhooksStored: this.webhookStorage.size,
                stats: this.stats
            });
        });

        // Main dashboard
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Analytics dashboard
        this.app.get('/analytics', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'analytics-dashboard.html'));
        });

        // Webhook endpoints
        this.setupWebhookRoutes();

        // API endpoints
        this.setupApiRoutes();

        // Analytics endpoints
        this.setupAnalyticsRoutes();

        // Template management
        this.setupTemplateRoutes();
    }

    /**
     * Setup webhook endpoints
     */
    setupWebhookRoutes() {
        // Order created webhook
        this.app.post('/api/webhooks/order-create', (req, res) => {
            this.handleWebhook(req, res, 'orders/create');
        });

        // Order fulfilled webhook
        this.app.post('/api/webhooks/order-fulfilled', (req, res) => {
            this.handleWebhook(req, res, 'orders/fulfilled');
        });

        // Order cancelled webhook
        this.app.post('/api/webhooks/order-cancelled', (req, res) => {
            this.handleWebhook(req, res, 'orders/cancelled');
        });

        // Generic webhook handler
        this.app.post('/api/webhooks/generic', (req, res) => {
            this.handleWebhook(req, res, null);
        });
    }

    /**
     * Setup API routes
     */
    setupApiRoutes() {
        // Get all webhooks
        this.app.get('/api/webhooks', (req, res) => {
            const webhooks = Array.from(this.webhookStorage.values());
            res.json({
                success: true,
                count: webhooks.length,
                webhooks: webhooks.slice(-100) // Last 100 webhooks
            });
        });

        // Get webhook by ID
        this.app.get('/api/webhooks/:id', (req, res) => {
            const webhook = this.webhookStorage.get(req.params.id);
            if (!webhook) {
                return res.status(404).json({
                    success: false,
                    error: 'Webhook not found'
                });
            }
            res.json({ success: true, webhook });
        });

        // Get webhook statistics
        this.app.get('/api/stats', (req, res) => {
            res.json({
                success: true,
                stats: {
                    ...this.stats,
                    current_stored: this.webhookStorage.size,
                    uptime_seconds: process.uptime()
                }
            });
        });

        // Process test webhook data
        this.app.post('/api/test-webhook', (req, res) => {
            const { webhookType = 'orders/create', testData } = req.body;
            
            try {
                const organizedData = this.dataOrganizer.organize(testData || this.createTestData(), webhookType);
                const messages = this.messageTemplates.generateAllFormats(
                    webhookType.replace('orders/', 'order_'),
                    organizedData
                );

                res.json({
                    success: true,
                    organizedData,
                    messages,
                    processed_at: new Date().toISOString()
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * Setup analytics routes
     */
    setupAnalyticsRoutes() {
        // Get dashboard analytics
        this.app.get('/api/analytics/dashboard', async (req, res) => {
            try {
                const metrics = await this.analyticsService.getDashboardMetrics();
                res.json({
                    success: true,
                    ...metrics
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get analytics report
        this.app.get('/api/analytics/report', async (req, res) => {
            try {
                const period = req.query.period || '24h';
                const report = await this.analyticsService.getAnalyticsReport(period);
                res.json({
                    success: true,
                    ...report
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Reset analytics data (for testing)
        this.app.post('/api/analytics/reset', async (req, res) => {
            try {
                const result = await this.analyticsService.resetAnalytics();
                res.json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * Setup template management routes
     */
    setupTemplateRoutes() {
        // List available templates
        this.app.get('/api/templates', (req, res) => {
            const templates = this.messageTemplates.listTemplates();
            res.json({ success: true, templates });
        });

        // Preview template
        this.app.post('/api/templates/preview', (req, res) => {
            const { eventType, format, templateType = 'message' } = req.body;
            
            try {
                const preview = this.messageTemplates.previewTemplate(eventType, format, templateType);
                res.json({ success: true, preview });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Add custom template
        this.app.post('/api/templates/custom', (req, res) => {
            const { eventType, format, templateType, template } = req.body;
            
            try {
                this.messageTemplates.addCustomTemplate(eventType, format, templateType, template);
                res.json({ 
                    success: true, 
                    message: 'Custom template added successfully' 
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Remove custom template
        this.app.delete('/api/templates/custom/:eventType/:format/:templateType', (req, res) => {
            const { eventType, format, templateType } = req.params;
            
            try {
                this.messageTemplates.removeCustomTemplate(eventType, format, templateType);
                res.json({ 
                    success: true, 
                    message: 'Custom template removed successfully' 
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * Main webhook handler
     */
    async handleWebhook(req, res, webhookType) {
        const startTime = Date.now();
        const webhookId = this.generateWebhookId();
        
        try {
            this.stats.total_received++;

            // Extract Shopify headers
            const headers = {
                topic: req.headers['x-shopify-topic'] || webhookType,
                shop: req.headers['x-shopify-shop-domain'],
                webhookId: req.headers['x-shopify-webhook-id'],
                apiVersion: req.headers['x-shopify-api-version']
            };

            // Log incoming webhook
            this.logWebhook('RECEIVED', webhookId, headers.topic, req.body);

            // Organize webhook data
            const organizedData = this.dataOrganizer.organize(req.body, webhookType);
            
            if (!organizedData) {
                throw new Error('Failed to organize webhook data: ' + this.dataOrganizer.getErrors().join(', '));
            }

            // Generate messages
            const eventType = (webhookType || headers.topic || 'orders/create').replace('orders/', 'order_');
            const messages = this.messageTemplates.generateAllFormats(eventType, organizedData);

            // Create webhook record
            const webhookRecord = {
                id: webhookId,
                received_at: new Date().toISOString(),
                processing_time_ms: Date.now() - startTime,
                webhook_type: webhookType,
                headers,
                raw_data: req.body,
                organized_data: organizedData,
                generated_messages: messages,
                summary: this.dataOrganizer.getSummary(),
                errors: this.dataOrganizer.getErrors(),
                status: 'processed'
            };

            // Store webhook
            this.webhookStorage.set(webhookId, webhookRecord);
            await this.saveWebhookToFile(webhookRecord);

            // Track analytics
            try {
                // Track order
                await this.analyticsService.trackOrder({
                    ...req.body,
                    status: eventType.replace('order_', ''),
                    processing_time: webhookRecord.processing_time_ms
                });

                // Track messages (simulate message delivery tracking)
                if (messages.whatsapp) {
                    await this.analyticsService.trackMessage({
                        channel: 'whatsapp',
                        status: 'sent', // In real implementation, this would be updated based on actual delivery
                        order_id: organizedData.order?.name,
                        recipient: organizedData.customer?.phone
                    });
                }
                if (messages.email) {
                    await this.analyticsService.trackMessage({
                        channel: 'email',
                        status: 'sent',
                        order_id: organizedData.order?.name,
                        recipient: organizedData.customer?.email
                    });
                }
                if (messages.sms) {
                    await this.analyticsService.trackMessage({
                        channel: 'sms',
                        status: 'sent',
                        order_id: organizedData.order?.name,
                        recipient: organizedData.customer?.phone
                    });
                }
            } catch (analyticsError) {
                console.error('Analytics tracking error:', analyticsError);
                // Don't fail the webhook processing if analytics fails
            }

            this.stats.successful_processed++;
            this.logWebhook('PROCESSED', webhookId, eventType, webhookRecord.summary);

            // Send response
            res.json({
                success: true,
                webhook_id: webhookId,
                event_type: eventType,
                order_id: organizedData.order?.name,
                customer: organizedData.customer?.name,
                total: organizedData.totals?.formatted?.total,
                processing_time_ms: webhookRecord.processing_time_ms,
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            this.stats.failed_processed++;
            this.logWebhook('ERROR', webhookId, webhookType, error.message);

            // Store error record
            const errorRecord = {
                id: webhookId,
                received_at: new Date().toISOString(),
                processing_time_ms: Date.now() - startTime,
                webhook_type: webhookType,
                headers: req.headers,
                raw_data: req.body,
                error: error.message,
                status: 'failed'
            };

            this.webhookStorage.set(webhookId, errorRecord);

            res.status(400).json({
                success: false,
                webhook_id: webhookId,
                error: error.message,
                processing_time_ms: errorRecord.processing_time_ms
            });
        }
    }

    /**
     * Generate unique webhook ID
     */
    generateWebhookId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `wh_${timestamp}_${random}`;
    }

    /**
     * Log webhook activity
     */
    logWebhook(action, id, type, data) {
        if (!this.config.enableLogging) return;

        const timestamp = new Date().toISOString();
        const message = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        console.log(`[${timestamp}] ${action} ${id} (${type}): ${message}`);
    }

    /**
     * Ensure storage directory exists
     */
    async ensureStorageDir() {
        try {
            await fs.mkdir(this.config.storageDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create storage directory:', error);
        }
    }

    /**
     * Save webhook to file
     */
    async saveWebhookToFile(webhook) {
        if (!this.config.enableLogging) return;

        try {
            const filename = `webhook_${webhook.id}.json`;
            const filepath = path.join(this.config.storageDir, filename);
            await fs.writeFile(filepath, JSON.stringify(webhook, null, 2));
        } catch (error) {
            console.error('Failed to save webhook to file:', error);
        }
    }

    /**
     * Create test data for demonstrations
     */
    createTestData() {
        return {
            id: Date.now(),
            name: `#${Math.floor(Math.random() * 9000) + 1000}`,
            order_number: Math.floor(Math.random() * 9000) + 1000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            financial_status: 'paid',
            fulfillment_status: null,
            currency: 'PKR',
            total_price: '1999.00',
            subtotal_price: '1799.00',
            total_discounts: '0.00',
            total_tax: '0.00',
            customer: {
                id: Math.floor(Math.random() * 1000000),
                first_name: 'Test',
                last_name: 'Customer',
                email: 'test@example.com',
                phone: '+92-300-1234567'
            },
            line_items: [{
                id: Math.floor(Math.random() * 1000000),
                title: 'Test Product',
                quantity: 1,
                price: '1799.00',
                sku: 'TEST-001'
            }],
            shipping_address: {
                first_name: 'Test',
                last_name: 'Customer',
                address1: '123 Test Street',
                city: 'Test City',
                country: 'Pakistan',
                phone: '+92-300-1234567'
            },
            shipping_lines: [{
                title: 'Standard Delivery',
                price: '200.00',
                code: 'standard'
            }],
            payment_gateway_names: {
                0: 'Cash on Delivery (COD)'
            }
        };
    }

    /**
     * Start the server
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                const server = this.app.listen(this.config.port, this.config.host, () => {
                    console.log('\n🚀 Webhook System Started!');
                    console.log(`📍 Server: http://${this.config.host}:${this.config.port}`);
                    console.log(`🏪 Shop: ${this.config.shopName}`);
                    console.log(`📞 Support: ${this.config.supportPhone}`);
                    console.log(`📧 Email: ${this.config.supportEmail}`);
                    console.log('\n📡 Webhook Endpoints:');
                    console.log(`   • Order Created:   POST /api/webhooks/order-create`);
                    console.log(`   • Order Fulfilled: POST /api/webhooks/order-fulfilled`);
                    console.log(`   • Order Cancelled: POST /api/webhooks/order-cancelled`);
                    console.log('\n🌐 Web Interface:');
                    console.log(`   • Dashboard: http://${this.config.host}:${this.config.port}`);
                    console.log(`   • Health: http://${this.config.host}:${this.config.port}/health`);
                    console.log(`   • API: http://${this.config.host}:${this.config.port}/api`);
                    console.log('\n✅ Ready to receive webhooks!\n');

                    resolve(server);
                });

                server.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop the server
     */
    stop() {
        if (this.server) {
            this.server.close();
            console.log('🛑 Webhook system stopped');
        }
    }

    /**
     * Get app instance (for testing)
     */
    getApp() {
        return this.app;
    }
}

// Create and start app if this file is run directly
if (require.main === module) {
    const config = {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        shopName: process.env.SHOP_NAME || 'MazayLO',
        supportPhone: process.env.SUPPORT_PHONE || '+92-300-1234567',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@mazaylo.com',
        websiteUrl: process.env.WEBSITE_URL || 'https://mazaylo.com'
    };

    const webhookApp = new WebhookApp(config);
    webhookApp.start().catch(error => {
        console.error('Failed to start webhook system:', error);
        process.exit(1);
    });
}

module.exports = WebhookApp;
