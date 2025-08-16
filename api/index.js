/**
 * Vercel Serverless Function Handler for Webhook System
 * This file adapts our Express app to work with Vercel's serverless functions
 */

// Load environment variables (for local development)
try {
    require('dotenv').config();
} catch (error) {
    // dotenv is optional in production
    console.log('dotenv not available, using environment variables directly');
}

const WebhookApp = require('../app');

// Create the webhook app instance
const webhookAppInstance = new WebhookApp({
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    shopName: process.env.SHOP_NAME || 'MazayLO',
    supportPhone: process.env.SUPPORT_PHONE || '+92-300-1234567',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@mazaylo.com',
    websiteUrl: process.env.WEBSITE_URL || 'https://mazaylo.com',
    enableLogging: true
});

// Get the Express app instance
const app = webhookAppInstance.getApp();

// Export the handler for Vercel
module.exports = app;
