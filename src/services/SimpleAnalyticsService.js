/**
 * Simple Analytics Service - Display Only (No Database)
 * 
 * Provides mock analytics data for demonstration purposes
 * Perfect for deployment without database configuration
 */

class SimpleAnalyticsService {
    constructor() {
        console.log('🎯 Simple Analytics Service initialized (Display Mode)');
        
        // In-memory storage for demo
        this.orders = [];
        this.messages = [];
        this.recentActivity = [];
        
        // Initialize with demo data
        this.initializeDemoData();
    }

    /**
     * Initialize demo data for display
     */
    initializeDemoData() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Demo orders
        this.orders = [
            { id: 'ORD001', total: 250.00, status: 'completed', created_at: yesterday.toISOString(), customer: 'Ahmed Khan' },
            { id: 'ORD002', total: 180.00, status: 'pending', created_at: now.toISOString(), customer: 'Sara Ali' },
            { id: 'ORD003', total: 320.00, status: 'completed', created_at: weekAgo.toISOString(), customer: 'Hassan Sheikh' },
            { id: 'ORD004', total: 150.00, status: 'cancelled', created_at: yesterday.toISOString(), customer: 'Fatima Ahmed' },
            { id: 'ORD005', total: 420.00, status: 'completed', created_at: now.toISOString(), customer: 'Ali Raza' }
        ];

        // Demo messages
        this.messages = [
            { id: 'MSG001', channel: 'whatsapp', status: 'delivered', order_id: 'ORD001', created_at: yesterday.toISOString() },
            { id: 'MSG002', channel: 'email', status: 'sent', order_id: 'ORD002', created_at: now.toISOString() },
            { id: 'MSG003', channel: 'sms', status: 'failed', order_id: 'ORD003', created_at: weekAgo.toISOString() },
            { id: 'MSG004', channel: 'whatsapp', status: 'delivered', order_id: 'ORD004', created_at: yesterday.toISOString() },
            { id: 'MSG005', channel: 'email', status: 'delivered', order_id: 'ORD005', created_at: now.toISOString() }
        ];

        // Demo recent activity
        this.recentActivity = [
            { type: 'order', action: 'Order Completed', details: 'Ali Raza - PKR 420', timestamp: now.toISOString(), status: 'success' },
            { type: 'message', action: 'EMAIL Delivered', details: 'To: ali@example.com', timestamp: now.toISOString(), status: 'success' },
            { type: 'order', action: 'Order Pending', details: 'Sara Ali - PKR 180', timestamp: now.toISOString(), status: 'pending' },
            { type: 'message', action: 'WHATSAPP Sent', details: 'To: +92-300-123456', timestamp: yesterday.toISOString(), status: 'success' }
        ];
    }

    /**
     * Track order (adds to demo data)
     */
    async trackOrder(orderData) {
        const order = {
            id: orderData.id || orderData.name || `ORD${Date.now()}`,
            total: parseFloat(orderData.total_price || 0),
            status: orderData.status || 'pending',
            customer: this.getCustomerName(orderData.customer) || 'Unknown Customer',
            created_at: new Date().toISOString()
        };

        this.orders.unshift(order);
        
        // Keep only last 50 orders
        if (this.orders.length > 50) {
            this.orders = this.orders.slice(0, 50);
        }

        // Add to recent activity
        this.recentActivity.unshift({
            type: 'order',
            action: `Order ${order.status}`,
            details: `${order.customer} - PKR ${order.total}`,
            timestamp: order.created_at,
            status: order.status === 'completed' ? 'success' : 'pending'
        });

        // Keep only last 20 activities
        if (this.recentActivity.length > 20) {
            this.recentActivity = this.recentActivity.slice(0, 20);
        }

        return order;
    }

    /**
     * Track message (adds to demo data)
     */
    async trackMessage(messageData) {
        const message = {
            id: `MSG${Date.now()}`,
            channel: messageData.channel || 'unknown',
            status: messageData.status || 'sent',
            order_id: messageData.order_id,
            recipient: messageData.recipient,
            created_at: new Date().toISOString()
        };

        this.messages.unshift(message);
        
        // Keep only last 50 messages
        if (this.messages.length > 50) {
            this.messages = this.messages.slice(0, 50);
        }

        // Add to recent activity
        this.recentActivity.unshift({
            type: 'message',
            action: `${message.channel.toUpperCase()} ${message.status}`,
            details: `To: ${message.recipient || 'Unknown'}`,
            timestamp: message.created_at,
            status: message.status === 'delivered' ? 'success' : message.status === 'failed' ? 'error' : 'pending'
        });

        // Keep only last 20 activities
        if (this.recentActivity.length > 20) {
            this.recentActivity = this.recentActivity.slice(0, 20);
        }

        return message;
    }

    /**
     * Get dashboard metrics
     */
    async getDashboardMetrics() {
        const completedOrders = this.orders.filter(o => o.status === 'completed');
        const deliveredMessages = this.messages.filter(m => m.status === 'delivered');
        
        const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
        const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
        
        const summary = {
            totalOrders: this.orders.length,
            totalMessages: this.messages.length,
            deliveryRate: this.messages.length > 0 ? Math.round((deliveredMessages.length / this.messages.length) * 100) : 0,
            successRate: this.orders.length > 0 ? Math.round((completedOrders.length / this.orders.length) * 100) : 0,
            totalRevenue: Math.round(totalRevenue),
            averageOrderValue: Math.round(averageOrderValue)
        };

        return {
            summary,
            orders: {
                total: this.orders.length,
                completed: completedOrders.length,
                pending: this.orders.filter(o => o.status === 'pending').length,
                cancelled: this.orders.filter(o => o.status === 'cancelled').length,
                totalRevenue: Math.round(totalRevenue),
                averageOrderValue: Math.round(averageOrderValue)
            },
            messages: {
                total: this.messages.length,
                whatsapp: this.messages.filter(m => m.channel === 'whatsapp').length,
                email: this.messages.filter(m => m.channel === 'email').length,
                sms: this.messages.filter(m => m.channel === 'sms').length,
                delivered: deliveredMessages.length,
                failed: this.messages.filter(m => m.status === 'failed').length,
                deliveryRate: this.messages.length > 0 ? Math.round((deliveredMessages.length / this.messages.length) * 100) : 0
            },
            performance: {
                successRate: summary.successRate,
                averageProcessingTime: 245, // Mock processing time
                totalProcessed: this.orders.length + this.messages.length,
                errorRate: 5 // Mock error rate
            },
            realtime: {
                recentActivity: this.recentActivity,
                ordersChart: this.generateOrdersChart(),
                messagesChart: this.generateMessagesChart(),
                deliveryChart: this.generateDeliveryChart()
            }
        };
    }

    /**
     * Get analytics report
     */
    async getAnalyticsReport(period = '24h') {
        return this.getDashboardMetrics();
    }

    /**
     * Reset analytics data
     */
    async resetAnalytics() {
        this.orders = [];
        this.messages = [];
        this.recentActivity = [];
        this.initializeDemoData();
        
        return {
            success: true,
            message: 'Analytics data reset successfully',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate orders chart data
     */
    generateOrdersChart() {
        const hours = Array.from({length: 24}, (_, i) => i);
        return {
            labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
            data: hours.map(() => Math.floor(Math.random() * 10) + 1)
        };
    }

    /**
     * Generate messages chart data
     */
    generateMessagesChart() {
        return {
            labels: ['WhatsApp', 'Email', 'SMS'],
            data: [
                this.messages.filter(m => m.channel === 'whatsapp').length || 15,
                this.messages.filter(m => m.channel === 'email').length || 25,
                this.messages.filter(m => m.channel === 'sms').length || 8
            ]
        };
    }

    /**
     * Generate delivery chart data
     */
    generateDeliveryChart() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return {
            labels: days,
            data: days.map(() => Math.floor(Math.random() * 100) + 50)
        };
    }

    /**
     * Get customer name from customer object
     */
    getCustomerName(customer) {
        if (!customer) return null;
        if (customer.first_name && customer.last_name) {
            return `${customer.first_name} ${customer.last_name}`;
        }
        return customer.first_name || customer.last_name || customer.name || null;
    }
}

module.exports = SimpleAnalyticsService;
