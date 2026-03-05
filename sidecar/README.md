# Enhanced Sidecar Service v2.0

This enhanced sidecar service provides intelligent trading advisory for both Binance and PancakeSwap DEX platforms. It implements the planner-intent API contract with real market analysis and risk assessment.

## Features

- **Binance Advisory**: Market analysis for spot trading with confidence scoring
- **PancakeSwap DEX**: Smart swap routing with liquidity assessment
- **Risk Assessment**: Dynamic risk scoring with flagged conditions
- **Deep Links**: Pre-filled exchange URLs for seamless execution
- **Authentication**: Optional token-based security
- **Health Monitoring**: Service readiness and version reporting

## Quick Start

```bash
# Install dependencies
npm install

# Start service
npm start

# Or with custom port
PORT=3001 npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `PLANNER_SIDECAR_TOKEN` | Optional auth token | `''` |

## API Endpoints

### POST /planner/intent

Generates trading advisory based on request parameters.

**Request Headers:**
- `X-Planner-Token`: Authentication token (if configured)
- `X-Request-Id`: Optional request tracking ID

**Request Body:**
```json
{
  "venue": "pancakeswap",
  "tokenIn": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  "tokenOut": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "amountIn": "1.0",
  "slippageBps": 50,
  "chainId": 56,
  "routeType": "auto"
}
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "trade_intent": {
      "venue": "pancakeswap",
      "symbol": "CAKE-BNB",
      "side": "BUY",
      "size": 1.0,
      "confidence": 0.85,
      "rationale": "DEX conditions look optimal for this swap.",
      "risk_flags": []
    },
    "execution_plan": {
      "mode": "assisted",
      "deep_link": "https://pancakeswap.finance/swap?...",
      "steps": [...],
      "route_type": "auto"
    },
    "risk_assessment": {
      "score": 0.0,
      "level": "low",
      "flags": []
    },
    "meta": {
      "source": "sidecar-enhanced",
      "provider": "sidecar",
      "planner_version": "2.0",
      "venue": "pancakeswap",
      "chain_id": 56
    }
  }
}
```

### GET /health

Service health check endpoint.

**Response:**
```json
{
  "status": 200,
  "data": {
    "ready": true,
    "version": "2.0-enhanced",
    "features": ["binance-advisory", "pancakeswap-dex", "risk-assessment"]
  }
}
```

## Testing

```bash
# Run configuration and functionality tests
npm test

# Test health endpoint
curl http://localhost:3000/health

# Test Binance advisory
curl -X POST http://localhost:3000/planner/intent \
  -H "Content-Type: application/json" \
  -d '{"venue":"binance","symbol":"BTCUSDT","side":"BUY","size":0.01}'

# Test PancakeSwap advisory
curl -X POST http://localhost:3000/planner/intent \
  -H "Content-Type: application/json" \
  -d '{"venue":"pancakeswap","tokenIn":"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82","tokenOut":"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c","amountIn":"1.0"}'
```

## Configuration

The service uses `config.js` for:
- Supported blockchain networks and tokens
- Risk assessment thresholds
- Venue-specific settings
- Default slippage values

Supported tokens on BSC (Chain ID 56):
- CAKE, WBNB, BUSD, USDT, BTCB, ETH

Supported tokens on Ethereum (Chain ID 1):
- WETH, USDC, USDT, DAI

## Deployment

### Quick Deploy (Recommended)

**Using Railway (Automated):**
```bash
# Run the deployment script
./deploy.sh  # Linux/Mac
# or
deploy.bat   # Windows

# The script will:
# - Install Railway CLI if needed
# - Create Railway project
# - Set secure environment variables
# - Deploy the service
# - Provide the deployment URL
```

**Manual Railway Deployment:**
1. Create account at [Railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`
4. Initialize: `railway init crypto-sidecar-enhanced`
5. Set environment: `railway variables set PLANNER_SIDECAR_TOKEN=your-secure-token`
6. Deploy: `railway up`
7. Get URL: `railway open` (copy the URL)

### Docker Deployment

```bash
# Build image
docker build -t crypto-sidecar .

# Run locally
docker run -p 3000:3000 -e PLANNER_SIDECAR_TOKEN=your-token crypto-sidecar

# Or deploy to any container platform
```

### Manual Deployment

```bash
# Install dependencies
npm install

# Set environment variable
export PLANNER_SIDECAR_TOKEN=your-secure-token

# Start service
npm start
```

## Integration Setup

After deployment, configure your main application:

### InfinityFree Configuration

1. **Access Control Panel**: Login to InfinityFree
2. **File Manager**: Navigate to your domain root
3. **Edit .htaccess** or create environment file:
   ```apache
   SetEnv PLANNER_SIDECAR_URL https://your-railway-url.up.railway.app/planner/intent
   SetEnv PLANNER_SIDECAR_TOKEN your-generated-token
   ```

### Alternative: PHP Environment File

Create `.env` in your PHP backend directory:
```bash
PLANNER_SIDECAR_URL=https://your-railway-url.up.railway.app/planner/intent
PLANNER_SIDECAR_TOKEN=your-generated-token
```

## Verification

### Test Health Endpoint
```bash
curl https://your-railway-url.up.railway.app/health
# Expected: {"status":200,"data":{"ready":true,"version":"2.0-enhanced",...}}
```

### Test Planner Endpoint
```bash
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

### Integration Test
```bash
# Test through your main backend
curl -X POST https://refatishere.free.nf/crypto/backend/api.php?action=planner-intent \
  -H "X-API-Token: your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"provider":"sidecar","venue":"pancakeswap",...}'
```
PLANNER_SIDECAR_TOKEN=your-secret
```

### Docker

```bash
docker build -t sidecar-mock .
docker run -p 3000:3000 sidecar-mock
```

## Integration

This mock service returns valid responses matching the API contract. For production, replace with real AI planner logic (e.g., from pancakeswap-ai repo).