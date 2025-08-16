# 🛠️ Development Guide - Webhook System

Complete development documentation for expanding and customizing the webhook system.

## 📋 Table of Contents

- [Development Setup](#-development-setup)
- [Architecture Overview](#-architecture-overview)
- [Development Workflow](#-development-workflow)
- [Adding New Features](#-adding-new-features)
- [Database Integration](#-database-integration)
- [Authentication & Security](#-authentication--security)
- [WhatsApp Integration](#-whatsapp-integration)
- [Email Service Integration](#-email-service-integration)
- [SMS Service Integration](#-sms-service-integration)
- [Production Deployment](#-production-deployment)
- [Performance Optimization](#-performance-optimization)
- [Troubleshooting](#-troubleshooting)

## 🚀 Development Setup

### Prerequisites
```bash
# Required software
- Node.js 16+ and npm 8+
- Git (for version control)
- Code editor (VS Code recommended)
- Postman or similar API testing tool

# Optional for full deployment
- MongoDB or PostgreSQL
- Redis (for caching and queues)
- Docker (for containerization)
```

### Initial Setup
```bash
# 1. Clone/Copy the project
cd webhook-system

# 2. Install dependencies
npm install

# 3. Install development dependencies
npm install --save-dev nodemon eslint prettier

# 4. Create environment file
cp .env.example .env

# 5. Start development server
npm run dev
```

### Environment Configuration
Create `.env` file in project root:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Shop Configuration
SHOP_NAME="MazayLO"
SUPPORT_PHONE="+92-300-1234567"
SUPPORT_EMAIL="support@mazaylo.com"
WEBSITE_URL="https://mazaylo.com"

# Database (when implemented)
DATABASE_URL="mongodb://localhost:27017/webhook-system"
# DATABASE_URL="postgresql://user:password@localhost:5432/webhook_system"

# Redis (for caching and queues)
REDIS_URL="redis://localhost:6379"

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN="your_access_token_here"
WHATSAPP_PHONE_ID="your_phone_number_id"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_verify_token"

# Email Service (SendGrid example)
SENDGRID_API_KEY="your_sendgrid_api_key"
FROM_EMAIL="noreply@mazaylo.com"

# SMS Service (Twilio example)
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# Security
JWT_SECRET="your-super-secret-jwt-key"
API_KEY="your-api-key-for-external-access"

# Logging
LOG_LEVEL="debug"
LOG_FILE="logs/app.log"

# Feature Flags
ENABLE_DATABASE=false
ENABLE_WHATSAPP_SENDING=false
ENABLE_EMAIL_SENDING=false
ENABLE_SMS_SENDING=false
ENABLE_AUTHENTICATION=false
```

## 🏗️ Architecture Overview

### Current Structure
```
webhook-system/
├── app.js                    # Main Express application
├── src/
│   ├── organizers/          # Data processing modules
│   ├── templates/           # Message template system
│   ├── middleware/          # Express middleware (to be added)
│   ├── routes/              # API route handlers (to be added)
│   ├── services/            # Business logic services (to be added)
│   ├── models/              # Data models (to be added)
│   └── utils/               # Utility functions (to be added)
├── config/                  # Configuration files
├── public/                  # Static files and dashboard
├── tests/                   # Test files
└── docs/                    # Documentation
```

### Planned Expansions
```
src/
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── validation.js        # Request validation
│   ├── rateLimiting.js      # Rate limiting
│   └── errorHandler.js      # Global error handling
├── routes/
│   ├── webhooks.js          # Webhook endpoints
│   ├── auth.js              # Authentication routes
│   ├── dashboard.js         # Dashboard API
│   └── admin.js             # Admin panel API
├── services/
│   ├── WhatsAppService.js   # WhatsApp Business API
│   ├── EmailService.js      # Email sending service
│   ├── SMSService.js        # SMS sending service
│   ├── DatabaseService.js   # Database operations
│   └── QueueService.js      # Background job processing
├── models/
│   ├── Webhook.js           # Webhook data model
│   ├── User.js              # User authentication
│   ├── Template.js          # Custom templates
│   └── Settings.js          # System settings
└── utils/
    ├── logger.js            # Logging utility
    ├── crypto.js            # Encryption/hashing
    ├── validators.js        # Data validation
    └── helpers.js           # Common helper functions
```

### Technology Stack

**Current:**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Frontend:** Vanilla HTML/CSS/JS
- **Storage:** In-memory (temporary)

**Planned Additions:**
- **Database:** MongoDB or PostgreSQL
- **Cache:** Redis
- **Queue:** Bull.js with Redis
- **Authentication:** JWT tokens
- **Validation:** Joi or Yup
- **Logging:** Winston
- **Testing:** Jest or Mocha
- **API Documentation:** Swagger/OpenAPI

## 🔄 Development Workflow

### 1. Feature Development Process
```bash
# 1. Create feature branch
git checkout -b feature/whatsapp-integration

# 2. Make changes and test
npm run dev          # Start development server
npm test            # Run tests
npm run lint        # Check code style

# 3. Commit and push
git add .
git commit -m "feat: add WhatsApp Business API integration"
git push origin feature/whatsapp-integration

# 4. Create pull request and merge
```

### 2. Code Style Guidelines
```javascript
// Use consistent naming conventions
const camelCaseForVariables = 'example';
const PascalCaseForClasses = class Example {};
const UPPER_CASE_FOR_CONSTANTS = 'EXAMPLE';

// Always use async/await for promises
async function processWebhook(data) {
    try {
        const result = await dataOrganizer.organize(data);
        return result;
    } catch (error) {
        logger.error('Webhook processing failed:', error);
        throw error;
    }
}

// Use descriptive error messages
throw new Error('Failed to send WhatsApp message: Invalid phone number format');

// Add JSDoc comments for functions
/**
 * Process incoming Shopify webhook
 * @param {Object} webhookData - Raw webhook payload
 * @param {string} eventType - Type of webhook event
 * @returns {Promise<Object>} Processed webhook result
 */
```

### 3. Testing Strategy
```bash
# Unit tests for individual components
npm test src/organizers/DataOrganizer.test.js

# Integration tests for API endpoints
npm test tests/integration/webhooks.test.js

# End-to-end tests for complete workflows
npm test tests/e2e/webhook-flow.test.js

# Performance tests
npm test tests/performance/load.test.js
```

## ➕ Adding New Features

### 1. Adding a New Webhook Event Type

**Step 1:** Update DataOrganizer
```javascript
// src/organizers/DataOrganizer.js
detectWebhookType(data) {
    // Add new event detection
    if (data.inventory_level_id) {
        return 'inventory_levels/update';
    }
    // ... existing code
}

organizeInventoryUpdate() {
    const data = this.rawData;
    return {
        type: 'inventory_updated',
        product: this.buildProductInfo(),
        inventory: {
            available: data.available,
            location: data.location_id,
            updated_at: data.updated_at
        },
        // ... additional fields
    };
}
```

**Step 2:** Add Message Templates
```javascript
// src/templates/MessageTemplates.js
loadDefaultTemplates() {
    return {
        // ... existing templates
        inventory_updated: {
            whatsapp: {
                message: `📦 *Inventory Updated*\n\n*Product:* {{product_title}}\n*Available:* {{inventory_available}}\n*Location:* {{inventory_location}}`
            },
            email: {
                subject: 'Inventory Level Updated - {{product_title}}',
                html: `<h2>Inventory Updated</h2><p>Product: {{product_title}}</p>`
            }
        }
    };
}
```

**Step 3:** Add API Endpoint
```javascript
// app.js or separate route file
app.post('/api/webhooks/inventory-update', (req, res) => {
    this.handleWebhook(req, res, 'inventory_levels/update');
});
```

### 2. Adding a New Service Integration

Create a new service file:
```javascript
// src/services/SlackService.js
class SlackService {
    constructor(config) {
        this.webhookUrl = config.webhookUrl;
        this.channel = config.channel;
    }

    async sendMessage(message, options = {}) {
        const payload = {
            channel: options.channel || this.channel,
            text: message,
            username: 'Order Bot',
            icon_emoji: ':shopping_cart:'
        };

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Slack API error: ${response.status}`);
        }

        return await response.json();
    }
}

module.exports = SlackService;
```

## 🗄️ Database Integration

### MongoDB Implementation
```javascript
// src/services/DatabaseService.js
const mongoose = require('mongoose');

// Webhook Model
const webhookSchema = new mongoose.Schema({
    webhook_id: { type: String, required: true, unique: true },
    event_type: { type: String, required: true },
    shop_domain: String,
    order_id: String,
    customer_id: String,
    raw_data: mongoose.Schema.Types.Mixed,
    organized_data: mongoose.Schema.Types.Mixed,
    generated_messages: mongoose.Schema.Types.Mixed,
    processing_time_ms: Number,
    status: { type: String, enum: ['processed', 'failed'], required: true },
    errors: [String],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const Webhook = mongoose.model('Webhook', webhookSchema);

class DatabaseService {
    async connect() {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to MongoDB');
    }

    async saveWebhook(webhookData) {
        const webhook = new Webhook(webhookData);
        return await webhook.save();
    }

    async getRecentWebhooks(limit = 50) {
        return await Webhook.find()
            .sort({ created_at: -1 })
            .limit(limit)
            .exec();
    }

    async getWebhookStats() {
        const stats = await Webhook.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    successful: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
                }
            }
        ]);
        
        return stats[0] || { total: 0, successful: 0, failed: 0 };
    }
}

module.exports = DatabaseService;
```

### PostgreSQL Implementation
```javascript
// src/services/DatabaseService.js
const { Pool } = require('pg');

class DatabaseService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    async initialize() {
        // Create tables if they don't exist
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS webhooks (
                id SERIAL PRIMARY KEY,
                webhook_id VARCHAR(255) UNIQUE NOT NULL,
                event_type VARCHAR(100) NOT NULL,
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
            
            CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
            CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type);
        `);
    }

    async saveWebhook(webhookData) {
        const query = `
            INSERT INTO webhooks (webhook_id, event_type, shop_domain, order_id, 
                                customer_id, raw_data, organized_data, generated_messages,
                                processing_time_ms, status, errors)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const values = [
            webhookData.webhook_id,
            webhookData.event_type,
            webhookData.shop_domain,
            webhookData.order_id,
            webhookData.customer_id,
            JSON.stringify(webhookData.raw_data),
            JSON.stringify(webhookData.organized_data),
            JSON.stringify(webhookData.generated_messages),
            webhookData.processing_time_ms,
            webhookData.status,
            webhookData.errors
        ];

        const result = await this.pool.query(query, values);
        return result.rows[0];
    }
}
```

## 🔐 Authentication & Security

### JWT Authentication Setup
```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// API Key authentication for webhook endpoints
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    
    next();
};

module.exports = { authenticateToken, authenticateApiKey };
```

### Rate Limiting
```javascript
// src/middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many webhook requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many API requests, please try again later'
    }
});

module.exports = { webhookLimiter, apiLimiter };
```

### Request Validation
```javascript
// src/middleware/validation.js
const Joi = require('joi');

const validateWebhook = (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().required(),
        created_at: Joi.string().isoDate().required(),
        total_price: Joi.string().required(),
        currency: Joi.string().length(3).required(),
        customer: Joi.object({
            id: Joi.number(),
            first_name: Joi.string(),
            last_name: Joi.string(),
            email: Joi.string().email(),
            phone: Joi.string()
        }).required(),
        line_items: Joi.array().items(
            Joi.object({
                id: Joi.number().required(),
                title: Joi.string().required(),
                quantity: Joi.number().min(1).required(),
                price: Joi.string().required()
            })
        ).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error: 'Invalid webhook data',
            details: error.details.map(d => d.message)
        });
    }

    next();
};

module.exports = { validateWebhook };
```

## 📱 WhatsApp Integration

### WhatsApp Business API Setup
```javascript
// src/services/WhatsAppService.js
class WhatsAppService {
    constructor(config) {
        this.accessToken = config.accessToken;
        this.phoneNumberId = config.phoneNumberId;
        this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
    }

    async sendMessage(to, message, options = {}) {
        const payload = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'text',
            text: {
                preview_url: options.preview_url || false,
                body: message
            }
        };

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`WhatsApp API error: ${error.error?.message || 'Unknown error'}`);
        }

        return await response.json();
    }

    async sendTemplateMessage(to, templateName, templateData = {}) {
        const payload = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'template',
            template: {
                name: templateName,
                language: { code: 'en' },
                components: [
                    {
                        type: 'body',
                        parameters: Object.entries(templateData).map(([key, value]) => ({
                            type: 'text',
                            text: value
                        }))
                    }
                ]
            }
        };

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`WhatsApp template send failed: ${response.status}`);
        }

        return await response.json();
    }

    formatPhoneNumber(phone) {
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        // Add country code if not present (assuming Pakistan +92)
        if (digits.startsWith('92')) {
            return digits;
        } else if (digits.startsWith('0')) {
            return '92' + digits.substring(1);
        } else if (digits.startsWith('3')) {
            return '92' + digits;
        }
        
        return digits;
    }

    async verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
            return challenge;
        }
        throw new Error('Webhook verification failed');
    }
}

module.exports = WhatsAppService;
```

### Integration with Message Templates
```javascript
// Update app.js to include WhatsApp sending
const WhatsAppService = require('./src/services/WhatsAppService');

class WebhookApp {
    constructor(options = {}) {
        // ... existing code
        
        // Initialize WhatsApp service
        if (process.env.ENABLE_WHATSAPP_SENDING === 'true') {
            this.whatsAppService = new WhatsAppService({
                accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
                phoneNumberId: process.env.WHATSAPP_PHONE_ID
            });
        }
    }

    async handleWebhook(req, res, webhookType) {
        // ... existing processing code

        // Send WhatsApp message if enabled
        if (this.whatsAppService && organizedData.customer.phone) {
            try {
                const whatsappMessage = messages.messages.whatsapp?.message;
                if (whatsappMessage) {
                    await this.whatsAppService.sendMessage(
                        organizedData.customer.phone,
                        whatsappMessage
                    );
                    console.log('✅ WhatsApp message sent successfully');
                }
            } catch (error) {
                console.error('❌ WhatsApp sending failed:', error.message);
            }
        }
    }
}
```

## 📧 Email Service Integration

### SendGrid Implementation
```javascript
// src/services/EmailService.js
const sgMail = require('@sendgrid/mail');

class EmailService {
    constructor(config) {
        sgMail.setApiKey(config.apiKey);
        this.fromEmail = config.fromEmail;
        this.templateIds = config.templateIds || {};
    }

    async sendEmail(to, subject, htmlContent, textContent, options = {}) {
        const msg = {
            to,
            from: options.from || this.fromEmail,
            subject,
            html: htmlContent,
            text: textContent || this.htmlToText(htmlContent)
        };

        try {
            const result = await sgMail.send(msg);
            return { success: true, messageId: result[0].headers['x-message-id'] };
        } catch (error) {
            throw new Error(`Email sending failed: ${error.message}`);
        }
    }

    async sendTemplateEmail(to, templateId, templateData = {}, options = {}) {
        const msg = {
            to,
            from: options.from || this.fromEmail,
            templateId,
            dynamicTemplateData: templateData
        };

        try {
            const result = await sgMail.send(msg);
            return { success: true, messageId: result[0].headers['x-message-id'] };
        } catch (error) {
            throw new Error(`Template email sending failed: ${error.message}`);
        }
    }

    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

module.exports = EmailService;
```

## 📱 SMS Service Integration

### Twilio Implementation
```javascript
// src/services/SMSService.js
const twilio = require('twilio');

class SMSService {
    constructor(config) {
        this.client = twilio(config.accountSid, config.authToken);
        this.fromNumber = config.fromNumber;
    }

    async sendSMS(to, message, options = {}) {
        try {
            const result = await this.client.messages.create({
                body: message,
                from: options.from || this.fromNumber,
                to: this.formatPhoneNumber(to)
            });

            return { 
                success: true, 
                messageId: result.sid,
                status: result.status 
            };
        } catch (error) {
            throw new Error(`SMS sending failed: ${error.message}`);
        }
    }

    formatPhoneNumber(phone) {
        // Format for international SMS
        const digits = phone.replace(/\D/g, '');
        
        if (digits.startsWith('92')) {
            return '+' + digits;
        } else if (digits.startsWith('0')) {
            return '+92' + digits.substring(1);
        }
        
        return '+92' + digits;
    }

    async getMessageStatus(messageId) {
        try {
            const message = await this.client.messages(messageId).fetch();
            return {
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage
            };
        } catch (error) {
            throw new Error(`Failed to get message status: ${error.message}`);
        }
    }
}

module.exports = SMSService;
```

## 🚀 Production Deployment

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S webhook -u 1001

# Change ownership
RUN chown -R webhook:nodejs /app
USER webhook

EXPOSE 3000

CMD ["node", "app.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  webhook-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mongodb://mongo:27017/webhook-system
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - webhook-app
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

### PM2 Process Management
```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'webhook-system',
        script: 'app.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        log_date_format: 'YYYY-MM-DD HH:mm Z',
        error_file: 'logs/err.log',
        out_file: 'logs/out.log',
        log_file: 'logs/combined.log',
        time: true
    }]
};
```

### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream webhook_app {
        server webhook-app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/certificate.crt;
        ssl_certificate_key /etc/nginx/ssl/private.key;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        location / {
            proxy_pass http://webhook_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Rate limiting for webhooks
        location /api/webhooks/ {
            limit_req zone=webhook_limit burst=10 nodelay;
            proxy_pass http://webhook_app;
        }
    }
}
```

## ⚡ Performance Optimization

### Background Job Processing
```javascript
// src/services/QueueService.js
const Queue = require('bull');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);
const webhookQueue = new Queue('webhook processing', { redis });

// Add job to queue
const addWebhookJob = async (webhookData) => {
    await webhookQueue.add('process-webhook', webhookData, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    });
};

// Process jobs
webhookQueue.process('process-webhook', async (job) => {
    const { webhookData, eventType } = job.data;
    
    // Process webhook asynchronously
    const organizer = new DataOrganizer();
    const templates = new MessageTemplates();
    
    const organizedData = organizer.organize(webhookData, eventType);
    const messages = templates.generateAllFormats(eventType, organizedData);
    
    // Send notifications
    await sendNotifications(messages, organizedData);
    
    return { success: true, processed_at: new Date() };
});

module.exports = { addWebhookJob, webhookQueue };
```

### Caching Strategy
```javascript
// src/utils/cache.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

class CacheService {
    async get(key) {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set(key, data, ttl = 3600) {
        await redis.setex(key, ttl, JSON.stringify(data));
    }

    async del(key) {
        await redis.del(key);
    }

    // Cache webhook statistics
    async cacheStats(stats) {
        await this.set('webhook:stats', stats, 300); // 5 minutes
    }

    async getStatsFromCache() {
        return await this.get('webhook:stats');
    }
}

module.exports = CacheService;
```

## 🔧 Troubleshooting

### Common Issues and Solutions

**1. Webhook not receiving data**
```bash
# Check if server is running
curl http://localhost:3000/health

# Test webhook endpoint directly
curl -X POST http://localhost:3000/api/webhooks/order-create \
  -H "Content-Type: application/json" \
  -d @examples/sample-order.json

# Check firewall and port accessibility
netstat -tlnp | grep 3000
```

**2. Database connection issues**
```javascript
// Add connection retry logic
const connectWithRetry = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected to database');
    } catch (error) {
        console.error('Database connection failed, retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};
```

**3. Memory leaks and performance**
```javascript
// Monitor memory usage
const monitorMemory = () => {
    const used = process.memoryUsage();
    console.log('Memory usage:', {
        rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100
    });
};

setInterval(monitorMemory, 30000); // Every 30 seconds
```

**4. API rate limiting issues**
```javascript
// Implement exponential backoff for external APIs
const retry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0 && error.status === 429) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};
```

### Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Run tests with coverage
npm run test:coverage

# Lint and format code
npm run lint
npm run format

# Build for production
npm run build

# Start production server
npm start

# Check dependencies for security issues
npm audit

# Update dependencies
npm update

# Generate API documentation
npm run docs

# Run performance tests
npm run test:perf

# Database migrations
npm run migrate:up
npm run migrate:down

# Seed database with test data
npm run seed
```

### Environment-Specific Configurations

**Development:**
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CORS=true
ENABLE_SWAGGER=true
```

**Staging:**
```bash
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_CORS=false
ENABLE_SWAGGER=true
```

**Production:**
```bash
NODE_ENV=production
LOG_LEVEL=error
ENABLE_CORS=false
ENABLE_SWAGGER=false
```

---

This development guide provides a comprehensive roadmap for expanding the webhook system into a fully-featured application. Follow the sections relevant to your needs and implement features incrementally.

**Next Steps:**
1. Choose your database (MongoDB or PostgreSQL)
2. Implement authentication if needed
3. Add real messaging service integrations
4. Set up monitoring and logging
5. Deploy to production environment

For questions or issues, refer to the troubleshooting section or create detailed issue reports with logs and error messages.
