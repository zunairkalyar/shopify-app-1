# Webhook System Setup Guide

## Overview
Your webhook system is now configured to receive and process **3 main Shopify webhook events** and convert them into order items for your dashboard.

## 🔗 Webhook URLs to Configure in Shopify

Set up these webhook URLs in your Shopify Admin:

### 1. Order Created Webhook
- **Event**: `orders/create`
- **URL**: `https://your-domain.com/webhook/shopify/orders/create`
- **Format**: JSON
- **Triggered**: When a new order is placed

### 2. Order Fulfilled Webhook
- **Event**: `orders/fulfilled` 
- **URL**: `https://your-domain.com/webhook/shopify/orders/fulfilled`
- **Format**: JSON
- **Triggered**: When an order is marked as fulfilled/shipped

### 3. Order Cancelled Webhook
- **Event**: `orders/cancelled`
- **URL**: `https://your-domain.com/webhook/shopify/orders/cancelled` 
- **Format**: JSON
- **Triggered**: When an order is cancelled or refunded

## 📋 How to Set Up Webhooks in Shopify

### Method 1: Shopify Admin Dashboard
1. Go to **Settings** > **Notifications**
2. Scroll to **Webhooks** section
3. Click **Create webhook**
4. Configure each webhook:
   - **Event**: Select from dropdown
   - **Format**: JSON
   - **URL**: Enter your webhook URL
   - **API Version**: Latest (2023-10 or newer)

### Method 2: Shopify CLI/API
```bash
# Create order created webhook
curl -X POST "https://your-shop.myshopify.com/admin/api/2023-10/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://your-domain.com/webhook/shopify/orders/create",
      "format": "json"
    }
  }'
```

## 🗄️ Database Schema

The system creates these database tables:

### Orders Table
- **shopify_order_id**: Unique Shopify order ID
- **order_number**: Human-readable order number
- **customer_name**: Customer full name
- **customer_email**: Customer email
- **customer_phone**: Customer phone (for WhatsApp/SMS)
- **total_amount**: Order total value
- **currency**: Currency (default: PKR)
- **product_count**: Number of products
- **event_type**: 'created', 'fulfilled', 'cancelled'
- **status**: 'pending', 'processed', 'failed'
- **message_sent**: Boolean - whether message was sent
- **tracking_number**: Fulfillment tracking number
- **cancel_reason**: Cancellation reason
- **created_at/updated_at**: Timestamps

### Order Events Table
- Tracks individual webhook events
- Links to main orders table
- Stores message content and responses

## 📱 Message Templates

### Order Confirmation (orders/create)
```
🛍️ *Order Confirmation*

Thank you {customer_name}!

📋 Order #: {order_number}
💰 Total: {currency} {total_amount}
📦 Items: {product_count} products

Your order has been received and is being processed.

Thank you for shopping with us!
```

### Fulfillment Notification (orders/fulfilled)
```
📦 *Order Shipped!*

Your order has been shipped and is on its way!
📦 Tracking: {tracking_number}
🚚 Carrier: {tracking_company}

Thank you for your patience!
```

### Cancellation Notice (orders/cancelled)
```
❌ *Order Cancelled*

Your order has been cancelled.
Reason: {cancel_reason}

If you have any questions, please contact our support team.
```

## 🚀 Deployment Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
export DATABASE_URL="sqlite:///webhook_orders.db"  # or PostgreSQL/MySQL URL
export FLASK_ENV="production"
export PORT=5000
```

### 3. Initialize Database
```bash
python app.py
# This will create the database tables automatically
```

### 4. Start the Server
```bash
# Development
python app.py

# Production with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🔧 Testing Webhooks

### Test Order Created
```bash
curl -X POST "http://localhost:5000/webhook/shopify/orders/create" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "12345",
    "order_number": "1001",
    "customer": {
      "first_name": "Ahmed",
      "last_name": "Khan",
      "email": "ahmed@example.com",
      "phone": "+923001234567"
    },
    "total_price": "2500.00",
    "currency": "PKR",
    "line_items": [
      {
        "name": "Test Product",
        "quantity": 2,
        "price": "1250.00"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  }'
```

## 📊 Dashboard Integration

The order data automatically appears in your dashboard:

- **All Orders**: `/` (main dashboard with "All Orders" menu)
- **Orders Created**: Click "Orders Created" submenu
- **Orders Fulfilled**: Click "Orders Fulfilled" submenu  
- **Orders Cancelled**: Click "Orders Cancelled" submenu

### API Endpoints
- **Dashboard Data**: `GET /api/analytics/dashboard`
- **Orders Data**: `GET /api/analytics/orders?event=all|created|fulfilled|cancelled`
- **Health Check**: `GET /health`

## 🔍 Monitoring and Logs

### Check Webhook Processing
```bash
# View logs
tail -f app.log

# Check specific order
curl "http://localhost:5000/api/analytics/orders?event=created"
```

### Database Queries
```sql
-- View all orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- Count orders by type
SELECT event_type, COUNT(*) FROM orders GROUP BY event_type;

-- Check message status
SELECT customer_phone, message_sent, message_status FROM orders WHERE message_sent = 1;
```

## 🛠️ Customization

### Adding WhatsApp/SMS Integration
Update the message sending functions in `routes/orders.py`:

```python
def send_order_confirmation_message(order_data):
    phone = order_data.get('customer_phone')
    message = f"Order #{order_data['order_number']} confirmed..."
    
    # Add your WhatsApp API call here
    # send_whatsapp_message(phone, message)
```

### Custom Message Templates
Modify the message templates in the respective functions:
- `send_order_confirmation_message()`
- `send_fulfillment_message()` 
- `send_cancellation_message()`

Your webhook system is now ready to receive Shopify orders and display them in your dashboard! 🎉
