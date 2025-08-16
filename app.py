from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime
import logging

# Import order models and routes
from models.order import Base, Order, OrderEvent, create_tables, get_order_statistics, get_orders_by_event_type
from routes.orders import orders_bp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, 
           static_folder='public',
           template_folder='public')

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///webhook_orders.db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db = SQLAlchemy(app)

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Register blueprints
app.register_blueprint(orders_bp)

@app.route('/')
def dashboard():
    """Serve the main dashboard"""
    return render_template('dashboard.html')

@app.route('/api/analytics/dashboard')
def dashboard_analytics():
    """Get dashboard analytics data"""
    try:
        session = SessionLocal()
        
        # Get order statistics
        stats = get_order_statistics(session)
        
        # Get recent activity (last 10 orders)
        recent_orders = get_orders_by_event_type(session, limit=10)
        recent_activity = []
        
        for order in recent_orders:
            activity_icons = {
                'created': 'shopping-cart',
                'fulfilled': 'truck', 
                'cancelled': 'x-circle'
            }
            
            activity = {
                'type': 'order',
                'action': f"Order {order.event_type.title()}",
                'details': f"{order.customer_name} - PKR {order.total_amount}",
                'timestamp': order.created_at.isoformat() if order.created_at else datetime.utcnow().isoformat(),
                'status': 'success' if order.status == 'processed' else 'pending',
                'icon': activity_icons.get(order.event_type, 'activity')
            }
            recent_activity.append(activity)
        
        session.close()
        
        # Calculate additional stats
        total_orders = stats['created'] + stats['fulfilled'] + stats['cancelled']
        success_rate = round((stats['fulfilled'] / total_orders * 100) if total_orders > 0 else 0, 1)
        
        response_data = {
            'success': True,
            'summary': {
                'totalOrders': total_orders,
                'totalMessages': stats['created'] + stats['fulfilled'] + stats['cancelled'],  # Assuming 1 message per order
                'totalRevenue': stats['totalValue'],
                'successRate': success_rate
            },
            'realtime': {
                'recentActivity': recent_activity
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error fetching dashboard analytics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/analytics/orders')
def orders_analytics():
    """Get orders data for order pages"""
    try:
        event_type = request.args.get('event', 'all')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        session = SessionLocal()
        
        # Get orders filtered by event type
        orders = get_orders_by_event_type(session, event_type, limit, offset)
        
        # Get statistics
        stats = get_order_statistics(session)
        
        session.close()
        
        # Convert orders to dictionary
        orders_data = [order.to_dict() for order in orders]
        
        response_data = {
            'success': True,
            'summary': stats,
            'orders': orders_data
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error fetching orders data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0'
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def init_database():
    """Initialize database tables"""
    try:
        create_tables(engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

if __name__ == '__main__':
    # Initialize database
    init_database()
    
    # Start the application
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting webhook system on port {port}")
    logger.info(f"Database: {DATABASE_URL}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
