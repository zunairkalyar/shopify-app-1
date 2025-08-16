from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Order(Base):
    """Database model for storing order information"""
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Shopify order information
    shopify_order_id = Column(String(50), unique=True, nullable=False, index=True)
    order_number = Column(String(50), nullable=True, index=True)
    
    # Customer information
    customer_name = Column(String(200), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True, index=True)
    
    # Order details
    total_amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default='PKR')
    product_count = Column(Integer, nullable=False, default=0)
    products = Column(JSON, nullable=True)  # Store product details as JSON
    
    # Shipping information
    shipping_address = Column(JSON, nullable=True)
    
    # Order status and events
    event_type = Column(String(20), nullable=False, index=True)  # 'created', 'fulfilled', 'cancelled'
    status = Column(String(20), nullable=False, default='pending', index=True)  # 'pending', 'processed', 'failed'
    financial_status = Column(String(50), nullable=True)
    fulfillment_status = Column(String(50), nullable=True)
    
    # Fulfillment information
    tracking_number = Column(String(100), nullable=True)
    tracking_company = Column(String(100), nullable=True)
    tracking_url = Column(String(500), nullable=True)
    fulfilled_at = Column(DateTime, nullable=True)
    
    # Cancellation information
    cancel_reason = Column(String(200), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    total_refund = Column(Float, nullable=True, default=0.0)
    
    # Message tracking
    message_sent = Column(Boolean, nullable=False, default=False)
    message_sent_at = Column(DateTime, nullable=True)
    message_type = Column(String(20), nullable=True)  # 'whatsapp', 'sms', 'email'
    message_status = Column(String(20), nullable=True)  # 'sent', 'delivered', 'failed'
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Raw webhook data for debugging
    raw_webhook_data = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<Order {self.shopify_order_id}: {self.customer_name} - {self.event_type}>"
    
    def to_dict(self):
        """Convert order to dictionary for API responses"""
        return {
            'id': self.id,
            'order_id': self.shopify_order_id,
            'order_number': self.order_number,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'total_amount': self.total_amount,
            'currency': self.currency,
            'product_count': self.product_count,
            'products': self.products,
            'shipping_address': self.shipping_address,
            'event_type': self.event_type,
            'status': self.status,
            'financial_status': self.financial_status,
            'fulfillment_status': self.fulfillment_status,
            'tracking_number': self.tracking_number,
            'tracking_company': self.tracking_company,
            'tracking_url': self.tracking_url,
            'fulfilled_at': self.fulfilled_at.isoformat() if self.fulfilled_at else None,
            'cancel_reason': self.cancel_reason,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'total_refund': self.total_refund,
            'message_sent': self.message_sent,
            'message_sent_at': self.message_sent_at.isoformat() if self.message_sent_at else None,
            'message_type': self.message_type,
            'message_status': self.message_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class OrderEvent(Base):
    """Track individual events for orders"""
    __tablename__ = 'order_events'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, nullable=False, index=True)  # Foreign key to orders.id
    shopify_order_id = Column(String(50), nullable=False, index=True)
    event_type = Column(String(20), nullable=False, index=True)  # 'created', 'fulfilled', 'cancelled'
    status = Column(String(20), nullable=False, default='pending')
    
    # Event specific data
    event_data = Column(JSON, nullable=True)
    
    # Message information
    message_sent = Column(Boolean, nullable=False, default=False)
    message_content = Column(Text, nullable=True)
    message_response = Column(JSON, nullable=True)
    
    # Timestamps
    event_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<OrderEvent {self.shopify_order_id}: {self.event_type}>"

# Database utility functions
def create_tables(engine):
    """Create all tables in the database"""
    Base.metadata.create_all(engine)

def get_order_by_shopify_id(session, shopify_order_id):
    """Get order by Shopify order ID"""
    return session.query(Order).filter_by(shopify_order_id=shopify_order_id).first()

def get_orders_by_event_type(session, event_type=None, limit=50, offset=0):
    """Get orders filtered by event type"""
    query = session.query(Order)
    
    if event_type and event_type != 'all':
        query = query.filter_by(event_type=event_type)
    
    return query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()

def get_order_statistics(session):
    """Get order statistics for dashboard"""
    from sqlalchemy import func
    
    # Count orders by event type
    stats = session.query(
        Order.event_type,
        func.count(Order.id).label('count'),
        func.sum(Order.total_amount).label('total_value')
    ).group_by(Order.event_type).all()
    
    result = {
        'created': 0,
        'fulfilled': 0,
        'cancelled': 0,
        'totalValue': 0
    }
    
    for stat in stats:
        result[stat.event_type] = stat.count
        result['totalValue'] += stat.total_value or 0
    
    return result
