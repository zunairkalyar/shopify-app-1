# 🚀 Webhook System - Complete Order Alert Solution

A comprehensive, production-ready webhook system for processing Shopify order events with automated message generation for WhatsApp, Email, and SMS notifications.

## ✨ Features

- **🔄 Complete Webhook Processing**: Handles order created, fulfilled, and cancelled events
- **📊 Smart Data Organization**: Automatically structures and validates incoming webhook data
- **📱 Multi-Channel Templates**: Generate WhatsApp, Email, and SMS messages automatically
- **🎨 Beautiful Web Dashboard**: Real-time monitoring and management interface
- **⚙️ Easy Configuration**: Customizable templates and settings
- **📈 Real-time Statistics**: Track webhook processing success rates
- **🔧 Developer-Friendly**: RESTful APIs, comprehensive testing, and clear documentation

## 🏗️ Architecture

```
webhook-system/
├── app.js                     # Main application server
├── src/
│   ├── organizers/
│   │   └── DataOrganizer.js   # Webhook data processing
│   └── templates/
│       └── MessageTemplates.js # Message generation
├── public/
│   ├── index.html            # Web dashboard
│   └── js/dashboard.js       # Frontend logic
├── config/                   # Configuration files
├── examples/                 # Example implementations
├── tests/                    # Test scripts
└── data/                     # Webhook storage (auto-created)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- A Shopify store (for webhook configuration)

### Installation

1. **Clone or Copy the System**
   ```bash
   # If cloning from repository
   git clone https://github.com/your-username/webhook-system.git
   cd webhook-system
   
   # Or if copying the folder
   cd webhook-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the System**
   ```bash
   npm start
   ```

4. **Open Dashboard**
   Navigate to `http://localhost:3000` in your browser

## 📡 Webhook Endpoints

The system provides these ready-to-use webhook URLs:

| Event Type | URL | Description |
|------------|-----|-------------|
| Order Created | `POST /api/webhooks/order-create` | New order placed |
| Order Fulfilled | `POST /api/webhooks/order-fulfilled` | Order shipped |
| Order Cancelled | `POST /api/webhooks/order-cancelled` | Order cancelled |
| Generic Handler | `POST /api/webhooks/generic` | Auto-detect event type |

## 🛠️ Shopify Configuration

1. **Go to Shopify Admin** → Settings → Notifications
2. **Scroll to "Webhooks"** section
3. **Click "Create webhook"**
4. **Configure each webhook:**
   - **Event**: Select event type (orders/create, orders/fulfilled, etc.)
   - **Format**: JSON
   - **URL**: Copy from dashboard (e.g., `http://localhost:3000/api/webhooks/order-create`)
   - **API Version**: 2023-10 (recommended)

## 📋 How It Works

### 1. Webhook Reception
```javascript
// Shopify sends webhook data
POST /api/webhooks/order-create
Content-Type: application/json
X-Shopify-Topic: orders/create
```

### 2. Data Organization
The `DataOrganizer` processes raw webhook data:
- Validates required fields
- Structures order information
- Formats customer details
- Organizes product data
- Calculates totals and addresses

### 3. Message Generation
The `MessageTemplates` system generates:
- **WhatsApp**: Rich formatted messages with emojis
- **Email**: HTML and text versions
- **SMS**: Concise text messages

### 4. Output Example
```json
{
  "success": true,
  "webhook_id": "wh_1692181234_abc123",
  "event_type": "order_created",
  "order_id": "#1001",
  "customer": "John Doe",
  "total": "PKR 2,499.00",
  "processing_time_ms": 45
}
```

## 🎨 Message Templates

### WhatsApp Message Example
```
🛍️ *Order Confirmed!*

*Order Details:*
📦 Order ID: #1001
👤 Customer: John Doe
📱 Phone: +92-300-1234567
💰 Total: PKR 2,499.00
💳 Payment: Cash on Delivery (COD)

*Products:*
• Premium Product x1 - PKR 1,999.00
• Shipping - PKR 500.00

*Expected Delivery:* 3-5 business days

Thank you for your order! 🙏

MazayLO
📞 +92-300-1234567
```

### Email Template Features
- Professional HTML design
- Responsive layout
- Order summary tables
- Shipping information
- Tracking links (when available)

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000
HOST=localhost
SHOP_NAME="MazayLO"
SUPPORT_PHONE="+92-300-1234567"
SUPPORT_EMAIL="support@mazaylo.com"
WEBSITE_URL="https://mazaylo.com"
```

### Custom Configuration
```javascript
const webhookApp = new WebhookApp({
    port: 3000,
    shopName: 'Your Store Name',
    supportPhone: '+92-XXX-XXXXXXX',
    supportEmail: 'support@yourstore.com',
    websiteUrl: 'https://yourstore.com',
    enableLogging: true
});
```

## 📊 API Reference

### Health Check
```http
GET /health
```
Returns server status and statistics.

### Get Webhooks
```http
GET /api/webhooks
```
Returns recent webhook processing history.

### Get Statistics
```http
GET /api/stats
```
Returns processing statistics and success rates.

### Test Webhook
```http
POST /api/test-webhook
Content-Type: application/json

{
  "webhookType": "orders/create"
}
```
Send test webhook data for testing.

### Template Preview
```http
POST /api/templates/preview
Content-Type: application/json

{
  "eventType": "order_created",
  "format": "whatsapp",
  "templateType": "message"
}
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Send Test Webhook
```bash
npm run example
```

### Manual Testing
Use the web dashboard "Test Webhook" feature or send POST requests directly:

```bash
curl -X POST http://localhost:3000/api/webhooks/order-create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/create" \
  -d @examples/sample-order.json
```

## 🎯 Use Cases

### E-commerce Store Notifications
- **Order Confirmations**: Instant WhatsApp/SMS to customers
- **Shipping Alerts**: Track shipments with updates
- **Customer Service**: Automated responses to order events

### Business Analytics
- **Order Tracking**: Monitor all incoming orders
- **Success Metrics**: Track webhook processing rates
- **Customer Insights**: Analyze order patterns

### Integration Examples
- Connect to CRM systems
- Trigger inventory updates
- Send data to analytics platforms
- Create custom workflows

## 🔒 Security Features

- **Request Validation**: Verify webhook authenticity
- **Error Handling**: Graceful failure management
- **Rate Limiting**: Built-in protection mechanisms
- **Data Sanitization**: Clean and validate all inputs

## 📈 Scaling & Production

### Performance Optimization
- **In-memory Processing**: Fast webhook handling
- **Minimal Dependencies**: Lightweight and efficient
- **Async Operations**: Non-blocking request processing

### Production Deployment
```bash
# Install PM2 for production
npm install -g pm2

# Start with PM2
pm2 start app.js --name webhook-system

# Auto-restart on system boot
pm2 startup
pm2 save
```

### Environment Setup
```bash
# Production environment
export NODE_ENV=production
export PORT=8080
export ENABLE_LOGGING=false

# Start production server
npm start
```

## 🛡️ Error Handling

The system includes comprehensive error handling:

- **Webhook Validation**: Missing required fields
- **Data Processing**: Invalid JSON or data formats
- **Template Errors**: Missing template variables
- **Network Issues**: Connection failures and timeouts

All errors are logged with detailed information for debugging.

## 🎨 Customization

### Custom Message Templates
```javascript
// Add custom WhatsApp template
messageTemplates.addCustomTemplate(
    'order_created',
    'whatsapp', 
    'message',
    'Custom message: {{order_id}} for {{customer_name}}'
);
```

### Custom Data Processing
```javascript
// Extend DataOrganizer
class CustomDataOrganizer extends DataOrganizer {
    buildCustomFields() {
        // Add your custom logic
        return this.rawData.custom_field;
    }
}
```

## 📞 Support & Contributing

### Getting Help
- 📚 Check the documentation
- 🐛 Report issues on GitHub
- 💬 Join our community discussions

### Contributing
1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for Shopify webhook integration
- Inspired by modern e-commerce needs
- Designed for Pakistani market requirements (PKR currency, local phone formats)

---

**Ready to process your first webhook?** 🚀

```bash
npm start
# Open http://localhost:3000
# Click "Send Test Data" to try it out!
```

For more information, visit the [GitHub repository](https://github.com/your-username/webhook-system) or check out the live demo.
