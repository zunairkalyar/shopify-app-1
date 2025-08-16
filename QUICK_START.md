# 🚀 Quick Start Guide

Get your webhook system up and running in minutes!

## ⚡ Instant Setup

### Option 1: Automated Setup (Recommended)
```bash
# Install dependencies and run full setup
npm install
npm run setup

# Start the system
npm start

# Open dashboard
# Visit: http://localhost:3000
```

### Option 2: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
copy .env.example .env

# 3. Start the system
npm start
```

## 🧪 Test Your Setup

```bash
# Send a test webhook
npm run example

# Run system tests
npm test

# Check system health
curl http://localhost:3000/health
```

## 📊 Dashboard Access

**URL:** `http://localhost:3000`

**Features Available:**
- ✅ Real-time webhook monitoring
- ✅ Message template previews
- ✅ Test webhook sender
- ✅ System statistics
- ✅ Configuration overview

## 🔗 Webhook URLs (Ready to Use)

Copy these URLs into your Shopify webhook settings:

| Event Type | URL |
|------------|-----|
| **Order Created** | `http://localhost:3000/api/webhooks/order-create` |
| **Order Fulfilled** | `http://localhost:3000/api/webhooks/order-fulfilled` |
| **Order Cancelled** | `http://localhost:3000/api/webhooks/order-cancelled` |

### Shopify Setup Steps:
1. Go to **Shopify Admin → Settings → Notifications**
2. Scroll to **"Webhooks"** section
3. Click **"Create webhook"**
4. Select event type and paste the URL above
5. Set **Format**: JSON
6. Set **API Version**: 2023-10

## 📱 Generated Message Examples

Your webhook system will automatically generate:

### WhatsApp Message
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

### Email (HTML + Text)
- Professional order confirmation email
- Order details and shipping info
- Responsive design

### SMS
```
Order #21002 confirmed! Total: PKR 1,654.05. 
We'll send shipping updates soon. - MazayLO
```

## 🔧 Basic Configuration

Edit `.env` file to customize:

```bash
# Shop Information
SHOP_NAME="Your Store Name"
SUPPORT_PHONE="+92-XXX-XXXXXXX"
SUPPORT_EMAIL="support@yourstore.com"
WEBSITE_URL="https://yourstore.com"

# Server Settings
PORT=3000
HOST=localhost
```

## 🎯 What Works Out of the Box

✅ **Webhook Processing**: All Shopify order events  
✅ **Message Generation**: WhatsApp, Email, SMS templates  
✅ **Web Dashboard**: Real-time monitoring  
✅ **Test System**: Built-in testing tools  
✅ **API Endpoints**: REST API for integration  
✅ **Error Handling**: Robust error management  
✅ **Logging**: Detailed system logs  

## 🚀 Production Deployment

### Docker (Recommended)
```bash
# Build and run with Docker
docker build -t webhook-system .
docker run -p 3000:3000 webhook-system

# Or use Docker Compose
docker-compose up -d
```

### PM2 (Node.js Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit
```

## 🔌 Optional Services Setup

### Enable Database (MongoDB/PostgreSQL)
```bash
# Add to .env file
ENABLE_DATABASE=true
DATABASE_URL="mongodb://localhost:27017/webhook-system"

# Run database setup
npm run setup:db
```

### Enable WhatsApp Sending
```bash
# Add to .env file
ENABLE_WHATSAPP_SENDING=true
WHATSAPP_ACCESS_TOKEN="your_token"
WHATSAPP_PHONE_ID="your_phone_id"
```

### Enable Email Sending (SendGrid)
```bash
# Add to .env file  
ENABLE_EMAIL_SENDING=true
SENDGRID_API_KEY="your_api_key"
FROM_EMAIL="noreply@yourstore.com"
```

### Enable SMS Sending (Twilio)
```bash
# Add to .env file
ENABLE_SMS_SENDING=true
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"
```

## 🆘 Troubleshooting

### System Won't Start
```bash
# Check Node.js version (needs 16+)
node --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Webhooks Not Receiving
1. ✅ Check if server is running: `http://localhost:3000/health`
2. ✅ Verify webhook URLs in Shopify settings
3. ✅ Check firewall settings
4. ✅ Test with: `npm run example`

### Dashboard Not Loading
1. ✅ Verify server is running on correct port
2. ✅ Check browser console for errors
3. ✅ Try different browser or incognito mode

## 📚 Need More Help?

- **📖 Full Documentation**: `README.md`
- **🛠️ Development Guide**: `DEVELOPMENT.md`
- **📡 API Reference**: `API_ENDPOINTS.md`
- **🏗️ Architecture**: `BACKEND_ARCHITECTURE.md`
- **🧪 Run Tests**: `npm test`
- **🔍 Check Logs**: `logs/app.log`

## 🎉 Success Checklist

- [ ] ✅ System starts without errors
- [ ] ✅ Dashboard loads at `http://localhost:3000`  
- [ ] ✅ Health check returns 200: `/health`
- [ ] ✅ Test webhook works: `npm run example`
- [ ] ✅ Shopify webhooks configured
- [ ] ✅ Messages generate correctly

**🎊 You're ready to process webhooks!**

---

**⚡ Quick Commands Summary:**
```bash
npm install          # Install dependencies
npm start           # Start the system
npm run example     # Test webhook
npm test           # Run tests
npm run setup      # Full automated setup
```
