# Sidecar Integration Configuration

**Document:** Environment Variables and Deployment Topology  
**Date:** 2026-03-05  
**Scope:** InfinityFree + Sidecar Deployment Model

---

## 1) Environment Variables Reference

### Backend API Configuration (InfinityFree / Any PHP Host)

**Required Variables:**

```bash
# Database
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASS=your-db-password
DB_NAME=your-db-name

# API Tokens
API_TOKEN_LEGACY=<token-for-/api/*>
API_TOKEN_CRYPTO=<token-for-/crypto/backend/*>

# CORS
ALLOWED_ORIGINS=https://refatishere.free.nf

```

**Optional Variables:**

```bash
# Planner Sidecar Integration
PLANNER_SIDECAR_URL=https://my-sidecar.railway.app/planner/intent
PLANNER_SIDECAR_TOKEN=shared-secret-planner-key-xyz123
```

### Environment Setup per Hosting Provider

#### InfinityFree

1. **Dashboard Login:** https://dash.infinityfree.com/
2. **Navigate:** Your Account → Your Websites
3. **Select** the website running the app
4. **.htaccess + PHP Configuration:** Edit .htaccess via File Manager to set env vars
   ```apache
   SetEnv DB_HOST your-db.infinityfree.com
   SetEnv DB_USER user123
   SetEnv DB_PASS yourpassword
   SetEnv DB_NAME database456
   SetEnv API_TOKEN_LEGACY token-legacy-xyz
   SetEnv API_TOKEN_CRYPTO token-crypto-abc
   SetEnv ALLOWED_ORIGINS https://refatishere.free.nf
   SetEnv PLANNER_SIDECAR_URL https://sidecar-host.com/planner/intent
   SetEnv PLANNER_SIDECAR_TOKEN your-shared-secret
   ```
   
   **OR use PHP file-based config:**
   ```php
   // bootstrap.php (already included in current app)
   $_ENV['DB_HOST'] = $_SERVER['DB_HOST'] ?? 'localhost';
   $_ENV['PLANNER_SIDECAR_URL'] = $_SERVER['PLANNER_SIDECAR_URL'] ?? '';
   // ...
   ```

3. **Verify:** PHP script reads from `$_SERVER` and `$_ENV` super-globals

#### Railway / Heroku / Modern Platforms

1. **Create Project:** https://railway.app/ or https://heroku.com/
2. **Add Environment:**
   - Dashboard → Project → Variables
   - Paste all env vars key=value
3. **Deploy:** Push to git or use platform CLI
4. **Verify:** SSH into dyno/replica and echo env vars

#### Local Development

Create `.env` or `.env.local` file:
```bash
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=
DB_NAME=local_db
API_TOKEN_LEGACY=dev-token-legacy
API_TOKEN_CRYPTO=dev-token-crypto
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
PLANNER_SIDECAR_URL=http://localhost:3000/planner/intent
PLANNER_SIDECAR_TOKEN=dev-sidecar-token
```

Then load in PHP:
```php
if (file_exists(__DIR__ . '/.env')) {
  dotenv(__DIR__ . '/.env');
}
```

---

## 2) Inline Bootstrap Configuration (Recommended)

Edit `crypto/backend/bootstrap.php` to support multiple initialization modes:

```php
<?php
// Load environment variables from various sources
function loadEnvFromServer() {
    $envVars = [
        'DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME',
        'API_TOKEN_LEGACY', 'API_TOKEN_CRYPTO',
        'ALLOWED_ORIGINS',
        'PLANNER_SIDECAR_URL', 'PLANNER_SIDECAR_TOKEN'
    ];
    
    foreach ($envVars as $var) {
        if (!isset($_ENV[$var])) {
            $_ENV[$var] = $_SERVER[$var] ?? getenv($var) ?? '';
        }
    }
}

loadEnvFromServer();

// Validate critical env vars
function validateEnvironment() {
    $required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'API_TOKEN_CRYPTO'];
    foreach ($required as $var) {
        if (empty($_ENV[$var])) {
            die("Missing required environment variable: $var");
        }
    }
}

validateEnvironment();
// ...rest of bootstrap
```

---

## 3) Sidecar Deployment Model

### Topology Diagram

```
┌─────────────────────────────────────────┐
│        Frontend (Browser / PWA)          │
│  (crypto/crypto.html + app.js)          │
└──────────────────┬──────────────────────┘
                   │
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────┐
│  InfinityFree Hosting (PHP Backend)     │
│  ├─ /crypto/backend/api.php             │
│  ├─ /api/*  (legacy)                    │
│  └─ Database connection (MySQL)         │
└──────────────────┬──────────────────────┘
                   │
           ┌───────┴────────┐
           │                │
      (Local Planner)  (if sidecar enabled)
           │                │
           │                ▼
           │       ┌────────────────────────┐
           │       │ Sidecar (Node.js)      │
           │       │ (Railway / Heroku)     │
           │       │ /planner/intent        │
           │       └────────────────────────┘
           │                │
           └────────┬───────┘
                    │
                    ▼
        ┌──────────────────────┐
        │ Planner Advisory     │
        │ + Deep Links         │
        │ + Risk Analysis      │
        └──────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Fallback |
|-----------|-----------------|----------|
| **Frontend** | User interaction, planner request builder, advisory display | UI graceful degradation |
| **PHP Backend** | Request validation, sidecar routing, local planner fallback | Local heuristic |
| **Sidecar** | Advanced AI/ML advisory, complex risk scoring | HTTP 502 → backend responds with local |
| **Local Planner** | Deterministic heuristic advisory, always available | None (baseline) |

---

## 4) Deployment Topology: InfinityFree + Sidecar

### Prerequisites

1. **Frontend:** Hosted on InfinityFree (already done)
2. **Backend:** PHP + MySQL on InfinityFree (already done)
3. **Sidecar**: Separate Node.js service (new):
   - Option A: Railway.app (free tier, recommended)
   - Option B: Replit.com (free tier, slower)
   - Option C: Self-hosted VPS (costs extra)

### Step 1: Prepare Backend for Sidecar

No code changes needed; config only:

1. Set `PLANNER_SIDECAR_URL` in InfinityFree .htaccess or php.ini
2. (Optional) Set `PLANNER_SIDECAR_TOKEN` for auth

### Step 2: Deploy Sidecar to Railway

```bash
# Clone or create sidecar application
git clone https://github.com/your-org/planner-sidecar.git
cd planner-sidecar

# Connect to Railway
npm install -g @railway/cli
railway login

# Create project
railway init

# Set environment
railway link <project-id>
railway variables --set PLANNER_SECRET=your-secret-key

# Deploy
git push railway main

# Get public URL
railway open
# Output: https://planner-sidecar-abc123.railway.app
```

### Step 3: Update InfinityFree Backend Config

1. **File Manager** → Navigate to root / deploy/
2. **Edit .htaccess** (or direct env config in PHP):
   ```apache
   SetEnv PLANNER_SIDECAR_URL https://planner-sidecar-abc123.railway.app/planner/intent
   SetEnv PLANNER_SIDECAR_TOKEN your-secret-key
   ```

3. **Test Backend Health:**
   ```bash
   curl -X POST https://refatishere.free.nf/crypto/backend/api.php?action=health
   # Expected: { "status": "healthy", ... }
   ```

### Step 4: Test Planner Integration

```bash
# Test local planner
curl -X POST https://refatishere.free.nf/crypto/backend/api.php?action=planner-intent \
  -H "X-API-Token: your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "venue": "binance",
    "side": "BUY",
    "size": 0.1,
    "type": "MARKET",
    "marketPrice": 45000,
    "mode": "spot",
    "provider": "local"
  }'
# Expected: { "status": "success", "data": { "meta": { "source": "local_heuristic" } } }

# Test sidecar planner
curl -X POST https://refatishere.free.nf/crypto/backend/api.php?action=planner-intent \
  -H "X-API-Token: your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "venue": "binance",
    "side": "BUY",
    "size": 0.1,
    "type": "MARKET",
    "marketPrice": 45000,
    "mode": "spot",
    "provider": "sidecar"
  }'
# Expected: { "status": "success", "data": { "meta": { "source": "sidecar" } } }
# OR if sidecar down: { "status": "error", "code": 502 } + fallback
```

---

## 5) Fallback Policy Detail

### Scenario Matrix

| Scenario | Sidecar Status | Backend Action | Frontend Display | Notes |
|----------|----------------|----------------|------------------|-------|
| **A** | Healthy | Forward request, return sidecar response | "Planner (Sidecar) 80%" | Normal operation |
| **B** | Timeout (>5s) | Return 202 + local advisory | "Planner (Local) 65%, sidecar timed out" | Graceful fallback |
| **C** | Server Error (5xx) | Return 202 + local advisory | "Planner (Local) 65%, sidecar error" | Resilient |
| **D** | Unreachable | Return 202 + local advisory | "Planner (Local) 65%, sidecar unavailable" | No external dependency |
| **E** | Disabled/Missing URL | Skip sidecar, use local directly | "Planner (Local) 65%" | Default safe mode |

### Backend Fallback Code (Existing in api.php)

```php
if ($provider === 'sidecar') {
    $sidecarUrl = getEnvValue('PLANNER_SIDECAR_URL', '');
    if ($sidecarUrl === '') {
        // No sidecar configured; use local
        $result = buildLocalPlannerResult($input);
        $result['meta']['source'] = 'local_heuristic';
        $result['meta']['note'] = 'Sidecar not configured';
        successResponse($result);
    }
    
    $sidecarResult = makeRequest(
        $sidecarUrl,
        'POST',
        ['X-Planner-Token: ' . $sidecarToken],
        json_encode($payload),
        ['timeout' => 5]  // Hard timeout
    );
    
    // If sidecar fails, fallback
    if ($sidecarResult['code'] >= 400 || $sidecarResult['timeout']) {
        $localResult = buildLocalPlannerResult($input);
        $localResult['meta']['fallback_reason'] = 'sidecar_' . ($sidecarResult['timeout'] ? 'timeout' : 'error');
        errorResponse(
            'Sidecar unavailable, using local advisory',
            202,  // 202 Accepted (partial success)
            $localResult
        );
    }
    
    // Sidecar success
    return $sidecarResult;
}
```

---

## 6) Monitoring & Health Checks

### Health Check Endpoints

**Backend Health:**
```bash
GET /crypto/backend/health.php
# Returns:
{
  "status": "healthy",
  "database": "connected",
  "planner_sidecar": "reachable",
  "timestamp": "2026-03-05T12:00:00Z"
}
```

**Sidecar Health:**
```bash
GET https://sidecar-xyz.railway.app/health
# Returns:
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime_seconds": 3600
}
```

### Deployment Smoke Test

```bash
#!/bin/bash
BACKEND="https://refatishere.free.nf/crypto/backend"
TOKEN="your-api-token"

echo "1. Backend health Check..."
curl -s -X GET "$BACKEND/health.php" -H "X-API-Token: $TOKEN"

echo "2. Local planner test..."
curl -s -X POST "$BACKEND/api.php?action=planner-intent" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","venue":"binance","side":"BUY","size":0.1,"type":"MARKET",...,"provider":"local"}'

echo "3. Sidecar test (if configured)..."
curl -s -X POST "$BACKEND/api.php?action=planner-intent" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","venue":"binance","side":"BUY","size":0.1,"type":"MARKET",...,"provider":"sidecar"}'

echo "Done."
```

---

## 7) Rollback Procedure

### If Sidecar Causes Issues

1. **Immediate Rollback:**
   - Clear `PLANNER_SIDECAR_URL` env var
   - Backend automatically uses local planner
   - Restart PHP workers (InfinityFree auto-restarts)
   - No code deployment needed

2. **Verify Rollback:**
   ```bash
   curl ... -d '{"provider":"sidecar",...}' 
   # Should now return local advisory with "sidecar not configured" note
   ```

3. **Investigate Sidecar:**
   - Check sidecar logs: `railway logs`
   - Test sidecar endpoint directly
   - Review request/response samples

---

## 8) Cost Considerations

| Component | Free Tier | Paid Tier | Notes |
|-----------|-----------|-----------|-------|
| **InfinityFree (Frontend + Backend)** | ✓ Included | N/A | No cost for normal usage |
| **Railway Sidecar** | ✓ $5/month free credit | $5+/month | 512MB RAM, 1-CPU sufficient |
| **Replit Sidecar** | ✓ Free (slow) | $7/month | Slower, but works |
| **VPS Sidecar** | ✗ | $3–10/month | More control, potential cost |

**Recommendation:** Start with Railway free tier; upgrade if needed.

---

**Configuration Status:** ✓ Complete for Phase 4  
**Next:** Publish documentation (Phase 5)
