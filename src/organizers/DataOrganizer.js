/**
 * DataOrganizer - Processes and structures incoming webhook data
 * Supports multiple webhook types: orders/create, orders/fulfilled, orders/cancelled
 */

class DataOrganizer {
    constructor(options = {}) {
        this.config = {
            dateFormat: options.dateFormat || 'DD/MM/YYYY HH:mm:ss',
            currencySymbol: options.currencySymbol || 'PKR',
            timezone: options.timezone || 'Asia/Karachi',
            ...options
        };
        
        // Store raw and organized data
        this.rawData = null;
        this.organizedData = null;
        this.webhookType = null;
        this.errors = [];
    }

    /**
     * Main entry point - organizes webhook data based on type
     * @param {Object} webhookData - Raw webhook payload
     * @param {string} webhookType - Type of webhook (orders/create, orders/fulfilled, etc.)
     * @returns {Object} Organized data structure
     */
    organize(webhookData, webhookType = null) {
        this.reset();
        
        try {
            this.rawData = webhookData;
            this.webhookType = webhookType || this.detectWebhookType(webhookData);
            
            if (!this.webhookType) {
                throw new Error('Cannot determine webhook type');
            }

            // Validate required fields
            this.validateRequiredFields();

            // Organize data based on type
            switch (this.webhookType) {
                case 'orders/create':
                    this.organizedData = this.organizeOrderCreate();
                    break;
                case 'orders/fulfilled':
                    this.organizedData = this.organizeOrderFulfilled();
                    break;
                case 'orders/cancelled':
                    this.organizedData = this.organizeOrderCancelled();
                    break;
                default:
                    this.organizedData = this.organizeGenericOrder();
            }

            // Add metadata
            this.organizedData.meta = this.buildMetadata();
            
            return this.organizedData;

        } catch (error) {
            this.errors.push(error.message);
            console.error('DataOrganizer Error:', error.message);
            return null;
        }
    }

    /**
     * Reset organizer state
     */
    reset() {
        this.rawData = null;
        this.organizedData = null;
        this.webhookType = null;
        this.errors = [];
    }

    /**
     * Detect webhook type from headers or data structure
     */
    detectWebhookType(data) {
        // Try to detect from common patterns
        if (data.fulfillment_status !== null) {
            return 'orders/fulfilled';
        } else if (data.cancelled_at !== null) {
            return 'orders/cancelled';
        } else if (data.id && data.created_at) {
            return 'orders/create';
        }
        return 'orders/generic';
    }

    /**
     * Validate required fields exist
     */
    validateRequiredFields() {
        const required = ['id', 'created_at', 'total_price'];
        const missing = required.filter(field => !this.rawData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    /**
     * Organize order creation data
     */
    organizeOrderCreate() {
        const data = this.rawData;
        
        return {
            type: 'order_created',
            order: this.buildOrderInfo(),
            customer: this.buildCustomerInfo(),
            products: this.buildProductsInfo(),
            shipping: this.buildShippingInfo(),
            payment: this.buildPaymentInfo(),
            totals: this.buildTotalsInfo(),
            timestamps: this.buildTimestamps(),
            addresses: this.buildAddresses(),
            notifications: this.buildNotificationData()
        };
    }

    /**
     * Organize order fulfillment data
     */
    organizeOrderFulfilled() {
        const organized = this.organizeOrderCreate();
        organized.type = 'order_fulfilled';
        organized.fulfillment = {
            status: this.rawData.fulfillment_status || 'fulfilled',
            fulfillments: this.rawData.fulfillments || [],
            tracking_info: this.extractTrackingInfo()
        };
        return organized;
    }

    /**
     * Organize order cancellation data
     */
    organizeOrderCancelled() {
        const organized = this.organizeOrderCreate();
        organized.type = 'order_cancelled';
        organized.cancellation = {
            cancelled_at: this.rawData.cancelled_at,
            cancel_reason: this.rawData.cancel_reason || 'Not specified',
            refund_status: this.rawData.refunds?.length > 0 ? 'refunded' : 'pending'
        };
        return organized;
    }

    /**
     * Generic organization for unknown webhook types
     */
    organizeGenericOrder() {
        return {
            type: 'order_generic',
            order: this.buildOrderInfo(),
            customer: this.buildCustomerInfo(),
            raw_data: this.rawData
        };
    }

    /**
     * Build order information
     */
    buildOrderInfo() {
        const data = this.rawData;
        return {
            id: data.id,
            name: data.name || `#${data.order_number || data.number}`,
            order_number: data.order_number || data.number,
            confirmation_number: data.confirmation_number,
            status: {
                financial: data.financial_status || 'pending',
                fulfillment: data.fulfillment_status || null
            },
            tags: data.tags ? data.tags.split(', ') : [],
            note: data.note || null,
            source: data.source_name || 'shopify'
        };
    }

    /**
     * Build customer information
     */
    buildCustomerInfo() {
        const data = this.rawData;
        const customer = data.customer || {};
        
        return {
            id: customer.id,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Guest Customer',
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email || data.email || 'No email provided',
            phone: customer.phone || data.phone || 'No phone provided',
            accepts_marketing: data.buyer_accepts_marketing || false,
            created_at: customer.created_at,
            order_count: customer.orders_count || 1,
            total_spent: customer.total_spent || '0.00'
        };
    }

    /**
     * Build products information
     */
    buildProductsInfo() {
        const lineItems = this.rawData.line_items || [];
        
        return lineItems.map(item => ({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            sku: item.sku,
            title: item.title || item.name,
            variant_title: item.variant_title,
            vendor: item.vendor,
            quantity: item.quantity,
            price: {
                unit: item.price,
                total: (parseFloat(item.price) * item.quantity).toFixed(2),
                currency: this.rawData.currency
            },
            weight: item.grams ? `${item.grams}g` : 'N/A',
            requires_shipping: item.requires_shipping,
            fulfillment_status: item.fulfillment_status,
            tax_lines: item.tax_lines || [],
            discount_allocations: item.discount_allocations || []
        }));
    }

    /**
     * Build shipping information
     */
    buildShippingInfo() {
        const shippingLines = this.rawData.shipping_lines || [];
        
        if (shippingLines.length === 0) {
            return {
                method: 'Not specified',
                price: '0.00',
                title: 'No shipping'
            };
        }

        const shipping = shippingLines[0];
        return {
            method: shipping.code || 'standard',
            title: shipping.title,
            price: shipping.price,
            carrier: shipping.carrier_identifier,
            phone: shipping.phone
        };
    }

    /**
     * Build payment information
     */
    buildPaymentInfo() {
        const data = this.rawData;
        const gateways = data.payment_gateway_names || {};
        
        return {
            status: data.financial_status || 'pending',
            method: gateways[0] || Object.values(gateways)[0] || 'Not specified',
            currency: data.currency || 'PKR',
            total_paid: data.total_paid || '0.00',
            total_outstanding: data.total_outstanding || data.total_price
        };
    }

    /**
     * Build totals information
     */
    buildTotalsInfo() {
        const data = this.rawData;
        
        return {
            subtotal: data.subtotal_price || '0.00',
            total_discounts: data.total_discounts || '0.00',
            total_tax: data.total_tax || '0.00',
            shipping: data.total_shipping_price_set?.shop_money?.amount || '0.00',
            total: data.total_price || '0.00',
            currency: data.currency || 'PKR',
            formatted: {
                subtotal: this.formatCurrency(data.subtotal_price || '0.00'),
                discounts: this.formatCurrency(data.total_discounts || '0.00'),
                tax: this.formatCurrency(data.total_tax || '0.00'),
                shipping: this.formatCurrency(data.total_shipping_price_set?.shop_money?.amount || '0.00'),
                total: this.formatCurrency(data.total_price || '0.00')
            }
        };
    }

    /**
     * Build timestamp information
     */
    buildTimestamps() {
        const data = this.rawData;
        
        return {
            created_at: data.created_at,
            updated_at: data.updated_at,
            processed_at: data.processed_at,
            closed_at: data.closed_at,
            cancelled_at: data.cancelled_at,
            formatted: {
                created: this.formatDate(data.created_at),
                updated: this.formatDate(data.updated_at),
                processed: this.formatDate(data.processed_at)
            }
        };
    }

    /**
     * Build address information
     */
    buildAddresses() {
        const data = this.rawData;
        
        return {
            billing: this.formatAddress(data.billing_address),
            shipping: this.formatAddress(data.shipping_address)
        };
    }

    /**
     * Format address object
     */
    formatAddress(address) {
        if (!address) return null;
        
        return {
            name: address.name || `${address.first_name || ''} ${address.last_name || ''}`.trim(),
            first_name: address.first_name,
            last_name: address.last_name,
            company: address.company,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            province: address.province,
            country: address.country,
            zip: address.zip,
            phone: address.phone,
            formatted: this.buildFormattedAddress(address)
        };
    }

    /**
     * Build formatted address string
     */
    buildFormattedAddress(address) {
        if (!address) return '';
        
        const parts = [
            address.address1,
            address.address2,
            address.city,
            address.province,
            address.country,
            address.zip
        ].filter(Boolean);
        
        return parts.join(', ');
    }

    /**
     * Build notification-ready data
     */
    buildNotificationData() {
        const order = this.buildOrderInfo();
        const customer = this.buildCustomerInfo();
        const totals = this.buildTotalsInfo();
        
        return {
            title: `New Order ${order.name}`,
            message: `${customer.name} placed an order for ${totals.formatted.total}`,
            customer_name: customer.name,
            order_total: totals.formatted.total,
            order_id: order.name,
            phone: customer.phone,
            email: customer.email
        };
    }

    /**
     * Extract tracking information
     */
    extractTrackingInfo() {
        const fulfillments = this.rawData.fulfillments || [];
        
        return fulfillments.map(f => ({
            tracking_number: f.tracking_number,
            tracking_url: f.tracking_url,
            tracking_company: f.tracking_company,
            carrier: f.carrier_identifier
        }));
    }

    /**
     * Build metadata
     */
    buildMetadata() {
        return {
            webhook_type: this.webhookType,
            processed_at: new Date().toISOString(),
            data_version: '1.0',
            total_products: this.rawData.line_items?.length || 0,
            has_shipping: (this.rawData.shipping_lines?.length || 0) > 0,
            has_discounts: parseFloat(this.rawData.total_discounts || '0') > 0,
            currency: this.rawData.currency || 'PKR',
            source_domain: this.rawData.source_name || 'shopify'
        };
    }

    /**
     * Format currency value
     */
    formatCurrency(amount, currency = null) {
        const curr = currency || this.config.currencySymbol;
        const num = parseFloat(amount || '0');
        return `${curr} ${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-GB', {
                timeZone: this.config.timezone,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Get organized data summary
     */
    getSummary() {
        if (!this.organizedData) return null;
        
        return {
            type: this.organizedData.type,
            order_id: this.organizedData.order.name,
            customer: this.organizedData.customer.name,
            total: this.organizedData.totals.formatted.total,
            product_count: this.organizedData.products.length,
            status: this.organizedData.order.status
        };
    }

    /**
     * Export data for templates
     */
    exportForTemplate() {
        if (!this.organizedData) return null;
        
        return {
            ...this.organizedData,
            summary: this.getSummary(),
            errors: this.errors
        };
    }

    /**
     * Get validation errors
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Check if data is valid
     */
    isValid() {
        return this.errors.length === 0 && this.organizedData !== null;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataOrganizer;
} else if (typeof window !== 'undefined') {
    window.DataOrganizer = DataOrganizer;
}
