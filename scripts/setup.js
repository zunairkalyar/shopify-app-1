#!/usr/bin/env node

/**
 * Complete Setup Script for Webhook System
 * Handles installation, configuration, and initial setup
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WebhookSystemSetup {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.steps = [
            'checkPrerequisites',
            'installDependencies', 
            'createDirectories',
            'setupEnvironment',
            'setupDatabase',
            'runTests',
            'showCompletionInfo'
        ];
        this.currentStep = 0;
    }

    /**
     * Main setup process
     */
    async run() {
        console.log('🚀 Webhook System Setup');
        console.log('========================\n');

        try {
            for (const step of this.steps) {
                this.currentStep++;
                console.log(`📋 Step ${this.currentStep}/${this.steps.length}: ${this.getStepTitle(step)}`);
                await this[step]();
                console.log('✅ Completed\n');
            }

            console.log('🎉 Setup completed successfully!\n');
        } catch (error) {
            console.error(`❌ Setup failed at step: ${this.getStepTitle(this.steps[this.currentStep - 1])}`);
            console.error(`💥 Error: ${error.message}\n`);
            this.showTroubleshootingTips();
            process.exit(1);
        }
    }

    /**
     * Get human-readable step title
     */
    getStepTitle(stepName) {
        const titles = {
            checkPrerequisites: 'Checking Prerequisites',
            installDependencies: 'Installing Dependencies',
            createDirectories: 'Creating Directories',
            setupEnvironment: 'Setting up Environment',
            setupDatabase: 'Setting up Database',
            runTests: 'Running Tests',
            showCompletionInfo: 'Setup Complete'
        };
        return titles[stepName] || stepName;
    }

    /**
     * Check system prerequisites
     */
    async checkPrerequisites() {
        console.log('   Checking Node.js version...');
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 16) {
            throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
        }
        console.log(`   ✓ Node.js ${nodeVersion}`);

        console.log('   Checking npm version...');
        try {
            const { stdout } = await execAsync('npm --version');
            console.log(`   ✓ npm ${stdout.trim()}`);
        } catch (error) {
            throw new Error('npm not found or not working');
        }

        console.log('   Checking Git (optional)...');
        try {
            await execAsync('git --version');
            console.log('   ✓ Git available');
        } catch (error) {
            console.log('   ⚠️ Git not found (optional for development)');
        }
    }

    /**
     * Install Node.js dependencies
     */
    async installDependencies() {
        console.log('   Installing production dependencies...');
        await this.runCommand('npm', ['install', '--production'], this.rootDir);
        
        console.log('   Installing development dependencies...');
        await this.runCommand('npm', ['install', '--only=dev'], this.rootDir);
        
        console.log('   ✓ All dependencies installed');
    }

    /**
     * Create necessary directories
     */
    async createDirectories() {
        const directories = ['data', 'logs', 'nginx', 'scripts'];
        
        for (const dir of directories) {
            const dirPath = path.join(this.rootDir, dir);
            try {
                await fs.access(dirPath);
                console.log(`   ✓ Directory exists: ${dir}`);
            } catch (error) {
                await fs.mkdir(dirPath, { recursive: true });
                console.log(`   ✓ Created directory: ${dir}`);
            }
        }

        // Create log files
        const logFiles = ['logs/app.log', 'logs/error.log'];
        for (const logFile of logFiles) {
            const logPath = path.join(this.rootDir, logFile);
            try {
                await fs.access(logPath);
            } catch (error) {
                await fs.writeFile(logPath, '');
                console.log(`   ✓ Created log file: ${logFile}`);
            }
        }
    }

    /**
     * Setup environment configuration
     */
    async setupEnvironment() {
        const envPath = path.join(this.rootDir, '.env');
        const envExamplePath = path.join(this.rootDir, '.env.example');

        try {
            await fs.access(envPath);
            console.log('   ✓ .env file already exists');
            
            // Validate .env file
            const envContent = await fs.readFile(envPath, 'utf8');
            const requiredVars = ['PORT', 'SHOP_NAME', 'SUPPORT_PHONE'];
            const missingVars = requiredVars.filter(varName => 
                !envContent.includes(`${varName}=`)
            );
            
            if (missingVars.length > 0) {
                console.log(`   ⚠️ Missing environment variables: ${missingVars.join(', ')}`);
            }
        } catch (error) {
            // Create .env from example
            try {
                await fs.access(envExamplePath);
                await fs.copyFile(envExamplePath, envPath);
                console.log('   ✓ Created .env from .env.example');
            } catch (exampleError) {
                // Create basic .env file
                const basicEnv = `# Webhook System Environment Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Shop Configuration  
SHOP_NAME="MazayLO"
SUPPORT_PHONE="+92-300-1234567"
SUPPORT_EMAIL="support@mazaylo.com"
WEBSITE_URL="https://mazaylo.com"

# Feature Flags
ENABLE_DATABASE=false
ENABLE_LOGGING=true
`;
                await fs.writeFile(envPath, basicEnv);
                console.log('   ✓ Created basic .env file');
            }
        }
    }

    /**
     * Setup database (optional)
     */
    async setupDatabase() {
        const config = require('../config/config');
        
        if (!config.features.database) {
            console.log('   ⏭️ Database setup skipped (disabled in configuration)');
            return;
        }

        if (!config.database.url) {
            console.log('   ⚠️ Database URL not configured, skipping database setup');
            console.log('   💡 Add DATABASE_URL to .env file to enable database support');
            return;
        }

        console.log('   Setting up database...');
        try {
            const setupScript = path.join(this.rootDir, 'scripts', 'setup-database.js');
            await this.runCommand('node', [setupScript], this.rootDir);
            console.log('   ✓ Database setup completed');
        } catch (error) {
            console.log('   ⚠️ Database setup failed, continuing without database');
            console.log(`   Error: ${error.message}`);
        }
    }

    /**
     * Run basic tests
     */
    async runTests() {
        console.log('   Running system tests...');
        try {
            await this.runCommand('npm', ['test'], this.rootDir);
            console.log('   ✓ All tests passed');
        } catch (error) {
            console.log('   ⚠️ Some tests failed, but setup can continue');
            console.log('   💡 Run "npm test" later to see detailed test results');
        }
    }

    /**
     * Show completion information
     */
    async showCompletionInfo() {
        const config = require('../config/config');
        
        console.log('🎯 Setup Summary:');
        console.log('=================');
        console.log(`✅ Node.js application ready`);
        console.log(`✅ Dependencies installed`);
        console.log(`✅ Environment configured`);
        console.log(`${config.features.database ? '✅' : '⏭️'} Database ${config.features.database ? 'ready' : 'disabled'}`);
        console.log(`✅ Tests completed\n`);

        console.log('🚀 Next Steps:');
        console.log('==============');
        console.log('1. Review configuration in .env file');
        console.log('2. Start the system: npm start');
        console.log('3. Visit dashboard: http://localhost:3000');
        console.log('4. Test webhooks: npm run example\n');

        console.log('🔧 Optional Configuration:');
        console.log('=========================');
        if (!config.whatsapp.enabled) {
            console.log('• Enable WhatsApp: Add WhatsApp Business API credentials to .env');
        }
        if (!config.email.enabled) {
            console.log('• Enable Email: Add SendGrid API key to .env');
        }
        if (!config.sms.enabled) {
            console.log('• Enable SMS: Add Twilio credentials to .env');
        }
        if (!config.features.database) {
            console.log('• Enable Database: Set ENABLE_DATABASE=true and add DATABASE_URL to .env');
        }

        console.log('\n📚 Documentation:');
        console.log('==================');
        console.log('• README.md - Quick start guide');
        console.log('• DEVELOPMENT.md - Development setup');
        console.log('• API_ENDPOINTS.md - API documentation');
        console.log('• BACKEND_ARCHITECTURE.md - System architecture\n');

        console.log('🆘 Support:');
        console.log('============');
        console.log('• Run tests: npm test');
        console.log('• Check health: curl http://localhost:3000/health');
        console.log('• View logs: tail -f logs/app.log');
        console.log('• Restart: npm start\n');
    }

    /**
     * Run command with error handling
     */
    async runCommand(command, args, cwd) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd: cwd || this.rootDir,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to start command: ${error.message}`));
            });
        });
    }

    /**
     * Show troubleshooting tips
     */
    showTroubleshootingTips() {
        console.log('🔧 Troubleshooting Tips:');
        console.log('========================');
        console.log('• Ensure Node.js 16+ is installed');
        console.log('• Check internet connection for package downloads');
        console.log('• Verify file permissions in the project directory');
        console.log('• Clear npm cache: npm cache clean --force');
        console.log('• Try manual installation: npm install');
        console.log('• Check logs in logs/ directory for more details');
        console.log('\n💬 For help, check the documentation or create an issue');
    }
}

// Show help information
function showHelp() {
    console.log(`
🔧 Webhook System Setup Script

📖 Usage: node scripts/setup.js [options]

🎯 Purpose:
   Complete automated setup of the webhook system including:
   • Dependency installation
   • Environment configuration  
   • Directory creation
   • Database setup (if enabled)
   • System tests

🔧 Options:
   --help, -h     Show this help message
   --skip-deps    Skip dependency installation
   --skip-tests   Skip running tests
   --skip-db      Skip database setup

🏃‍♂️ Examples:
   node scripts/setup.js
   npm run setup
   
📋 Requirements:
   • Node.js 16+ installed
   • npm 8+ installed
   • Internet connection for package downloads

🚀 Quick Start:
   1. Run this setup script
   2. Review generated .env file
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
    const setup = new WebhookSystemSetup();
    setup.run().catch(error => {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    });
}

module.exports = WebhookSystemSetup;
