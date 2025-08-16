/**
 * Analytics Dashboard JavaScript
 * 
 * Handles real-time data visualization, chart rendering,
 * and interactive dashboard features for webhook analytics
 */

class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.lastUpdate = null;
        this.isAutoRefreshEnabled = true;
        this.refreshRate = 30000; // 30 seconds
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Analytics Dashboard...');
        
        try {
            // Check server status
            await this.checkServerStatus();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Initialize charts
            this.initializeCharts();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            // Bind event listeners
            this.bindEvents();
            
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    async checkServerStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            
            if (response.ok && data.status === 'healthy') {
                statusIndicator.style.backgroundColor = '#4CAF50';
                statusText.textContent = 'Real-time Order Processing & Message Delivery Analytics';
            } else {
                statusIndicator.style.backgroundColor = '#ff9800';
                statusText.textContent = 'System Status: ' + (data.status || 'Unknown');
            }
        } catch (error) {
            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            statusIndicator.style.backgroundColor = '#f44336';
            statusText.textContent = 'Server Connection Error';
        }
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard metrics...');
            
            // Fetch analytics data
            const analyticsResponse = await fetch('/api/analytics/dashboard');
            if (!analyticsResponse.ok) {
                throw new Error(`Analytics API error: ${analyticsResponse.status}`);
            }
            
            const analytics = await analyticsResponse.json();
            console.log('📈 Analytics data loaded:', analytics);
            
            // Update summary cards
            this.updateSummaryCards(analytics.summary);
            
            // Update order metrics
            this.updateOrderMetrics(analytics.orders);
            
            // Update message metrics
            this.updateMessageMetrics(analytics.messages);
            
            // Update channel performance
            this.updateChannelPerformance(analytics.messages.byChannel);
            
            // Update activity feed
            this.updateActivityFeed(analytics.realtime.recentActivity);
            
            // Update charts
            this.updateCharts(analytics.realtime);
            
            this.lastUpdate = new Date();
            console.log('✅ Dashboard data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
        }
    }

    updateSummaryCards(summary) {
        // Update summary card values
        document.getElementById('totalOrders').textContent = this.formatNumber(summary.totalOrders || 0);
        document.getElementById('totalMessages').textContent = this.formatNumber(summary.totalMessages || 0);
        document.getElementById('deliveryRate').textContent = `${summary.deliveryRate || 0}%`;
        document.getElementById('totalRevenue').textContent = `PKR ${this.formatNumber(summary.totalRevenue || 0)}`;
        document.getElementById('avgOrderValue').textContent = `PKR ${this.formatNumber(summary.averageOrderValue || 0)}`;
        document.getElementById('successRate').textContent = `${summary.successRate || 0}%`;
        
        // Update change indicators (mock data for now)
        this.updateChangeIndicator('ordersChange', '+12%', true);
        this.updateChangeIndicator('messagesChange', '+8%', true);
        this.updateChangeIndicator('deliveryChange', '+3%', true);
        this.updateChangeIndicator('revenueChange', '+25%', true);
        this.updateChangeIndicator('aovChange', '+5%', true);
        this.updateChangeIndicator('successChange', '+2%', true);
    }

    updateChangeIndicator(elementId, change, isPositive) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `${change} from last week`;
            element.className = `change ${isPositive ? 'positive' : 'negative'}`;
        }
    }

    updateOrderMetrics(orders) {
        document.getElementById('ordersToday').textContent = orders.today || 0;
        document.getElementById('ordersWeek').textContent = orders.thisWeek || 0;
        document.getElementById('ordersMonth').textContent = orders.thisMonth || 0;
        document.getElementById('ordersCreated').textContent = orders.byStatus?.created || 0;
        document.getElementById('ordersFulfilled').textContent = orders.byStatus?.fulfilled || 0;
        document.getElementById('ordersCancelled').textContent = orders.byStatus?.cancelled || 0;
    }

    updateMessageMetrics(messages) {
        // Already handled in summary cards, but could add more detailed metrics here
    }

    updateChannelPerformance(channels) {
        document.getElementById('whatsappDelivered').textContent = channels?.whatsapp?.delivered || 0;
        document.getElementById('emailDelivered').textContent = channels?.email?.delivered || 0;
        document.getElementById('smsDelivered').textContent = channels?.sms?.delivered || 0;
    }

    updateActivityFeed(activities) {
        const feedContainer = document.getElementById('activityFeed');
        
        if (!activities || activities.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <p>🔍 No recent activity</p>
                    <p style="font-size: 0.9em; margin-top: 10px; color: #999;">Activity will appear here when orders are processed</p>
                </div>
            `;
            return;
        }

        const activityHTML = activities.map(activity => {
            const iconClass = this.getActivityIconClass(activity.type);
            const timeAgo = this.getTimeAgo(activity.timestamp);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">
                        ${this.getActivityIcon(activity.type)}
                    </div>
                    <div class="activity-info">
                        <h4>${activity.action}</h4>
                        <p>${activity.details}</p>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        feedContainer.innerHTML = activityHTML;
    }

    getActivityIconClass(type) {
        switch (type) {
            case 'order': return 'order';
            case 'message': return 'message';
            case 'error': return 'error';
            default: return 'order';
        }
    }

    getActivityIcon(type) {
        switch (type) {
            case 'order': return '📦';
            case 'message': return '💬';
            case 'error': return '❌';
            default: return '📦';
        }
    }

    initializeCharts() {
        // Initialize Orders Chart
        const ordersCtx = document.getElementById('ordersChart').getContext('2d');
        this.charts.orders = new Chart(ordersCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Orders',
                    data: [],
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            borderDash: [5, 5]
                        }
                    }
                }
            }
        });

        // Initialize Delivery Chart (Doughnut)
        const deliveryCtx = document.getElementById('deliveryChart').getContext('2d');
        this.charts.delivery = new Chart(deliveryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Delivered', 'Failed', 'Pending'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#4CAF50',
                        '#f44336',
                        '#ff9800'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateCharts(realtime) {
        // Update Orders Chart
        if (this.charts.orders && realtime.ordersChart) {
            const labels = realtime.ordersChart.map(item => item.hour);
            const data = realtime.ordersChart.map(item => item.value);
            
            this.charts.orders.data.labels = labels;
            this.charts.orders.data.datasets[0].data = data;
            this.charts.orders.update();
        }

        // Update Delivery Chart
        if (this.charts.delivery && realtime.deliveryChart) {
            const { delivered, failed, pending } = realtime.deliveryChart;
            this.charts.delivery.data.datasets[0].data = [delivered, failed, pending];
            this.charts.delivery.update();
        }
    }

    startAutoRefresh() {
        if (this.isAutoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                this.loadDashboardData();
            }, this.refreshRate);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    bindEvents() {
        // Handle visibility change for auto-refresh
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else {
                this.startAutoRefresh();
            }
        });

        // Handle window focus for refresh
        window.addEventListener('focus', () => {
            this.loadDashboardData();
        });
    }

    showError(message) {
        const errorHtml = `
            <div style="background: #f44336; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>❌ Error:</strong> ${message}
                <button onclick="location.reload()" style="float: right; background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    🔄 Retry
                </button>
            </div>
        `;
        
        // Show error in activity feed or create error container
        const container = document.getElementById('activityFeed') || document.querySelector('.container');
        container.innerHTML = errorHtml;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }
}

// Global functions for button actions
async function sendTestWebhook() {
    try {
        const response = await fetch('/api/test-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhookType: 'orders/create' })
        });

        if (response.ok) {
            showNotification('🧪 Test webhook sent successfully!', 'success');
            // Refresh dashboard after test
            setTimeout(() => dashboard.loadDashboardData(), 2000);
        } else {
            showNotification('❌ Test webhook failed', 'error');
        }
    } catch (error) {
        showNotification('❌ Error sending test webhook: ' + error.message, 'error');
    }
}

function showWebhookUrls() {
    const currentHost = window.location.origin;
    const urls = [
        `${currentHost}/api/webhooks/order-create`,
        `${currentHost}/api/webhooks/order-fulfilled`,
        `${currentHost}/api/webhooks/order-cancelled`
    ];

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%;">
            <h2 style="margin-bottom: 20px; color: #333;">🔗 Webhook URLs</h2>
            <p style="margin-bottom: 20px; color: #666;">Use these URLs in your Shopify webhook settings:</p>
            ${urls.map((url, index) => `
                <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                    <strong>${['Order Created', 'Order Fulfilled', 'Order Cancelled'][index]}:</strong><br>
                    <code style="font-size: 0.9em; word-break: break-all;">${url}</code>
                    <button onclick="navigator.clipboard.writeText('${url}')" style="float: right; padding: 5px 10px; border: none; background: #667eea; color: white; border-radius: 4px; cursor: pointer;">
                        📋 Copy
                    </button>
                </div>
            `).join('')}
            <button onclick="document.body.removeChild(this.closest('div'))" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                ✅ Close
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

function manageTemplates() {
    showNotification('📝 Template management feature coming soon!', 'info');
}

async function exportAnalytics() {
    try {
        const response = await fetch('/api/analytics/report');
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('📊 Analytics data exported successfully!', 'success');
    } catch (error) {
        showNotification('❌ Export failed: ' + error.message, 'error');
    }
}

function refreshCharts() {
    dashboard.loadDashboardData();
    showNotification('🔄 Dashboard refreshed!', 'info');
}

function refreshActivity() {
    dashboard.loadDashboardData();
    showNotification('🔄 Activity feed refreshed!', 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px 20px;
        border-radius: 8px; color: white; z-index: 1001; max-width: 300px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 4000);
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new AnalyticsDashboard();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsDashboard;
}
