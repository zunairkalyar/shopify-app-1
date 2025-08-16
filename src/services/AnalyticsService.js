/**
 * Analytics Service - Order and Message Delivery Metrics
 * 
 * Tracks comprehensive metrics including:
 * - Order processing statistics
 * - Message delivery rates
 * - Performance analytics
 * - Real-time dashboards
 */

const fs = require('fs').promises;
const path = require('path');

class AnalyticsService {
    constructor() {
        this.dataDir = path.join(process.cwd(), 'data');
        this.analyticsFile = path.join(this.dataDir, 'analytics.json');
        this.ordersFile = path.join(this.dataDir, 'orders.json');
        this.messagesFile = path.join(this.dataDir, 'messages.json');
        
        // In-memory cache for real-time metrics
        this.metricsCache = {
            orders: {
                total: 0,
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                byStatus: {
                    created: 0,
                    fulfilled: 0,
                    cancelled: 0
                },
                byPayment: {
                    paid: 0,
                    pending: 0,
                    cod: 0
                },
                totalValue: 0,
                averageValue: 0
            },
            messages: {
                total: 0,
                delivered: 0,
                failed: 0,
                pending: 0,
                byChannel: {
                    whatsapp: { sent: 0, delivered: 0, failed: 0 },
                    email: { sent: 0, delivered: 0, failed: 0 },
                    sms: { sent: 0, delivered: 0, failed: 0 }
                },
                deliveryRate: 0,
                averageDeliveryTime: 0
            },
            performance: {
                avgProcessingTime: 0,
                successRate: 0,
                uptime: 0,
                lastUpdate: null
            },
            realtime: {
                ordersLast24h: [],
                messagesLast24h: [],
                recentActivity: []
            }
        };

        this.initializeAnalytics();
    }

    /**
     * Initialize analytics system
     */
    async initializeAnalytics() {
        try {
            await this.ensureDataDirectory();
            await this.loadAnalyticsData();
            await this.calculateMetrics();
        } catch (error) {
            console.error('Analytics initialization error:', error);
        }
    }

    /**
     * Ensure data directory exists
     */
    async ensureDataDirectory() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load analytics data from storage
     */
    async loadAnalyticsData() {
        try {
            const analyticsData = await fs.readFile(this.analyticsFile, 'utf8');
            const parsedData = JSON.parse(analyticsData);
            this.metricsCache = { ...this.metricsCache, ...parsedData };
        } catch (error) {
            // File doesn't exist or is corrupted, start fresh
            await this.saveAnalyticsData();
        }
    }

    /**
     * Save analytics data to storage
     */
    async saveAnalyticsData() {
        try {
            await fs.writeFile(
                this.analyticsFile,
                JSON.stringify(this.metricsCache, null, 2)
            );
        } catch (error) {
            console.error('Error saving analytics data:', error);
        }
    }

    /**
     * Track new order
     */
    async trackOrder(orderData) {
        try {
            const order = {
                id: orderData.id || `order_${Date.now()}`,
                status: orderData.status || 'created',
                total: parseFloat(orderData.total_price || 0),
                currency: orderData.currency || 'PKR',
                payment_status: orderData.financial_status || 'pending',
                customer: {
                    name: orderData.customer?.first_name + ' ' + orderData.customer?.last_name || 'Unknown',
                    email: orderData.customer?.email || 'N/A',
                    phone: orderData.customer?.phone || 'N/A'
                },
                items_count: orderData.line_items?.length || 0,
                timestamp: new Date().toISOString(),
                processing_time: orderData.processing_time || 0
            };

            // Update metrics
            this.metricsCache.orders.total++;
            this.metricsCache.orders.byStatus[order.status]++;
            this.metricsCache.orders.totalValue += order.total;
            this.metricsCache.orders.averageValue = this.metricsCache.orders.totalValue / this.metricsCache.orders.total;

            // Update payment status
            if (order.payment_status === 'paid') {
                this.metricsCache.orders.byPayment.paid++;
            } else if (order.payment_status === 'pending') {
                this.metricsCache.orders.byPayment.pending++;
            } else {
                this.metricsCache.orders.byPayment.cod++;
            }

            // Update time-based metrics
            await this.updateTimeBasedMetrics('orders', order);

            // Add to recent activity
            this.metricsCache.realtime.recentActivity.unshift({
                type: 'order',
                action: `Order ${order.status}`,
                details: `${order.customer.name} - ${order.currency} ${order.total}`,
                timestamp: order.timestamp
            });

            // Keep only last 50 activities
            this.metricsCache.realtime.recentActivity = 
                this.metricsCache.realtime.recentActivity.slice(0, 50);

            await this.saveOrderData(order);
            await this.saveAnalyticsData();

            return order;
        } catch (error) {
            console.error('Error tracking order:', error);
            throw error;
        }
    }

    /**
     * Track message delivery
     */
    async trackMessage(messageData) {
        try {
            const message = {
                id: messageData.id || `msg_${Date.now()}`,
                channel: messageData.channel || 'unknown', // whatsapp, email, sms
                status: messageData.status || 'pending', // sent, delivered, failed, pending
                order_id: messageData.order_id || null,
                recipient: messageData.recipient || 'N/A',
                content_type: messageData.content_type || 'text',
                timestamp: new Date().toISOString(),
                delivery_time: messageData.delivery_time || null,
                error_message: messageData.error || null
            };

            // Update message metrics
            this.metricsCache.messages.total++;
            
            if (message.status === 'delivered') {
                this.metricsCache.messages.delivered++;
                this.metricsCache.messages.byChannel[message.channel].delivered++;
            } else if (message.status === 'failed') {
                this.metricsCache.messages.failed++;
                this.metricsCache.messages.byChannel[message.channel].failed++;
            } else if (message.status === 'sent') {
                this.metricsCache.messages.byChannel[message.channel].sent++;
            }

            // Calculate delivery rate
            this.metricsCache.messages.deliveryRate = 
                (this.metricsCache.messages.delivered / this.metricsCache.messages.total * 100).toFixed(2);

            // Update average delivery time
            if (message.delivery_time) {
                this.metricsCache.messages.averageDeliveryTime = 
                    ((this.metricsCache.messages.averageDeliveryTime + message.delivery_time) / 2).toFixed(2);
            }

            // Update time-based metrics
            await this.updateTimeBasedMetrics('messages', message);

            // Add to recent activity
            this.metricsCache.realtime.recentActivity.unshift({
                type: 'message',
                action: `${message.channel.toUpperCase()} ${message.status}`,
                details: `To: ${message.recipient}`,
                timestamp: message.timestamp,
                status: message.status
            });

            // Keep only last 50 activities
            this.metricsCache.realtime.recentActivity = 
                this.metricsCache.realtime.recentActivity.slice(0, 50);

            await this.saveMessageData(message);
            await this.saveAnalyticsData();

            return message;
        } catch (error) {
            console.error('Error tracking message:', error);
            throw error;
        }
    }

    /**
     * Update time-based metrics
     */
    async updateTimeBasedMetrics(type, data) {
        const now = new Date();
        const timestamp = new Date(data.timestamp);
        
        // Today
        if (this.isToday(timestamp)) {
            if (type === 'orders') {
                this.metricsCache.orders.today++;
            }
        }

        // This week
        if (this.isThisWeek(timestamp)) {
            if (type === 'orders') {
                this.metricsCache.orders.thisWeek++;
            }
        }

        // This month
        if (this.isThisMonth(timestamp)) {
            if (type === 'orders') {
                this.metricsCache.orders.thisMonth++;
            }
        }

        // Last 24 hours data for charts
        const last24h = this.metricsCache.realtime[`${type}Last24h`];
        last24h.push({
            timestamp: timestamp.toISOString(),
            value: type === 'orders' ? data.total : 1
        });

        // Keep only last 24 hours
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        this.metricsCache.realtime[`${type}Last24h`] = last24h.filter(
            item => new Date(item.timestamp) > cutoff
        );
    }

    /**
     * Get comprehensive dashboard metrics
     */
    async getDashboardMetrics() {
        await this.calculateMetrics();
        
        return {
            summary: {
                totalOrders: this.metricsCache.orders.total,
                totalMessages: this.metricsCache.messages.total,
                deliveryRate: parseFloat(this.metricsCache.messages.deliveryRate),
                successRate: parseFloat(this.metricsCache.performance.successRate),
                totalRevenue: this.metricsCache.orders.totalValue,
                averageOrderValue: parseFloat(this.metricsCache.orders.averageValue.toFixed(2))
            },
            orders: {
                total: this.metricsCache.orders.total,
                today: this.metricsCache.orders.today,
                thisWeek: this.metricsCache.orders.thisWeek,
                thisMonth: this.metricsCache.orders.thisMonth,
                byStatus: this.metricsCache.orders.byStatus,
                byPayment: this.metricsCache.orders.byPayment,
                totalValue: this.metricsCache.orders.totalValue,
                averageValue: this.metricsCache.orders.averageValue
            },
            messages: {
                total: this.metricsCache.messages.total,
                delivered: this.metricsCache.messages.delivered,
                failed: this.metricsCache.messages.failed,
                pending: this.metricsCache.messages.pending,
                byChannel: this.metricsCache.messages.byChannel,
                deliveryRate: parseFloat(this.metricsCache.messages.deliveryRate),
                averageDeliveryTime: parseFloat(this.metricsCache.messages.averageDeliveryTime)
            },
            performance: {
                avgProcessingTime: this.metricsCache.performance.avgProcessingTime,
                successRate: parseFloat(this.metricsCache.performance.successRate),
                uptime: this.calculateUptime()
            },
            realtime: {
                recentActivity: this.metricsCache.realtime.recentActivity.slice(0, 20),
                ordersChart: this.generateChartData('orders'),
                messagesChart: this.generateChartData('messages'),
                deliveryChart: this.generateDeliveryChart()
            }
        };
    }

    /**
     * Generate chart data for orders/messages over time
     */
    generateChartData(type) {
        const data = this.metricsCache.realtime[`${type}Last24h`];
        const hours = {};
        
        // Initialize 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
            hours[hour] = 0;
        }

        // Fill with actual data
        data.forEach(item => {
            const hour = new Date(item.timestamp).getHours();
            hours[hour] += type === 'orders' ? item.value : 1;
        });

        return Object.keys(hours).map(hour => ({
            hour: `${hour}:00`,
            value: hours[hour]
        }));
    }

    /**
     * Generate delivery success chart
     */
    generateDeliveryChart() {
        return {
            delivered: this.metricsCache.messages.delivered,
            failed: this.metricsCache.messages.failed,
            pending: this.metricsCache.messages.pending
        };
    }

    /**
     * Calculate overall metrics
     */
    async calculateMetrics() {
        // Calculate success rate
        const totalProcessed = this.metricsCache.orders.total;
        const successful = totalProcessed - this.metricsCache.messages.failed;
        this.metricsCache.performance.successRate = totalProcessed > 0 
            ? (successful / totalProcessed * 100).toFixed(2)
            : 100;

        // Update last calculation time
        this.metricsCache.performance.lastUpdate = new Date().toISOString();
    }

    /**
     * Save order data
     */
    async saveOrderData(order) {
        try {
            let orders = [];
            try {
                const ordersData = await fs.readFile(this.ordersFile, 'utf8');
                orders = JSON.parse(ordersData);
            } catch {
                // File doesn't exist, start with empty array
            }

            orders.push(order);
            
            // Keep only last 1000 orders
            if (orders.length > 1000) {
                orders = orders.slice(-1000);
            }

            await fs.writeFile(this.ordersFile, JSON.stringify(orders, null, 2));
        } catch (error) {
            console.error('Error saving order data:', error);
        }
    }

    /**
     * Save message data
     */
    async saveMessageData(message) {
        try {
            let messages = [];
            try {
                const messagesData = await fs.readFile(this.messagesFile, 'utf8');
                messages = JSON.parse(messagesData);
            } catch {
                // File doesn't exist, start with empty array
            }

            messages.push(message);
            
            // Keep only last 1000 messages
            if (messages.length > 1000) {
                messages = messages.slice(-1000);
            }

            await fs.writeFile(this.messagesFile, JSON.stringify(messages, null, 2));
        } catch (error) {
            console.error('Error saving message data:', error);
        }
    }

    /**
     * Utility functions for date checking
     */
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isThisWeek(date) {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return date >= weekStart;
    }

    isThisMonth(date) {
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }

    calculateUptime() {
        // Simple uptime calculation (can be enhanced with actual server start time)
        const now = new Date();
        const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Assume 24h uptime
        const uptimeMs = now.getTime() - startTime.getTime();
        const uptimeHours = (uptimeMs / (1000 * 60 * 60)).toFixed(2);
        return `${uptimeHours} hours`;
    }

    /**
     * Get detailed analytics report
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
        this.metricsCache = {
            orders: {
                total: 0, today: 0, thisWeek: 0, thisMonth: 0,
                byStatus: { created: 0, fulfilled: 0, cancelled: 0 },
                byPayment: { paid: 0, pending: 0, cod: 0 },
                totalValue: 0, averageValue: 0
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
                avgProcessingTime: 0, successRate: 0, uptime: 0, lastUpdate: null
            },
            realtime: {
                ordersLast24h: [], messagesLast24h: [], recentActivity: []
            }
        };

        await this.saveAnalyticsData();
        return { success: true, message: 'Analytics data reset successfully' };
    }
}

module.exports = AnalyticsService;
