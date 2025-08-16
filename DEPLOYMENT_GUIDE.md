# 🚀 Deployment Guide: GitHub to Vercel

This guide will walk you through deploying your Shopify webhook system from your local machine to GitHub and then to Vercel for production use.

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Git installed on your computer
- ✅ A GitHub account
- ✅ A Vercel account (free tier works perfectly)
- ✅ Your Shopify store admin access

## 🔧 Step 1: Initialize Git Repository

### For Windows Users:
```cmd
# Run the setup script
setup-github.bat
```

### For Mac/Linux Users:
```bash
# Make the script executable and run it
chmod +x setup-github.sh
./setup-github.sh
```

### Manual Setup (if scripts don't work):
```bash
# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "🚀 Initial commit: Complete Shopify webhook system"
```

## 🌐 Step 2: Create GitHub Repository

1. **Go to GitHub**: Visit [github.com/new](https://github.com/new)

2. **Repository Settings**:
   - **Repository name**: `webhook-system`
   - **Description**: `Complete Shopify webhook system with multi-channel messaging`
   - **Visibility**: Public (recommended for easier deployment)
   - **Initialize**: Leave all checkboxes unchecked (we already have files)

3. **Click "Create repository"**

4. **Copy the repository URL** (looks like: `https://github.com/YOUR_USERNAME/webhook-system.git`)

## 📤 Step 3: Push to GitHub

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
# Add GitHub as remote origin
git remote add origin https://github.com/YOUR_USERNAME/webhook-system.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

**🎉 Your code is now on GitHub!** Visit your repository to confirm all files are uploaded.

## ☁️ Step 4: Deploy to Vercel

### Method 1: One-Click Deploy (Easiest)
1. Visit this URL (replace YOUR_USERNAME): 
   ```
   https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/webhook-system
   ```
2. Click "Deploy"
3. Wait for deployment to complete

### Method 2: Manual Deployment
1. **Go to Vercel**: Visit [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository**: Click "Import" next to your webhook-system repository
3. **Configure Project**:
   - **Project Name**: `webhook-system` (or your preferred name)
   - **Framework Preset**: Other (Node.js)
   - **Root Directory**: `./` (leave as default)
4. **Click "Deploy"**

## ⚙️ Step 5: Configure Environment Variables

After deployment, you need to set up environment variables in Vercel:

1. **Go to your Vercel project dashboard**
2. **Click "Settings" tab**
3. **Click "Environment Variables"**
4. **Add these variables**:

### Required Variables:
```bash
SHOP_NAME=Your Store Name
SUPPORT_PHONE=+92-XXX-XXXXXXX  
SUPPORT_EMAIL=support@yourstore.com
WEBSITE_URL=https://yourstore.com
```

### Optional Service Integrations:
```bash
# WhatsApp Business API (optional)
ENABLE_WHATSAPP_SENDING=true
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Email Service - SendGrid (optional)
ENABLE_EMAIL_SENDING=true
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourstore.com

# SMS Service - Twilio (optional)
ENABLE_SMS_SENDING=true
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Database (optional)
ENABLE_DATABASE=true
DATABASE_URL=mongodb://your-connection-string
```

5. **Click "Save" and redeploy** (Vercel will automatically redeploy)

## 🔗 Step 6: Get Your Webhook URLs

After deployment, your webhook URLs will be:

```
https://your-project-name.vercel.app/api/webhooks/order-create
https://your-project-name.vercel.app/api/webhooks/order-fulfilled  
https://your-project-name.vercel.app/api/webhooks/order-cancelled
```

**Copy these URLs** - you'll need them for Shopify configuration.

## 🛍️ Step 7: Configure Shopify Webhooks

1. **Login to your Shopify Admin**
2. **Go to Settings → Notifications**
3. **Scroll down to "Webhooks" section**
4. **For each event, click "Create webhook"**:

### Order Created Webhook:
- **Event**: `Order creation`
- **Format**: `JSON`
- **URL**: `https://your-project-name.vercel.app/api/webhooks/order-create`
- **API Version**: `2023-10`

### Order Fulfilled Webhook:
- **Event**: `Order fulfillment`
- **Format**: `JSON`
- **URL**: `https://your-project-name.vercel.app/api/webhooks/order-fulfilled`
- **API Version**: `2023-10`

### Order Cancelled Webhook:
- **Event**: `Order cancellation`
- **Format**: `JSON`
- **URL**: `https://your-project-name.vercel.app/api/webhooks/order-cancelled`
- **API Version**: `2023-10`

## 🧪 Step 8: Test Your Setup

### 1. Test the Health Endpoint:
```bash
curl https://your-project-name.vercel.app/health
```

### 2. Test Webhook Processing:
```bash
curl -X POST https://your-project-name.vercel.app/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookType":"orders/create"}'
```

### 3. View the Dashboard:
Visit `https://your-project-name.vercel.app` in your browser to see the monitoring dashboard.

### 4. Place a Test Order:
Place a test order in your Shopify store to see real webhook processing.

## 🎯 Shopify Webhook Configuration Summary

| Event Type | Shopify Setting | Your Webhook URL |
|------------|----------------|------------------|
| Order Created | Order creation | `/api/webhooks/order-create` |
| Order Fulfilled | Order fulfillment | `/api/webhooks/order-fulfilled` |
| Order Cancelled | Order cancellation | `/api/webhooks/order-cancelled` |

## 🔍 Monitoring and Debugging

### View Logs:
1. Go to your Vercel project dashboard
2. Click "Functions" tab
3. View real-time logs and errors

### Test Endpoints:
- **Health Check**: `GET /health`
- **Recent Webhooks**: `GET /api/webhooks`
- **Statistics**: `GET /api/stats`
- **Test Webhook**: `POST /api/test-webhook`

## 🚨 Troubleshooting

### Common Issues:

**1. Webhooks not receiving data:**
- Check Shopify webhook configuration
- Verify URLs are correct
- Check Vercel function logs

**2. Environment variables not working:**
- Ensure variables are saved in Vercel dashboard
- Check spelling and formatting
- Redeploy after adding variables

**3. Messages not sending:**
- Verify service credentials (WhatsApp, SendGrid, Twilio)
- Check that services are enabled (`ENABLE_*_SENDING=true`)
- Review function logs for errors

### Need Help?
- Check the Vercel function logs for detailed error information
- Visit your deployed dashboard for system status
- Test endpoints manually with curl or Postman

## ✅ Success Checklist

- [ ] Git repository initialized locally
- [ ] Code pushed to GitHub successfully
- [ ] Project deployed to Vercel
- [ ] Environment variables configured
- [ ] Shopify webhooks configured with correct URLs
- [ ] Health check endpoint responding
- [ ] Test webhook processing works
- [ ] Dashboard accessible
- [ ] Test order placed successfully triggers webhook

## 🎉 Congratulations!

Your Shopify webhook system is now live and ready to process orders! Every time someone places an order in your Shopify store, your system will:

1. ✅ Receive the webhook from Shopify
2. ✅ Process and organize the order data
3. ✅ Generate beautiful messages for WhatsApp, Email, and SMS
4. ✅ Log everything for monitoring
5. ✅ Display activity in your dashboard

## 🔄 Making Updates

To update your system:

1. **Make changes locally**
2. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Updated feature X"
   git push
   ```
3. **Vercel automatically redeploys** from GitHub

---

**🚀 Your webhook system is now production-ready!**

For advanced configuration and customization, check the main [README.md](README.md) file.
