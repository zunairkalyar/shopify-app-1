-- Webhook Analytics Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to set up the tables

-- Orders table - stores order data from webhooks
CREATE TABLE IF NOT EXISTS webhook_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    order_number VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    total_price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'PKR',
    payment_status VARCHAR(50),
    items_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    webhook_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table - tracks message delivery
CREATE TABLE IF NOT EXISTS webhook_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id VARCHAR(255),
    channel VARCHAR(50) NOT NULL, -- whatsapp, email, sms
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- sent, delivered, failed, pending
    recipient VARCHAR(255),
    content_type VARCHAR(50) DEFAULT 'text',
    delivery_time_ms INTEGER,
    error_message TEXT,
    message_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics summary table - stores aggregated metrics
CREATE TABLE IF NOT EXISTS webhook_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- orders, messages, performance
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 2),
    metric_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, metric_type, metric_name)
);

-- Webhooks processing log - logs webhook processing
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_id VARCHAR(255) NOT NULL,
    webhook_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- processed, failed
    processing_time_ms INTEGER,
    error_message TEXT,
    raw_data JSONB,
    processed_data JSONB,
    headers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webhook_orders_created_at ON webhook_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_orders_status ON webhook_orders(status);
CREATE INDEX IF NOT EXISTS idx_webhook_orders_customer_email ON webhook_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_webhook_messages_created_at ON webhook_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_messages_channel ON webhook_messages(channel);
CREATE INDEX IF NOT EXISTS idx_webhook_messages_status ON webhook_messages(status);
CREATE INDEX IF NOT EXISTS idx_webhook_messages_order_id ON webhook_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_analytics_date ON webhook_analytics(date);
CREATE INDEX IF NOT EXISTS idx_webhook_analytics_metric_type ON webhook_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);

-- Enable Row Level Security
ALTER TABLE webhook_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service role access
CREATE POLICY "Service role can manage orders" ON webhook_orders
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage messages" ON webhook_messages
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage analytics" ON webhook_analytics
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage logs" ON webhook_logs
FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous read access to analytics for dashboard
CREATE POLICY "Anonymous can read analytics" ON webhook_analytics
FOR SELECT USING (true);

-- Insert initial analytics data
INSERT INTO webhook_analytics (date, metric_type, metric_name, metric_value)
VALUES 
    (CURRENT_DATE, 'orders', 'total', 0),
    (CURRENT_DATE, 'orders', 'created', 0),
    (CURRENT_DATE, 'orders', 'fulfilled', 0),
    (CURRENT_DATE, 'orders', 'cancelled', 0),
    (CURRENT_DATE, 'messages', 'total', 0),
    (CURRENT_DATE, 'messages', 'delivered', 0),
    (CURRENT_DATE, 'messages', 'failed', 0),
    (CURRENT_DATE, 'performance', 'success_rate', 100)
ON CONFLICT (date, metric_type, metric_name) DO NOTHING;
