// Webhook Management Page JavaScript

function initWebhooksPage() {
    const webhookContent = `
        <div class="page-header-actions">
            <div class="header-left">
                <h2 style="color: #2c3e50; margin-bottom: 8px;">Webhook Management</h2>
                <p style="color: #6c757d; margin: 0;">Configure and monitor webhook endpoints</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="refreshWebhookData()">
                    <i data-feather="refresh-cw"></i>
                    Refresh
                </button>
                <button class="btn btn-primary" onclick="testWebhook()">
                    <i data-feather="send"></i>
                    Send Test
                </button>
            </div>
        </div>

        <!-- Webhook URLs Section -->
        <div class="section-card">
            <div class="section-header">
                <h3>Webhook Endpoints</h3>
                <p>Your webhook URLs for Shopify integration</p>
            </div>
            <div class="webhook-urls">
                <div class="url-item">
                    <div class="url-info">
                        <label>Order Created</label>
                        <div class="url-input-group">
                            <input type="text" class="url-input" value="https://webhook-system.vercel.app/api/webhooks/order-create" readonly>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <i data-feather="copy"></i>
                            </button>
                        </div>
                        <small class="url-description">Triggered when a new order is created</small>
                    </div>
                </div>

                <div class="url-item">
                    <div class="url-info">
                        <label>Order Fulfilled</label>
                        <div class="url-input-group">
                            <input type="text" class="url-input" value="https://webhook-system.vercel.app/api/webhooks/order-fulfilled" readonly>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <i data-feather="copy"></i>
                            </button>
                        </div>
                        <small class="url-description">Triggered when an order is fulfilled</small>
                    </div>
                </div>

                <div class="url-item">
                    <div class="url-info">
                        <label>Order Cancelled</label>
                        <div class="url-input-group">
                            <input type="text" class="url-input" value="https://webhook-system.vercel.app/api/webhooks/order-cancelled" readonly>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <i data-feather="copy"></i>
                            </button>
                        </div>
                        <small class="url-description">Triggered when an order is cancelled</small>
                    </div>
                </div>

                <div class="url-item">
                    <div class="url-info">
                        <label>Generic Webhook</label>
                        <div class="url-input-group">
                            <input type="text" class="url-input" value="https://webhook-system.vercel.app/api/webhooks/generic" readonly>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <i data-feather="copy"></i>
                            </button>
                        </div>
                        <small class="url-description">Generic webhook for custom events</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Webhooks Section -->
        <div class="section-card">
            <div class="section-header">
                <div class="header-left">
                    <h3>Recent Webhooks</h3>
                    <p>Latest received webhook data</p>
                </div>
                <div class="header-actions">
                    <select class="filter-select" onchange="filterWebhooks(this.value)">
                        <option value="all">All Events</option>
                        <option value="order-create">Order Created</option>
                        <option value="order-fulfilled">Order Fulfilled</option>
                        <option value="order-cancelled">Order Cancelled</option>
                    </select>
                </div>
            </div>
            <div class="webhooks-table">
                <div class="table-header">
                    <div class="th">Event</div>
                    <div class="th">Order ID</div>
                    <div class="th">Customer</div>
                    <div class="th">Status</div>
                    <div class="th">Time</div>
                    <div class="th">Actions</div>
                </div>
                <div id="webhooksTableBody" class="table-body">
                    <div class="loading-row">
                        <div class="spinner"></div>
                        <span>Loading webhooks...</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Webhook Configuration -->
        <div class="section-card">
            <div class="section-header">
                <h3>Configuration</h3>
                <p>Webhook settings and preferences</p>
            </div>
            <div class="config-grid">
                <div class="config-item">
                    <label class="config-label">
                        <input type="checkbox" checked>
                        Enable Order Tracking
                    </label>
                    <small>Track all order-related webhooks</small>
                </div>
                <div class="config-item">
                    <label class="config-label">
                        <input type="checkbox" checked>
                        Enable Message Generation
                    </label>
                    <small>Generate messages for each webhook</small>
                </div>
                <div class="config-item">
                    <label class="config-label">
                        <input type="checkbox" checked>
                        Enable Analytics
                    </label>
                    <small>Store webhook data for analytics</small>
                </div>
                <div class="config-item">
                    <label class="config-label">
                        <input type="checkbox">
                        Enable Debug Logging
                    </label>
                    <small>Log detailed webhook information</small>
                </div>
            </div>
        </div>
    `;

    return webhookContent;
}

function copyToClipboard(button) {
    const input = button.previousElementSibling;
    input.select();
    document.execCommand('copy');
    
    const icon = button.querySelector('i');
    icon.setAttribute('data-feather', 'check');
    feather.replace();
    
    setTimeout(() => {
        icon.setAttribute('data-feather', 'copy');
        feather.replace();
    }, 2000);
}

async function loadWebhookData() {
    try {
        const response = await fetch('/api/webhooks');
        const data = await response.json();
        
        if (data.success) {
            displayWebhooks(data.webhooks || []);
        }
    } catch (error) {
        console.error('Error loading webhooks:', error);
        displayWebhooks([]);
    }
}

function displayWebhooks(webhooks) {
    const tbody = document.getElementById('webhooksTableBody');
    
    if (!webhooks || webhooks.length === 0) {
        tbody.innerHTML = `
            <div class="empty-state">
                <i data-feather="inbox"></i>
                <h4>No webhooks received yet</h4>
                <p>Webhook data will appear here once you start receiving them</p>
            </div>
        `;
        feather.replace();
        return;
    }

    tbody.innerHTML = webhooks.slice(0, 20).map(webhook => `
        <div class="table-row">
            <div class="td">
                <div class="event-badge ${getEventClass(webhook.webhook_type)}">
                    ${formatEventType(webhook.webhook_type)}
                </div>
            </div>
            <div class="td">
                <strong>${webhook.organized_data?.order?.name || 'N/A'}</strong>
            </div>
            <div class="td">
                ${webhook.organized_data?.customer?.name || 'N/A'}
            </div>
            <div class="td">
                <span class="status-badge ${webhook.status}">
                    ${webhook.status}
                </span>
            </div>
            <div class="td">
                <div class="time-info">
                    <div>${formatTime(webhook.received_at)}</div>
                    <small>${formatDate(webhook.received_at)}</small>
                </div>
            </div>
            <div class="td">
                <button class="btn-icon" onclick="viewWebhookDetails('${webhook.id}')">
                    <i data-feather="eye"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    feather.replace();
}

function getEventClass(eventType) {
    const classes = {
        'orders/create': 'event-create',
        'orders/fulfilled': 'event-fulfilled',
        'orders/cancelled': 'event-cancelled'
    };
    return classes[eventType] || 'event-default';
}

function formatEventType(eventType) {
    const types = {
        'orders/create': 'Order Created',
        'orders/fulfilled': 'Order Fulfilled',
        'orders/cancelled': 'Order Cancelled'
    };
    return types[eventType] || eventType;
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

async function refreshWebhookData() {
    const button = event.target.closest('button');
    const icon = button.querySelector('i');
    
    icon.setAttribute('data-feather', 'loader');
    feather.replace();
    
    await loadWebhookData();
    
    setTimeout(() => {
        icon.setAttribute('data-feather', 'refresh-cw');
        feather.replace();
    }, 1000);
}

async function testWebhook() {
    try {
        const response = await fetch('/api/test-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                webhookType: 'orders/create',
                testData: {
                    id: Date.now(),
                    name: '#' + Math.floor(Math.random() * 9000 + 1000),
                    total_price: (Math.random() * 500 + 100).toFixed(2),
                    customer: {
                        first_name: 'Test',
                        last_name: 'Customer',
                        email: 'test@example.com'
                    }
                }
            })
        });
        
        if (response.ok) {
            showNotification('Test webhook sent successfully!', 'success');
            setTimeout(() => loadWebhookData(), 1000);
        }
    } catch (error) {
        showNotification('Failed to send test webhook', 'error');
    }
}

function filterWebhooks(eventType) {
    // This would filter the webhook display
    console.log('Filtering by:', eventType);
}

function viewWebhookDetails(webhookId) {
    // This would show webhook details in a modal or new page
    console.log('Viewing webhook:', webhookId);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i data-feather="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    feather.replace();
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export functions for global use
window.initWebhooksPage = initWebhooksPage;
window.loadWebhookData = loadWebhookData;
window.copyToClipboard = copyToClipboard;
window.refreshWebhookData = refreshWebhookData;
window.testWebhook = testWebhook;
window.filterWebhooks = filterWebhooks;
window.viewWebhookDetails = viewWebhookDetails;
