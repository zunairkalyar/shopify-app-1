/**
 * SMS Service Implementation
 * Handles SMS sending using Twilio API
 */

const config = require('../../config/config');

class SMSService {
    constructor(options = {}) {
        const smsConfig = config.getServiceConfig('sms') || {};
        
        this.accountSid = options.accountSid || smsConfig.accountSid;
        this.authToken = options.authToken || smsConfig.authToken;
        this.fromNumber = options.phoneNumber || smsConfig.phoneNumber;
        this.enabled = options.enabled !== undefined ? options.enabled : smsConfig.enabled;
        this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
        
        this.retryConfig = {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 5000
        };
    }

    /**
     * Check if SMS service is properly configured
     */
    isConfigured() {
        return !!(this.accountSid && this.authToken && this.fromNumber && this.enabled);
    }

    /**
     * Send SMS message
     */
    async sendSMS(to, message, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('SMS service is not properly configured');
        }

        // Validate message length (SMS limit is 160 characters for GSM, 70 for Unicode)
        if (message.length > 1600) { // Twilio allows concatenated messages up to 1600 chars
            throw new Error('Message is too long for SMS (max 1600 characters)');
        }

        const phoneNumber = this.formatPhoneNumber(to);
        if (!phoneNumber) {
            throw new Error('Invalid phone number format');
        }

        const messageData = {
            From: options.from || this.fromNumber,
            To: phoneNumber,
            Body: message
        };

        // Add optional parameters
        if (options.mediaUrl) {
            messageData.MediaUrl = Array.isArray(options.mediaUrl) 
                ? options.mediaUrl 
                : [options.mediaUrl];
        }

        if (options.statusCallback) {
            messageData.StatusCallback = options.statusCallback;
        }

        if (options.messagingServiceSid) {
            messageData.MessagingServiceSid = options.messagingServiceSid;
            delete messageData.From; // Don't use From when using Messaging Service
        }

        return this.sendRequest(messageData, options);
    }

    /**
     * Send bulk SMS messages
     */
    async sendBulkSMS(recipients, message, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('SMS service is not properly configured');
        }

        const results = [];
        const batchSize = options.batchSize || 10; // Smaller batch size for SMS to avoid rate limits
        const delayBetweenMessages = options.delay || 100; // 100ms delay between messages

        // Process recipients in batches
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchResults = [];

            for (const recipient of batch) {
                try {
                    const phoneNumber = typeof recipient === 'string' ? recipient : recipient.phone;
                    const personalizedMessage = typeof recipient === 'object' && recipient.message 
                        ? recipient.message 
                        : message;

                    const result = await this.sendSMS(phoneNumber, personalizedMessage, options);
                    batchResults.push({
                        phone: phoneNumber,
                        success: true,
                        result
                    });
                } catch (error) {
                    batchResults.push({
                        phone: typeof recipient === 'string' ? recipient : recipient.phone,
                        success: false,
                        error: error.message
                    });
                }

                // Small delay between individual messages in the batch
                if (delayBetweenMessages > 0) {
                    await this.sleep(delayBetweenMessages);
                }
            }

            results.push({
                batch: Math.floor(i / batchSize) + 1,
                count: batch.length,
                results: batchResults
            });

            // Longer delay between batches
            if (i + batchSize < recipients.length) {
                await this.sleep(1000);
            }
        }

        return results;
    }

    /**
     * Send request to Twilio API with retry logic
     */
    async sendRequest(messageData, options = {}) {
        const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.makeHttpRequest(messageData);
                
                if (response.status >= 200 && response.status < 300) {
                    const data = await response.json();
                    return {
                        success: true,
                        messageId: data.sid,
                        status: data.status,
                        direction: data.direction,
                        price: data.price,
                        priceUnit: data.price_unit,
                        attempt
                    };
                } else {
                    const errorData = await response.json();
                    throw new Error(`Twilio API error (${response.status}): ${errorData.message || 'Unknown error'}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`SMS send attempt ${attempt} failed:`, error.message);
                
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

        throw new Error(`SMS send failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Make HTTP request to Twilio API
     */
    async makeHttpRequest(messageData) {
        const fetch = globalThis.fetch || require('node-fetch');
        
        // Twilio uses basic auth
        const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
        
        // Convert data to form-encoded
        const formData = new URLSearchParams();
        Object.keys(messageData).forEach(key => {
            if (Array.isArray(messageData[key])) {
                messageData[key].forEach(value => formData.append(key, value));
            } else {
                formData.append(key, messageData[key]);
            }
        });
        
        return fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'WebhookSystem/1.0'
            },
            body: formData
        });
    }

    /**
     * Format phone number for Twilio API
     */
    formatPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            return null;
        }

        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        // Pakistan phone number formatting
        if (digits.startsWith('92')) {
            return '+' + digits;
        } else if (digits.startsWith('0') && digits.length === 11) {
            return '+92' + digits.substring(1);
        } else if (digits.startsWith('3') && digits.length === 10) {
            return '+92' + digits;
        } else if (digits.length === 10 && !digits.startsWith('0')) {
            return '+92' + digits;
        }
        
        // International format (assume it's already correct if it doesn't match Pakistan patterns)
        if (digits.length >= 10) {
            return digits.startsWith('+') ? phone : '+' + digits;
        }
        
        return null;
    }

    /**
     * Get message status
     */
    async getMessageStatus(messageId) {
        if (!this.isConfigured()) {
            throw new Error('SMS service is not properly configured');
        }

        try {
            const fetch = globalThis.fetch || require('node-fetch');
            const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            
            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${messageId}.json`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'User-Agent': 'WebhookSystem/1.0'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                return {
                    sid: data.sid,
                    status: data.status,
                    direction: data.direction,
                    errorCode: data.error_code,
                    errorMessage: data.error_message,
                    price: data.price,
                    priceUnit: data.price_unit,
                    dateCreated: data.date_created,
                    dateUpdated: data.date_updated,
                    dateSent: data.date_sent
                };
            } else {
                throw new Error(`Failed to get message status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error getting message status:', error);
            throw error;
        }
    }

    /**
     * Get account information
     */
    async getAccountInfo() {
        if (!this.isConfigured()) {
            throw new Error('SMS service is not properly configured');
        }

        try {
            const fetch = globalThis.fetch || require('node-fetch');
            const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            
            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'User-Agent': 'WebhookSystem/1.0'
                    }
                }
            );

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get account info: ${response.status}`);
            }
        } catch (error) {
            console.error('Error getting account info:', error);
            throw error;
        }
    }

    /**
     * Test the SMS service configuration
     */
    async testConnection() {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Service not configured'
            };
        }

        try {
            // Test by getting account information
            const accountInfo = await this.getAccountInfo();
            return {
                success: true,
                accountSid: accountInfo.sid,
                accountStatus: accountInfo.status,
                fromNumber: this.fromNumber
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate phone number format
     */
    validatePhoneNumber(phone) {
        const formatted = this.formatPhoneNumber(phone);
        return formatted !== null;
    }

    /**
     * Calculate message segments (for pricing estimation)
     */
    calculateMessageSegments(message) {
        // GSM 7-bit characters
        const gsmChars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà]*$/;
        
        const isGsm = gsmChars.test(message);
        const maxSingleSegment = isGsm ? 160 : 70;
        const maxMultiSegment = isGsm ? 153 : 67; // Accounting for UDH header
        
        if (message.length <= maxSingleSegment) {
            return {
                segments: 1,
                encoding: isGsm ? 'GSM-7' : 'UCS-2',
                totalCharacters: message.length,
                charactersPerSegment: maxSingleSegment
            };
        } else {
            const segments = Math.ceil(message.length / maxMultiSegment);
            return {
                segments,
                encoding: isGsm ? 'GSM-7' : 'UCS-2',
                totalCharacters: message.length,
                charactersPerSegment: maxMultiSegment
            };
        }
    }

    /**
     * Build SMS from template data (for webhook integration)
     */
    buildOrderSMS(orderData, eventType = 'order_created') {
        const templates = {
            order_created: `Order ${orderData.order?.name || 'N/A'} confirmed! Total: ${orderData.totals?.formatted?.total || 'N/A'}. We'll send shipping updates soon. - ${config.shop.name}`,
            order_fulfilled: `Order ${orderData.order?.name || 'N/A'} shipped! ${orderData.fulfillment?.tracking_info?.[0]?.tracking_number ? `Track: ${orderData.fulfillment.tracking_info[0].tracking_number}` : ''} Expected delivery: 1-3 days. - ${config.shop.name}`,
            order_cancelled: `Order ${orderData.order?.name || 'N/A'} cancelled. Refund of ${orderData.totals?.formatted?.total || 'N/A'} will be processed in 3-7 days. - ${config.shop.name}`
        };

        const message = templates[eventType];
        if (!message) {
            throw new Error(`No SMS template found for event type: ${eventType}`);
        }

        const segments = this.calculateMessageSegments(message);
        
        return {
            message,
            segments: segments.segments,
            encoding: segments.encoding,
            length: message.length
        };
    }

    /**
     * Utility: Sleep function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get recent messages from Twilio
     */
    async getRecentMessages(options = {}) {
        if (!this.isConfigured()) {
            throw new Error('SMS service is not properly configured');
        }

        try {
            const fetch = globalThis.fetch || require('node-fetch');
            const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            
            // Build query parameters
            const params = new URLSearchParams();
            if (options.from) params.append('From', options.from);
            if (options.to) params.append('To', options.to);
            if (options.dateSent) params.append('DateSent', options.dateSent);
            if (options.pageSize) params.append('PageSize', options.pageSize.toString());
            
            const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'User-Agent': 'WebhookSystem/1.0'
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get messages: ${response.status}`);
            }
        } catch (error) {
            console.error('Error getting recent messages:', error);
            throw error;
        }
    }
}

module.exports = SMSService;
