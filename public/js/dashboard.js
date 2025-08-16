/**
 * Dashboard JavaScript for Webhook System
 * Handles UI interactions, API calls, and real-time updates
 */

class WebhookDashboard {
    constructor() {
        this.apiBase = '/api';
        this.refreshInterval = 30000; // 30 seconds
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Webhook Dashboard');
        
        // Initialize components
        this.checkServerStatus();
        this.loadStats();
        this.loadRecentWebhooks();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Dashboard initialized successfully');
    }

    /**
     * Check server health status
     */
    async checkServerStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.updateServerStatus(true, `Server running (${data.webhooksStored} webhooks stored)`);
            } else {
                this.updateServerStatus(false, 'Server unhealthy');
            }
        } catch (error) {
            this.updateServerStatus(false, 'Server offline');
            console.error('Server status check failed:', error);
        }
    }

    /**
     * Update server status indicator
     */
    updateServerStatus(isHealthy, message) {
        const statusEl = document.getElementById('serverStatus');
        if (!statusEl) return;

        const dotEl = statusEl.querySelector('.status-dot');
        const spanEl = statusEl.querySelector('span');

        if (isHealthy) {
            statusEl.className = 'status-indicator';
            statusEl.style.background = 'rgba(34, 197, 94, 0.1)';
            statusEl.style.borderColor = 'rgba(34, 197, 94, 0.2)';
            statusEl.style.color = '#166534';
            if (dotEl) dotEl.style.background = '#22c55e';
        } else {
            statusEl.style.background = 'rgba(239, 68, 68, 0.1)';
            statusEl.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            statusEl.style.color = '#991b1b';
            if (dotEl) dotEl.style.background = '#ef4444';
        }

        if (spanEl) spanEl.textContent = message;
    }

    /**
     * Load webhook statistics
     */
    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (data.success) {
                this.updateStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
            this.updateStats({
                total_received: 0,
                successful_processed: 0,
                failed_processed: 0
            });
        }
    }

    /**
     * Update statistics display
     */
    updateStats(stats) {
        const totalEl = document.getElementById('totalWebhooks');
        const successRateEl = document.getElementById('successRate');

        if (totalEl) {
            totalEl.textContent = stats.total_received || 0;
        }

        if (successRateEl) {
            const total = stats.total_received || 0;
            const successful = stats.successful_processed || 0;
            const rate = total > 0 ? Math.round((successful / total) * 100) : 100;
            successRateEl.textContent = `${rate}%`;
        }
    }

    /**
     * Load recent webhooks
     */
    async loadRecentWebhooks() {
        const webhookListEl = document.getElementById('webhookList');
        if (!webhookListEl) return;

        try {
            const response = await fetch(`${this.apiBase}/webhooks`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (data.success) {
                this.displayWebhooks(data.webhooks);
            } else {
                throw new Error(data.error || 'Failed to load webhooks');
            }
        } catch (error) {
            console.error('Failed to load webhooks:', error);
            webhookListEl.innerHTML = `
                <div class="loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load webhooks: ${error.message}
                </div>`;
        }
    }

    /**
     * Display webhooks list
     */
    displayWebhooks(webhooks) {
        const webhookListEl = document.getElementById('webhookList');
        if (!webhookListEl) return;

        if (!webhooks || webhooks.length === 0) {
            webhookListEl.innerHTML = `
                <div class="loading">
                    <i class="fas fa-inbox"></i>
                    No webhooks received yet
                </div>`;
            return;
        }

        const webhookItems = webhooks
            .slice(-10) // Show last 10 webhooks
            .reverse()  // Most recent first
            .map(webhook => this.createWebhookItem(webhook))
            .join('');

        webhookListEl.innerHTML = webhookItems;
    }

    /**
     * Create webhook item HTML
     */
    createWebhookItem(webhook) {
        const timestamp = new Date(webhook.received_at).toLocaleString();
        const statusClass = webhook.status === 'processed' ? 'status-success' : 'status-error';
        const statusText = webhook.status === 'processed' ? 'Success' : 'Failed';
        
        const summary = webhook.summary || {};
        const orderInfo = summary.order_id ? `Order ${summary.order_id}` : 'Unknown Order';
        const customerInfo = summary.customer ? ` - ${summary.customer}` : '';
        const totalInfo = summary.total ? ` (${summary.total})` : '';

        return `
            <div class="webhook-item">
                <div class="webhook-details">
                    <h4>${orderInfo}${customerInfo}</h4>
                    <p>${webhook.webhook_type || 'Unknown Type'} • ${timestamp}${totalInfo}</p>
                </div>
                <div>
                    <span class="webhook-status ${statusClass}">${statusText}</span>
                </div>
            </div>`;
    }

    /**
     * Start auto-refresh interval
     */
    startAutoRefresh() {
        setInterval(() => {
            this.checkServerStatus();
            this.loadStats();
            this.loadRecentWebhooks();
        }, this.refreshInterval);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Modal close on outside click
        window.onclick = (event) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        };

        // Escape key to close modals
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    }

    /**
     * Show webhook URLs modal
     */
    showWebhookUrls() {
        const modal = document.getElementById('webhookUrlsModal');
        if (modal) modal.style.display = 'block';
    }

    /**
     * Show test webhook modal
     */
    showTestWebhook() {
        const modal = document.getElementById('testWebhookModal');
        if (modal) modal.style.display = 'block';
    }

    /**
     * Show templates modal
     */
    async showTemplates() {
        const modal = document.getElementById('templateModal');
        if (modal) {
            modal.style.display = 'block';
            await this.loadTemplatePreview('whatsapp');
        }
    }

    /**
     * Show settings modal
     */
    showSettings() {
        alert('Settings panel coming soon! 🔧\n\nFor now, you can configure the system using environment variables or modify the config in app.js');
    }

    /**
     * Load template preview
     */
    async loadTemplatePreview(format) {
        const templateEl = document.getElementById(`${format}Template`);
        if (!templateEl) return;

        templateEl.textContent = 'Loading...';

        try {
            const response = await fetch(`${this.apiBase}/templates/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventType: 'order_created',
                    format: format,
                    templateType: 'message'
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (data.success) {
                templateEl.textContent = typeof data.preview.data === 'string' 
                    ? data.preview.data 
                    : JSON.stringify(data.preview.data, null, 2);
            } else {
                throw new Error(data.error || 'Failed to load template');
            }
        } catch (error) {
            console.error('Failed to load template preview:', error);
            templateEl.textContent = `Error loading template: ${error.message}`;
        }
    }

    /**
     * Send test webhook
     */
    async sendTestWebhook(event) {
        event.preventDefault();
        
        const webhookType = document.getElementById('testWebhookType')?.value || 'orders/create';
        const resultsEl = document.getElementById('testResults');
        
        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    Sending test webhook...
                </div>`;
        }

        try {
            const response = await fetch(`${this.apiBase}/test-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ webhookType })
            });

            const data = await response.json();
            
            if (data.success) {
                this.displayTestResults(data, resultsEl);
                // Refresh the webhooks list and stats
                this.loadStats();
                this.loadRecentWebhooks();
            } else {
                throw new Error(data.error || 'Test webhook failed');
            }
        } catch (error) {
            console.error('Test webhook failed:', error);
            if (resultsEl) {
                resultsEl.innerHTML = `
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Test Failed:</strong> ${error.message}
                    </div>`;
            }
        }
    }

    /**
     * Display test webhook results
     */
    displayTestResults(data, resultsEl) {
        if (!resultsEl) return;

        const organizedData = data.organizedData;
        const messages = data.messages;

        let html = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                <strong>Test Successful!</strong> Webhook processed and messages generated.
            </div>`;

        // Show basic info
        if (organizedData && organizedData.order) {
            html += `
                <h4>Order Information</h4>
                <div class="json-viewer">${JSON.stringify({
                    order_id: organizedData.order.name,
                    customer: organizedData.customer.name,
                    total: organizedData.totals.formatted.total,
                    products: organizedData.products.length
                }, null, 2)}</div>`;
        }

        // Show message previews
        if (messages && messages.messages) {
            html += `<h4>Generated Messages</h4>`;
            
            // WhatsApp message
            if (messages.messages.whatsapp && messages.messages.whatsapp.message) {
                html += `
                    <h5>WhatsApp Message:</h5>
                    <div class="json-viewer">${JSON.stringify(messages.messages.whatsapp.message, null, 2)}</div>`;
            }

            // Email message
            if (messages.messages.email && messages.messages.email.message) {
                html += `
                    <h5>Email Subject:</h5>
                    <div class="json-viewer">${messages.messages.email.message.subject || 'No subject'}</div>`;
            }
        }

        resultsEl.innerHTML = html;
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    /**
     * Show tab content
     */
    async showTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.textContent.toLowerCase() === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update tab content
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => {
            if (content.id === tabName) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Load template preview for this tab
        await this.loadTemplatePreview(tabName);
    }
}

// Global functions (called from HTML)
let dashboard;

function showWebhookUrls() {
    dashboard?.showWebhookUrls();
}

function showTestWebhook() {
    dashboard?.showTestWebhook();
}

function showTemplates() {
    dashboard?.showTemplates();
}

function showSettings() {
    dashboard?.showSettings();
}

function closeModal(modalId) {
    dashboard?.closeModal(modalId);
}

function sendTestWebhook(event) {
    dashboard?.sendTestWebhook(event);
}

function showTab(tabName) {
    dashboard?.showTab(tabName);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new WebhookDashboard();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && dashboard) {
        // Refresh data when page becomes visible
        dashboard.checkServerStatus();
        dashboard.loadStats();
        dashboard.loadRecentWebhooks();
    }
});
