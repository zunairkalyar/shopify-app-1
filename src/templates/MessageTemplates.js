/**
 * MessageTemplates - Customizable message templates for webhook events
 * Supports WhatsApp, Email, SMS, and generic notification formats
 */

class MessageTemplates {
    constructor(options = {}) {
        this.config = {
            defaultLanguage: options.defaultLanguage || 'en',
            shopName: options.shopName || 'Your Store',
            supportPhone: options.supportPhone || '+92-XXX-XXXXXXX',
            supportEmail: options.supportEmail || 'support@yourstore.com',
            websiteUrl: options.websiteUrl || 'https://yourstore.com',
            ...options
        };

        // Load default templates
        this.templates = this.loadDefaultTemplates();
        this.customTemplates = new Map();
    }

    /**
     * Load default message templates
     */
    loadDefaultTemplates() {
        return {
            order_created: {
                whatsapp: {
                    title: 'Order Confirmation - {{order_id}}',
                    message: `🛍️ *Order Confirmed!*

*Order Details:*
📦 Order ID: {{order_id}}
👤 Customer: {{customer_name}}
📱 Phone: {{customer_phone}}
💰 Total: {{order_total}}
💳 Payment: {{payment_method}}

*Products:*
{{#each products}}
• {{title}} x{{quantity}} - {{price.total}}
{{/each}}

*Shipping Address:*
{{shipping_address_formatted}}

*Expected Delivery:* 3-5 business days

Thank you for your order! 🙏

{{shop_name}}
📞 {{support_phone}}`,
                    
                    notification: {
                        title: 'New Order Received',
                        body: '{{customer_name}} placed order {{order_id}} for {{order_total}}'
                    }
                },
                
                email: {
                    subject: 'Order Confirmation - {{order_id}}',
                    html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .product-item { border-bottom: 1px solid #dee2e6; padding: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Order #{{order_id}}</p>
        </div>
        
        <div class="content">
            <p>Hi {{customer_first_name}},</p>
            <p>Thank you for your order! We've received your order and will process it shortly.</p>
            
            <div class="order-summary">
                <h3>Order Summary</h3>
                <p><strong>Order ID:</strong> {{order_id}}</p>
                <p><strong>Order Date:</strong> {{order_date_formatted}}</p>
                <p><strong>Total Amount:</strong> {{order_total}}</p>
                <p><strong>Payment Method:</strong> {{payment_method}}</p>
            </div>
            
            <h3>Products Ordered</h3>
            {{#each products}}
            <div class="product-item">
                <strong>{{title}}</strong><br>
                Quantity: {{quantity}} | Price: {{price.total}}
            </div>
            {{/each}}
            
            <h3>Shipping Address</h3>
            <p>{{shipping_address_formatted}}</p>
            
            <p>We'll send you shipping updates once your order is dispatched.</p>
        </div>
        
        <div class="footer">
            <p>{{shop_name}}</p>
            <p>{{support_phone}} | {{support_email}}</p>
        </div>
    </div>
</body>
</html>`,
                    text: `Order Confirmed - {{order_id}}

Hi {{customer_first_name}},

Thank you for your order! Order details:

Order ID: {{order_id}}
Total: {{order_total}}
Payment: {{payment_method}}

Products:
{{#each products}}
• {{title}} x{{quantity}} - {{price.total}}
{{/each}}

Shipping to: {{shipping_address_formatted}}

Best regards,
{{shop_name}}
{{support_phone}}`
                },
                
                sms: {
                    message: `Order {{order_id}} confirmed! Total: {{order_total}}. We'll send shipping updates soon. - {{shop_name}}`
                }
            },
            
            order_fulfilled: {
                whatsapp: {
                    title: 'Order Shipped - {{order_id}}',
                    message: `📦 *Your Order is On The Way!*

*Shipping Details:*
📦 Order ID: {{order_id}}
👤 Customer: {{customer_name}}
🚚 Status: Shipped
{{#if tracking_number}}
📍 Tracking: {{tracking_number}}
{{/if}}

*Products Shipped:*
{{#each products}}
• {{title}} x{{quantity}}
{{/each}}

*Delivery Address:*
{{shipping_address_formatted}}

*Expected Delivery:* 1-3 business days

Track your order: {{tracking_url}}

{{shop_name}}
📞 {{support_phone}}`,
                    
                    notification: {
                        title: 'Order Shipped',
                        body: 'Order {{order_id}} has been shipped and is on the way!'
                    }
                },
                
                email: {
                    subject: 'Your order {{order_id}} is on the way!',
                    html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .tracking-box { background: #f0f9f4; border: 1px solid #10B981; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .track-button { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 Your Order is Shipped!</h1>
            <p>Order #{{order_id}}</p>
        </div>
        
        <div class="content">
            <p>Hi {{customer_first_name}},</p>
            <p>Great news! Your order has been shipped and is on the way to you.</p>
            
            {{#if tracking_number}}
            <div class="tracking-box">
                <h3>Tracking Information</h3>
                <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
                <a href="{{tracking_url}}" class="track-button">Track Your Package</a>
            </div>
            {{/if}}
            
            <p><strong>Estimated Delivery:</strong> 1-3 business days</p>
            <p><strong>Delivery Address:</strong><br>{{shipping_address_formatted}}</p>
        </div>
        
        <div class="footer">
            <p>{{shop_name}}</p>
            <p>{{support_phone}} | {{support_email}}</p>
        </div>
    </div>
</body>
</html>`
                },
                
                sms: {
                    message: `Order {{order_id}} shipped! {{#if tracking_number}}Track: {{tracking_number}}{{/if}} Expected delivery: 1-3 days. - {{shop_name}}`
                }
            },
            
            order_cancelled: {
                whatsapp: {
                    title: 'Order Cancelled - {{order_id}}',
                    message: `❌ *Order Cancelled*

*Cancellation Details:*
📦 Order ID: {{order_id}}
👤 Customer: {{customer_name}}
💰 Amount: {{order_total}}
📅 Cancelled: {{cancellation_date_formatted}}
📝 Reason: {{cancel_reason}}

*Refund Information:*
{{#if refund_amount}}
💵 Refund: {{refund_amount}}
⏰ Processing Time: 3-7 business days
{{else}}
💵 Refund: Will be processed within 3-7 business days
{{/if}}

If you have any questions, please contact us.

{{shop_name}}
📞 {{support_phone}}`,
                    
                    notification: {
                        title: 'Order Cancelled',
                        body: 'Order {{order_id}} has been cancelled. Refund will be processed soon.'
                    }
                },
                
                email: {
                    subject: 'Order Cancellation - {{order_id}}',
                    html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .refund-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Cancelled</h1>
            <p>Order #{{order_id}}</p>
        </div>
        
        <div class="content">
            <p>Hi {{customer_first_name}},</p>
            <p>Your order {{order_id}} has been cancelled as requested.</p>
            
            <div class="refund-box">
                <h3>Refund Information</h3>
                <p><strong>Amount:</strong> {{order_total}}</p>
                <p><strong>Processing Time:</strong> 3-7 business days</p>
                <p>The refund will be credited to your original payment method.</p>
            </div>
            
            <p><strong>Cancellation Reason:</strong> {{cancel_reason}}</p>
            
            <p>If you have any questions about this cancellation, please don't hesitate to contact us.</p>
        </div>
        
        <div class="footer">
            <p>{{shop_name}}</p>
            <p>{{support_phone}} | {{support_email}}</p>
        </div>
    </div>
</body>
</html>`
                },
                
                sms: {
                    message: `Order {{order_id}} cancelled. Refund of {{order_total}} will be processed in 3-7 days. - {{shop_name}}`
                }
            }
        };
    }

    /**
     * Generate message from template
     * @param {string} eventType - Type of event (order_created, order_fulfilled, etc.)
     * @param {string} format - Message format (whatsapp, email, sms)
     * @param {Object} data - Organized webhook data
     * @param {string} templateType - Specific template type (message, notification, etc.)
     * @returns {Object} Generated message
     */
    generateMessage(eventType, format, data, templateType = 'message') {
        try {
            // Get template
            const template = this.getTemplate(eventType, format, templateType);
            if (!template) {
                throw new Error(`Template not found: ${eventType}.${format}.${templateType}`);
            }

            // Prepare data for template
            const templateData = this.prepareTemplateData(data);

            // Compile template
            const compiled = this.compileTemplate(template, templateData);

            return {
                success: true,
                eventType,
                format,
                templateType,
                data: compiled,
                generated_at: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                eventType,
                format,
                templateType
            };
        }
    }

    /**
     * Get template by path
     */
    getTemplate(eventType, format, templateType) {
        // Check custom templates first
        const customKey = `${eventType}.${format}.${templateType}`;
        if (this.customTemplates.has(customKey)) {
            return this.customTemplates.get(customKey);
        }

        // Check default templates
        const template = this.templates[eventType]?.[format];
        if (!template) return null;

        if (templateType === 'message') {
            return typeof template === 'string' ? template : template.message || template;
        }

        return template[templateType] || template;
    }

    /**
     * Prepare data for template compilation
     */
    prepareTemplateData(data) {
        // Base template variables
        const templateData = {
            // Shop information
            shop_name: this.config.shopName,
            support_phone: this.config.supportPhone,
            support_email: this.config.supportEmail,
            website_url: this.config.websiteUrl,

            // Order information
            order_id: data.order?.name || data.order?.id,
            order_number: data.order?.order_number,
            order_total: data.totals?.formatted?.total,
            order_date_formatted: data.timestamps?.formatted?.created,

            // Customer information
            customer_name: data.customer?.name,
            customer_first_name: data.customer?.first_name,
            customer_last_name: data.customer?.last_name,
            customer_phone: data.customer?.phone,
            customer_email: data.customer?.email,

            // Payment information
            payment_method: data.payment?.method,
            payment_status: data.payment?.status,

            // Shipping information
            shipping_method: data.shipping?.title || data.shipping?.method,
            shipping_price: data.shipping?.price,
            shipping_address_formatted: data.addresses?.shipping?.formatted,

            // Products
            products: data.products || [],
            product_count: data.products?.length || 0,

            // Fulfillment data (if available)
            tracking_number: data.fulfillment?.tracking_info?.[0]?.tracking_number,
            tracking_url: data.fulfillment?.tracking_info?.[0]?.tracking_url,
            tracking_company: data.fulfillment?.tracking_info?.[0]?.tracking_company,

            // Cancellation data (if available)
            cancel_reason: data.cancellation?.cancel_reason,
            cancellation_date_formatted: this.formatDate(data.cancellation?.cancelled_at),
            refund_amount: data.cancellation?.refund_amount,

            // Additional metadata
            currency: data.totals?.currency,
            has_discount: data.totals?.total_discounts && parseFloat(data.totals.total_discounts) > 0,
            discount_amount: data.totals?.formatted?.discounts
        };

        return templateData;
    }

    /**
     * Compile template with data using basic Handlebars-like syntax
     */
    compileTemplate(template, data) {
        if (typeof template === 'string') {
            return this.compileString(template, data);
        }

        if (typeof template === 'object') {
            const compiled = {};
            for (const [key, value] of Object.entries(template)) {
                compiled[key] = typeof value === 'string' 
                    ? this.compileString(value, data)
                    : this.compileTemplate(value, data);
            }
            return compiled;
        }

        return template;
    }

    /**
     * Compile string template
     */
    compileString(template, data) {
        let compiled = template;

        // Handle {{variable}} replacements
        compiled = compiled.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(data, path.trim());
            return value !== undefined ? String(value) : match;
        });

        // Handle {{#each}} loops
        compiled = compiled.replace(/\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayPath, loopTemplate) => {
            const array = this.getNestedValue(data, arrayPath.trim());
            if (!Array.isArray(array)) return '';

            return array.map(item => {
                return loopTemplate.replace(/\{\{([^}]+)\}\}/g, (innerMatch, innerPath) => {
                    const value = this.getNestedValue(item, innerPath.trim());
                    return value !== undefined ? String(value) : innerMatch;
                });
            }).join('');
        });

        // Handle {{#if}} conditionals
        compiled = compiled.replace(/\{\{#if\s+([^}]+)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{\/if\}\}/gs, 
            (match, condition, trueBranch, falseBranch = '') => {
                const value = this.getNestedValue(data, condition.trim());
                const isTrue = value && value !== 'false' && value !== '0' && value !== '' && value !== 'null';
                return isTrue ? trueBranch : falseBranch;
            });

        return compiled;
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Add custom template
     */
    addCustomTemplate(eventType, format, templateType, template) {
        const key = `${eventType}.${format}.${templateType}`;
        this.customTemplates.set(key, template);
    }

    /**
     * Remove custom template
     */
    removeCustomTemplate(eventType, format, templateType) {
        const key = `${eventType}.${format}.${templateType}`;
        this.customTemplates.delete(key);
    }

    /**
     * List available templates
     */
    listTemplates() {
        const templates = [];
        
        // Add default templates
        for (const [eventType, formats] of Object.entries(this.templates)) {
            for (const [format, template] of Object.entries(formats)) {
                const templateTypes = typeof template === 'object' ? Object.keys(template) : ['message'];
                templateTypes.forEach(type => {
                    templates.push({
                        eventType,
                        format,
                        templateType: type,
                        custom: false
                    });
                });
            }
        }

        // Add custom templates
        for (const key of this.customTemplates.keys()) {
            const [eventType, format, templateType] = key.split('.');
            templates.push({
                eventType,
                format,
                templateType,
                custom: true
            });
        }

        return templates;
    }

    /**
     * Generate all message formats for an event
     */
    generateAllFormats(eventType, data) {
        const results = {
            eventType,
            generated_at: new Date().toISOString(),
            messages: {}
        };

        const formats = ['whatsapp', 'email', 'sms'];
        
        formats.forEach(format => {
            try {
                const message = this.generateMessage(eventType, format, data, 'message');
                const notification = this.generateMessage(eventType, format, data, 'notification');
                
                results.messages[format] = {
                    message: message.success ? message.data : null,
                    notification: notification.success ? notification.data : null,
                    errors: []
                };

                if (!message.success) results.messages[format].errors.push(message.error);
                if (!notification.success) results.messages[format].errors.push(notification.error);

            } catch (error) {
                results.messages[format] = {
                    message: null,
                    notification: null,
                    errors: [error.message]
                };
            }
        });

        return results;
    }

    /**
     * Format date helper
     */
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
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
     * Preview template with sample data
     */
    previewTemplate(eventType, format, templateType = 'message') {
        // Create sample data
        const sampleData = this.createSampleData(eventType);
        
        // Generate message
        return this.generateMessage(eventType, format, sampleData, templateType);
    }

    /**
     * Create sample data for preview
     */
    createSampleData(eventType) {
        const baseData = {
            order: {
                id: '12345678901',
                name: '#1001',
                order_number: 1001,
                status: { financial: 'paid', fulfillment: null }
            },
            customer: {
                name: 'John Doe',
                first_name: 'John',
                last_name: 'Doe',
                phone: '+92-300-1234567',
                email: 'john.doe@example.com'
            },
            products: [
                {
                    title: 'Premium Product Example',
                    quantity: 2,
                    price: { unit: '999.00', total: '1998.00', currency: 'PKR' }
                }
            ],
            totals: {
                formatted: { total: 'PKR 2,228.00' },
                currency: 'PKR'
            },
            payment: { method: 'Cash on Delivery (COD)', status: 'paid' },
            shipping: { title: 'Standard Delivery', method: 'standard' },
            addresses: {
                shipping: { formatted: 'John Doe, 123 Main St, Karachi, Pakistan' }
            },
            timestamps: {
                formatted: { created: '15/08/2025 14:30' }
            }
        };

        // Add event-specific data
        if (eventType === 'order_fulfilled') {
            baseData.fulfillment = {
                tracking_info: [{
                    tracking_number: 'TRK123456789',
                    tracking_url: 'https://track.example.com/TRK123456789'
                }]
            };
        }

        if (eventType === 'order_cancelled') {
            baseData.cancellation = {
                cancel_reason: 'Customer requested cancellation',
                cancelled_at: new Date().toISOString(),
                refund_amount: 'PKR 2,228.00'
            };
        }

        return baseData;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageTemplates;
} else if (typeof window !== 'undefined') {
    window.MessageTemplates = MessageTemplates;
}
