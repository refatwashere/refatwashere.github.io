#!/bin/bash
# Sidecar Deployment Script for Railway
# Run this script to deploy the enhanced sidecar service

echo "🚀 Enhanced Sidecar v2.0 Deployment Script"
echo "=========================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway login --browserless

# Initialize Railway project
echo "📁 Initializing Railway project..."
railway init crypto-sidecar-enhanced --yes

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set PLANNER_SIDECAR_TOKEN="$(openssl rand -hex 32)"
echo "✅ Generated secure PLANNER_SIDECAR_TOKEN"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

# Get the deployment URL
echo "🔗 Getting deployment URL..."
DEPLOY_URL=$(railway open --print)
echo "✅ Sidecar deployed at: $DEPLOY_URL"

# Test the deployment
echo "🧪 Testing deployment..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed with status: $HEALTH_RESPONSE"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Copy this URL: $DEPLOY_URL/planner/intent"
echo "2. Set PLANNER_SIDECAR_URL in your InfinityFree environment"
echo "3. Set PLANNER_SIDECAR_TOKEN to the generated token above"
echo "4. Run integration tests"
echo ""
echo "🎉 Deployment complete!"