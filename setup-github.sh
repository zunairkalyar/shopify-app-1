#!/bin/bash

# Webhook System - GitHub Setup Script
# This script will initialize Git, add all files, and push to your GitHub repository

echo "🚀 Setting up your Webhook System for GitHub and Vercel deployment..."
echo

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    echo "   Download from: https://git-scm.com/downloads"
    exit 1
fi

echo "📋 Current project status:"
ls -la

echo
echo "🔧 Initializing Git repository..."
git init

echo
echo "📝 Adding all files to Git..."
git add .

echo
echo "💬 Creating initial commit..."
git commit -m "🚀 Initial commit: Complete Shopify webhook system

✨ Features:
- Complete webhook processing (order created/fulfilled/cancelled)
- Multi-channel message generation (WhatsApp, Email, SMS)
- Beautiful web dashboard with real-time monitoring
- Production-ready with comprehensive error handling
- One-click Vercel deployment
- Comprehensive API endpoints
- Service integrations (WhatsApp Business API, SendGrid, Twilio)

🛠️ Ready for production deployment!"

echo
echo "🌐 Next steps:"
echo
echo "1. Create a new repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Repository name: webhook-system"
echo "   - Description: Complete Shopify webhook system with multi-channel messaging"
echo "   - Set to Public (for easier deployment)"
echo "   - Don't initialize with README (we already have one)"
echo
echo "2. Copy the repository URL (e.g., https://github.com/YOUR_USERNAME/webhook-system.git)"
echo
echo "3. Run these commands with your actual repository URL:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/webhook-system.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo
echo "4. Deploy to Vercel:"
echo "   - Go to https://vercel.com/new"
echo "   - Import your GitHub repository"
echo "   - Configure environment variables (see README.md)"
echo "   - Deploy!"
echo
echo "5. Configure Shopify webhooks with your Vercel URLs"
echo
echo "✅ Git repository initialized successfully!"
echo
echo "💡 Pro tip: After pushing to GitHub, you can use this one-click deploy:"
echo "   https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/webhook-system"
