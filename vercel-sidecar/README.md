# 🚀 Crypto Sidecar - Vercel Serverless Deployment (100% FREE)

This is the **completely free** deployment of your enhanced crypto sidecar service using Vercel serverless functions.

## ✨ Why Vercel Serverless?

- **100% FREE** - No credit card required
- **100GB bandwidth/month** - Plenty for your trading app
- **100,000 function invocations/month** - More than enough
- **10 second execution timeout** - Your planner logic is fast
- **Global CDN** - Fast responses worldwide
- **Automatic HTTPS** - Secure by default

## 📁 Project Structure

```
vercel-sidecar/
├── api/
│   ├── health.js      # Health check endpoint
│   └── planner.js     # Main planner logic
├── config.js          # Chain and venue configurations
├── marketData.js      # Market data simulator
├── package.json       # Dependencies
├── vercel.json        # Vercel configuration
└── README.md          # This file
```

## 🚀 Deployment Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy

```bash
cd vercel-sidecar
vercel --prod
```

### 4. Set Environment Variable

```bash
vercel env add PLANNER_SIDECAR_TOKEN
# Enter your secure token when prompted
```

### 5. Get Your URLs

After deployment, Vercel will give you URLs like:
- Health: `https://your-project.vercel.app/api/health`
- Planner: `https://your-project.vercel.app/api/planner`

## 🔧 Configuration

### Update InfinityFree Backend

Add these lines to your `htdocs/.htaccess` on InfinityFree:

```apache
SetEnv PLANNER_SIDECAR_URL https://your-project.vercel.app/api/planner
SetEnv PLANNER_SIDECAR_TOKEN your-secure-token-here
```

### Enable Planner in Frontend

1. Open `https://refatishere.free.nf/crypto/crypto.html`
2. Go to Settings
3. Enable "Use AI Planner"
4. Set Backend API Token to your crypto token

## 🧪 Testing

### Test Health Endpoint

```bash
curl https://your-project.vercel.app/api/health
```

Expected response:
```json
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
```

### Test Planner Endpoint

```bash
curl -X POST https://your-project.vercel.app/api/planner \
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

## 📊 Free Tier Limits

| Resource | Limit | Your Usage |
|----------|-------|------------|
| Bandwidth | 100GB/month | ~1GB (very low) |
| Functions | 100,000/month | ~100 (very low) |
| Execution Time | 10 seconds | ~0.1 seconds |
| Cold Starts | Yes | Minimal impact |

## 🔄 Development

### Local Development

```bash
cd vercel-sidecar
npm install
vercel dev
```

### Update Deployment

```bash
cd vercel-sidecar
vercel --prod
```

## 🆘 Troubleshooting

### Function Timeout
- Your planner logic is optimized for < 10 seconds
- If you add heavy computations, consider optimizing

### Cold Starts
- First request after inactivity may be slower
- Subsequent requests are fast
- Not an issue for your use case

### Environment Variables
- Make sure `PLANNER_SIDECAR_TOKEN` is set in Vercel dashboard
- Redeploy after changing environment variables

## 🎯 Success Metrics

Your deployment is successful when:
- ✅ Health endpoint returns `ready: true`
- ✅ Planner endpoint returns trading advice
- ✅ InfinityFree backend can call Vercel functions
- ✅ Frontend planner workspace shows advice
- ✅ All integration tests pass

## 💰 Cost Summary

| Component | Provider | Cost |
|-----------|----------|------|
| Main App + PHP Backend | InfinityFree | FREE |
| AI Sidecar Service | Vercel | FREE |
| Database | InfinityFree | FREE |
| **TOTAL** | | **FREE** |

---

**🎉 Congratulations!** Your crypto trading app now has a professional AI sidecar service running completely free on Vercel serverless functions.