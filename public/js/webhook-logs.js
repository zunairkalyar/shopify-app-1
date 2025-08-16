// Webhook Logs Management System
class WebhookLogsManager {
    constructor() {
        this.currentPage = 1;
        this.logsPerPage = 20;
        this.autoRefresh = false;
        this.refreshInterval = null;
        this.currentFilters = {
            search: '',
            type: '',
            status: ''
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadWebhookLogs();
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.currentFilters.search = searchInput.value;
                this.currentPage = 1;
                this.loadWebhookLogs();
            }, 300));
        }

        // Filter dropdowns
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.currentFilters.type = typeFilter.value;
                this.currentPage = 1;
                this.loadWebhookLogs();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentFilters.status = statusFilter.value;
                this.currentPage = 1;
                this.loadWebhookLogs();
            });
        }

        // Modal close
        const modal = document.getElementById('webhookModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async loadWebhookLogs() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.logsPerPage,
                ...this.currentFilters
            });

            // Remove empty values
            for (const [key, value] of params.entries()) {
                if (!value) {
                    params.delete(key);
                }
            }

            const response = await fetch(`https://shopify-app-1-seven.vercel.app/api/webhook-logs?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.displayLogs(data.logs);
                this.updatePagination(data.pagination);
                this.updateLogsCount(data.pagination.total);
            } else {
                throw new Error(data.error || 'Failed to load webhook logs');
            }
        } catch (error) {
            console.error('Error loading webhook logs:', error);
            this.showError('Failed to load webhook logs. Please try again.');
        }
    }

    displayLogs(logs) {
        const tableBody = document.getElementById('logsTableBody');
        if (!tableBody) return;

        if (logs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No webhook logs found</p>
                        <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
                            Webhook logs will appear here when webhooks are received
                        </p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = logs.map(log => `
            <tr onclick="showWebhookDetails('${log.id}')" title="Click to view details">
                <td>
                    <div style="font-weight: 500;">${this.formatTimestamp(log.timestamp)}</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${this.formatDate(log.timestamp)}</div>
                </td>
                <td>
                    <span class="webhook-type ${this.getTypeClass(log.webhook_type)}">
                        ${this.formatWebhookType(log.webhook_type)}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 500;">${log.order_id || 'N/A'}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${log.customer_name || 'Unknown'}</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${log.customer_email || ''}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${log.currency || 'USD'} ${log.total_amount || '0.00'}</div>
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(log.status)}">
                        <span class="status-dot ${this.getStatusDotClass(log.status)}"></span>
                        ${log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                </td>
                <td>
                    <div style="font-family: monospace; font-size: 0.875rem;">${log.ip_address || 'Unknown'}</div>
                </td>
                <td>
                    <button class="btn btn-primary" onclick="event.stopPropagation(); showWebhookDetails('${log.id}')" style="font-size: 0.75rem; padding: 0.5rem 1rem;">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    }

    formatWebhookType(type) {
        const typeMap = {
            'orders/create': 'Order Created',
            'orders/fulfilled': 'Order Fulfilled', 
            'orders/cancelled': 'Order Cancelled'
        };
        return typeMap[type] || type;
    }

    getTypeClass(type) {
        const classMap = {
            'orders/create': 'type-create',
            'orders/fulfilled': 'type-fulfilled',
            'orders/cancelled': 'type-cancelled'
        };
        return classMap[type] || '';
    }

    getStatusClass(status) {
        const classMap = {
            'success': 'status-success',
            'error': 'status-error',
            'pending': 'status-pending'
        };
        return classMap[status] || 'status-pending';
    }

    getStatusDotClass(status) {
        const classMap = {
            'success': 'dot-success',
            'error': 'dot-error',
            'pending': 'dot-pending'
        };
        return classMap[status] || 'dot-pending';
    }

    updatePagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        const { page, pages, total } = pagination;
        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button ${page <= 1 ? 'disabled' : ''} onclick="webhookLogs.goToPage(${page - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);

        if (startPage > 1) {
            paginationHTML += `<button onclick="webhookLogs.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span>...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="${i === page ? 'active' : ''}" onclick="webhookLogs.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < pages) {
            if (endPage < pages - 1) {
                paginationHTML += `<span>...</span>`;
            }
            paginationHTML += `<button onclick="webhookLogs.goToPage(${pages})">${pages}</button>`;
        }

        // Next button
        paginationHTML += `
            <button ${page >= pages ? 'disabled' : ''} onclick="webhookLogs.goToPage(${page + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    updateLogsCount(total) {
        const countElement = document.getElementById('logsCount');
        if (countElement) {
            countElement.textContent = `${total} total`;
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadWebhookLogs();
    }

    async showWebhookDetails(logId) {
        try {
            const response = await fetch(`https://shopify-app-1-seven.vercel.app/api/webhook-logs/${logId}`);
            const data = await response.json();

            if (data.success) {
                this.displayWebhookModal(data.log);
            } else {
                throw new Error(data.error || 'Failed to load webhook details');
            }
        } catch (error) {
            console.error('Error loading webhook details:', error);
            this.showError('Failed to load webhook details. Please try again.');
        }
    }

    displayWebhookModal(log) {
        const modal = document.getElementById('webhookModal');
        const detailsContainer = document.getElementById('webhookDetails');
        
        if (!modal || !detailsContainer) return;

        const detailsHTML = `
            <div class="detail-section">
                <h3>
                    <i class="fas fa-info-circle"></i>
                    Basic Information
                </h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Webhook ID</span>
                        <span class="info-value">${log.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Type</span>
                        <span class="info-value">${this.formatWebhookType(log.webhook_type)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Status</span>
                        <span class="info-value">
                            <span class="status-badge ${this.getStatusClass(log.status)}">
                                <span class="status-dot ${this.getStatusDotClass(log.status)}"></span>
                                ${log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                            </span>
                        </span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Received At</span>
                        <span class="info-value">${new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">IP Address</span>
                        <span class="info-value" style="font-family: monospace;">${log.ip_address}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Message</span>
                        <span class="info-value">${log.message}</span>
                    </div>
                </div>
            </div>

            ${log.order_id ? `
            <div class="detail-section">
                <h3>
                    <i class="fas fa-shopping-cart"></i>
                    Order Information
                </h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Order ID</span>
                        <span class="info-value">${log.order_id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Customer</span>
                        <span class="info-value">${log.customer_name || 'Unknown'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <span class="info-value">${log.customer_email || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Amount</span>
                        <span class="info-value">${log.currency || 'USD'} ${log.total_amount || '0.00'}</span>
                    </div>
                </div>
            </div>
            ` : ''}

            ${log.headers && Object.keys(log.headers).length > 0 ? `
            <div class="detail-section">
                <h3>
                    <i class="fas fa-list"></i>
                    Request Headers
                    <button class="copy-btn" onclick="webhookLogs.copyToClipboard(${JSON.stringify(JSON.stringify(log.headers, null, 2)).replace(/"/g, '&quot;')})" title="Copy headers">
                        <i class="fas fa-copy"></i>
                    </button>
                </h3>
                <div class="json-viewer">${this.formatJSON(log.headers)}</div>
            </div>
            ` : ''}

            ${log.raw_data && Object.keys(log.raw_data).length > 0 ? `
            <div class="detail-section">
                <h3>
                    <i class="fas fa-code"></i>
                    Raw Webhook Data
                    <button class="copy-btn" onclick="webhookLogs.copyToClipboard(${JSON.stringify(JSON.stringify(log.raw_data, null, 2)).replace(/"/g, '&quot;')})" title="Copy raw data">
                        <i class="fas fa-copy"></i>
                    </button>
                </h3>
                <div class="json-viewer">${this.formatJSON(log.raw_data)}</div>
            </div>
            ` : ''}

            ${log.error_details ? `
            <div class="detail-section">
                <h3>
                    <i class="fas fa-exclamation-triangle"></i>
                    Error Details
                </h3>
                <div class="json-viewer" style="background: #7f1d1d; border-left: 4px solid #ef4444;">${this.escapeHtml(log.error_details)}</div>
            </div>
            ` : ''}
        `;

        detailsContainer.innerHTML = detailsHTML;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    formatJSON(obj) {
        return this.escapeHtml(JSON.stringify(obj, null, 2));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    closeModal() {
        const modal = document.getElementById('webhookModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showError('Failed to copy to clipboard');
        }
    }

    toggleAutoRefresh() {
        const toggle = document.getElementById('autoRefreshToggle');
        if (!toggle) return;

        this.autoRefresh = !this.autoRefresh;
        
        if (this.autoRefresh) {
            toggle.classList.add('active');
            this.refreshInterval = setInterval(() => {
                this.loadWebhookLogs();
            }, 5000); // Refresh every 5 seconds
        } else {
            toggle.classList.remove('active');
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        }
    }

    refreshLogs() {
        this.loadWebhookLogs();
    }

    async exportLogs() {
        try {
            const response = await fetch(`https://shopify-app-1-seven.vercel.app/api/webhook-logs?limit=1000`);
            const data = await response.json();

            if (data.success) {
                const csv = this.convertToCSV(data.logs);
                this.downloadCSV(csv, 'webhook-logs.csv');
            } else {
                throw new Error(data.error || 'Failed to export logs');
            }
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.showError('Failed to export logs. Please try again.');
        }
    }

    convertToCSV(logs) {
        if (logs.length === 0) return '';

        const headers = ['Timestamp', 'Type', 'Order ID', 'Customer Name', 'Email', 'Amount', 'Currency', 'Status', 'IP Address', 'Message'];
        const rows = logs.map(log => [
            log.timestamp,
            log.webhook_type,
            log.order_id || '',
            log.customer_name || '',
            log.customer_email || '',
            log.total_amount || '',
            log.currency || '',
            log.status,
            log.ip_address || '',
            log.message || ''
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    async clearLogs() {
        if (!confirm('Are you sure you want to clear all webhook logs? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('https://shopify-app-1-seven.vercel.app/api/webhook-logs/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Webhook logs cleared successfully');
                this.loadWebhookLogs();
            } else {
                throw new Error(data.error || 'Failed to clear logs');
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
            this.showError('Failed to clear logs. Please try again.');
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 300px;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Global functions (called from HTML)
function showWebhookDetails(logId) {
    webhookLogs.showWebhookDetails(logId);
}

function closeModal() {
    webhookLogs.closeModal();
}

function toggleAutoRefresh() {
    webhookLogs.toggleAutoRefresh();
}

function refreshLogs() {
    webhookLogs.refreshLogs();
}

function exportLogs() {
    webhookLogs.exportLogs();
}

function clearLogs() {
    webhookLogs.clearLogs();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.webhookLogs = new WebhookLogsManager();
});
