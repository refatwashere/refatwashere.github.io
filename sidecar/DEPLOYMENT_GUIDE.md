# 🚀 Crypto Sidecar Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Git**: Install Git from [git-scm.com](https://git-scm.com)
3. **Node.js**: Install from [nodejs.org](https://nodejs.org) (v14+)

## Step 1: Install Railway CLI

### Windows
```powershell
npm install -g @railway/cli
```

### macOS/Linux
```bash
npm install -g @railway/cli
# or
curl -fsSL https://railway.app/install.sh | sh
```

## Step 2: Prepare Repository

```bash
# Navigate to sidecar directory
cd sidecar

# Initialize git repository
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Enhanced crypto sidecar v2.0"
```

## Step 3: Deploy to Railway

### Option A: GitHub Integration (Recommended)

1. **Create GitHub Repository**:
   - Go to [github.com](https://github.com) → New Repository
   - Name: `crypto-sidecar-enhanced`
   - Make it public or private
   - Don't initialize with README

2. **Push to GitHub**:
   ```bash
   # Add remote (replace with your GitHub URL)
   git remote add origin https://github.com/YOUR_USERNAME/crypto-sidecar-enhanced.git

   # Push to GitHub
   git push -u origin main
   ```

3. **Connect to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Connect your GitHub account
   - Select the `crypto-sidecar-enhanced` repository
   - Click "Deploy"

### Option B: Direct CLI Deployment

```bash
# Login to Railway
railway login

# Create new project
railway init crypto-sidecar-enhanced

# Set environment variables
railway variables set PLANNER_SIDECAR_TOKEN=your-secure-token-here

# Deploy
railway up
```

## Step 4: Configure Environment

In Railway dashboard:
1. Go to your project
2. Click "Variables" tab
3. Add: `PLANNER_SIDECAR_TOKEN` = `your-32-character-secure-token`

## Step 5: Get Deployment URL

After deployment:
1. Go to Railway project dashboard
2. Click "Settings" tab
3. Copy the "Public URL" (e.g., `https://crypto-sidecar-enhanced-production.up.railway.app`)

## Step 6: Test Deployment

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/health

# Expected response:
{
  "status": 200,
  "data": {
    "ready": true,
    "version": "2.0-enhanced",
    "features": ["binance-advisory", "pancakeswap-dex", "risk-assessment", "market-data-simulator"],
    "supported_chains": [1, 56],
    "supported_venues": ["binance", "pancakeswap"]
  }
}

# Test planner endpoint
curl -X POST https://your-railway-url.up.railway.app/planner/intent \
  -H "Content-Type: application/json" \
  -H "X-Planner-Token: your-token" \
  -d '{
    "venue": "pancakeswap",
    "tokenIn": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    "tokenOut": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "amountIn": "1.0",
    "chainId": 56
  }'
```

## Step 7: Configure InfinityFree Backend

1. **Access InfinityFree Control Panel**
2. **Navigate to File Manager** → Your domain root
3. **Edit .htaccess** or create environment file:

```apache
# Add these lines to .htaccess
SetEnv PLANNER_SIDECAR_URL https://your-railway-url.up.railway.app/planner/intent
SetEnv PLANNER_SIDECAR_TOKEN your-32-character-secure-token
```

## Step 8: Run Integration Tests

```bash
# Download and run integration test
curl -fsSL https://raw.githubusercontent.com/your-repo/integration_test.sh -o test.sh
chmod +x test.sh
./test.sh
```

## Troubleshooting

### Common Issues

**Railway CLI Not Found**:
```bash
# Try alternative installation
npm install -g @railway/cli --force
# or
npx @railway/cli --version
```

**Deployment Fails**:
- Check `railway.json` configuration
- Ensure `package.json` has correct scripts
- Verify all dependencies are in `package.json`

**Health Check Fails**:
- Check Railway logs: `railway logs`
- Verify environment variables are set
- Test locally: `npm start` then `curl http://localhost:3000/health`

**Integration Test Fails**:
- Verify InfinityFree environment variables
- Check backend API is accessible
- Ensure sidecar URL is correct and HTTPS

### Logs and Monitoring

**View Railway Logs**:
```bash
railway logs
```

**Monitor Health**:
```bash
# Continuous health monitoring
while true; do
  curl -s https://your-railway-url/health | jq .data.ready
  sleep 60
done
```

## Security Notes

- **Token Security**: Use a strong 32+ character token
- **HTTPS Only**: Railway provides HTTPS automatically
- **Rate Limiting**: Consider implementing rate limits for production
- **Monitoring**: Set up alerts for service downtime

## Cost Estimation

- **Railway Free Tier**: $5/month credit (sufficient for development)
- **Production**: $5-10/month depending on usage
- **Scaling**: Automatic scaling based on requests

---

## 🎉 Deployment Complete!

Your enhanced crypto sidecar is now live and integrated. Test the planner functionality in your crypto app's trading interface.