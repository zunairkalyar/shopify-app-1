# 🚀 Shopify Webhook System

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fwebhook-system)

A complete, production-ready webhook system for processing Shopify orders with automated WhatsApp, Email, and SMS message generation.

## ✨ Features

- 🔄 **Complete Webhook Processing** - Handles order created, fulfilled, and cancelled events
- 📊 **Smart Data Organization** - Automatically structures and validates webhook data
- 📱 **Multi-Channel Messages** - Generate WhatsApp, Email, and SMS messages
- 🎨 **Beautiful Dashboard** - Real-time monitoring and management interface
- ⚡ **Instant Deploy** - One-click Vercel deployment
- 🔧 **Zero Configuration** - Works out of the box

## 🎯 Live Demo

- **Dashboard**: [Your Vercel URL]/
- **Health Check**: [Your Vercel URL]/health
- **API Docs**: [Your Vercel URL]/api

## 🚀 Quick Deploy to Vercel

### 1. One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fwebhook-system)

### 2. Manual Deploy
```bash
# Clone the repository
git clone https://github.com/your-username/webhook-system.git
cd webhook-system

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 🔗 Shopify Webhook URLs

After deployment, use these URLs in your Shopify webhook settings:

| Event Type | URL |
|------------|-----|
| **Order Created** | `https://your-app.vercel.app/api/webhooks/order-create` |
| **Order Fulfilled** | `https://your-app.vercel.app/api/webhooks/order-fulfilled` |
| **Order Cancelled** | `https://your-app.vercel.app/api/webhooks/order-cancelled` |

### Shopify Setup:
1. Go to **Shopify Admin → Settings → Notifications**
2. Scroll to **"Webhooks"** section  
3. Click **"Create webhook"**
4. Select event type and paste URL above
5. Set **Format**: JSON, **API Version**: 2023-10

## ⚙️ Environment Configuration

In Vercel dashboard, add these environment variables:

### Required:
```bash
SHOP_NAME=Your Store Name
SUPPORT_PHONE=+92-XXX-XXXXXXX  
SUPPORT_EMAIL=support@yourstore.com
WEBSITE_URL=https://yourstore.com
```

### Optional Services:
```bash
# WhatsApp Business API
ENABLE_WHATSAPP_SENDING=true
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_ID=your_phone_id

# Email (SendGrid)  
ENABLE_EMAIL_SENDING=true
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=noreply@yourstore.com

# SMS (Twilio)
ENABLE_SMS_SENDING=true
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Database (Optional)
ENABLE_DATABASE=true
DATABASE_URL=mongodb://your-connection-string
```

## 📱 Generated Messages

The system automatically generates beautiful messages:

### WhatsApp
```
🛍️ *Order Confirmed!*

*Order Details:*
📦 Order ID: #21002
👤 Customer: Hassan Ahmed  
💰 Total: PKR 1,654.05
💳 Payment: Cash on Delivery (COD)

Thank you for your order! 🙏

MazayLO
📞 +92-300-1234567
```

### Email
Professional HTML email with:
- Order confirmation
- Product details
- Shipping information
- Responsive design

### SMS  
```
Order #21002 confirmed! Total: PKR 1,654.05. 
We'll send shipping updates soon. - MazayLO
```

## 🧪 Testing

Test your deployment:

```bash
# Health check
curl https://your-app.vercel.app/health

# Test webhook
curl -X POST https://your-app.vercel.app/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookType":"orders/create"}'
```

## 📊 API Endpoints

- `GET /health` - Health check
- `GET /api/webhooks` - Recent webhooks
- `GET /api/stats` - System statistics  
- `POST /api/webhooks/order-create` - Order created webhook
- `POST /api/webhooks/order-fulfilled` - Order fulfilled webhook
- `POST /api/webhooks/order-cancelled` - Order cancelled webhook
- `POST /api/test-webhook` - Test webhook processing
- `POST /api/templates/preview` - Preview message templates

## 🏗️ Architecture

```
├── app.js                     # Main Express application
├── src/
│   ├── organizers/
│   │   └── DataOrganizer.js   # Webhook data processing
│   ├── templates/
│   │   └── MessageTemplates.js # Message generation
│   └── services/
│       ├── WhatsAppService.js # WhatsApp integration
│       ├── EmailService.js    # Email integration
│       └── SMSService.js      # SMS integration
├── public/                    # Web dashboard
├── config/                    # Configuration management
├── examples/                  # Test data and scripts
└── vercel.json               # Vercel deployment config
```

## 🔧 Local Development

```bash
# Clone repository
git clone https://github.com/your-username/webhook-system.git
cd webhook-system

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Test the system
npm test
npm run example
```

## 🚀 Features Overview

✅ **Webhook Processing** - Complete Shopify integration  
✅ **Message Generation** - WhatsApp, Email, SMS templates  
✅ **Web Dashboard** - Real-time monitoring  
✅ **API System** - RESTful endpoints  
✅ **Error Handling** - Robust error management  
✅ **Testing** - Built-in test suite  
✅ **Documentation** - Comprehensive guides  
✅ **Production Ready** - Scalable and secure  

## 💡 Use Cases

- **E-commerce Automation** - Order confirmations and updates
- **Customer Communication** - Multi-channel notifications  
- **Business Analytics** - Webhook monitoring and stats
- **Integration Hub** - Connect with other services

## 📈 Scaling

The system is designed to handle:
- High webhook volumes
- Multiple Shopify stores  
- Concurrent processing
- Auto-scaling on Vercel

## 🆘 Support

- 📖 **Documentation**: Check the `/docs` folder
- 🐛 **Issues**: Create GitHub issues
- 💬 **Community**: Join discussions  
- 📧 **Contact**: your-email@domain.com

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**Built with ❤️ for the e-commerce community**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fwebhook-system)
