from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
import json

# Import your database models
# from models import Order, Customer, db

orders_bp = Blueprint('orders', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@orders_bp.route('/webhook/shopify/orders/create', methods=['POST'])
def handle_order_created():
    """Handle Shopify orders/create webhook"""
    try:
        # Get webhook data
        webhook_data = request.get_json()
        
        if not webhook_data:
            logger.error("No webhook data received")
            return jsonify({'error': 'No data received'}), 400
            
        # Extract order data from Shopify webhook
        order_data = extract_order_create_data(webhook_data)
        
        # Save to database
        order_id = save_order_to_database(order_data, 'created')
        
        # Trigger message sending (WhatsApp/SMS)
        send_order_confirmation_message(order_data)
        
        logger.info(f"Order created webhook processed successfully: {order_data['order_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Order created webhook processed',
            'order_id': order_data['order_id'],
            'customer': order_data['customer_name'],
            'amount': order_data['total_amount'],
            'currency': order_data['currency'],
            'products': len(order_data['products']),
            'db_id': order_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing order created webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/webhook/shopify/orders/fulfilled', methods=['POST'])
def handle_order_fulfilled():
    """Handle Shopify orders/fulfilled webhook"""
    try:
        webhook_data = request.get_json()
        
        if not webhook_data:
            return jsonify({'error': 'No data received'}), 400
            
        # Extract fulfillment data
        order_data = extract_order_fulfilled_data(webhook_data)
        
        # Update order in database
        update_order_fulfillment(order_data)
        
        # Send shipping notification
        send_fulfillment_message(order_data)
        
        logger.info(f"Order fulfilled webhook processed: {order_data['order_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Order fulfilled webhook processed',
            'order_id': order_data['order_id']
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing order fulfilled webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/webhook/shopify/orders/cancelled', methods=['POST'])
def handle_order_cancelled():
    """Handle Shopify orders/cancelled webhook"""
    try:
        webhook_data = request.get_json()
        
        if not webhook_data:
            return jsonify({'error': 'No data received'}), 400
            
        # Extract cancellation data
        order_data = extract_order_cancelled_data(webhook_data)
        
        # Update order in database
        update_order_cancellation(order_data)
        
        # Send cancellation notification
        send_cancellation_message(order_data)
        
        logger.info(f"Order cancelled webhook processed: {order_data['order_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Order cancelled webhook processed',
            'order_id': order_data['order_id']
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing order cancelled webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

def extract_order_create_data(webhook_data):
    """Extract and normalize order creation data from Shopify webhook"""
    try:
        return {
            'order_id': str(webhook_data.get('id', '')),
            'order_number': webhook_data.get('order_number', ''),
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
            'shipping_address': {
                'address1': webhook_data.get('shipping_address', {}).get('address1', ''),
                'city': webhook_data.get('shipping_address', {}).get('city', ''),
                'country': webhook_data.get('shipping_address', {}).get('country', ''),
                'zip': webhook_data.get('shipping_address', {}).get('zip', '')
            },
            'financial_status': webhook_data.get('financial_status', ''),
            'fulfillment_status': webhook_data.get('fulfillment_status', ''),
            'created_at': webhook_data.get('created_at', datetime.utcnow().isoformat()),
            'event_type': 'created',
            'raw_webhook_data': json.dumps(webhook_data)
        }
    except Exception as e:
        logger.error(f"Error extracting order create data: {str(e)}")
        raise

def extract_order_fulfilled_data(webhook_data):
    """Extract fulfillment data from Shopify webhook"""
    try:
        fulfillment = webhook_data.get('fulfillment', {})
        
        return {
            'order_id': str(webhook_data.get('id', '')),
            'fulfillment_id': str(fulfillment.get('id', '')),
            'tracking_number': fulfillment.get('tracking_number', ''),
            'tracking_company': fulfillment.get('tracking_company', ''),
            'tracking_url': fulfillment.get('tracking_url', ''),
            'status': fulfillment.get('status', ''),
            'fulfilled_at': fulfillment.get('created_at', datetime.utcnow().isoformat()),
            'event_type': 'fulfilled',
            'line_items': fulfillment.get('line_items', [])
        }
    except Exception as e:
        logger.error(f"Error extracting order fulfilled data: {str(e)}")
        raise

def extract_order_cancelled_data(webhook_data):
    """Extract cancellation data from Shopify webhook"""
    try:
        return {
            'order_id': str(webhook_data.get('id', '')),
            'cancel_reason': webhook_data.get('cancel_reason', 'Not specified'),
            'cancelled_at': webhook_data.get('cancelled_at', datetime.utcnow().isoformat()),
            'total_refund': float(webhook_data.get('total_refunds_set', {}).get('shop_money', {}).get('amount', 0)),
            'refund_status': 'refunded' if webhook_data.get('refunds') else 'cancelled',
            'event_type': 'cancelled',
            'financial_status': webhook_data.get('financial_status', '')
        }
    except Exception as e:
        logger.error(f"Error extracting order cancelled data: {str(e)}")
        raise

def save_order_to_database(order_data, event_type):
    """Save order data to database"""
    try:
        # This is a placeholder - implement your actual database logic
        logger.info(f"Saving order {order_data['order_id']} to database")
        
        # Example database save (uncomment and modify based on your models):
        # order = Order(
        #     shopify_order_id=order_data['order_id'],
        #     order_number=order_data['order_number'],
        #     customer_name=order_data['customer_name'],
        #     customer_email=order_data['customer_email'],
        #     customer_phone=order_data['customer_phone'],
        #     total_amount=order_data['total_amount'],
        #     currency=order_data['currency'],
        #     event_type=event_type,
        #     status='pending',
        #     created_at=datetime.fromisoformat(order_data['created_at'].replace('Z', '+00:00')),
        #     raw_data=order_data['raw_webhook_data']
        # )
        # db.session.add(order)
        # db.session.commit()
        # return order.id
        
        return 1  # Placeholder return
        
    except Exception as e:
        logger.error(f"Error saving order to database: {str(e)}")
        raise

def update_order_fulfillment(order_data):
    """Update order with fulfillment information"""
    try:
        logger.info(f"Updating order {order_data['order_id']} with fulfillment data")
        
        # Example update (implement based on your models):
        # order = Order.query.filter_by(shopify_order_id=order_data['order_id']).first()
        # if order:
        #     order.fulfillment_status = 'fulfilled'
        #     order.tracking_number = order_data['tracking_number']
        #     order.tracking_company = order_data['tracking_company']
        #     order.fulfilled_at = datetime.fromisoformat(order_data['fulfilled_at'].replace('Z', '+00:00'))
        #     db.session.commit()
        
    except Exception as e:
        logger.error(f"Error updating order fulfillment: {str(e)}")
        raise

def update_order_cancellation(order_data):
    """Update order with cancellation information"""
    try:
        logger.info(f"Updating order {order_data['order_id']} with cancellation data")
        
        # Example update (implement based on your models):
        # order = Order.query.filter_by(shopify_order_id=order_data['order_id']).first()
        # if order:
        #     order.status = 'cancelled'
        #     order.cancel_reason = order_data['cancel_reason']
        #     order.cancelled_at = datetime.fromisoformat(order_data['cancelled_at'].replace('Z', '+00:00'))
        #     order.total_refund = order_data['total_refund']
        #     db.session.commit()
        
    except Exception as e:
        logger.error(f"Error updating order cancellation: {str(e)}")
        raise

def send_order_confirmation_message(order_data):
    """Send order confirmation message via WhatsApp/SMS"""
    try:
        phone = order_data.get('customer_phone')
        if not phone:
            logger.warning(f"No phone number for order {order_data['order_id']}")
            return
            
        message = f"""
🛍️ *Order Confirmation*

Thank you {order_data['customer_name']}!

📋 Order #: {order_data['order_number']}
💰 Total: {order_data['currency']} {order_data['total_amount']}
📦 Items: {order_data['product_count']} products

Your order has been received and is being processed.

Thank you for shopping with us!
        """.strip()
        
        # Call your WhatsApp/SMS sending function
        # send_whatsapp_message(phone, message)
        logger.info(f"Order confirmation message prepared for {phone}")
        
    except Exception as e:
        logger.error(f"Error sending order confirmation: {str(e)}")

def send_fulfillment_message(order_data):
    """Send fulfillment notification message"""
    try:
        # Get customer phone from database based on order_id
        # This would require a database lookup
        
        tracking_info = ""
        if order_data.get('tracking_number'):
            tracking_info = f"\n📦 Tracking: {order_data['tracking_number']}"
            if order_data.get('tracking_company'):
                tracking_info += f"\n🚚 Carrier: {order_data['tracking_company']}"
        
        message = f"""
📦 *Order Shipped!*

Your order has been shipped and is on its way!
{tracking_info}

Thank you for your patience!
        """.strip()
        
        logger.info(f"Fulfillment message prepared for order {order_data['order_id']}")
        
    except Exception as e:
        logger.error(f"Error sending fulfillment message: {str(e)}")

def send_cancellation_message(order_data):
    """Send cancellation notification message"""
    try:
        message = f"""
❌ *Order Cancelled*

Your order has been cancelled.
Reason: {order_data.get('cancel_reason', 'Not specified')}

If you have any questions, please contact our support team.
        """.strip()
        
        logger.info(f"Cancellation message prepared for order {order_data['order_id']}")
        
    except Exception as e:
        logger.error(f"Error sending cancellation message: {str(e)}")

# API endpoints for dashboard to fetch order data
@orders_bp.route('/api/analytics/orders', methods=['GET'])
def get_orders_data():
    """Get orders data for dashboard"""
    try:
        event_type = request.args.get('event', 'all')
        
        # This would query your database based on event_type
        # For now, return sample data
        sample_data = {
            'success': True,
            'summary': {
                'created': 25,
                'fulfilled': 18,
                'cancelled': 2,
                'totalValue': 125000
            },
            'orders': [
                {
                    'order_id': '1001',
                    'customer_name': 'Ahmed Khan',
                    'event_type': 'created',
                    'total_amount': 2500,
                    'status': 'processed',
                    'product_count': 2,
                    'message_sent': True,
                    'created_at': datetime.utcnow().isoformat(),
                    'tracking_number': None,
                    'fulfilled_at': None,
                    'cancel_reason': None,
                    'cancelled_at': None
                }
            ]
        }
        
        return jsonify(sample_data)
        
    except Exception as e:
        logger.error(f"Error fetching orders data: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
