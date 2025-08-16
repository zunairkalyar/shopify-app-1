/**
 * Email Service Implementation
 * Handles email sending using SendGrid API
 */

const config = require('../../config/config');

class EmailService {
    constructor(options = {}) {
        const emailConfig = config.getServiceConfig('email') || {};
        
        this.apiKey = options.apiKey || emailConfig.apiKey;
        this.fromEmail = options.fromEmail || emailConfig.fromEmail;
        this.enabled = options.enabled !== undefined ? options.enabled : emailConfig.enabled;
        this.apiUrl = 'https://api.sendgrid.com/v3/mail/send';
        
        this.retryConfig = {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 5000
        };
    }

    /**
     * Check if email service is properly configured
     */
    isConfigured() {
        return !!(this.apiKey && this.fromEmail && this.enabled);
    }

    /**
     * Send email with HTML and text content
     */
    async sendEmail(to, subject, htmlContent, textContent = null, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not properly configured');
        }

        // Convert HTML to text if text content not provided
        const textBody = textContent || this.htmlToText(htmlContent);

        const emailData = {
            personalizations: [{
                to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
                subject: subject
            }],
            from: {
                email: options.from || this.fromEmail,
                name: options.fromName || config.shop.name
            },
            content: [
                {
                    type: 'text/plain',
                    value: textBody
                },
                {
                    type: 'text/html',
                    value: htmlContent
                }
            ]
        };

        // Add CC if provided
        if (options.cc) {
            emailData.personalizations[0].cc = Array.isArray(options.cc) 
                ? options.cc.map(email => ({ email })) 
                : [{ email: options.cc }];
        }

        // Add BCC if provided
        if (options.bcc) {
            emailData.personalizations[0].bcc = Array.isArray(options.bcc) 
                ? options.bcc.map(email => ({ email })) 
                : [{ email: options.bcc }];
        }

        // Add reply-to if provided
        if (options.replyTo) {
            emailData.reply_to = {
                email: options.replyTo,
                name: options.replyToName
            };
        }

        // Add attachments if provided
        if (options.attachments && options.attachments.length > 0) {
            emailData.attachments = options.attachments.map(attachment => ({
                content: attachment.content, // Base64 encoded
                filename: attachment.filename,
                type: attachment.type || 'application/octet-stream',
                disposition: attachment.disposition || 'attachment'
            }));
        }

        return this.sendRequest(emailData, options);
    }

    /**
     * Send email using SendGrid template
     */
    async sendTemplateEmail(to, templateId, templateData = {}, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not properly configured');
        }

        const emailData = {
            personalizations: [{
                to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
                dynamic_template_data: templateData
            }],
            from: {
                email: options.from || this.fromEmail,
                name: options.fromName || config.shop.name
            },
            template_id: templateId
        };

        // Add subject override if provided (for templates that allow it)
        if (options.subject) {
            emailData.personalizations[0].subject = options.subject;
        }

        return this.sendRequest(emailData, options);
    }

    /**
     * Send bulk emails
     */
    async sendBulkEmails(recipients, subject, htmlContent, textContent = null, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not properly configured');
        }

        const textBody = textContent || this.htmlToText(htmlContent);
        const batchSize = options.batchSize || 100;
        const results = [];

        // Process recipients in batches
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            
            const emailData = {
                personalizations: batch.map(recipient => ({
                    to: [{ email: typeof recipient === 'string' ? recipient : recipient.email }],
                    subject: subject,
                    // Add personalized data if provided
                    ...(typeof recipient === 'object' && recipient.data ? {
                        dynamic_template_data: recipient.data
                    } : {})
                })),
                from: {
                    email: options.from || this.fromEmail,
                    name: options.fromName || config.shop.name
                },
                content: [
                    {
                        type: 'text/plain',
                        value: textBody
                    },
                    {
                        type: 'text/html',
                        value: htmlContent
                    }
                ]
            };

            try {
                const result = await this.sendRequest(emailData, options);
                results.push({
                    batch: Math.floor(i / batchSize) + 1,
                    count: batch.length,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    batch: Math.floor(i / batchSize) + 1,
                    count: batch.length,
                    success: false,
                    error: error.message
                });
            }

            // Add delay between batches to avoid rate limiting
            if (i + batchSize < recipients.length) {
                await this.sleep(1000);
            }
        }

        return results;
    }

    /**
     * Send request to SendGrid API with retry logic
     */
    async sendRequest(emailData, options = {}) {
        const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.makeHttpRequest(emailData);
                
                if (response.status >= 200 && response.status < 300) {
                    // SendGrid returns 202 for successful sends
                    return {
                        success: true,
                        messageId: response.headers['x-message-id'],
                        status: response.status,
                        attempt
                    };
                } else {
                    const errorText = await response.text();
                    throw new Error(`SendGrid API error (${response.status}): ${errorText}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`Email send attempt ${attempt} failed:`, error.message);
                
                // Don't retry for client errors (4xx)
                if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
                    break;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.min(
                        this.retryConfig.initialDelay * Math.pow(2, attempt - 1),
                        this.retryConfig.maxDelay
                    );
                    await this.sleep(delay);
                }
            }
        }

        throw new Error(`Email send failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Make HTTP request to SendGrid API
     */
    async makeHttpRequest(emailData) {
        const fetch = globalThis.fetch || require('node-fetch');
        
        return fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'WebhookSystem/1.0'
            },
            body: JSON.stringify(emailData)
        });
    }

    /**
     * Convert HTML to plain text
     */
    htmlToText(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        return html
            // Remove HTML tags
            .replace(/<[^>]*>/g, '')
            // Replace HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Collapse multiple whitespace
            .replace(/\s+/g, ' ')
            // Trim
            .trim();
    }

    /**
     * Validate email address
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Get email delivery statistics
     */
    async getStats(options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not properly configured');
        }

        try {
            const fetch = globalThis.fetch || require('node-fetch');
            
            // Build query parameters
            const params = new URLSearchParams();
            if (options.startDate) params.append('start_date', options.startDate);
            if (options.endDate) params.append('end_date', options.endDate);
            if (options.aggregatedBy) params.append('aggregated_by', options.aggregatedBy);

            const url = `https://api.sendgrid.com/v3/stats?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'User-Agent': 'WebhookSystem/1.0'
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get email stats: ${response.status}`);
            }
        } catch (error) {
            console.error('Error getting email stats:', error);
            throw error;
        }
    }

    /**
     * Test the email service configuration
     */
    async testConnection() {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Service not configured'
            };
        }

        try {
            // Test by sending a simple email to a test address
            const testEmail = {
                personalizations: [{
                    to: [{ email: this.fromEmail }],
                    subject: 'Test Email - Webhook System'
                }],
                from: {
                    email: this.fromEmail,
                    name: config.shop.name
                },
                content: [{
                    type: 'text/plain',
                    value: 'This is a test email to verify the email service configuration.'
                }]
            };

            const response = await this.makeHttpRequest(testEmail);
            
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    status: response.status,
                    messageId: response.headers['x-message-id']
                };
            } else {
                return {
                    success: false,
                    error: `API responded with status ${response.status}`
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Utility: Sleep function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Build email from template data (for webhook integration)
     */
    buildOrderEmail(orderData, eventType = 'order_created') {
        const templates = {
            order_created: {
                subject: `Order Confirmation - ${orderData.order?.name}`,
                htmlTemplate: this.getOrderCreatedHtmlTemplate(),
                greeting: 'Thank you for your order!'
            },
            order_fulfilled: {
                subject: `Your order ${orderData.order?.name} is on the way!`,
                htmlTemplate: this.getOrderFulfilledHtmlTemplate(),
                greeting: 'Great news! Your order has been shipped.'
            },
            order_cancelled: {
                subject: `Order Cancellation - ${orderData.order?.name}`,
                htmlTemplate: this.getOrderCancelledHtmlTemplate(),
                greeting: 'Your order has been cancelled as requested.'
            }
        };

        const template = templates[eventType];
        if (!template) {
            throw new Error(`No email template found for event type: ${eventType}`);
        }

        // Replace template variables
        let htmlContent = template.htmlTemplate
            .replace(/\{\{shop_name\}\}/g, config.shop.name)
            .replace(/\{\{order_id\}\}/g, orderData.order?.name || 'N/A')
            .replace(/\{\{customer_name\}\}/g, orderData.customer?.name || 'Customer')
            .replace(/\{\{order_total\}\}/g, orderData.totals?.formatted?.total || 'N/A')
            .replace(/\{\{greeting\}\}/g, template.greeting);

        return {
            subject: template.subject,
            html: htmlContent,
            text: this.htmlToText(htmlContent)
        };
    }

    /**
     * Get basic HTML template for order confirmation
     */
    getOrderCreatedHtmlTemplate() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { text-align: center; padding: 20px; color: #6B7280; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{{greeting}}</h1>
                <p>Order {{order_id}}</p>
            </div>
            <div class="content">
                <p>Hi {{customer_name}},</p>
                <p>Your order has been confirmed and will be processed soon.</p>
                <p><strong>Order Total:</strong> {{order_total}}</p>
                <p>We'll send you updates as your order progresses.</p>
            </div>
            <div class="footer">
                <p>{{shop_name}}</p>
            </div>
        </body>
        </html>`;
    }

    getOrderFulfilledHtmlTemplate() {
        return this.getOrderCreatedHtmlTemplate()
            .replace('{{greeting}}', 'Your order is on the way!')
            .replace('Your order has been confirmed', 'Your order has been shipped');
    }

    getOrderCancelledHtmlTemplate() {
        return this.getOrderCreatedHtmlTemplate()
            .replace('{{greeting}}', 'Order Cancelled')
            .replace('Your order has been confirmed', 'Your order has been cancelled');
    }
}

module.exports = EmailService;
