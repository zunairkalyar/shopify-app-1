#!/usr/bin/env node

/**
 * Send Test Webhook Script
 * Sends sample webhook data to the webhook system for testing
 */

const fs = require('fs');
const path = require('path');

// Simple HTTP request function (no external dependencies)
function sendHttpRequest(url, options = {}) {
    const urlLib = require('url');
    const http = require('http');
    const https = require('https');
    
    return new Promise((resolve, reject) => {
        const urlObj = urlLib.parse(url);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.path,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        if (options.body) {
            requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
        }

        const req = lib.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

/**
 * Load sample order data
 */
function loadSampleData() {
    try {
        const samplePath = path.join(__dirname, 'sample-order.json');
        const rawData = fs.readFileSync(samplePath, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('❌ Failed to load sample data:', error.message);
        
        // Return a basic fallback order
        return {
            id: Date.now(),
            name: `#${Math.floor(Math.random() * 9000) + 1000}`,
            order_number: Math.floor(Math.random() * 9000) + 1000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            financial_status: 'paid',
            fulfillment_status: null,
            currency: 'PKR',
            total_price: '1999.00',
            subtotal_price: '1799.00',
            total_discounts: '0.00',
            total_tax: '0.00',
            customer: {
                id: Math.floor(Math.random() * 1000000),
                first_name: 'Test',
                last_name: 'Customer',
                email: 'test@example.com',
                phone: '+92-300-1234567'
            },
            line_items: [{
                id: Math.floor(Math.random() * 1000000),
                title: 'Test Product',
                quantity: 1,
                price: '1799.00',
                sku: 'TEST-001'
            }],
            shipping_address: {
                first_name: 'Test',
                last_name: 'Customer',
                address1: '123 Test Street',
                city: 'Test City',
                country: 'Pakistan',
                phone: '+92-300-1234567'
            },
            shipping_lines: [{
                title: 'Standard Delivery',
                price: '200.00',
                code: 'standard'
            }],
            payment_gateway_names: {
                0: 'Cash on Delivery (COD)'
            }
        };
    }
}

/**
 * Send webhook to specified endpoint
 */
async function sendWebhook(webhookType, baseUrl = 'http://localhost:3000') {
    const orderData = loadSampleData();
    
    // Map webhook types to endpoints
    const endpoints = {
        'order-create': '/api/webhooks/order-create',
        'order-fulfilled': '/api/webhooks/order-fulfilled',
        'order-cancelled': '/api/webhooks/order-cancelled',
        'generic': '/api/webhooks/generic'
    };

    const endpoint = endpoints[webhookType];
    if (!endpoint) {
        throw new Error(`Unknown webhook type: ${webhookType}`);
    }

    const url = `${baseUrl}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': webhookType.replace('-', 's/'),
        'X-Shopify-Shop-Domain': 'mazaylo.myshopify.com',
        'X-Shopify-Webhook-Id': `test-webhook-${Date.now()}`,
        'X-Shopify-API-Version': '2023-10',
        'User-Agent': 'Shopify/1.0 (https://mazaylo.myshopify.com; +https://help.shopify.com/webhooks)'
    };

    console.log(`🚀 Sending ${webhookType} webhook to ${url}...`);
    console.log(`📦 Order ID: ${orderData.name || orderData.id}`);
    console.log(`👤 Customer: ${orderData.customer?.first_name} ${orderData.customer?.last_name}`);
    console.log(`💰 Total: ${orderData.currency} ${orderData.total_price}`);

    try {
        const response = await sendHttpRequest(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(orderData)
        });

        console.log('\n✅ Webhook sent successfully!');
        console.log(`📈 Status: ${response.status}`);
        
        if (response.data) {
            if (typeof response.data === 'object') {
                console.log('📄 Response:');
                console.log(`   Webhook ID: ${response.data.webhook_id}`);
                console.log(`   Event Type: ${response.data.event_type}`);
                console.log(`   Processing Time: ${response.data.processing_time_ms}ms`);
                
                if (response.data.success) {
                    console.log(`   Order: ${response.data.order_id}`);
                    console.log(`   Customer: ${response.data.customer}`);
                    console.log(`   Total: ${response.data.total}`);
                } else {
                    console.log(`   Error: ${response.data.error}`);
                }
            } else {
                console.log(`📄 Response: ${response.data}`);
            }
        }

        return response;

    } catch (error) {
        console.error(`❌ Failed to send webhook: ${error.message}`);
        console.error('💡 Make sure the webhook server is running on http://localhost:3000');
        throw error;
    }
}

/**
 * Test all webhook types
 */
async function testAllWebhooks(baseUrl) {
    const webhookTypes = ['order-create', 'order-fulfilled', 'order-cancelled'];
    
    console.log('🧪 Testing all webhook types...\n');
    
    for (const webhookType of webhookTypes) {
        try {
            await sendWebhook(webhookType, baseUrl);
            console.log(''); // Add spacing between tests
        } catch (error) {
            console.error(`Failed to test ${webhookType}: ${error.message}\n`);
        }
    }
}

/**
 * Check if server is running
 */
async function checkServerHealth(baseUrl) {
    try {
        const response = await sendHttpRequest(`${baseUrl}/health`);
        
        if (response.status === 200 && response.data) {
            console.log('✅ Server is running');
            console.log(`📊 Status: ${response.data.status}`);
            console.log(`📈 Uptime: ${Math.round(response.data.uptime)}s`);
            console.log(`📦 Webhooks Stored: ${response.data.webhooksStored}`);
            return true;
        } else {
            console.log('⚠️ Server is responding but may not be healthy');
            return false;
        }
    } catch (error) {
        console.log('❌ Server is not responding');
        console.log('💡 Start the server with: npm start');
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const webhookType = args[0] || 'order-create';
    const baseUrl = args[1] || 'http://localhost:3000';

    console.log('🎯 Webhook Test Script');
    console.log('======================');
    console.log(`📍 Server: ${baseUrl}`);
    console.log(`🔗 Webhook Type: ${webhookType}`);
    console.log('');

    // Check server health first
    console.log('🔍 Checking server status...');
    const serverHealthy = await checkServerHealth(baseUrl);
    console.log('');

    if (!serverHealthy) {
        process.exit(1);
    }

    // Send webhook(s)
    try {
        if (webhookType === 'all') {
            await testAllWebhooks(baseUrl);
        } else {
            await sendWebhook(webhookType, baseUrl);
        }

        console.log('\n🎉 Test completed successfully!');
        console.log(`🌐 View dashboard: ${baseUrl}`);
        
    } catch (error) {
        console.error(`\n💥 Test failed: ${error.message}`);
        process.exit(1);
    }
}

// Show usage information
function showUsage() {
    console.log(`
📖 Usage: node send-test-webhook.js [webhook-type] [server-url]

🔗 Webhook Types:
   • order-create    - New order placed (default)
   • order-fulfilled - Order shipped
   • order-cancelled - Order cancelled
   • all            - Test all webhook types

📍 Server URL:
   • Default: http://localhost:3000
   • Example: http://your-server.com:8080

📚 Examples:
   node send-test-webhook.js
   node send-test-webhook.js order-fulfilled
   node send-test-webhook.js all
   node send-test-webhook.js order-create http://localhost:8080
   
🚀 Quick Start:
   1. Start the webhook server: npm start
   2. Run this script: npm run example
   3. Check the dashboard: http://localhost:3000
`);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    sendWebhook,
    testAllWebhooks,
    checkServerHealth,
    loadSampleData
};
