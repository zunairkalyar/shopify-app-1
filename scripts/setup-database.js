#!/usr/bin/env node

/**
 * Database Setup Script
 * Initializes the database schema and creates initial data
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DatabaseService = require('../src/services/DatabaseService');
const config = require('../config/config');

async function setupDatabase() {
    console.log('🚀 Starting database setup...\n');

    const dbService = new DatabaseService();
    
    try {
        // Check if database is configured
        if (!config.features.database) {
            console.log('💤 Database is disabled in configuration');
            console.log('💡 To enable database support:');
            console.log('   1. Set ENABLE_DATABASE=true in your .env file');
            console.log('   2. Configure DATABASE_URL with your connection string');
            console.log('   3. Run this script again\n');
            return;
        }

        if (!config.database.url) {
            console.log('❌ DATABASE_URL is not configured');
            console.log('💡 Add DATABASE_URL to your .env file:');
            console.log('   MongoDB: DATABASE_URL="mongodb://localhost:27017/webhook-system"');
            console.log('   PostgreSQL: DATABASE_URL="postgresql://user:password@localhost:5432/webhook_system"\n');
            return;
        }

        console.log(`🔧 Database Type: ${dbService.dbType}`);
        console.log(`📍 Database URL: ${config.database.url.replace(/\/\/[^:]*:[^@]*@/, '//***:***@')}\n`);

        // Connect to database
        console.log('🔌 Connecting to database...');
        await dbService.connect();

        // Initialize schema
        console.log('📊 Initializing database schema...');
        await dbService.initialize();

        // Test connection
        console.log('🧪 Testing database connection...');
        const testResult = await dbService.testConnection();
        
        if (testResult.success) {
            console.log('✅ Database test successful');
        } else {
            console.log('❌ Database test failed:', testResult.error);
        }

        // Create initial data if needed
        console.log('\n📝 Creating initial data...');
        await createInitialData(dbService);

        // Show database stats
        console.log('\n📈 Database Statistics:');
        const stats = await dbService.getWebhookStats();
        console.log(`   • Total webhooks: ${stats.total}`);
        console.log(`   • Successful: ${stats.successful}`);
        console.log(`   • Failed: ${stats.failed}`);
        console.log(`   • Today: ${stats.today || 0}`);

        console.log('\n✅ Database setup completed successfully!');
        console.log('\n🚀 Next steps:');
        console.log('   1. Start the webhook system: npm start');
        console.log('   2. Test webhooks: npm run example');
        console.log('   3. Visit dashboard: http://localhost:3000');

    } catch (error) {
        console.error('\n❌ Database setup failed:', error.message);
        console.error('\n💡 Troubleshooting tips:');
        console.error('   • Check if your database server is running');
        console.error('   • Verify connection string in .env file');
        console.error('   • Ensure database user has proper permissions');
        console.error('   • Check firewall settings');
        
        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n🔍 Connection refused - database server might not be running');
        }
        
        if (error.message.includes('authentication')) {
            console.error('\n🔍 Authentication failed - check username/password');
        }
        
        process.exit(1);
    } finally {
        // Close connection
        await dbService.close();
    }
}

/**
 * Create initial data for the system
 */
async function createInitialData(dbService) {
    try {
        if (dbService.dbType === 'mongodb') {
            await createInitialDataMongoDB(dbService);
        } else if (dbService.dbType === 'postgresql') {
            await createInitialDataPostgreSQL(dbService);
        }
    } catch (error) {
        console.error('⚠️ Failed to create initial data:', error.message);
    }
}

/**
 * Create initial data for MongoDB
 */
async function createInitialDataMongoDB(dbService) {
    const db = dbService.connection;
    
    // Create default settings
    const settingsCollection = db.collection('settings');
    const existingSettings = await settingsCollection.findOne({ key: 'app_version' });
    
    if (!existingSettings) {
        await settingsCollection.insertMany([
            {
                key: 'app_version',
                value: '1.0.0',
                description: 'Current application version',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                key: 'setup_completed',
                value: true,
                description: 'Database setup completion status',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                key: 'webhook_retention_days',
                value: 30,
                description: 'Number of days to retain webhook data',
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
        
        console.log('📄 Created default settings');
    }
}

/**
 * Create initial data for PostgreSQL
 */
async function createInitialDataPostgreSQL(dbService) {
    const db = dbService.connection;
    
    // Check if settings exist
    const existingSettings = await db.query(
        "SELECT COUNT(*) as count FROM settings WHERE key = 'app_version'"
    );
    
    if (parseInt(existingSettings.rows[0].count) === 0) {
        await db.query(`
            INSERT INTO settings (key, value, description) VALUES
            ('app_version', '"1.0.0"', 'Current application version'),
            ('setup_completed', 'true', 'Database setup completion status'),
            ('webhook_retention_days', '30', 'Number of days to retain webhook data')
        `);
        
        console.log('📄 Created default settings');
    }
}

/**
 * Show help information
 */
function showHelp() {
    console.log(`
🗄️ Database Setup Script

📖 Usage: node scripts/setup-database.js [options]

🔧 Options:
   --help, -h     Show this help message
   --force        Force recreate database schema
   --clean        Clean existing data before setup
   
🏃‍♂️ Examples:
   node scripts/setup-database.js
   npm run setup
   
📋 Requirements:
   • Node.js 16+ installed
   • Database server running (MongoDB or PostgreSQL)
   • Proper DATABASE_URL in .env file
   • Network access to database server

🔗 Database URLs:
   MongoDB:    mongodb://localhost:27017/webhook-system
   PostgreSQL: postgresql://user:pass@localhost:5432/webhook_system
   
🚀 Quick Start:
   1. Configure .env file with database settings
   2. Run this script to initialize database
   3. Start the application: npm start
`);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Main execution
if (require.main === module) {
    setupDatabase().catch(error => {
        console.error('💥 Setup script failed:', error);
        process.exit(1);
    });
}

module.exports = { setupDatabase, createInitialData };
