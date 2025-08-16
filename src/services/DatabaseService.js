/**
 * Database Service
 * Handles database operations with support for MongoDB and PostgreSQL
 */

const config = require('../../config/config');

class DatabaseService {
    constructor(options = {}) {
        const dbConfig = config.getServiceConfig('database') || {};
        
        this.databaseUrl = options.url || dbConfig.url;
        this.enabled = options.enabled !== undefined ? options.enabled : dbConfig.enabled;
        this.connection = null;
        this.dbType = this.detectDatabaseType();
        this.isConnected = false;
        
        // Default options
        this.options = {
            maxRetries: 3,
            retryDelay: 5000,
            connectionTimeout: 30000,
            ...options
        };
    }

    /**
     * Detect database type from URL
     */
    detectDatabaseType() {
        if (!this.databaseUrl) return null;
        
        if (this.databaseUrl.startsWith('mongodb://') || this.databaseUrl.startsWith('mongodb+srv://')) {
            return 'mongodb';
        } else if (this.databaseUrl.startsWith('postgresql://') || this.databaseUrl.startsWith('postgres://')) {
            return 'postgresql';
        }
        
        return null;
    }

    /**
     * Connect to database
     */
    async connect() {
        if (!this.enabled || !this.databaseUrl) {
            console.log('💤 Database is disabled or not configured');
            return false;
        }

        if (this.isConnected) {
            return true;
        }

        try {
            if (this.dbType === 'mongodb') {
                await this.connectMongoDB();
            } else if (this.dbType === 'postgresql') {
                await this.connectPostgreSQL();
            } else {
                throw new Error('Unsupported database type');
            }

            this.isConnected = true;
            console.log(`✅ Connected to ${this.dbType} database`);
            return true;

        } catch (error) {
            console.error(`❌ Database connection failed:`, error.message);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Connect to MongoDB
     */
    async connectMongoDB() {
        const { MongoClient } = require('mongodb');
        
        this.client = new MongoClient(this.databaseUrl, {
            serverSelectionTimeoutMS: this.options.connectionTimeout,
            maxPoolSize: 10,
            minPoolSize: 5
        });
        
        await this.client.connect();
        this.connection = this.client.db();
        
        // Test connection
        await this.connection.admin().ping();
    }

    /**
     * Connect to PostgreSQL
     */
    async connectPostgreSQL() {
        const { Pool } = require('pg');
        
        this.connection = new Pool({
            connectionString: this.databaseUrl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: this.options.connectionTimeout,
        });
        
        // Test connection
        const client = await this.connection.connect();
        await client.query('SELECT NOW()');
        client.release();
    }

    /**
     * Initialize database schema
     */
    async initialize() {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            if (this.dbType === 'mongodb') {
                await this.initializeMongoDB();
            } else if (this.dbType === 'postgresql') {
                await this.initializePostgreSQL();
            }
            
            console.log('✅ Database schema initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Initialize MongoDB collections and indexes
     */
    async initializeMongoDB() {
        const collections = ['webhooks', 'users', 'templates', 'settings'];
        
        for (const collectionName of collections) {
            const exists = await this.connection.listCollections({ name: collectionName }).hasNext();
            
            if (!exists) {
                await this.connection.createCollection(collectionName);
                console.log(`📄 Created collection: ${collectionName}`);
            }
        }

        // Create indexes for webhooks collection
        const webhooksCollection = this.connection.collection('webhooks');
        
        await webhooksCollection.createIndex({ webhook_id: 1 }, { unique: true });
        await webhooksCollection.createIndex({ created_at: -1 });
        await webhooksCollection.createIndex({ event_type: 1 });
        await webhooksCollection.createIndex({ status: 1 });
        await webhooksCollection.createIndex({ 'organized_data.order.name': 1 });
        
        console.log('📊 Created database indexes');
    }

    /**
     * Initialize PostgreSQL tables and indexes
     */
    async initializePostgreSQL() {
        // Create webhooks table
        await this.connection.query(`
            CREATE TABLE IF NOT EXISTS webhooks (
                id SERIAL PRIMARY KEY,
                webhook_id VARCHAR(255) UNIQUE NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                webhook_type VARCHAR(100),
                shop_domain VARCHAR(255),
                order_id VARCHAR(255),
                customer_id VARCHAR(255),
                raw_data JSONB,
                organized_data JSONB,
                generated_messages JSONB,
                processing_time_ms INTEGER,
                status VARCHAR(20) CHECK (status IN ('processed', 'failed')),
                errors TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create users table
        await this.connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create templates table
        await this.connection.query(`
            CREATE TABLE IF NOT EXISTS templates (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(100) NOT NULL,
                format VARCHAR(50) NOT NULL,
                template_type VARCHAR(50) NOT NULL,
                template_content TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_type, format, template_type)
            );
        `);

        // Create settings table
        await this.connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(255) UNIQUE NOT NULL,
                value JSONB,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create indexes
        await this.connection.query('CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at DESC);');
        await this.connection.query('CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);');
        await this.connection.query('CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type);');
        await this.connection.query('CREATE INDEX IF NOT EXISTS idx_webhooks_order_id ON webhooks(order_id);');
        
        console.log('📊 Created database tables and indexes');
    }

    /**
     * Save webhook to database
     */
    async saveWebhook(webhookData) {
        if (!this.isConnected) {
            return null;
        }

        try {
            if (this.dbType === 'mongodb') {
                return await this.saveWebhookMongoDB(webhookData);
            } else if (this.dbType === 'postgresql') {
                return await this.saveWebhookPostgreSQL(webhookData);
            }
        } catch (error) {
            console.error('❌ Failed to save webhook to database:', error.message);
            return null;
        }
    }

    /**
     * Save webhook to MongoDB
     */
    async saveWebhookMongoDB(webhookData) {
        const collection = this.connection.collection('webhooks');
        
        const document = {
            ...webhookData,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        const result = await collection.insertOne(document);
        return { ...document, _id: result.insertedId };
    }

    /**
     * Save webhook to PostgreSQL
     */
    async saveWebhookPostgreSQL(webhookData) {
        const query = `
            INSERT INTO webhooks (
                webhook_id, event_type, webhook_type, shop_domain, order_id, customer_id,
                raw_data, organized_data, generated_messages, processing_time_ms, status, errors
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        const values = [
            webhookData.id || webhookData.webhook_id,
            webhookData.event_type,
            webhookData.webhook_type,
            webhookData.headers?.shop || webhookData.shop_domain,
            webhookData.organized_data?.order?.name,
            webhookData.organized_data?.customer?.id,
            JSON.stringify(webhookData.raw_data),
            JSON.stringify(webhookData.organized_data),
            JSON.stringify(webhookData.generated_messages),
            webhookData.processing_time_ms,
            webhookData.status,
            webhookData.errors || []
        ];
        
        const result = await this.connection.query(query, values);
        return result.rows[0];
    }

    /**
     * Get recent webhooks
     */
    async getRecentWebhooks(limit = 50, offset = 0) {
        if (!this.isConnected) {
            return [];
        }

        try {
            if (this.dbType === 'mongodb') {
                return await this.getRecentWebhooksMongoDB(limit, offset);
            } else if (this.dbType === 'postgresql') {
                return await this.getRecentWebhooksPostgreSQL(limit, offset);
            }
        } catch (error) {
            console.error('❌ Failed to get webhooks from database:', error.message);
            return [];
        }
    }

    /**
     * Get recent webhooks from MongoDB
     */
    async getRecentWebhooksMongoDB(limit, offset) {
        const collection = this.connection.collection('webhooks');
        
        return await collection
            .find({})
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();
    }

    /**
     * Get recent webhooks from PostgreSQL
     */
    async getRecentWebhooksPostgreSQL(limit, offset) {
        const query = `
            SELECT * FROM webhooks 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
        `;
        
        const result = await this.connection.query(query, [limit, offset]);
        return result.rows;
    }

    /**
     * Get webhook statistics
     */
    async getWebhookStats() {
        if (!this.isConnected) {
            return {
                total: 0,
                successful: 0,
                failed: 0,
                today: 0,
                last_24_hours: 0
            };
        }

        try {
            if (this.dbType === 'mongodb') {
                return await this.getWebhookStatsMongoDB();
            } else if (this.dbType === 'postgresql') {
                return await this.getWebhookStatsPostgreSQL();
            }
        } catch (error) {
            console.error('❌ Failed to get webhook stats from database:', error.message);
            return { total: 0, successful: 0, failed: 0 };
        }
    }

    /**
     * Get webhook statistics from MongoDB
     */
    async getWebhookStatsMongoDB() {
        const collection = this.connection.collection('webhooks');
        
        const [totalStats, todayStats] = await Promise.all([
            collection.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        successful: {
                            $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] }
                        },
                        failed: {
                            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                        }
                    }
                }
            ]).toArray(),
            collection.countDocuments({
                created_at: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            })
        ]);

        const stats = totalStats[0] || { total: 0, successful: 0, failed: 0 };
        return { ...stats, today: todayStats };
    }

    /**
     * Get webhook statistics from PostgreSQL
     */
    async getWebhookStatsPostgreSQL() {
        const queries = await Promise.all([
            this.connection.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'processed' THEN 1 END) as successful,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
                FROM webhooks
            `),
            this.connection.query(`
                SELECT COUNT(*) as today
                FROM webhooks 
                WHERE created_at >= CURRENT_DATE
            `),
            this.connection.query(`
                SELECT COUNT(*) as last_24_hours
                FROM webhooks 
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `)
        ]);

        const [totalStats, todayStats, last24Stats] = queries.map(q => q.rows[0]);
        
        return {
            total: parseInt(totalStats.total),
            successful: parseInt(totalStats.successful),
            failed: parseInt(totalStats.failed),
            today: parseInt(todayStats.today),
            last_24_hours: parseInt(last24Stats.last_24_hours)
        };
    }

    /**
     * Clean up old webhooks
     */
    async cleanupOldWebhooks(daysOld = 30, keepCount = 1000) {
        if (!this.isConnected) {
            return 0;
        }

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            if (this.dbType === 'mongodb') {
                return await this.cleanupOldWebhooksMongoDB(cutoffDate, keepCount);
            } else if (this.dbType === 'postgresql') {
                return await this.cleanupOldWebhooksPostgreSQL(cutoffDate, keepCount);
            }
        } catch (error) {
            console.error('❌ Failed to cleanup old webhooks:', error.message);
            return 0;
        }
    }

    /**
     * Clean up old webhooks from MongoDB
     */
    async cleanupOldWebhooksMongoDB(cutoffDate, keepCount) {
        const collection = this.connection.collection('webhooks');
        
        // Get total count first
        const totalCount = await collection.countDocuments();
        
        if (totalCount <= keepCount) {
            return 0; // Nothing to clean
        }
        
        // Delete old documents
        const result = await collection.deleteMany({
            created_at: { $lt: cutoffDate }
        });
        
        return result.deletedCount;
    }

    /**
     * Clean up old webhooks from PostgreSQL
     */
    async cleanupOldWebhooksPostgreSQL(cutoffDate, keepCount) {
        const countResult = await this.connection.query('SELECT COUNT(*) FROM webhooks');
        const totalCount = parseInt(countResult.rows[0].count);
        
        if (totalCount <= keepCount) {
            return 0;
        }
        
        const deleteResult = await this.connection.query(
            'DELETE FROM webhooks WHERE created_at < $1',
            [cutoffDate]
        );
        
        return deleteResult.rowCount;
    }

    /**
     * Test database connection
     */
    async testConnection() {
        try {
            if (this.dbType === 'mongodb') {
                await this.connection.admin().ping();
                return { success: true, type: 'mongodb' };
            } else if (this.dbType === 'postgresql') {
                const result = await this.connection.query('SELECT NOW()');
                return { success: true, type: 'postgresql', time: result.rows[0].now };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Close database connection
     */
    async close() {
        try {
            if (this.isConnected) {
                if (this.dbType === 'mongodb' && this.client) {
                    await this.client.close();
                } else if (this.dbType === 'postgresql' && this.connection) {
                    await this.connection.end();
                }
                
                this.isConnected = false;
                console.log('📌 Database connection closed');
            }
        } catch (error) {
            console.error('❌ Error closing database connection:', error.message);
        }
    }

    /**
     * Get database health status
     */
    async getHealthStatus() {
        if (!this.enabled) {
            return { status: 'disabled', message: 'Database is disabled' };
        }

        if (!this.isConnected) {
            return { status: 'disconnected', message: 'Database is not connected' };
        }

        try {
            const testResult = await this.testConnection();
            if (testResult.success) {
                return { 
                    status: 'healthy', 
                    message: 'Database is connected and responding',
                    type: this.dbType 
                };
            } else {
                return { 
                    status: 'unhealthy', 
                    message: `Database test failed: ${testResult.error}` 
                };
            }
        } catch (error) {
            return { 
                status: 'error', 
                message: `Database health check failed: ${error.message}` 
            };
        }
    }
}

module.exports = DatabaseService;
