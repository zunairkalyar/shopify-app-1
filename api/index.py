from flask import Flask, request, jsonify
from datetime import datetime
import json
import logging
import os
import sys

# Add the parent directory to the Python path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Initialize Flask app for Vercel
app = Flask(__name__)

# Configure logging for Vercel
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simple in-memory storage for Vercel (since we can't use persistent SQLite)
# In production, you'd use a proper database like PostgreSQL, MongoDB, or Supabase
orders_store = []
stats_store = {
    'created': 0,
    'fulfilled': 0, 
    'cancelled': 0,
    'totalValue': 0
}

@app.route('/')
def home():
    """Redirect to dashboard"""
    return jsonify({
        'message': 'Webhook System API is running',
        'dashboard': '/public/dashboard.html',
        'health': '/health',
        'webhooks': {
            'orders_create': '/webhook/shopify/orders/create',
            'orders_fulfilled': '/webhook/shopify/orders/fulfilled',
            'orders_cancelled': '/webhook/shopify/orders/cancelled'
        }
    })

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0',
        'platform': 'Vercel'
    })

@app.route('/webhook/shopify/orders/create', methods=['POST'])
def handle_order_created():
    """Handle Shopify orders/create webhook"""
    try:
        webhook_data = request.get_json()
        
        if not webhook_data:
            logger.error("No webhook data received")
            return jsonify({'error': 'No data received'}), 400
            
        # Extract order data
        order_data = extract_order_create_data(webhook_data)
        
        # Store in memory (for demo purposes)
        orders_store.append(order_data)
        stats_store['created'] += 1
        stats_store['totalValue'] += order_data['total_amount']
        
        # Log for monitoring
        logger.info(f"Order created: {order_data['order_id']} - {order_data['customer_name']}")
        
        # Prepare WhatsApp message (you can integrate with your WhatsApp API here)
        message = prepare_order_confirmation_message(order_data)
        logger.info(f"Order confirmation message prepared for {order_data.get('customer_phone')}")
        
        return jsonify({
            'success': True,
            'message': 'Order created webhook processed',
            'order_id': order_data['order_id'],
            'customer': order_data['customer_name'],
            'amount': order_data['total_amount']
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing order created webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/webhook/shopify/orders/fulfilled', methods=['POST'])
def handle_order_fulfilled():
    """Handle Shopify orders/fulfilled webhook"""
    try:
        webhook_data = request.get_json()
        
        if not webhook_data:
            return jsonify({'error': 'No data received'}), 400
            
        order_data = extract_order_fulfilled_data(webhook_data)
        
        # Update existing order or create new entry
        existing_order = find_order_by_id(order_data['order_id'])
        if existing_order:
            existing_order.update(order_data)
            existing_order['event_type'] = 'fulfilled'
        else:
            order_data['event_type'] = 'fulfilled'
            orders_store.append(order_data)
        
        stats_store['fulfilled'] += 1
        
        logger.info(f"Order fulfilled: {order_data['order_id']}")
        
        # Prepare fulfillment message
        message = prepare_fulfillment_message(order_data)
        logger.info(f"Fulfillment message prepared for order {order_data['order_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Order fulfilled webhook processed',
            'order_id': order_data['order_id'],
            'tracking': order_data.get('tracking_number', 'N/A')
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing order fulfilled webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/webhook/shopify/orders/cancelled', methods=['POST'])
def handle_order_cancelled():
    """Handle Shopify orders/cancelled webhook"""
    try:
        webhook_data = request.get_json()
        
        if not webhook_data:
            return jsonify({'error': 'No data received'}), 400
            
        order_data = extract_order_cancelled_data(webhook_data)
        
        # Update existing order or create new entry
        existing_order = find_order_by_id(order_data['order_id'])
        if existing_order:
            existing_order.update(order_data)
            existing_order['event_type'] = 'cancelled'
        else:
            order_data['event_type'] = 'cancelled'
            orders_store.append(order_data)
        
        stats_store['cancelled'] += 1
        
        logger.info(f"Order cancelled: {order_data['order_id']}")
        
        # Prepare cancellation message
        message = prepare_cancellation_message(order_data)
        logger.info(f"Cancellation message prepared for order {order_data['order_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Order cancelled webhook processed',
            'order_id': order_data['order_id'],
            'reason': order_data.get('cancel_reason', 'Not specified')
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing order cancelled webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/dashboard')
def dashboard_analytics():
    """Get dashboard analytics data"""
    try:
        # Get recent activity
        recent_activity = []
        for order in orders_store[-10:]:  # Last 10 orders
            activity = {
                'type': 'order',
                'action': f"Order {order.get('event_type', 'created').title()}",
                'details': f"{order.get('customer_name', 'Unknown')} - PKR {order.get('total_amount', 0)}",
                'timestamp': order.get('created_at', datetime.utcnow().isoformat()),
                'status': 'success'
            }
            recent_activity.append(activity)
        
        # Calculate success rate
        total_orders = stats_store['created'] + stats_store['fulfilled'] + stats_store['cancelled']
        success_rate = round((stats_store['fulfilled'] / total_orders * 100) if total_orders > 0 else 0, 1)
        
        return jsonify({
            'success': True,
            'summary': {
                'totalOrders': total_orders,
                'totalMessages': total_orders,  # Assuming 1 message per order
                'totalRevenue': stats_store['totalValue'],
                'successRate': success_rate
            },
            'realtime': {
                'recentActivity': recent_activity
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching dashboard analytics: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analytics/orders')
def orders_analytics():
    """Get orders data for order pages"""
    try:
        event_type = request.args.get('event', 'all')
        
        # Filter orders by event type
        if event_type == 'all':
            filtered_orders = orders_store
        else:
            filtered_orders = [order for order in orders_store if order.get('event_type') == event_type]
        
        return jsonify({
            'success': True,
            'summary': stats_store,
            'orders': filtered_orders[-50:]  # Return last 50 orders
        })
        
    except Exception as e:
        logger.error(f"Error fetching orders data: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Utility functions
def extract_order_create_data(webhook_data):
    """Extract order creation data from Shopify webhook"""
    return {
        'order_id': str(webhook_data.get('id', '')),
        'order_number': str(webhook_data.get('order_number', '')),
        'customer_name': f"{webhook_data.get('customer', {}).get('first_name', '')} {webhook_data.get('customer', {}).get('last_name', '')}".strip(),
        'customer_email': webhook_data.get('customer', {}).get('email', ''),
        'customer_phone': webhook_data.get('customer', {}).get('phone', '') or webhook_data.get('billing_address', {}).get('phone', ''),
        'total_amount': float(webhook_data.get('total_price', 0)),
        'currency': webhook_data.get('currency', 'PKR'),
        'product_count': len(webhook_data.get('line_items', [])),
        'products': [
            {
                'name': item.get('name', ''),
                'quantity': item.get('quantity', 0),
                'price': float(item.get('price', 0))
            }
            for item in webhook_data.get('line_items', [])
        ],
        'financial_status': webhook_data.get('financial_status', ''),
        'fulfillment_status': webhook_data.get('fulfillment_status', ''),
        'created_at': webhook_data.get('created_at', datetime.utcnow().isoformat()),
        'event_type': 'created',
        'status': 'processed',
        'message_sent': True
    }

def extract_order_fulfilled_data(webhook_data):
    """Extract fulfillment data from Shopify webhook"""
    return {
        'order_id': str(webhook_data.get('id', '')),
        'tracking_number': webhook_data.get('tracking_number', ''),
        'tracking_company': webhook_data.get('tracking_company', ''),
        'tracking_url': webhook_data.get('tracking_url', ''),
        'fulfilled_at': webhook_data.get('created_at', datetime.utcnow().isoformat()),
        'status': 'processed',
        'message_sent': True
    }

def extract_order_cancelled_data(webhook_data):
    """Extract cancellation data from Shopify webhook"""
    return {
        'order_id': str(webhook_data.get('id', '')),
        'cancel_reason': webhook_data.get('cancel_reason', 'Not specified'),
        'cancelled_at': webhook_data.get('cancelled_at', datetime.utcnow().isoformat()),
        'total_refund': float(webhook_data.get('total_refunds_set', {}).get('shop_money', {}).get('amount', 0)),
        'status': 'processed',
        'message_sent': True
    }

def find_order_by_id(order_id):
    """Find order in memory store by ID"""
    for order in orders_store:
        if order.get('order_id') == order_id:
            return order
    return None

def prepare_order_confirmation_message(order_data):
    """Prepare order confirmation message"""
    return f"""
🛍️ *Order Confirmation*

Thank you {order_data['customer_name']}!

📋 Order #: {order_data['order_number']}
💰 Total: {order_data['currency']} {order_data['total_amount']}
📦 Items: {order_data['product_count']} products

Your order has been received and is being processed.

Thank you for shopping with us!
    """.strip()

def prepare_fulfillment_message(order_data):
    """Prepare fulfillment message"""
    tracking_info = ""
    if order_data.get('tracking_number'):
        tracking_info = f"\n📦 Tracking: {order_data['tracking_number']}"
        if order_data.get('tracking_company'):
            tracking_info += f"\n🚚 Carrier: {order_data['tracking_company']}"
    
    return f"""
📦 *Order Shipped!*

Your order has been shipped and is on its way!{tracking_info}

Thank you for your patience!
    """.strip()

def prepare_cancellation_message(order_data):
    """Prepare cancellation message"""
    return f"""
❌ *Order Cancelled*

Your order has been cancelled.
Reason: {order_data.get('cancel_reason', 'Not specified')}

If you have any questions, please contact our support team.
    """.strip()

# Export the Flask app for Vercel
# Vercel expects the Flask app to be directly importable
app = app

# For local development
if __name__ == '__main__':
    app.run(debug=True)
