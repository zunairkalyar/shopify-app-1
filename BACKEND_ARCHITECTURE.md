# 🏗️ Backend Architecture Guide - Webhook System

Complete backend implementation guide for building a production-ready webhook processing system.

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Database Design](#-database-design)
- [Service Layer Design](#-service-layer-design)
- [Message Queue System](#-message-queue-system)
- [Authentication & Security](#-authentication--security)
- [Monitoring & Logging](#-monitoring--logging)
- [Scalability & Performance](#-scalability--performance)
- [Deployment Architecture](#-deployment-architecture)
- [Microservices Breakdown](#-microservices-breakdown)
- [Implementation Roadmap](#-implementation-roadmap)

## 🏗️ Architecture Overview

### High-Level System Architecture

```
┌─────────────────┐    ┌──────────────────────────────────────────┐
│   Shopify       │    │             Load Balancer                │
│   Webhook       ├────┤            (Nginx/HAProxy)               │
│   Calls         │    └─────────────────┬────────────────────────┘
└─────────────────┘                      │
                                         │
    ┌────────────────────────────────────┼────────────────────────────────────┐
    │                                    │                                    │
    ▼                                    ▼                                    ▼
┌─────────┐                        ┌─────────┐                        ┌─────────┐
│ API     │                        │ API     │                        │ API     │
│ Server  │                        │ Server  │                        │ Server  │
│ Node 1  │                        │ Node 2  │                        │ Node 3  │
└────┬────┘                        └────┬────┘                        └────┬────┘
     │                                  │                                  │
     └──────────────────┬───────────────┼──────────────────────────────────┘
                        │               │
                        ▼               ▼
                   ┌─────────────────────────┐
                   │     Message Queue       │
                   │     (Redis/RabbitMQ)    │
                   └────────┬────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Worker   │ │ Worker   │ │ Worker   │
        │ Process  │ │ Process  │ │ Process  │
        │ Node 1   │ │ Node 2   │ │ Node 3   │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │WhatsApp │      │  Email  │      │   SMS   │
   │   API   │      │ Service │      │ Service │
   └─────────┘      └─────────┘      └─────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │          Database Cluster           │
        │  ┌─────────┐ ┌─────────┐ ┌────────┐ │
        │  │ MongoDB │ │  Redis  │ │ Backup │ │
        │  │ Primary │ │ Cache   │ │   DB   │ │
        │  └─────────┘ └─────────┘ └────────┘ │
        └─────────────────────────────────────┘
```

### Core Components

1. **API Gateway Layer**
   - Request routing and load balancing
   - Authentication and authorization
   - Rate limiting and throttling
   - Request/response transformation

2. **Application Layer**
   - Webhook processing services
   - Business logic implementation
   - Data validation and transformation
   - Message template generation

3. **Message Queue Layer**
   - Asynchronous job processing
   - Message delivery orchestration
   - Retry mechanisms and dead letter queues
   - Priority-based processing

4. **Data Layer**
   - Primary database (MongoDB/PostgreSQL)
   - Cache layer (Redis)
   - Message queue storage
   - File storage (if needed)

5. **External Integrations**
   - WhatsApp Business API
   - Email service providers
   - SMS service providers
   - Monitoring and logging services

## 🗄️ Database Design

### MongoDB Schema Design

#### Webhooks Collection
```javascript
// webhooks collection
{
  _id: ObjectId,
  webhook_id: String, // Unique webhook identifier
  shopify_webhook_id: String, // Shopify's webhook ID
  event_type: String, // 'order_created', 'order_fulfilled', etc.
  shop_domain: String,
  
  // Raw webhook data
  raw_data: {
    id: Number,
    name: String,
    created_at: ISODate,
    customer: Object,
    line_items: Array,
    // ... full Shopify payload
  },
  
  // Processed data
  organized_data: {
    type: String,
    order: Object,
    customer: Object,
    products: Array,
    totals: Object,
    // ... structured data
  },
  
  // Generated messages
  generated_messages: {
    whatsapp: {
      message: String,
      notification: Object,
      generated_at: ISODate
    },
    email: {
      subject: String,
      html: String,
      text: String,
      generated_at: ISODate
    },
    sms: {
      message: String,
      generated_at: ISODate
    }
  },
  
  // Processing metadata
  processing: {
    received_at: ISODate,
    processed_at: ISODate,
    processing_time_ms: Number,
    status: String, // 'received', 'processing', 'processed', 'failed'
    errors: Array,
    retry_count: Number
  },
  
  // Message delivery tracking
  delivery_status: {
    whatsapp: {
      status: String, // 'pending', 'sent', 'delivered', 'failed'
      sent_at: ISODate,
      delivered_at: ISODate,
      message_id: String,
      error: String
    },
    email: {
      status: String,
      sent_at: ISODate,
      opened_at: ISODate,
      message_id: String,
      error: String
    },
    sms: {
      status: String,
      sent_at: ISODate,
      delivered_at: ISODate,
      message_id: String,
      error: String
    }
  },
  
  // Indexes
  created_at: ISODate,
  updated_at: ISODate
}

// Indexes
db.webhooks.createIndex({ "webhook_id": 1 }, { unique: true })
db.webhooks.createIndex({ "event_type": 1, "created_at": -1 })
db.webhooks.createIndex({ "shop_domain": 1, "created_at": -1 })
db.webhooks.createIndex({ "processing.status": 1, "created_at": -1 })
db.webhooks.createIndex({ "raw_data.id": 1, "event_type": 1 })
```

#### Custom Templates Collection
```javascript
// custom_templates collection
{
  _id: ObjectId,
  template_id: String,
  
  // Template identification
  event_type: String, // 'order_created', 'order_fulfilled', etc.
  message_format: String, // 'whatsapp', 'email', 'sms'
  template_type: String, // 'message', 'notification'
  
  // Template content
  template: String, // Template with {{variables}}
  variables: Array, // List of available variables
  
  // Metadata
  name: String,
  description: String,
  active: Boolean,
  shop_domain: String, // If shop-specific
  
  // Audit trail
  created_by: ObjectId,
  created_at: ISODate,
  updated_by: ObjectId,
  updated_at: ISODate
}
```

#### System Configuration Collection
```javascript
// system_config collection
{
  _id: ObjectId,
  config_key: String,
  config_value: Mixed,
  data_type: String, // 'string', 'number', 'boolean', 'object'
  
  // Metadata
  description: String,
  category: String, // 'system', 'integrations', 'templates'
  is_sensitive: Boolean,
  
  // Version control
  version: Number,
  created_at: ISODate,
  updated_at: ISODate
}
```

#### Users Collection (for authentication)
```javascript
// users collection
{
  _id: ObjectId,
  user_id: String,
  
  // User details
  username: String,
  email: String,
  password_hash: String,
  role: String, // 'admin', 'user', 'viewer'
  
  // Profile
  first_name: String,
  last_name: String,
  avatar_url: String,
  
  // Authentication
  last_login: ISODate,
  login_count: Number,
  is_active: Boolean,
  email_verified: Boolean,
  
  // Security
  failed_login_attempts: Number,
  locked_until: ISODate,
  password_reset_token: String,
  password_reset_expires: ISODate,
  
  // Metadata
  created_at: ISODate,
  updated_at: ISODate
}
```

### PostgreSQL Schema Design (Alternative)

```sql
-- Webhooks table
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    webhook_id VARCHAR(255) UNIQUE NOT NULL,
    shopify_webhook_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    shop_domain VARCHAR(255),
    
    -- JSON columns for flexible data
    raw_data JSONB NOT NULL,
    organized_data JSONB,
    generated_messages JSONB,
    
    -- Processing metadata
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    errors TEXT[],
    retry_count INTEGER DEFAULT 0,
    
    -- Delivery tracking
    delivery_status JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhooks_event_type_created ON webhooks(event_type, created_at DESC);
CREATE INDEX idx_webhooks_shop_domain_created ON webhooks(shop_domain, created_at DESC);
CREATE INDEX idx_webhooks_status_created ON webhooks(status, created_at DESC);
CREATE INDEX idx_webhooks_shopify_id_event ON webhooks(raw_data->>'id', event_type);

-- GIN index for JSON queries
CREATE INDEX idx_webhooks_raw_data_gin ON webhooks USING GIN (raw_data);
CREATE INDEX idx_webhooks_organized_data_gin ON webhooks USING GIN (organized_data);

-- Custom templates table
CREATE TABLE custom_templates (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Template identification
    event_type VARCHAR(100) NOT NULL,
    message_format VARCHAR(50) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    
    -- Template content
    template TEXT NOT NULL,
    variables TEXT[],
    
    -- Metadata
    name VARCHAR(255),
    description TEXT,
    active BOOLEAN DEFAULT true,
    shop_domain VARCHAR(255),
    
    -- Audit trail
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- System configuration table
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    
    -- Metadata
    description TEXT,
    category VARCHAR(100),
    is_sensitive BOOLEAN DEFAULT false,
    
    -- Version control
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- User details
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    
    -- Authentication
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## 🔧 Service Layer Design

### Core Services Architecture

```javascript
// src/services/index.js - Service registry
class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.config = require('../config');
    }

    register(name, service) {
        this.services.set(name, service);
    }

    get(name) {
        if (!this.services.has(name)) {
            throw new Error(`Service ${name} not found`);
        }
        return this.services.get(name);
    }

    async initializeServices() {
        // Database service
        const dbService = new DatabaseService(this.config.database);
        await dbService.connect();
        this.register('database', dbService);

        // Cache service
        const cacheService = new CacheService(this.config.redis);
        await cacheService.connect();
        this.register('cache', cacheService);

        // Queue service
        const queueService = new QueueService(this.config.queue);
        await queueService.initialize();
        this.register('queue', queueService);

        // Message services
        if (this.config.whatsapp.enabled) {
            this.register('whatsapp', new WhatsAppService(this.config.whatsapp));
        }

        if (this.config.email.enabled) {
            this.register('email', new EmailService(this.config.email));
        }

        if (this.config.sms.enabled) {
            this.register('sms', new SMSService(this.config.sms));
        }

        // Core business services
        this.register('webhook', new WebhookProcessingService(this));
        this.register('template', new TemplateService(this));
        this.register('notification', new NotificationService(this));
        this.register('auth', new AuthenticationService(this));
    }
}
```

### Webhook Processing Service

```javascript
// src/services/WebhookProcessingService.js
class WebhookProcessingService {
    constructor(serviceContainer) {
        this.services = serviceContainer;
        this.db = serviceContainer.get('database');
        this.cache = serviceContainer.get('cache');
        this.queue = serviceContainer.get('queue');
        
        this.dataOrganizer = new DataOrganizer();
        this.templateEngine = new TemplateEngine();
    }

    async processWebhook(webhookData, headers) {
        const startTime = Date.now();
        const webhookId = this.generateWebhookId();
        
        try {
            // Store initial webhook record
            const webhookRecord = await this.createWebhookRecord(
                webhookId, 
                webhookData, 
                headers
            );

            // Validate webhook data
            this.validateWebhookData(webhookData);

            // Detect event type
            const eventType = this.detectEventType(webhookData, headers);

            // Organize webhook data
            const organizedData = this.dataOrganizer.organize(webhookData, eventType);
            if (!organizedData) {
                throw new Error('Failed to organize webhook data');
            }

            // Generate messages
            const messages = await this.generateMessages(eventType, organizedData);

            // Update webhook record with processed data
            await this.updateWebhookRecord(webhookId, {
                organized_data: organizedData,
                generated_messages: messages,
                processing_time_ms: Date.now() - startTime,
                status: 'processed'
            });

            // Queue message delivery jobs
            await this.queueMessageDelivery(webhookId, messages, organizedData);

            // Cache frequently accessed data
            await this.cacheWebhookData(webhookId, organizedData);

            return {
                success: true,
                webhookId,
                eventType,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            await this.handleProcessingError(webhookId, error, startTime);
            throw error;
        }
    }

    async createWebhookRecord(webhookId, rawData, headers) {
        const record = {
            webhook_id: webhookId,
            shopify_webhook_id: headers['x-shopify-webhook-id'],
            event_type: this.detectEventType(rawData, headers),
            shop_domain: headers['x-shopify-shop-domain'],
            raw_data: rawData,
            processing: {
                received_at: new Date(),
                status: 'processing'
            }
        };

        return await this.db.webhooks.create(record);
    }

    async updateWebhookRecord(webhookId, updates) {
        return await this.db.webhooks.update(
            { webhook_id: webhookId },
            { 
                ...updates,
                'processing.updated_at': new Date()
            }
        );
    }

    async generateMessages(eventType, organizedData) {
        const templates = await this.services.get('template');
        
        // Get applicable templates for this event
        const applicableTemplates = await templates.getTemplatesForEvent(eventType);
        
        const messages = {};
        
        for (const template of applicableTemplates) {
            try {
                const message = await templates.generateMessage(
                    template.format,
                    template.template,
                    organizedData
                );
                
                messages[template.format] = {
                    ...message,
                    template_id: template.id,
                    generated_at: new Date()
                };
            } catch (error) {
                console.error(`Failed to generate ${template.format} message:`, error);
                messages[template.format] = {
                    error: error.message,
                    generated_at: new Date()
                };
            }
        }
        
        return messages;
    }

    async queueMessageDelivery(webhookId, messages, organizedData) {
        const deliveryJobs = [];
        
        // WhatsApp delivery
        if (messages.whatsapp && !messages.whatsapp.error) {
            deliveryJobs.push({
                type: 'whatsapp',
                webhookId,
                to: organizedData.customer.phone,
                message: messages.whatsapp.message,
                priority: 'high'
            });
        }
        
        // Email delivery
        if (messages.email && !messages.email.error) {
            deliveryJobs.push({
                type: 'email',
                webhookId,
                to: organizedData.customer.email,
                subject: messages.email.subject,
                html: messages.email.html,
                text: messages.email.text,
                priority: 'medium'
            });
        }
        
        // SMS delivery
        if (messages.sms && !messages.sms.error) {
            deliveryJobs.push({
                type: 'sms',
                webhookId,
                to: organizedData.customer.phone,
                message: messages.sms.message,
                priority: 'low'
            });
        }
        
        // Add jobs to queue
        for (const job of deliveryJobs) {
            await this.queue.add('message-delivery', job, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                },
                priority: this.getPriorityValue(job.priority)
            });
        }
    }

    getPriorityValue(priority) {
        const priorities = { high: 100, medium: 50, low: 10 };
        return priorities[priority] || 10;
    }

    detectEventType(data, headers) {
        // Try header first
        const headerTopic = headers['x-shopify-topic'];
        if (headerTopic) return headerTopic;
        
        // Fallback to data analysis
        if (data.fulfillment_status !== null) return 'orders/fulfilled';
        if (data.cancelled_at !== null) return 'orders/cancelled';
        if (data.id && data.created_at) return 'orders/create';
        
        return 'orders/unknown';
    }

    validateWebhookData(data) {
        const required = ['id', 'created_at'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    generateWebhookId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `wh_${timestamp}_${random}`;
    }

    async handleProcessingError(webhookId, error, startTime) {
        await this.updateWebhookRecord(webhookId, {
            processing_time_ms: Date.now() - startTime,
            status: 'failed',
            errors: [error.message]
        });
    }
}
```

### Notification Delivery Service

```javascript
// src/services/NotificationService.js
class NotificationService {
    constructor(serviceContainer) {
        this.services = serviceContainer;
        this.db = serviceContainer.get('database');
        
        // Initialize delivery providers
        this.providers = new Map();
        
        if (serviceContainer.has('whatsapp')) {
            this.providers.set('whatsapp', serviceContainer.get('whatsapp'));
        }
        
        if (serviceContainer.has('email')) {
            this.providers.set('email', serviceContainer.get('email'));
        }
        
        if (serviceContainer.has('sms')) {
            this.providers.set('sms', serviceContainer.get('sms'));
        }
    }

    async deliverMessage(job) {
        const { type, webhookId, ...messageData } = job.data;
        
        try {
            const provider = this.providers.get(type);
            if (!provider) {
                throw new Error(`Provider ${type} not available`);
            }

            // Send message
            const result = await this.sendMessage(provider, type, messageData);
            
            // Update delivery status
            await this.updateDeliveryStatus(webhookId, type, {
                status: 'sent',
                sent_at: new Date(),
                message_id: result.messageId,
                provider_response: result
            });

            return result;

        } catch (error) {
            // Update delivery status with error
            await this.updateDeliveryStatus(webhookId, type, {
                status: 'failed',
                error: error.message,
                failed_at: new Date()
            });

            throw error;
        }
    }

    async sendMessage(provider, type, messageData) {
        switch (type) {
            case 'whatsapp':
                return await provider.sendMessage(messageData.to, messageData.message);
                
            case 'email':
                return await provider.sendEmail(
                    messageData.to,
                    messageData.subject,
                    messageData.html,
                    messageData.text
                );
                
            case 'sms':
                return await provider.sendSMS(messageData.to, messageData.message);
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    }

    async updateDeliveryStatus(webhookId, messageType, statusUpdate) {
        const updatePath = `delivery_status.${messageType}`;
        
        return await this.db.webhooks.update(
            { webhook_id: webhookId },
            { 
                [updatePath]: statusUpdate,
                updated_at: new Date()
            }
        );
    }

    // Handle delivery status callbacks (for services that support them)
    async handleDeliveryCallback(messageId, status, metadata = {}) {
        // Find webhook by message ID
        const webhook = await this.db.webhooks.findOne({
            $or: [
                { 'delivery_status.whatsapp.message_id': messageId },
                { 'delivery_status.email.message_id': messageId },
                { 'delivery_status.sms.message_id': messageId }
            ]
        });

        if (!webhook) {
            console.warn(`No webhook found for message ID: ${messageId}`);
            return;
        }

        // Determine message type and update status
        let messageType;
        if (webhook.delivery_status.whatsapp?.message_id === messageId) {
            messageType = 'whatsapp';
        } else if (webhook.delivery_status.email?.message_id === messageId) {
            messageType = 'email';
        } else if (webhook.delivery_status.sms?.message_id === messageId) {
            messageType = 'sms';
        }

        if (messageType) {
            await this.updateDeliveryStatus(webhook.webhook_id, messageType, {
                status: status,
                delivered_at: status === 'delivered' ? new Date() : undefined,
                callback_metadata: metadata,
                updated_at: new Date()
            });
        }
    }
}
```

## 📬 Message Queue System

### Queue Configuration with Bull

```javascript
// src/services/QueueService.js
const Queue = require('bull');
const Redis = require('ioredis');

class QueueService {
    constructor(config) {
        this.config = config;
        this.redis = new Redis(config.redis_url);
        this.queues = new Map();
        
        // Initialize queues
        this.initializeQueues();
    }

    initializeQueues() {
        // Message delivery queue (high priority)
        const messageQueue = new Queue('message-delivery', {
            redis: this.config.redis_url,
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        });

        // Webhook processing queue (medium priority)
        const webhookQueue = new Queue('webhook-processing', {
            redis: this.config.redis_url,
            defaultJobOptions: {
                removeOnComplete: 200,
                removeOnFail: 100,
                attempts: 2,
                backoff: {
                    type: 'fixed',
                    delay: 5000
                }
            }
        });

        // Analytics and reporting queue (low priority)
        const analyticsQueue = new Queue('analytics', {
            redis: this.config.redis_url,
            defaultJobOptions: {
                removeOnComplete: 50,
                removeOnFail: 25,
                attempts: 1
            }
        });

        this.queues.set('message-delivery', messageQueue);
        this.queues.set('webhook-processing', webhookQueue);
        this.queues.set('analytics', analyticsQueue);

        // Setup processors
        this.setupProcessors();
    }

    setupProcessors() {
        // Message delivery processor
        const messageQueue = this.queues.get('message-delivery');
        messageQueue.process('whatsapp', 5, require('../processors/whatsapp-processor'));
        messageQueue.process('email', 10, require('../processors/email-processor'));
        messageQueue.process('sms', 3, require('../processors/sms-processor'));

        // Webhook processing processor
        const webhookQueue = this.queues.get('webhook-processing');
        webhookQueue.process('process-webhook', 20, require('../processors/webhook-processor'));

        // Analytics processor
        const analyticsQueue = this.queues.get('analytics');
        analyticsQueue.process('generate-report', 1, require('../processors/analytics-processor'));
        analyticsQueue.process('cleanup-data', 1, require('../processors/cleanup-processor'));

        // Setup event handlers
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        for (const [queueName, queue] of this.queues) {
            queue.on('completed', (job, result) => {
                console.log(`Job ${job.id} in queue ${queueName} completed:`, result);
            });

            queue.on('failed', (job, error) => {
                console.error(`Job ${job.id} in queue ${queueName} failed:`, error);
            });

            queue.on('stalled', (job) => {
                console.warn(`Job ${job.id} in queue ${queueName} stalled`);
            });
        }
    }

    async add(queueName, jobType, data, options = {}) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        return await queue.add(jobType, data, options);
    }

    async getQueueStatus(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed()
        ]);

        return {
            name: queueName,
            counts: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length
            }
        };
    }

    async getAllQueuesStatus() {
        const statuses = [];
        
        for (const queueName of this.queues.keys()) {
            statuses.push(await this.getQueueStatus(queueName));
        }
        
        return statuses;
    }

    async pauseQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        
        await queue.pause();
    }

    async resumeQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        
        await queue.resume();
    }

    async cleanQueue(queueName, grace = 5000) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        
        await queue.clean(grace, 'completed');
        await queue.clean(grace, 'failed');
    }
}

module.exports = QueueService;
```

### Job Processors

```javascript
// src/processors/whatsapp-processor.js
module.exports = async function(job) {
    const { serviceContainer } = require('../app');
    const notificationService = serviceContainer.get('notification');
    
    console.log(`Processing WhatsApp message job ${job.id}`);
    
    try {
        const result = await notificationService.deliverMessage(job);
        
        return {
            success: true,
            messageId: result.messageId,
            processedAt: new Date()
        };
    } catch (error) {
        console.error(`WhatsApp delivery failed for job ${job.id}:`, error);
        throw error;
    }
};

// src/processors/email-processor.js
module.exports = async function(job) {
    const { serviceContainer } = require('../app');
    const notificationService = serviceContainer.get('notification');
    
    console.log(`Processing email job ${job.id}`);
    
    try {
        const result = await notificationService.deliverMessage(job);
        
        return {
            success: true,
            messageId: result.messageId,
            processedAt: new Date()
        };
    } catch (error) {
        console.error(`Email delivery failed for job ${job.id}:`, error);
        throw error;
    }
};

// src/processors/webhook-processor.js
module.exports = async function(job) {
    const { serviceContainer } = require('../app');
    const webhookService = serviceContainer.get('webhook');
    
    console.log(`Processing webhook job ${job.id}`);
    
    try {
        const { webhookData, headers } = job.data;
        const result = await webhookService.processWebhook(webhookData, headers);
        
        return {
            success: true,
            webhookId: result.webhookId,
            processedAt: new Date()
        };
    } catch (error) {
        console.error(`Webhook processing failed for job ${job.id}:`, error);
        throw error;
    }
};
```

## 🔐 Authentication & Security

### JWT Authentication Service

```javascript
// src/services/AuthenticationService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthenticationService {
    constructor(serviceContainer) {
        this.db = serviceContainer.get('database');
        this.cache = serviceContainer.get('cache');
        this.config = serviceContainer.config.auth;
        
        this.jwtSecret = this.config.jwt_secret;
        this.tokenExpiry = this.config.token_expiry || '24h';
        this.maxFailedAttempts = this.config.max_failed_attempts || 5;
        this.lockoutDuration = this.config.lockout_duration || 30 * 60 * 1000; // 30 minutes
    }

    async authenticate(username, password) {
        try {
            // Find user
            const user = await this.db.users.findOne({
                $or: [
                    { username: username },
                    { email: username }
                ]
            });

            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check if account is locked
            if (user.locked_until && user.locked_until > new Date()) {
                throw new Error('Account temporarily locked due to failed login attempts');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                await this.handleFailedLogin(user);
                throw new Error('Invalid credentials');
            }

            // Reset failed attempts on successful login
            await this.resetFailedAttempts(user);

            // Generate JWT token
            const token = this.generateToken(user);

            // Update last login
            await this.updateLastLogin(user);

            return {
                user: this.sanitizeUser(user),
                token: token,
                expiresIn: this.tokenExpiry
            };

        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async handleFailedLogin(user) {
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const updateData = {
            failed_login_attempts: failedAttempts,
            updated_at: new Date()
        };

        if (failedAttempts >= this.maxFailedAttempts) {
            updateData.locked_until = new Date(Date.now() + this.lockoutDuration);
        }

        await this.db.users.update(
            { _id: user._id },
            updateData
        );
    }

    async resetFailedAttempts(user) {
        await this.db.users.update(
            { _id: user._id },
            {
                failed_login_attempts: 0,
                locked_until: null,
                updated_at: new Date()
            }
        );
    }

    async updateLastLogin(user) {
        await this.db.users.update(
            { _id: user._id },
            {
                last_login: new Date(),
                login_count: (user.login_count || 0) + 1,
                updated_at: new Date()
            }
        );
    }

    generateToken(user) {
        const payload = {
            userId: user.user_id,
            username: user.username,
            role: user.role,
            iat: Math.floor(Date.now() / 1000)
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.tokenExpiry
        });
    }

    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Check if token is blacklisted
            const isBlacklisted = await this.cache.get(`blacklist:${token}`);
            if (isBlacklisted) {
                throw new Error('Token has been revoked');
            }

            // Get fresh user data
            const user = await this.db.users.findOne({ user_id: decoded.userId });
            if (!user || !user.is_active) {
                throw new Error('User not found or inactive');
            }

            return {
                ...decoded,
                user: this.sanitizeUser(user)
            };

        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    async revokeToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret, { ignoreExpiration: true });
            const expiresAt = decoded.exp * 1000;
            const ttl = Math.max(0, expiresAt - Date.now());
            
            if (ttl > 0) {
                await this.cache.set(`blacklist:${token}`, true, Math.ceil(ttl / 1000));
            }
        } catch (error) {
            // Token is invalid, no need to blacklist
        }
    }

    async createUser(userData) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(userData.password, salt);

        // Create user record
        const user = {
            user_id: this.generateUserId(),
            username: userData.username,
            email: userData.email,
            password_hash: passwordHash,
            role: userData.role || 'user',
            first_name: userData.first_name,
            last_name: userData.last_name,
            is_active: true,
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date()
        };

        const result = await this.db.users.create(user);
        return this.sanitizeUser(result);
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.db.users.findOne({ user_id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await this.db.users.update(
            { user_id: userId },
            {
                password_hash: passwordHash,
                updated_at: new Date()
            }
        );
    }

    async requestPasswordReset(email) {
        const user = await this.db.users.findOne({ email });
        if (!user) {
            // Don't reveal if email exists
            return { message: 'If the email exists, a reset link will be sent' };
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store reset token
        await this.db.users.update(
            { _id: user._id },
            {
                password_reset_token: resetToken,
                password_reset_expires: resetExpires,
                updated_at: new Date()
            }
        );

        // Send reset email (implement email service)
        // await this.sendPasswordResetEmail(user.email, resetToken);

        return { message: 'If the email exists, a reset link will be sent' };
    }

    sanitizeUser(user) {
        const { password_hash, password_reset_token, ...sanitized } = user;
        return sanitized;
    }

    generateUserId() {
        return `user_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    }
}

module.exports = AuthenticationService;
```

### Security Middleware

```javascript
// src/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: message,
                retryAfter: Math.round(windowMs / 1000)
            });
        }
    });
};

// Different limits for different endpoints
const webhookLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    100, // 100 requests per minute
    'Too many webhook requests'
);

const apiLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per 15 minutes
    'Too many API requests'
);

const authLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    10, // 10 login attempts per 15 minutes
    'Too many authentication attempts'
);

// Security headers
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : true,
    credentials: true,
    optionsSuccessStatus: 200
};

// Request validation
const validateContentType = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        if (!req.is('application/json')) {
            return res.status(400).json({
                error: 'Content-Type must be application/json'
            });
        }
    }
    next();
};

// Request size limits
const requestSizeLimit = (limit) => {
    return (req, res, next) => {
        if (req.headers['content-length']) {
            const contentLength = parseInt(req.headers['content-length']);
            if (contentLength > limit) {
                return res.status(413).json({
                    error: 'Request entity too large'
                });
            }
        }
        next();
    };
};

module.exports = {
    webhookLimiter,
    apiLimiter,
    authLimiter,
    securityHeaders,
    corsOptions,
    validateContentType,
    requestSizeLimit
};
```

## 📊 Monitoring & Logging

### Comprehensive Logging System

```javascript
// src/services/LoggingService.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

class LoggingService {
    constructor(config) {
        this.config = config;
        this.logger = this.createLogger();
    }

    createLogger() {
        const logFormat = winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.prettyPrint()
        );

        const transports = [];

        // Console transport for development
        if (process.env.NODE_ENV !== 'production') {
            transports.push(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            );
        }

        // File transports
        transports.push(
            // General application logs
            new DailyRotateFile({
                filename: 'logs/application-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
                level: 'info'
            }),

            // Error logs
            new DailyRotateFile({
                filename: 'logs/error-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d',
                level: 'error'
            }),

            // Webhook processing logs
            new DailyRotateFile({
                filename: 'logs/webhooks-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '50m',
                maxFiles: '7d',
                level: 'debug',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            })
        );

        return winston.createLogger({
            level: this.config.log_level || 'info',
            format: logFormat,
            transports,
            exceptionHandlers: [
                new winston.transports.File({ filename: 'logs/exceptions.log' })
            ],
            rejectionHandlers: [
                new winston.transports.File({ filename: 'logs/rejections.log' })
            ]
        });
    }

    // Structured logging methods
    logWebhookReceived(webhookId, eventType, shopDomain) {
        this.logger.info('Webhook received', {
            webhookId,
            eventType,
            shopDomain,
            event: 'webhook.received'
        });
    }

    logWebhookProcessed(webhookId, eventType, processingTimeMs) {
        this.logger.info('Webhook processed successfully', {
            webhookId,
            eventType,
            processingTimeMs,
            event: 'webhook.processed'
        });
    }

    logWebhookFailed(webhookId, eventType, error) {
        this.logger.error('Webhook processing failed', {
            webhookId,
            eventType,
            error: error.message,
            stack: error.stack,
            event: 'webhook.failed'
        });
    }

    logMessageSent(messageType, webhookId, recipient, messageId) {
        this.logger.info('Message sent successfully', {
            messageType,
            webhookId,
            recipient: this.maskSensitiveData(recipient),
            messageId,
            event: 'message.sent'
        });
    }

    logMessageFailed(messageType, webhookId, recipient, error) {
        this.logger.error('Message sending failed', {
            messageType,
            webhookId,
            recipient: this.maskSensitiveData(recipient),
            error: error.message,
            event: 'message.failed'
        });
    }

    logAuthAttempt(username, success, ipAddress) {
        const level = success ? 'info' : 'warn';
        const message = success ? 'Authentication successful' : 'Authentication failed';
        
        this.logger.log(level, message, {
            username,
            success,
            ipAddress,
            event: 'auth.attempt'
        });
    }

    logApiRequest(req, res, responseTime) {
        this.logger.info('API request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            event: 'api.request'
        });
    }

    maskSensitiveData(data) {
        if (typeof data === 'string') {
            // Mask phone numbers: +92-XXX-XXXXXX -> +92-XXX-XX****
            if (data.match(/^\+?\d+/)) {
                return data.replace(/(\+?\d{2}-?\d{3}-?\d{2})\d+/, '$1****');
            }
            // Mask email: user@domain.com -> u***@domain.com
            if (data.includes('@')) {
                const [username, domain] = data.split('@');
                return `${username.charAt(0)}***@${domain}`;
            }
        }
        return data;
    }

    // Query logs for monitoring and debugging
    async queryLogs(filters = {}) {
        // This would integrate with log aggregation services
        // like ELK stack, Splunk, or cloud logging services
        return {
            message: 'Log querying not implemented - integrate with log aggregation service'
        };
    }
}

module.exports = LoggingService;
```

### Metrics and Monitoring

```javascript
// src/services/MetricsService.js
const prometheus = require('prom-client');

class MetricsService {
    constructor() {
        // Create metrics collectors
        this.createMetrics();
        
        // Enable default system metrics
        prometheus.collectDefaultMetrics({
            timeout: 5000,
            prefix: 'webhook_system_'
        });
    }

    createMetrics() {
        // Webhook processing metrics
        this.webhookCounter = new prometheus.Counter({
            name: 'webhook_requests_total',
            help: 'Total number of webhook requests',
            labelNames: ['event_type', 'shop_domain', 'status']
        });

        this.webhookDuration = new prometheus.Histogram({
            name: 'webhook_processing_duration_seconds',
            help: 'Webhook processing duration in seconds',
            labelNames: ['event_type', 'status'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });

        // Message delivery metrics
        this.messageCounter = new prometheus.Counter({
            name: 'messages_sent_total',
            help: 'Total number of messages sent',
            labelNames: ['type', 'status']
        });

        this.messageDuration = new prometheus.Histogram({
            name: 'message_delivery_duration_seconds',
            help: 'Message delivery duration in seconds',
            labelNames: ['type'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
        });

        // Queue metrics
        this.queueSize = new prometheus.Gauge({
            name: 'queue_size',
            help: 'Current queue size',
            labelNames: ['queue_name', 'status']
        });

        // API metrics
        this.apiRequestCounter = new prometheus.Counter({
            name: 'api_requests_total',
            help: 'Total number of API requests',
            labelNames: ['method', 'route', 'status_code']
        });

        this.apiRequestDuration = new prometheus.Histogram({
            name: 'api_request_duration_seconds',
            help: 'API request duration in seconds',
            labelNames: ['method', 'route'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
        });

        // Database metrics
        this.dbQueryCounter = new prometheus.Counter({
            name: 'database_queries_total',
            help: 'Total number of database queries',
            labelNames: ['operation', 'collection']
        });

        this.dbQueryDuration = new prometheus.Histogram({
            name: 'database_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['operation', 'collection'],
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2]
        });
    }

    // Webhook metrics
    recordWebhookReceived(eventType, shopDomain) {
        this.webhookCounter.inc({ event_type: eventType, shop_domain: shopDomain, status: 'received' });
    }

    recordWebhookProcessed(eventType, shopDomain, duration, status) {
        this.webhookCounter.inc({ event_type: eventType, shop_domain: shopDomain, status });
        this.webhookDuration.observe({ event_type: eventType, status }, duration / 1000);
    }

    // Message metrics
    recordMessageSent(messageType, status, duration) {
        this.messageCounter.inc({ type: messageType, status });
        if (duration) {
            this.messageDuration.observe({ type: messageType }, duration / 1000);
        }
    }

    // Queue metrics
    updateQueueSize(queueName, status, size) {
        this.queueSize.set({ queue_name: queueName, status }, size);
    }

    // API metrics
    recordApiRequest(method, route, statusCode, duration) {
        this.apiRequestCounter.inc({ method, route, status_code: statusCode });
        this.apiRequestDuration.observe({ method, route }, duration / 1000);
    }

    // Database metrics
    recordDatabaseQuery(operation, collection, duration) {
        this.dbQueryCounter.inc({ operation, collection });
        this.dbQueryDuration.observe({ operation, collection }, duration / 1000);
    }

    // Get all metrics for Prometheus endpoint
    getMetrics() {
        return prometheus.register.metrics();
    }

    // Get specific metrics for dashboard
    async getDashboardMetrics() {
        const metrics = await prometheus.register.getMetricsAsJSON();
        
        return {
            webhooks: this.extractMetricValue(metrics, 'webhook_requests_total'),
            messages: this.extractMetricValue(metrics, 'messages_sent_total'),
            queues: this.extractMetricValue(metrics, 'queue_size'),
            api: this.extractMetricValue(metrics, 'api_requests_total'),
            system: {
                memory: this.extractMetricValue(metrics, 'process_resident_memory_bytes'),
                cpu: this.extractMetricValue(metrics, 'process_cpu_user_seconds_total')
            }
        };
    }

    extractMetricValue(metrics, metricName) {
        const metric = metrics.find(m => m.name === metricName);
        return metric ? metric.values : [];
    }
}

module.exports = MetricsService;
```

## 📈 Scalability & Performance

### Horizontal Scaling Architecture

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # Load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api-1
      - api-2
      - api-3

  # API servers (multiple instances)
  api-1:
    build: .
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=api-1
      - PORT=3000
    depends_on:
      - mongodb-primary
      - redis

  api-2:
    build: .
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=api-2
      - PORT=3000
    depends_on:
      - mongodb-primary
      - redis

  api-3:
    build: .
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=api-3
      - PORT=3000
    depends_on:
      - mongodb-primary
      - redis

  # Worker processes for background jobs
  worker-1:
    build: .
    command: node workers/message-worker.js
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=message-delivery
    depends_on:
      - redis
      - mongodb-primary

  worker-2:
    build: .
    command: node workers/webhook-worker.js
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=webhook-processing
    depends_on:
      - redis
      - mongodb-primary

  # Database cluster
  mongodb-primary:
    image: mongo:6
    command: mongod --replSet rs0
    volumes:
      - mongodb-primary-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}

  mongodb-secondary:
    image: mongo:6
    command: mongod --replSet rs0
    volumes:
      - mongodb-secondary-data:/data/db
    depends_on:
      - mongodb-primary

  # Redis cluster
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  redis-sentinel:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    depends_on:
      - redis

  # Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  mongodb-primary-data:
  mongodb-secondary-data:
  redis-data:
  grafana-data:
```

### Performance Optimizations

```javascript
// src/middleware/performance.js
const compression = require('compression');
const responseTime = require('response-time');

// Response compression
const compressionMiddleware = compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
});

// Response time tracking
const responseTimeMiddleware = responseTime((req, res, time) => {
    // Record metrics
    if (global.metricsService) {
        global.metricsService.recordApiRequest(
            req.method,
            req.route?.path || req.path,
            res.statusCode,
            time
        );
    }
});

// Database connection pooling
const databaseOptimization = {
    mongodb: {
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4 // Use IPv4
    },
    redis: {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
        lazyConnect: true
    }
};

// Memory management
const memoryOptimization = () => {
    // Force garbage collection periodically (only in production)
    if (process.env.NODE_ENV === 'production') {
        setInterval(() => {
            if (global.gc) {
                global.gc();
            }
        }, 300000); // Every 5 minutes
    }

    // Monitor memory usage
    setInterval(() => {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
            console.warn('High memory usage detected:', memUsage);
        }
    }, 60000); // Every minute
};

// Cache optimization
const cacheStrategies = {
    // Cache frequently accessed webhook data
    webhookCache: {
        ttl: 300, // 5 minutes
        maxSize: 1000
    },
    
    // Cache template data
    templateCache: {
        ttl: 3600, // 1 hour
        maxSize: 100
    },
    
    // Cache user sessions
    sessionCache: {
        ttl: 1800, // 30 minutes
        maxSize: 10000
    }
};

module.exports = {
    compressionMiddleware,
    responseTimeMiddleware,
    databaseOptimization,
    memoryOptimization,
    cacheStrategies
};
```

## 🚀 Deployment Architecture

### Kubernetes Deployment

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: webhook-system

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webhook-config
  namespace: webhook-system
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  SHOP_NAME: "MazayLO"
  SUPPORT_PHONE: "+92-300-1234567"
  SUPPORT_EMAIL: "support@mazaylo.com"

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-api
  namespace: webhook-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webhook-api
  template:
    metadata:
      labels:
        app: webhook-api
    spec:
      containers:
      - name: webhook-api
        image: webhook-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        envFrom:
        - configMapRef:
            name: webhook-config
        - secretRef:
            name: webhook-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: webhook-service
  namespace: webhook-system
spec:
  selector:
    app: webhook-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-ingress
  namespace: webhook-system
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.yourcompany.com
    secretName: webhook-tls
  rules:
  - host: api.yourcompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webhook-service
            port:
              number: 80

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webhook-hpa
  namespace: webhook-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webhook-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🎯 Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)
1. **Database Layer**
   - Set up MongoDB/PostgreSQL with proper schemas
   - Implement connection pooling and optimization
   - Create basic CRUD operations

2. **Authentication System**
   - JWT-based authentication
   - User management
   - Role-based access control

3. **Basic API Structure**
   - Express.js setup with middleware
   - Request validation
   - Error handling

### Phase 2: Webhook Processing (Weeks 3-4)
1. **Webhook Handler**
   - Data validation and organization
   - Template engine integration
   - Basic message generation

2. **Message Queue**
   - Redis-based queue setup
   - Job processing workers
   - Retry mechanisms

3. **Testing Framework**
   - Unit tests for core components
   - Integration tests for API endpoints

### Phase 3: Message Delivery (Weeks 5-6)
1. **WhatsApp Integration**
   - WhatsApp Business API setup
   - Message sending and status tracking
   - Template message support

2. **Email Service**
   - SendGrid/SES integration
   - HTML template rendering
   - Delivery tracking

3. **SMS Service**
   - Twilio integration
   - Message sending and status updates

### Phase 4: Monitoring & Analytics (Weeks 7-8)
1. **Logging System**
   - Structured logging with Winston
   - Log aggregation and rotation
   - Error tracking

2. **Metrics Collection**
   - Prometheus metrics
   - Grafana dashboards
   - Performance monitoring

3. **Admin Dashboard**
   - System statistics
   - User management
   - Configuration management

### Phase 5: Production Deployment (Weeks 9-10)
1. **Containerization**
   - Docker images and multi-stage builds
   - Docker Compose for local development
   - Kubernetes deployment configs

2. **CI/CD Pipeline**
   - Automated testing
   - Build and deployment automation
   - Environment management

3. **Security Hardening**
   - Security headers and middleware
   - Rate limiting and DDoS protection
   - SSL/TLS configuration

### Phase 6: Optimization & Scaling (Weeks 11-12)
1. **Performance Optimization**
   - Database query optimization
   - Caching strategies
   - Memory management

2. **Horizontal Scaling**
   - Load balancing
   - Auto-scaling configuration
   - Database clustering

3. **Documentation & Training**
   - API documentation
   - Deployment guides
   - User training materials

---

This backend architecture guide provides a comprehensive blueprint for building a production-ready webhook processing system. Each component is designed to be scalable, maintainable, and secure. The implementation can be done incrementally, following the roadmap to ensure steady progress and early validation of core functionality.

**Next Steps:**
1. Choose your technology stack based on team expertise
2. Set up development environment following Phase 1
3. Implement core infrastructure components
4. Add webhook processing capabilities
5. Integrate messaging services
6. Deploy to production with monitoring

The system is designed to handle high volume webhook processing while maintaining reliability and performance. Each service can be scaled independently based on load patterns and requirements.
