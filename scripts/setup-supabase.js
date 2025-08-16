/**
 * Supabase Database Setup Script
 * 
 * Creates the necessary tables for webhook analytics:
 * - webhook_orders: Stores order data from webhooks
 * - webhook_messages: Stores message delivery data
 * - webhook_analytics: Stores aggregated analytics data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SQL commands to create the tables
const createTablesSQL = [
    // Orders table
    `
    CREATE TABLE IF NOT EXISTS webhook_orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        order_number VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'created',
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        total_price DECIMAL(10, 2),
        currency VARCHAR(10) DEFAULT 'PKR',
        payment_status VARCHAR(50),
        items_count INTEGER DEFAULT 0,
        processing_time_ms INTEGER,
        webhook_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Messages table
    `
    CREATE TABLE IF NOT EXISTS webhook_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id VARCHAR(255),
        channel VARCHAR(50) NOT NULL, -- whatsapp, email, sms
        status VARCHAR(50) NOT NULL DEFAULT 'pending', -- sent, delivered, failed, pending
        recipient VARCHAR(255),
        content_type VARCHAR(50) DEFAULT 'text',
        delivery_time_ms INTEGER,
        error_message TEXT,
        message_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Analytics summary table
    `
    CREATE TABLE IF NOT EXISTS webhook_analytics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        date DATE NOT NULL,
        metric_type VARCHAR(50) NOT NULL, -- orders, messages, performance
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15, 2),
        metric_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(date, metric_type, metric_name)
    );
    `,
    
    // Webhooks processing log
    `
    CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        webhook_id VARCHAR(255) NOT NULL,
        webhook_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL, -- processed, failed
        processing_time_ms INTEGER,
        error_message TEXT,
        raw_data JSONB,
        processed_data JSONB,
        headers JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `
];

// Create indexes for better query performance
const createIndexesSQL = [
    `CREATE INDEX IF NOT EXISTS idx_webhook_orders_created_at ON webhook_orders(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_orders_status ON webhook_orders(status);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_orders_customer_email ON webhook_orders(customer_email);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_messages_created_at ON webhook_messages(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_messages_channel ON webhook_messages(channel);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_messages_status ON webhook_messages(status);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_messages_order_id ON webhook_messages(order_id);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_analytics_date ON webhook_analytics(date);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_analytics_metric_type ON webhook_analytics(metric_type);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_type ON webhook_logs(webhook_type);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);`
];

// Row Level Security (RLS) policies
const createRLSPolicies = [
    // Enable RLS on all tables
    `ALTER TABLE webhook_orders ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE webhook_messages ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE webhook_analytics ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;`,
    
    // Create policies to allow service role access
    `
    CREATE POLICY "Service role can manage orders" ON webhook_orders
    FOR ALL USING (auth.role() = 'service_role');
    `,
    `
    CREATE POLICY "Service role can manage messages" ON webhook_messages
    FOR ALL USING (auth.role() = 'service_role');
    `,
    `
    CREATE POLICY "Service role can manage analytics" ON webhook_analytics
    FOR ALL USING (auth.role() = 'service_role');
    `,
    `
    CREATE POLICY "Service role can manage logs" ON webhook_logs
    FOR ALL USING (auth.role() = 'service_role');
    `,
    
    // Allow anonymous read access to analytics (for dashboard)
    `
    CREATE POLICY "Anonymous can read analytics" ON webhook_analytics
    FOR SELECT USING (true);
    `
];

async function setupDatabase() {
    console.log('🚀 Setting up Supabase database for webhook analytics...\n');
    
    try {
        // Test connection
        console.log('🔍 Testing connection to Supabase...');
        const { data, error: testError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .limit(1);
            
        if (testError) {
            throw new Error(`Connection failed: ${testError.message}`);
        }
        console.log('✅ Connection successful!\n');
        
        // Create tables
        console.log('📊 Creating database tables...');
        for (let i = 0; i < createTablesSQL.length; i++) {
            const sql = createTablesSQL[i];
            const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || `table_${i + 1}`;
            
            console.log(`   Creating table: ${tableName}`);
            const { error } = await supabase.rpc('execute_sql', { sql });
            
            if (error) {
                console.error(`   ❌ Error creating ${tableName}:`, error.message);
            } else {
                console.log(`   ✅ Table ${tableName} created successfully`);
            }
        }
        
        // Create indexes
        console.log('\n📈 Creating database indexes...');
        for (let i = 0; i < createIndexesSQL.length; i++) {
            const sql = createIndexesSQL[i];
            const indexName = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1] || `index_${i + 1}`;
            
            console.log(`   Creating index: ${indexName}`);
            const { error } = await supabase.rpc('execute_sql', { sql });
            
            if (error && !error.message.includes('already exists')) {
                console.error(`   ⚠️ Warning creating ${indexName}:`, error.message);
            } else {
                console.log(`   ✅ Index ${indexName} created successfully`);
            }
        }
        
        // Set up RLS policies
        console.log('\n🛡️ Setting up Row Level Security policies...');
        for (let i = 0; i < createRLSPolicies.length; i++) {
            const sql = createRLSPolicies[i];
            const { error } = await supabase.rpc('execute_sql', { sql });
            
            if (error && !error.message.includes('already exists')) {
                console.log(`   ⚠️ Warning setting up RLS policy ${i + 1}:`, error.message);
            } else {
                console.log(`   ✅ RLS policy ${i + 1} set up successfully`);
            }
        }
        
        // Verify tables were created
        console.log('\n🔍 Verifying table creation...');
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['webhook_orders', 'webhook_messages', 'webhook_analytics', 'webhook_logs']);
            
        if (tablesError) {
            console.error('❌ Error verifying tables:', tablesError.message);
        } else {
            console.log('📋 Tables found:');
            tables.forEach(table => {
                console.log(`   ✅ ${table.table_name}`);
            });
        }
        
        // Insert initial analytics data
        console.log('\n📊 Setting up initial analytics data...');
        const today = new Date().toISOString().split('T')[0];
        
        const initialMetrics = [
            { date: today, metric_type: 'orders', metric_name: 'total', metric_value: 0 },
            { date: today, metric_type: 'orders', metric_name: 'created', metric_value: 0 },
            { date: today, metric_type: 'orders', metric_name: 'fulfilled', metric_value: 0 },
            { date: today, metric_type: 'orders', metric_name: 'cancelled', metric_value: 0 },
            { date: today, metric_type: 'messages', metric_name: 'total', metric_value: 0 },
            { date: today, metric_type: 'messages', metric_name: 'delivered', metric_value: 0 },
            { date: today, metric_type: 'messages', metric_name: 'failed', metric_value: 0 },
            { date: today, metric_type: 'performance', metric_name: 'success_rate', metric_value: 100 }
        ];
        
        const { error: insertError } = await supabase
            .from('webhook_analytics')
            .upsert(initialMetrics, { onConflict: 'date,metric_type,metric_name' });
            
        if (insertError) {
            console.log('⚠️ Warning inserting initial metrics:', insertError.message);
        } else {
            console.log('✅ Initial analytics metrics set up successfully');
        }
        
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📊 Your webhook analytics database is ready with:');
        console.log('   • webhook_orders - Store order data');
        console.log('   • webhook_messages - Track message delivery');
        console.log('   • webhook_analytics - Analytics aggregations');
        console.log('   • webhook_logs - Webhook processing logs');
        console.log('\n✅ You can now start your webhook system with database persistence!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error('\nPlease check:');
        console.error('  1. Your Supabase URL and Service Role Key are correct');
        console.error('  2. Your Supabase project has the required permissions');
        console.error('  3. Your network connection is working');
        process.exit(1);
    }
}

// Helper function to create the execute_sql function in Supabase if it doesn't exist
async function ensureExecuteSqlFunction() {
    const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION execute_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        EXECUTE sql;
    END;
    $$;
    `;
    
    try {
        const { error } = await supabase.rpc('execute_sql', { sql: 'SELECT 1' });
        if (error && error.message.includes('function execute_sql does not exist')) {
            console.log('🔧 Creating execute_sql helper function...');
            // This would need to be run directly in Supabase SQL editor
            console.log('⚠️ Please run this SQL in your Supabase SQL Editor first:');
            console.log(createFunctionSQL);
            console.log('\nThen run this script again.');
            process.exit(0);
        }
    } catch (err) {
        console.log('ℹ️ execute_sql function check completed');
    }
}

// Run the setup
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
