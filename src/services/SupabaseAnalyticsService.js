/**
 * Supabase Analytics Service - Database-powered analytics
 * 
 * Uses Supabase database for persistent storage and real-time analytics
 * Tracks comprehensive metrics including:
 * - Order processing statistics
 * - Message delivery rates
 * - Performance analytics
 * - Real-time dashboards
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseAnalyticsService {
    constructor() {
        this.supabase = null;
        this.isEnabled = process.env.ENABLE_DATABASE === 'true';
        
        // Initialize Supabase client if enabled
        if (this.isEnabled && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            this.supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
        }
        
        // In-memory cache for performance
        this.metricsCache = {
            lastUpdate: null,
            summary: null,
            realtime: {
                recentActivity: []
            }
        };
    }

    /**
     * Check if database is available
     */
    isDatabaseEnabled() {
        return this.isEnabled && this.supabase !== null;
    }

    /**
     * Track new order in database
     */
    async trackOrder(orderData) {
        try {
            const orderRecord = {
                order_id: orderData.id || orderData.name || `order_${Date.now()}`,
                order_number: orderData.order_number || orderData.number,
                status: orderData.status || 'created',
                customer_name: this.getCustomerName(orderData.customer),
                customer_email: orderData.customer?.email,
                customer_phone: orderData.customer?.phone,
                total_price: parseFloat(orderData.total_price || 0),
                currency: orderData.currency || 'PKR',
                payment_status: orderData.financial_status || 'pending',
                items_count: orderData.line_items?.length || 0,
                processing_time_ms: orderData.processing_time || 0,
                webhook_data: orderData
            };

            if (this.isDatabaseEnabled()) {
                // Store in Supabase
                const { data, error } = await this.supabase
                    .from('webhook_orders')
                    .insert([orderRecord])
                    .select();

                if (error) {
                    console.error('Supabase order tracking error:', error);
                }
            }

            // Add to recent activity cache
            this.addToRecentActivity({
                type: 'order',
                action: `Order ${orderRecord.status}`,
                details: `${orderRecord.customer_name || 'Unknown'} - ${orderRecord.currency} ${orderRecord.total_price}`,
                timestamp: new Date().toISOString()
            });

            return orderRecord;
        } catch (error) {
            console.error('Error tracking order:', error);
            throw error;
        }
    }

    /**
     * Track message delivery in database
     */
    async trackMessage(messageData) {
        try {
            const messageRecord = {
                order_id: messageData.order_id,
                channel: messageData.channel || 'unknown',
                status: messageData.status || 'pending',
                recipient: messageData.recipient,
                content_type: messageData.content_type || 'text',
                delivery_time_ms: messageData.delivery_time,
                error_message: messageData.error,
                message_data: messageData
            };

            if (this.isDatabaseEnabled()) {
                // Store in Supabase
                const { data, error } = await this.supabase
                    .from('webhook_messages')
                    .insert([messageRecord])
                    .select();

                if (error) {
                    console.error('Supabase message tracking error:', error);
                }
            }

            // Add to recent activity cache
            this.addToRecentActivity({
                type: 'message',
                action: `${messageRecord.channel.toUpperCase()} ${messageRecord.status}`,
                details: `To: ${messageRecord.recipient}`,
                timestamp: new Date().toISOString(),
                status: messageRecord.status
            });

            return messageRecord;
        } catch (error) {
            console.error('Error tracking message:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive dashboard metrics
     */
    async getDashboardMetrics() {
        try {
            if (!this.isDatabaseEnabled()) {
                return this.getMockMetrics();
            }

            // Calculate orders metrics
            const ordersMetrics = await this.getOrdersMetrics();
            const messagesMetrics = await this.getMessagesMetrics();
            const performanceMetrics = await this.getPerformanceMetrics();
            const realtimeData = await this.getRealtimeData();

            const summary = {
                totalOrders: ordersMetrics.total,
                totalMessages: messagesMetrics.total,
                deliveryRate: messagesMetrics.deliveryRate,
                successRate: performanceMetrics.successRate,
                totalRevenue: ordersMetrics.totalRevenue,
                averageOrderValue: ordersMetrics.averageOrderValue
            };

            return {
                summary,
                orders: ordersMetrics,
                messages: messagesMetrics,
                performance: performanceMetrics,
                realtime: {
                    recentActivity: this.metricsCache.realtime.recentActivity.slice(0, 20),
                    ordersChart: realtimeData.ordersChart,
                    messagesChart: realtimeData.messagesChart,
                    deliveryChart: realtimeData.deliveryChart
                }
            };
        } catch (error) {
            console.error('Error getting dashboard metrics:', error);
            return this.getMockMetrics();
        }
    }

    /**
     * Get orders metrics from database
     */
    async getOrdersMetrics() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            // Get total orders
            const { count: totalOrders } = await this.supabase
                .from('webhook_orders')
                .select('*', { count: 'exact', head: true });

            // Get today's orders
            const { count: todayOrders } = await this.supabase
                .from('webhook_orders')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today);

            // Get this week's orders
            const { count: weekOrders } = await this.supabase
                .from('webhook_orders')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', weekAgo);

            // Get this month's orders
            const { count: monthOrders } = await this.supabase
                .from('webhook_orders')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', monthAgo);

            // Get orders by status
            const { data: statusData } = await this.supabase
                .from('webhook_orders')
                .select('status')
                .order('created_at', { ascending: false });

            // Get total revenue and average
            const { data: revenueData } = await this.supabase
                .from('webhook_orders')
                .select('total_price');

            const byStatus = {
                created: 0,
                fulfilled: 0,
                cancelled: 0
            };

            statusData?.forEach(order => {
                if (byStatus.hasOwnProperty(order.status)) {
                    byStatus[order.status]++;
                }
            });

            const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            return {
                total: totalOrders || 0,
                today: todayOrders || 0,
                thisWeek: weekOrders || 0,
                thisMonth: monthOrders || 0,
                byStatus,
                totalRevenue,
                averageOrderValue,
                byPayment: { paid: 0, pending: 0, cod: 0 } // Mock data for now
            };
        } catch (error) {
            console.error('Error getting orders metrics:', error);
            return {
                total: 0, today: 0, thisWeek: 0, thisMonth: 0,
                byStatus: { created: 0, fulfilled: 0, cancelled: 0 },
                byPayment: { paid: 0, pending: 0, cod: 0 },
                totalRevenue: 0, averageOrderValue: 0
            };
        }
    }

    /**
     * Get messages metrics from database
     */
    async getMessagesMetrics() {
        try {
            // Get total messages
            const { count: totalMessages } = await this.supabase
                .from('webhook_messages')
                .select('*', { count: 'exact', head: true });

            // Get messages by status
            const { data: statusData } = await this.supabase
                .from('webhook_messages')
                .select('status, channel');

            const delivered = statusData?.filter(m => m.status === 'delivered').length || 0;
            const failed = statusData?.filter(m => m.status === 'failed').length || 0;
            const sent = statusData?.filter(m => m.status === 'sent').length || 0;
            const pending = statusData?.filter(m => m.status === 'pending').length || 0;

            // Channel breakdown
            const byChannel = {
                whatsapp: { sent: 0, delivered: 0, failed: 0 },
                email: { sent: 0, delivered: 0, failed: 0 },
                sms: { sent: 0, delivered: 0, failed: 0 }
            };

            statusData?.forEach(message => {
                if (byChannel[message.channel]) {
                    if (message.status === 'delivered') byChannel[message.channel].delivered++;
                    else if (message.status === 'failed') byChannel[message.channel].failed++;
                    else if (message.status === 'sent') byChannel[message.channel].sent++;
                }
            });

            const deliveryRate = totalMessages > 0 ? ((delivered / totalMessages) * 100).toFixed(2) : 0;

            return {
                total: totalMessages || 0,
                delivered,
                failed,
                pending,
                byChannel,
                deliveryRate: parseFloat(deliveryRate),
                averageDeliveryTime: 0 // Mock data for now
            };
        } catch (error) {
            console.error('Error getting messages metrics:', error);
            return {
                total: 0, delivered: 0, failed: 0, pending: 0,
                byChannel: {
                    whatsapp: { sent: 0, delivered: 0, failed: 0 },
                    email: { sent: 0, delivered: 0, failed: 0 },
                    sms: { sent: 0, delivered: 0, failed: 0 }
                },
                deliveryRate: 0, averageDeliveryTime: 0
            };
        }
    }

    /**
     * Get performance metrics
     */
    async getPerformanceMetrics() {
        try {
            const { count: totalProcessed } = await this.supabase
                .from('webhook_orders')
                .select('*', { count: 'exact', head: true });

            const { count: failedMessages } = await this.supabase
                .from('webhook_messages')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'failed');

            const successRate = totalProcessed > 0 
                ? (((totalProcessed - (failedMessages || 0)) / totalProcessed) * 100).toFixed(2)
                : 100;

            return {
                avgProcessingTime: 0, // Mock data
                successRate: parseFloat(successRate),
                uptime: this.calculateUptime()
            };
        } catch (error) {
            console.error('Error getting performance metrics:', error);
            return {
                avgProcessingTime: 0,
                successRate: 100,
                uptime: this.calculateUptime()
            };
        }
    }

    /**
     * Get realtime chart data
     */
    async getRealtimeData() {
        try {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // Orders in last 24h
            const { data: ordersData } = await this.supabase
                .from('webhook_orders')
                .select('created_at, total_price')
                .gte('created_at', last24h)
                .order('created_at', { ascending: true });

            // Messages in last 24h
            const { data: messagesData } = await this.supabase
                .from('webhook_messages')
                .select('created_at, status')
                .gte('created_at', last24h)
                .order('created_at', { ascending: true });

            // Generate hourly chart data
            const ordersChart = this.generateHourlyChartData(ordersData || [], 'orders');
            const messagesChart = this.generateHourlyChartData(messagesData || [], 'messages');

            // Delivery success chart
            const deliveredCount = messagesData?.filter(m => m.status === 'delivered').length || 0;
            const failedCount = messagesData?.filter(m => m.status === 'failed').length || 0;
            const pendingCount = messagesData?.filter(m => m.status === 'pending').length || 0;

            return {
                ordersChart,
                messagesChart,
                deliveryChart: {
                    delivered: deliveredCount,
                    failed: failedCount,
                    pending: pendingCount
                }
            };
        } catch (error) {
            console.error('Error getting realtime data:', error);
            return {
                ordersChart: this.generateEmptyHourlyChart(),
                messagesChart: this.generateEmptyHourlyChart(),
                deliveryChart: { delivered: 0, failed: 0, pending: 0 }
            };
        }
    }

    /**
     * Generate hourly chart data
     */
    generateHourlyChartData(data, type) {
        const hours = {};
        
        // Initialize 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
            hours[hour] = 0;
        }

        // Fill with actual data
        data.forEach(item => {
            const hour = new Date(item.created_at).getHours();
            if (hours.hasOwnProperty(hour)) {
                hours[hour]++;
            }
        });

        return Object.keys(hours).sort((a, b) => a - b).map(hour => ({
            hour: `${hour}:00`,
            value: hours[hour]
        }));
    }

    /**
     * Generate empty hourly chart
     */
    generateEmptyHourlyChart() {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push({ hour: `${i}:00`, value: 0 });
        }
        return hours;
    }

    /**
     * Add to recent activity cache
     */
    addToRecentActivity(activity) {
        this.metricsCache.realtime.recentActivity.unshift(activity);
        
        // Keep only last 50 activities
        if (this.metricsCache.realtime.recentActivity.length > 50) {
            this.metricsCache.realtime.recentActivity = 
                this.metricsCache.realtime.recentActivity.slice(0, 50);
        }
    }

    /**
     * Get analytics report
     */
    async getAnalyticsReport(period = '24h') {
        const metrics = await this.getDashboardMetrics();
        
        return {
            period,
            generated_at: new Date().toISOString(),
            summary: metrics.summary,
            detailed_metrics: {
                orders: metrics.orders,
                messages: metrics.messages,
                performance: metrics.performance
            },
            charts: {
                orders_timeline: metrics.realtime.ordersChart,
                messages_timeline: metrics.realtime.messagesChart,
                delivery_success: metrics.realtime.deliveryChart
            },
            recent_activity: metrics.realtime.recentActivity
        };
    }

    /**
     * Reset analytics data (for testing)
     */
    async resetAnalytics() {
        try {
            if (this.isDatabaseEnabled()) {
                // Clear all tables
                await this.supabase.from('webhook_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                await this.supabase.from('webhook_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                await this.supabase.from('webhook_analytics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }

            // Clear cache
            this.metricsCache.realtime.recentActivity = [];
            this.metricsCache.summary = null;
            this.metricsCache.lastUpdate = null;

            return { success: true, message: 'Analytics data reset successfully' };
        } catch (error) {
            console.error('Error resetting analytics:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Helper function to get customer name
     */
    getCustomerName(customer) {
        if (!customer) return 'Unknown';
        const firstName = customer.first_name || '';
        const lastName = customer.last_name || '';
        return `${firstName} ${lastName}`.trim() || 'Unknown';
    }

    /**
     * Calculate uptime
     */
    calculateUptime() {
        const now = new Date();
        const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const uptimeHours = ((now - startTime) / (1000 * 60 * 60)).toFixed(2);
        return `${uptimeHours} hours`;
    }

    /**
     * Return mock metrics when database is disabled
     */
    getMockMetrics() {
        return {
            summary: {
                totalOrders: 0,
                totalMessages: 0,
                deliveryRate: 0,
                successRate: 100,
                totalRevenue: 0,
                averageOrderValue: 0
            },
            orders: {
                total: 0, today: 0, thisWeek: 0, thisMonth: 0,
                byStatus: { created: 0, fulfilled: 0, cancelled: 0 },
                byPayment: { paid: 0, pending: 0, cod: 0 },
                totalRevenue: 0, averageOrderValue: 0
            },
            messages: {
                total: 0, delivered: 0, failed: 0, pending: 0,
                byChannel: {
                    whatsapp: { sent: 0, delivered: 0, failed: 0 },
                    email: { sent: 0, delivered: 0, failed: 0 },
                    sms: { sent: 0, delivered: 0, failed: 0 }
                },
                deliveryRate: 0, averageDeliveryTime: 0
            },
            performance: {
                avgProcessingTime: 0,
                successRate: 100,
                uptime: this.calculateUptime()
            },
            realtime: {
                recentActivity: this.metricsCache.realtime.recentActivity.slice(0, 20),
                ordersChart: this.generateEmptyHourlyChart(),
                messagesChart: this.generateEmptyHourlyChart(),
                deliveryChart: { delivered: 0, failed: 0, pending: 0 }
            }
        };
    }
}

module.exports = SupabaseAnalyticsService;
