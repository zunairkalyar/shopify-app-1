#!/usr/bin/env node

/**
 * Test Suite for Webhook System
 * Basic tests to verify system components work correctly
 */

const fs = require('fs');
const path = require('path');

// Import our modules
const DataOrganizer = require('../src/organizers/DataOrganizer');
const MessageTemplates = require('../src/templates/MessageTemplates');

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    failures: []
};

/**
 * Simple test assertion function
 */
function assert(condition, message) {
    testResults.total++;
    
    if (condition) {
        testResults.passed++;
        console.log(`✅ ${message}`);
        return true;
    } else {
        testResults.failed++;
        testResults.failures.push(message);
        console.log(`❌ ${message}`);
        return false;
    }
}

/**
 * Load sample order data for testing
 */
function loadSampleOrder() {
    try {
        const samplePath = path.join(__dirname, '../examples/sample-order.json');
        const rawData = fs.readFileSync(samplePath, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        // Return a basic fallback order for testing
        return {
            id: 12345678901,
            name: "#TEST001",
            order_number: 1001,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            financial_status: 'paid',
            fulfillment_status: null,
            currency: 'PKR',
            total_price: '2499.00',
            subtotal_price: '2299.00',
            total_discounts: '0.00',
            total_tax: '0.00',
            customer: {
                id: 123456,
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone: '+92-300-1234567'
            },
            line_items: [{
                id: 987654321,
                title: 'Test Product Premium',
                quantity: 1,
                price: '2299.00',
                sku: 'TEST-PREMIUM-001'
            }],
            shipping_address: {
                first_name: 'John',
                last_name: 'Doe',
                address1: '123 Test Avenue',
                city: 'Karachi',
                country: 'Pakistan',
                phone: '+92-300-1234567'
            },
            shipping_lines: [{
                title: 'Express Delivery',
                price: '200.00',
                code: 'express'
            }],
            payment_gateway_names: {
                0: 'Cash on Delivery (COD)'
            }
        };
    }
}

/**
 * Test DataOrganizer functionality
 */
function testDataOrganizer() {
    console.log('\n📊 Testing DataOrganizer...');
    
    const organizer = new DataOrganizer({
        currencySymbol: 'PKR',
        timezone: 'Asia/Karachi'
    });

    const sampleOrder = loadSampleOrder();

    // Test organization of order creation
    const organizedData = organizer.organize(sampleOrder, 'orders/create');
    
    assert(organizedData !== null, 'DataOrganizer should organize data successfully');
    assert(organizedData.type === 'order_created', 'Should set correct event type');
    assert(organizedData.order !== undefined, 'Should have order information');
    assert(organizedData.customer !== undefined, 'Should have customer information');
    assert(organizedData.products !== undefined, 'Should have products information');
    assert(organizedData.totals !== undefined, 'Should have totals information');
    
    // Test specific data fields
    assert(organizedData.order.name !== undefined, 'Should have order name/ID');
    assert(organizedData.customer.name !== undefined, 'Should have customer name');
    assert(organizedData.totals.formatted.total !== undefined, 'Should have formatted total');
    
    // Test currency formatting
    const formattedTotal = organizedData.totals.formatted.total;
    assert(formattedTotal.includes('PKR'), 'Should include PKR currency');
    
    // Test validation
    organizer.reset();
    const invalidData = { invalid: 'data' };
    const invalidResult = organizer.organize(invalidData, 'orders/create');
    assert(invalidResult === null, 'Should reject invalid data');
    assert(organizer.getErrors().length > 0, 'Should report validation errors');
    
    // Test getSummary
    organizer.reset();
    organizer.organize(sampleOrder, 'orders/create');
    const summary = organizer.getSummary();
    assert(summary !== null, 'Should provide data summary');
    assert(summary.order_id !== undefined, 'Summary should have order ID');
    
    console.log('   DataOrganizer tests completed');
}

/**
 * Test MessageTemplates functionality
 */
function testMessageTemplates() {
    console.log('\n📧 Testing MessageTemplates...');
    
    const templates = new MessageTemplates({
        shopName: 'Test Store',
        supportPhone: '+92-300-1234567',
        supportEmail: 'support@teststore.com',
        websiteUrl: 'https://teststore.com'
    });

    const organizer = new DataOrganizer();
    const sampleOrder = loadSampleOrder();
    const organizedData = organizer.organize(sampleOrder, 'orders/create');

    // Test WhatsApp message generation
    const whatsappMessage = templates.generateMessage(
        'order_created', 
        'whatsapp', 
        organizedData, 
        'message'
    );
    
    assert(whatsappMessage.success === true, 'Should generate WhatsApp message successfully');
    assert(typeof whatsappMessage.data === 'string', 'WhatsApp message should be a string');
    assert(whatsappMessage.data.includes('Order Confirmed'), 'WhatsApp message should include confirmation text');
    
    // Test Email message generation
    const emailMessage = templates.generateMessage(
        'order_created',
        'email',
        organizedData,
        'message'
    );
    
    assert(emailMessage.success === true, 'Should generate email message successfully');
    assert(typeof emailMessage.data === 'object', 'Email message should be an object');
    assert(emailMessage.data.subject !== undefined, 'Email should have subject');
    assert(emailMessage.data.html !== undefined, 'Email should have HTML content');
    
    // Test SMS message generation
    const smsMessage = templates.generateMessage(
        'order_created',
        'sms',
        organizedData,
        'message'
    );
    
    assert(smsMessage.success === true, 'Should generate SMS message successfully');
    assert(typeof smsMessage.data === 'string', 'SMS message should be a string');
    
    // Test all formats generation
    const allFormats = templates.generateAllFormats('order_created', organizedData);
    assert(allFormats.messages.whatsapp !== undefined, 'Should generate all formats - WhatsApp');
    assert(allFormats.messages.email !== undefined, 'Should generate all formats - Email');
    assert(allFormats.messages.sms !== undefined, 'Should generate all formats - SMS');
    
    // Test custom template
    templates.addCustomTemplate(
        'order_created',
        'whatsapp',
        'message',
        'Custom test message: {{order_id}} for {{customer_name}}'
    );
    
    const customMessage = templates.generateMessage(
        'order_created',
        'whatsapp',
        organizedData,
        'message'
    );
    
    assert(customMessage.success === true, 'Should use custom template');
    assert(customMessage.data.includes('Custom test message'), 'Should use custom template content');
    
    // Test template preview
    const preview = templates.previewTemplate('order_created', 'whatsapp', 'message');
    assert(preview.success === true, 'Should generate template preview');
    
    // Test list templates
    const templateList = templates.listTemplates();
    assert(Array.isArray(templateList), 'Should return array of templates');
    assert(templateList.length > 0, 'Should have available templates');
    
    console.log('   MessageTemplates tests completed');
}

/**
 * Test integration between components
 */
function testIntegration() {
    console.log('\n🔗 Testing Integration...');
    
    const organizer = new DataOrganizer({
        currencySymbol: 'PKR',
        timezone: 'Asia/Karachi'
    });
    
    const templates = new MessageTemplates({
        shopName: 'MazayLO',
        supportPhone: '+92-300-1234567',
        supportEmail: 'support@mazaylo.com',
        websiteUrl: 'https://mazaylo.com'
    });
    
    const sampleOrder = loadSampleOrder();
    
    // Full integration test: organize data and generate messages
    const organizedData = organizer.organize(sampleOrder, 'orders/create');
    assert(organizedData !== null, 'Integration: Should organize data');
    
    const allMessages = templates.generateAllFormats('order_created', organizedData);
    assert(allMessages.messages !== undefined, 'Integration: Should generate all message formats');
    
    // Test template variables are populated
    const whatsappMsg = allMessages.messages.whatsapp?.message;
    if (whatsappMsg && typeof whatsappMsg === 'string') {
        assert(!whatsappMsg.includes('{{'), 'Integration: Should populate all template variables');
    }
    
    // Test different webhook types
    const fulfilledData = organizer.organize(sampleOrder, 'orders/fulfilled');
    const fulfilledMessages = templates.generateAllFormats('order_fulfilled', fulfilledData);
    assert(fulfilledMessages.messages !== undefined, 'Integration: Should handle fulfilled orders');
    
    console.log('   Integration tests completed');
}

/**
 * Performance test
 */
function testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    const organizer = new DataOrganizer();
    const templates = new MessageTemplates();
    const sampleOrder = loadSampleOrder();
    
    // Test processing speed
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
        const organizedData = organizer.organize(sampleOrder, 'orders/create');
        templates.generateAllFormats('order_created', organizedData);
        organizer.reset();
    }
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    const avgTime = processingTime / 100;
    
    console.log(`   Processed 100 webhooks in ${processingTime}ms`);
    console.log(`   Average processing time: ${avgTime.toFixed(2)}ms per webhook`);
    
    assert(avgTime < 100, 'Performance: Should process webhook in under 100ms');
    assert(processingTime < 5000, 'Performance: Should process 100 webhooks in under 5 seconds');
    
    console.log('   Performance tests completed');
}

/**
 * Test error handling
 */
function testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...');
    
    const organizer = new DataOrganizer();
    const templates = new MessageTemplates();
    
    // Test with null/undefined data
    let result = organizer.organize(null, 'orders/create');
    assert(result === null, 'Should handle null data gracefully');
    
    result = organizer.organize(undefined, 'orders/create');
    assert(result === null, 'Should handle undefined data gracefully');
    
    // Test with empty object
    result = organizer.organize({}, 'orders/create');
    assert(result === null, 'Should handle empty object gracefully');
    
    // Test with missing required fields
    result = organizer.organize({ id: 123 }, 'orders/create');
    assert(result === null, 'Should handle missing required fields');
    
    // Test invalid template generation
    const invalidMessage = templates.generateMessage(
        'invalid_event',
        'invalid_format',
        {},
        'invalid_type'
    );
    assert(invalidMessage.success === false, 'Should handle invalid template requests');
    
    console.log('   Error handling tests completed');
}

/**
 * Test file system operations
 */
function testFileSystem() {
    console.log('\n📁 Testing File System...');
    
    // Test sample data loading
    const sampleOrder = loadSampleOrder();
    assert(sampleOrder !== null, 'Should load sample order data');
    assert(sampleOrder.id !== undefined, 'Sample data should have order ID');
    
    // Test module loading
    assert(DataOrganizer !== undefined, 'Should load DataOrganizer module');
    assert(MessageTemplates !== undefined, 'Should load MessageTemplates module');
    
    console.log('   File system tests completed');
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🧪 Starting Webhook System Tests');
    console.log('==================================\n');
    
    const startTime = Date.now();
    
    try {
        // Run test suites
        testFileSystem();
        testDataOrganizer();
        testMessageTemplates();
        testIntegration();
        testErrorHandling();
        testPerformance();
        
    } catch (error) {
        console.error(`\n💥 Test suite failed with error: ${error.message}`);
        testResults.failed++;
        testResults.failures.push(`Test suite error: ${error.message}`);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Print results
    console.log('\n📊 Test Results');
    console.log('================');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total:  ${testResults.total}`);
    console.log(`⏱️ Time:   ${totalTime}ms`);
    
    if (testResults.failed > 0) {
        console.log('\n💥 Failed Tests:');
        testResults.failures.forEach((failure, index) => {
            console.log(`   ${index + 1}. ${failure}`);
        });
    }
    
    const successRate = testResults.total > 0 ? 
        ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
        
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 All tests passed! System is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

/**
 * Show test help
 */
function showHelp() {
    console.log(`
🧪 Webhook System Test Suite

📖 Usage: node test-webhook-system.js [options]

🏃‍♂️ Options:
   --help, -h     Show this help message
   
🔍 Test Categories:
   • File System    - Module loading and data access
   • DataOrganizer  - Webhook data processing
   • MessageTemplates - Message generation
   • Integration    - Component interaction
   • Error Handling - Graceful failure management
   • Performance   - Speed and efficiency

📊 Output:
   • ✅ Individual test results
   • 📈 Summary statistics
   • ⚡ Performance metrics
   • 💥 Failure details

🚀 Quick Start:
   npm test
   
📝 Example Output:
   ✅ DataOrganizer should organize data successfully
   ❌ Should handle invalid webhook type
   📊 Test Results: 85/90 passed (94.4% success rate)
`);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runTests,
    testDataOrganizer,
    testMessageTemplates,
    testIntegration,
    loadSampleOrder
};
