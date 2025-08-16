/**
 * WhatsApp Business API Service
 * Handles sending messages via WhatsApp Business API
 */

const config = require('../../config/config');

class WhatsAppService {
    constructor(options = {}) {
        const whatsappConfig = config.getServiceConfig('whatsapp') || {};
        
        this.accessToken = options.accessToken || whatsappConfig.accessToken;
        this.phoneNumberId = options.phoneId || whatsappConfig.phoneId;
        this.verifyToken = options.verifyToken || whatsappConfig.verifyToken;
        this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
        this.enabled = options.enabled !== undefined ? options.enabled : whatsappConfig.enabled;
        
        this.retryConfig = {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000
        };
    }

    /**
     * Check if WhatsApp service is properly configured
     */
    isConfigured() {
        return !!(this.accessToken && this.phoneNumberId && this.enabled);
    }

    /**
     * Send text message
     */
    async sendMessage(to, message, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('WhatsApp service is not properly configured');
        }

        const phoneNumber = this.formatPhoneNumber(to);
        if (!phoneNumber) {
            throw new Error('Invalid phone number format');
        }

        const payload = {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: {
                preview_url: options.previewUrl || false,
                body: message
            }
        };

        return this.sendRequest(payload, options);
    }

    /**
     * Send template message
     */
    async sendTemplateMessage(to, templateName, templateData = {}, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('WhatsApp service is not properly configured');
        }

        const phoneNumber = this.formatPhoneNumber(to);
        if (!phoneNumber) {
            throw new Error('Invalid phone number format');
        }

        const payload = {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'template',
            template: {
                name: templateName,
                language: { code: options.language || 'en' },
                components: this.buildTemplateComponents(templateData)
            }
        };

        return this.sendRequest(payload, options);
    }

    /**
     * Send media message (image, document, etc.)
     */
    async sendMediaMessage(to, mediaType, mediaUrl, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('WhatsApp service is not properly configured');
        }

        const phoneNumber = this.formatPhoneNumber(to);
        const supportedTypes = ['image', 'document', 'audio', 'video'];
        
        if (!supportedTypes.includes(mediaType)) {
            throw new Error(`Unsupported media type: ${mediaType}`);
        }

        const payload = {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: mediaType,
            [mediaType]: {
                link: mediaUrl,
                caption: options.caption || undefined
            }
        };

        return this.sendRequest(payload, options);
    }

    /**
     * Send request to WhatsApp API with retry logic
     */
    async sendRequest(payload, options = {}) {
        const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.makeHttpRequest(payload);
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        success: true,
                        messageId: data.messages?.[0]?.id,
                        whatsappId: data.messages?.[0]?.wa_id,
                        response: data,
                        attempt
                    };
                } else {
                    const errorData = await response.json();
                    throw new Error(`WhatsApp API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`WhatsApp send attempt ${attempt} failed:`, error.message);
                
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

        throw new Error(`WhatsApp message failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Make HTTP request to WhatsApp API
     */
    async makeHttpRequest(payload) {
        // In a real environment, use node-fetch or axios
        // For this implementation, we'll use Node.js built-in fetch (Node 18+)
        
        const fetch = globalThis.fetch || require('node-fetch');
        
        return fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'WebhookSystem/1.0'
            },
            body: JSON.stringify(payload)
        });
    }

    /**
     * Format phone number for WhatsApp API
     */
    formatPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            return null;
        }

        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        // Pakistan phone number formatting
        if (digits.startsWith('92')) {
            return digits;
        } else if (digits.startsWith('0') && digits.length === 11) {
            return '92' + digits.substring(1);
        } else if (digits.startsWith('3') && digits.length === 10) {
            return '92' + digits;
        } else if (digits.length === 10 && !digits.startsWith('0')) {
            return '92' + digits;
        }
        
        // International format (assume it's already correct if it doesn't match Pakistan patterns)
        if (digits.length >= 10) {
            return digits;
        }
        
        return null;
    }

    /**
     * Build template components from data
     */
    buildTemplateComponents(templateData) {
        const components = [];

        if (templateData.header) {
            components.push({
                type: 'header',
                parameters: Array.isArray(templateData.header) 
                    ? templateData.header.map(value => ({ type: 'text', text: String(value) }))
                    : [{ type: 'text', text: String(templateData.header) }]
            });
        }

        if (templateData.body) {
            components.push({
                type: 'body',
                parameters: Array.isArray(templateData.body) 
                    ? templateData.body.map(value => ({ type: 'text', text: String(value) }))
                    : [{ type: 'text', text: String(templateData.body) }]
            });
        }

        if (templateData.buttons) {
            templateData.buttons.forEach((button, index) => {
                components.push({
                    type: 'button',
                    sub_type: button.type || 'quick_reply',
                    index: index.toString(),
                    parameters: [{ type: 'payload', payload: button.payload || '' }]
                });
            });
        }

        return components;
    }

    /**
     * Verify webhook signature (for receiving webhooks from WhatsApp)
     */
    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === this.verifyToken) {
            console.log('✅ WhatsApp webhook verified');
            return challenge;
        }
        
        console.error('❌ WhatsApp webhook verification failed');
        throw new Error('Webhook verification failed');
    }

    /**
     * Process incoming WhatsApp webhook
     */
    processIncomingWebhook(webhookData) {
        try {
            const changes = webhookData.entry?.[0]?.changes?.[0];
            if (!changes) return null;

            const messages = changes.value?.messages || [];
            const statuses = changes.value?.statuses || [];

            const result = {
                messages: messages.map(msg => ({
                    id: msg.id,
                    from: msg.from,
                    timestamp: msg.timestamp,
                    type: msg.type,
                    text: msg.text?.body,
                    media: msg.image || msg.document || msg.audio || msg.video
                })),
                statuses: statuses.map(status => ({
                    id: status.id,
                    status: status.status,
                    timestamp: status.timestamp,
                    recipientId: status.recipient_id
                }))
            };

            return result;
        } catch (error) {
            console.error('Error processing WhatsApp webhook:', error);
            return null;
        }
    }

    /**
     * Get message status
     */
    async getMessageStatus(messageId) {
        if (!this.isConfigured()) {
            throw new Error('WhatsApp service is not properly configured');
        }

        try {
            const fetch = globalThis.fetch || require('node-fetch');
            const response = await fetch(`https://graph.facebook.com/v18.0/${messageId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'WebhookSystem/1.0'
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get message status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error getting message status:', error);
            throw error;
        }
    }

    /**
     * Utility: Sleep function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test the WhatsApp service configuration
     */
    async testConnection() {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Service not configured'
            };
        }

        try {
            // Test by getting phone number info
            const fetch = globalThis.fetch || require('node-fetch');
            const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'WebhookSystem/1.0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    phoneNumber: data.display_phone_number,
                    status: data.status
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
}

module.exports = WhatsAppService;
