# 📡 API Endpoints Reference - Webhook System

Complete API documentation for all available endpoints in the webhook system.

## 📋 Table of Contents

- [Authentication](#-authentication)
- [Webhook Endpoints](#-webhook-endpoints)
- [Dashboard API](#-dashboard-api)
- [Template Management](#-template-management)
- [Admin API](#-admin-api)
- [Health & Monitoring](#-health--monitoring)
- [Error Responses](#-error-responses)
- [Rate Limits](#-rate-limits)
- [Request/Response Examples](#-requestresponse-examples)

## 🔑 Authentication

### API Key Authentication (for webhooks)
```http
X-API-Key: your-api-key-here
```

### JWT Authentication (for dashboard)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🪝 Webhook Endpoints

### 1. Order Created Webhook
Receives Shopify order creation events.

**Endpoint:** `POST /api/webhooks/order-create`

**Headers:**
```http
Content-Type: application/json
X-Shopify-Topic: orders/create
X-Shopify-Shop-Domain: your-shop.myshopify.com
X-Shopify-Webhook-Id: unique-webhook-id
X-Shopify-API-Version: 2023-10
X-API-Key: your-api-key (optional)
```

**Request Body:**
```json
{
  "id": 6000651075838,
  "name": "#21002",
  "created_at": "2025-08-16T12:28:19+05:00",
  "updated_at": "2025-08-16T12:28:20+05:00",
  "currency": "PKR",
  "total_price": "1654.05",
  "subtotal_price": "1424.05",
  "total_discounts": "74.95",
  "total_tax": "0.00",
  "financial_status": "pending",
  "fulfillment_status": null,
  "customer": {
    "id": 8219799355646,
    "first_name": "Hassan",
    "last_name": "Ahmed",
    "email": "hassan.ahmed@example.com",
    "phone": "+923443292360"
  },
  "line_items": [
    {
      "id": 14627859300606,
      "title": "Product Name",
      "quantity": 1,
      "price": "1499.00",
      "sku": "MAZ0141"
    }
  ],
  "shipping_address": {
    "first_name": "Hassan",
    "last_name": "Ahmed",
    "address1": "123 Main Street",
    "city": "Karachi",
    "country": "Pakistan",
    "phone": "+923443292360"
  },
  "shipping_lines": [
    {
      "title": "Standard Delivery",
      "price": "230.00"
    }
  ],
  "payment_gateway_names": {
    "0": "Cash on Delivery (COD)"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "webhook_id": "wh_1692181234_abc123",
  "event_type": "order_created",
  "order_id": "#21002",
  "customer": "Hassan Ahmed",
  "total": "PKR 1,654.05",
  "processing_time_ms": 45,
  "message": "Webhook processed successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "webhook_id": "wh_1692181234_abc123",
  "error": "Missing required field: customer.phone",
  "processing_time_ms": 12
}
```

### 2. Order Fulfilled Webhook
Receives Shopify order fulfillment events.

**Endpoint:** `POST /api/webhooks/order-fulfilled`

**Headers:** Same as order created

**Request Body:** Similar to order created with additional fulfillment data:
```json
{
  "id": 6000651075838,
  "fulfillment_status": "fulfilled",
  "fulfillments": [
    {
      "id": 4884459290878,
      "status": "success",
      "tracking_number": "1234567890",
      "tracking_url": "https://track.example.com/1234567890",
      "tracking_company": "DHL"
    }
  ]
}
```

**Response:** Same structure as order created with `event_type: "order_fulfilled"`

### 3. Order Cancelled Webhook
Receives Shopify order cancellation events.

**Endpoint:** `POST /api/webhooks/order-cancelled`

**Headers:** Same as order created

**Request Body:** Similar to order created with additional cancellation data:
```json
{
  "id": 6000651075838,
  "cancelled_at": "2025-08-16T15:30:00+05:00",
  "cancel_reason": "customer",
  "refunds": [
    {
      "id": 123456,
      "amount": "1654.05",
      "status": "pending"
    }
  ]
}
```

**Response:** Same structure as order created with `event_type: "order_cancelled"`

### 4. Generic Webhook Handler
Handles any webhook type with auto-detection.

**Endpoint:** `POST /api/webhooks/generic`

**Headers:** Same as specific webhooks

**Request Body:** Any valid Shopify webhook payload

**Response:** Same structure with detected event type

---

## 🎛️ Dashboard API

### 1. Get Recent Webhooks
Retrieves recent webhook processing history.

**Endpoint:** `GET /api/webhooks`

**Query Parameters:**
- `limit` (optional): Number of webhooks to return (default: 50, max: 100)
- `offset` (optional): Number of webhooks to skip (default: 0)
- `status` (optional): Filter by status ('processed', 'failed')
- `event_type` (optional): Filter by event type

**Example:**
```http
GET /api/webhooks?limit=10&status=processed&event_type=order_created
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 150,
  "webhooks": [
    {
      "id": "wh_1692181234_abc123",
      "received_at": "2025-08-16T12:28:19Z",
      "processing_time_ms": 45,
      "webhook_type": "orders/create",
      "status": "processed",
      "summary": {
        "order_id": "#21002",
        "customer": "Hassan Ahmed",
        "total": "PKR 1,654.05",
        "product_count": 1
      },
      "errors": []
    }
  ]
}
```

### 2. Get Webhook by ID
Retrieves detailed information about a specific webhook.

**Endpoint:** `GET /api/webhooks/{webhook_id}`

**Path Parameters:**
- `webhook_id`: Unique webhook identifier

**Response:**
```json
{
  "success": true,
  "webhook": {
    "id": "wh_1692181234_abc123",
    "received_at": "2025-08-16T12:28:19Z",
    "processing_time_ms": 45,
    "webhook_type": "orders/create",
    "headers": {
      "x-shopify-topic": "orders/create",
      "x-shopify-shop-domain": "your-shop.myshopify.com"
    },
    "raw_data": { /* Original webhook payload */ },
    "organized_data": { /* Processed data structure */ },
    "generated_messages": { /* All generated message formats */ },
    "summary": { /* Quick overview */ },
    "errors": [],
    "status": "processed"
  }
}
```

### 3. Get Webhook Statistics
Retrieves system statistics and metrics.

**Endpoint:** `GET /api/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_received": 1250,
    "successful_processed": 1198,
    "failed_processed": 52,
    "current_stored": 1000,
    "uptime_seconds": 86400,
    "start_time": "2025-08-15T12:00:00Z",
    "success_rate": 95.84,
    "average_processing_time_ms": 42,
    "events_by_type": {
      "order_created": 800,
      "order_fulfilled": 300,
      "order_cancelled": 150
    },
    "recent_activity": {
      "last_hour": 45,
      "last_24_hours": 320
    }
  }
}
```

### 4. Test Webhook Processing
Sends test webhook data for validation and testing.

**Endpoint:** `POST /api/test-webhook`

**Request Body:**
```json
{
  "webhookType": "orders/create",
  "testData": {
    // Optional: Custom test data
    // If not provided, system generates sample data
  }
}
```

**Response:**
```json
{
  "success": true,
  "organizedData": { /* Processed webhook data */ },
  "messages": {
    "whatsapp": {
      "message": "🛍️ *Order Confirmed!*...",
      "notification": {
        "title": "New Order Received",
        "body": "John Doe placed order #1001 for PKR 2,499.00"
      }
    },
    "email": {
      "message": {
        "subject": "Order Confirmation - #1001",
        "html": "<html>...</html>",
        "text": "Order Confirmed..."
      }
    },
    "sms": {
      "message": "Order #1001 confirmed! Total: PKR 2,499.00..."
    }
  },
  "processed_at": "2025-08-16T12:30:00Z"
}
```

---

## 📝 Template Management

### 1. List Available Templates
Gets all available message templates.

**Endpoint:** `GET /api/templates`

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "eventType": "order_created",
      "format": "whatsapp",
      "templateType": "message",
      "custom": false
    },
    {
      "eventType": "order_created",
      "format": "email",
      "templateType": "message",
      "custom": false
    }
  ]
}
```

### 2. Preview Template
Generates a preview of a message template with sample data.

**Endpoint:** `POST /api/templates/preview`

**Request Body:**
```json
{
  "eventType": "order_created",
  "format": "whatsapp",
  "templateType": "message"
}
```

**Response:**
```json
{
  "success": true,
  "preview": {
    "eventType": "order_created",
    "format": "whatsapp",
    "templateType": "message",
    "data": "🛍️ *Order Confirmed!*\n\n*Order Details:*\n📦 Order ID: #1001\n👤 Customer: John Doe...",
    "generated_at": "2025-08-16T12:30:00Z"
  }
}
```

### 3. Add Custom Template
Creates a custom message template.

**Endpoint:** `POST /api/templates/custom`

**Request Body:**
```json
{
  "eventType": "order_created",
  "format": "whatsapp",
  "templateType": "message",
  "template": "🎉 New order {{order_id}} from {{customer_name}} for {{order_total}}!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom template added successfully"
}
```

### 4. Remove Custom Template
Removes a custom message template.

**Endpoint:** `DELETE /api/templates/custom/{eventType}/{format}/{templateType}`

**Path Parameters:**
- `eventType`: Event type (order_created, order_fulfilled, etc.)
- `format`: Message format (whatsapp, email, sms)
- `templateType`: Template type (message, notification, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Custom template removed successfully"
}
```

---

## 👨‍💼 Admin API

### 1. System Configuration
Gets or updates system configuration.

**Endpoint:** `GET /api/admin/config`
**Endpoint:** `PUT /api/admin/config`

**Authentication:** JWT required with admin role

**Response (GET):**
```json
{
  "success": true,
  "config": {
    "shopName": "MazayLO",
    "supportPhone": "+92-300-1234567",
    "supportEmail": "support@mazaylo.com",
    "websiteUrl": "https://mazaylo.com",
    "enableWhatsApp": true,
    "enableEmail": false,
    "enableSMS": false,
    "enableDatabase": true,
    "maxWebhooksStored": 10000,
    "logLevel": "info"
  }
}
```

**Request Body (PUT):**
```json
{
  "shopName": "Updated Shop Name",
  "supportPhone": "+92-300-9876543",
  "enableWhatsApp": false
}
```

### 2. User Management
Manages system users and authentication.

**Create User:** `POST /api/admin/users`
**Get Users:** `GET /api/admin/users`
**Update User:** `PUT /api/admin/users/{userId}`
**Delete User:** `DELETE /api/admin/users/{userId}`

**Create User Request:**
```json
{
  "username": "admin",
  "email": "admin@mazaylo.com",
  "password": "secure-password",
  "role": "admin"
}
```

### 3. System Logs
Retrieves system logs and error reports.

**Endpoint:** `GET /api/admin/logs`

**Query Parameters:**
- `level` (optional): Log level (error, warn, info, debug)
- `from` (optional): Start date (ISO string)
- `to` (optional): End date (ISO string)
- `limit` (optional): Number of logs (default: 100)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-08-16T12:30:00Z",
      "level": "error",
      "message": "WhatsApp API failed: Rate limit exceeded",
      "webhook_id": "wh_1692181234_abc123",
      "meta": {
        "error_code": "RATE_LIMIT",
        "retry_after": 60
      }
    }
  ]
}
```

### 4. Database Management
Database operations and maintenance.

**Backup:** `POST /api/admin/backup`
**Restore:** `POST /api/admin/restore`
**Cleanup:** `POST /api/admin/cleanup`

**Cleanup Request:**
```json
{
  "olderThanDays": 30,
  "keepSuccessful": 1000,
  "keepFailed": 500
}
```

---

## 🏥 Health & Monitoring

### 1. Health Check
Basic health check endpoint.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-16T12:30:00Z",
  "uptime": 86400,
  "webhooksStored": 1250,
  "stats": {
    "total_received": 1250,
    "successful_processed": 1198,
    "failed_processed": 52
  }
}
```

### 2. Detailed Health Check
Comprehensive system health information.

**Endpoint:** `GET /api/health/detailed`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-16T12:30:00Z",
  "uptime": 86400,
  "services": {
    "database": {
      "status": "healthy",
      "response_time_ms": 12,
      "last_check": "2025-08-16T12:29:50Z"
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 3,
      "last_check": "2025-08-16T12:29:50Z"
    },
    "whatsapp_api": {
      "status": "healthy",
      "response_time_ms": 150,
      "last_check": "2025-08-16T12:25:00Z"
    }
  },
  "memory": {
    "rss": 125.5,
    "heapTotal": 89.2,
    "heapUsed": 67.8,
    "external": 12.1
  },
  "cpu": {
    "usage_percent": 15.2,
    "load_average": [0.8, 0.6, 0.4]
  }
}
```

### 3. Metrics
System metrics and performance data.

**Endpoint:** `GET /api/metrics`

**Query Parameters:**
- `from` (optional): Start time for metrics
- `to` (optional): End time for metrics
- `resolution` (optional): Data resolution (minute, hour, day)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "webhook_processing": {
      "requests_per_minute": 2.5,
      "average_response_time_ms": 45,
      "error_rate_percent": 4.16,
      "p95_response_time_ms": 89,
      "p99_response_time_ms": 156
    },
    "message_delivery": {
      "whatsapp": {
        "sent": 120,
        "failed": 5,
        "success_rate": 96
      },
      "email": {
        "sent": 85,
        "failed": 2,
        "success_rate": 97.6
      },
      "sms": {
        "sent": 45,
        "failed": 1,
        "success_rate": 97.8
      }
    }
  }
}
```

---

## ❌ Error Responses

### Standard Error Format
All API errors follow this format:

```json
{
  "success": false,
  "error": "Error message description",
  "error_code": "SPECIFIC_ERROR_CODE",
  "details": {
    "field": "Additional error details",
    "validation_errors": ["Field is required", "Invalid format"]
  },
  "timestamp": "2025-08-16T12:30:00Z",
  "request_id": "req_1692181234_xyz789"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | External service down |

### Webhook-Specific Errors

| Code | Description |
|------|-------------|
| `INVALID_WEBHOOK_DATA` | Webhook payload is invalid |
| `MISSING_REQUIRED_FIELD` | Required field missing from webhook |
| `UNSUPPORTED_EVENT_TYPE` | Webhook event type not supported |
| `PROCESSING_FAILED` | Webhook processing failed |
| `MESSAGE_GENERATION_FAILED` | Failed to generate messages |

---

## 🚧 Rate Limits

### Webhook Endpoints
- **Rate Limit:** 100 requests per minute per IP
- **Burst:** Up to 10 requests can be made immediately
- **Headers:**
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: 1692181890

### API Endpoints
- **Rate Limit:** 1000 requests per 15 minutes per IP
- **Authenticated:** 5000 requests per 15 minutes per user

### Admin Endpoints
- **Rate Limit:** 500 requests per 15 minutes per admin user

---

## 📝 Request/Response Examples

### Complete Webhook Processing Example

**Request:**
```bash
curl -X POST http://localhost:3000/api/webhooks/order-create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-Shop-Domain: mazaylo.myshopify.com" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "id": 6000651075838,
    "name": "#21002",
    "created_at": "2025-08-16T12:28:19+05:00",
    "currency": "PKR",
    "total_price": "1654.05",
    "customer": {
      "first_name": "Hassan",
      "last_name": "Ahmed",
      "phone": "+923443292360",
      "email": "hassan@example.com"
    },
    "line_items": [{
      "title": "Test Product",
      "quantity": 1,
      "price": "1499.00"
    }]
  }'
```

**Response:**
```json
{
  "success": true,
  "webhook_id": "wh_1692181234_abc123",
  "event_type": "order_created",
  "order_id": "#21002",
  "customer": "Hassan Ahmed",
  "total": "PKR 1,654.05",
  "processing_time_ms": 45,
  "message": "Webhook processed successfully",
  "generated_messages": {
    "whatsapp": "✅ Generated",
    "email": "✅ Generated",
    "sms": "✅ Generated"
  },
  "notifications_sent": {
    "whatsapp": "✅ Sent",
    "email": "⏳ Queued",
    "sms": "❌ Failed"
  }
}
```

### Template Preview Example

**Request:**
```bash
curl -X POST http://localhost:3000/api/templates/preview \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "order_created",
    "format": "whatsapp",
    "templateType": "message"
  }'
```

**Response:**
```json
{
  "success": true,
  "preview": {
    "eventType": "order_created",
    "format": "whatsapp",
    "templateType": "message",
    "data": "🛍️ *Order Confirmed!*\n\n*Order Details:*\n📦 Order ID: #1001\n👤 Customer: John Doe\n📱 Phone: +92-300-1234567\n💰 Total: PKR 2,228.00\n💳 Payment: Cash on Delivery (COD)\n\n*Products:*\n• Premium Product Example x2 - PKR 1,998.00\n\n*Shipping Address:*\nJohn Doe, 123 Main St, Karachi, Pakistan\n\n*Expected Delivery:* 3-5 business days\n\nThank you for your order! 🙏\n\nMazayLO\n📞 +92-300-1234567",
    "generated_at": "2025-08-16T12:30:00Z"
  }
}
```

### Statistics Query Example

**Request:**
```bash
curl -X GET "http://localhost:3000/api/stats" \
  -H "Authorization: Bearer your-jwt-token"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_received": 1250,
    "successful_processed": 1198,
    "failed_processed": 52,
    "success_rate": 95.84,
    "average_processing_time_ms": 42,
    "uptime_seconds": 86400,
    "current_stored": 1000,
    "start_time": "2025-08-15T12:00:00Z",
    "events_by_type": {
      "order_created": 800,
      "order_fulfilled": 300,
      "order_cancelled": 150
    },
    "processing_times": {
      "min_ms": 15,
      "max_ms": 234,
      "avg_ms": 42,
      "p95_ms": 89,
      "p99_ms": 156
    },
    "recent_activity": {
      "last_hour": 45,
      "last_24_hours": 320,
      "last_7_days": 2100
    }
  }
}
```

---

## 🔗 SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

class WebhookSystemClient {
    constructor(baseURL, apiKey) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
        this.axios = axios.create({
            baseURL: this.baseURL,
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    async sendWebhook(eventType, data) {
        const response = await this.axios.post(`/api/webhooks/${eventType}`, data);
        return response.data;
    }

    async getWebhooks(options = {}) {
        const params = new URLSearchParams(options);
        const response = await this.axios.get(`/api/webhooks?${params}`);
        return response.data;
    }

    async getStats() {
        const response = await this.axios.get('/api/stats');
        return response.data;
    }
}

// Usage
const client = new WebhookSystemClient('http://localhost:3000', 'your-api-key');
const result = await client.sendWebhook('order-create', orderData);
```

### Python
```python
import requests

class WebhookSystemClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def send_webhook(self, event_type, data):
        url = f"{self.base_url}/api/webhooks/{event_type}"
        response = requests.post(url, json=data, headers=self.headers)
        return response.json()
    
    def get_webhooks(self, **params):
        url = f"{self.base_url}/api/webhooks"
        response = requests.get(url, params=params, headers=self.headers)
        return response.json()
    
    def get_stats(self):
        url = f"{self.base_url}/api/stats"
        response = requests.get(url, headers=self.headers)
        return response.json()

# Usage
client = WebhookSystemClient('http://localhost:3000', 'your-api-key')
result = client.send_webhook('order-create', order_data)
```

---

This API reference provides comprehensive documentation for all available endpoints. Use this guide to integrate with the webhook system programmatically or to understand the complete API surface.

**For more examples and advanced usage, check the `/examples` directory in the project.**
