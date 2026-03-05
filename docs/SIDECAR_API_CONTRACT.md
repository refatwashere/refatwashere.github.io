# Sidecar API Contract Specification

**Version:** 1.0  
**Date:** 2026-03-05  
**Status:** Production-Ready  
**Scope:** Planner Intent Advisory Service (optional, non-blocking integration)

---

## 1) Overview

The **Planner Sidecar** is an optional Node.js service that provides advanced AI-driven trading advisories for both Binance and PancakeSwap venues. It integrates with the InfinityFree-hosted PHP backend via a well-defined REST API contract.

### Key Properties
- **Scope:** Advisory only (no execution, no wallet signing)
- **Deployment:** Free-tier Node.js hosting (e.g., Railway, Replit, Heroku free tier)
- **Timeout:** Hard 5-second timeout from PHP backend; failures fallback to local heuristic planner
- **Authentication:** Optional shared secret token (`X-Planner-Token` header)
- **Transport:** HTTPS only in production

---

## 2) Request Contract

### POST /planner/intent

**Purpose:** Generate a trading advisory for a given symbol, venue, and market context.

**Request Headers:**
```
Content-Type: application/json
X-Request-Id: <uuid or request-id propagated from frontend>
X-Planner-Token: <optional shared secret, required if PLANNER_SIDECAR_TOKEN env var is set>
```

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "venue": "binance",
  "side": "BUY",
  "size": 0.1,
  "type": "LIMIT",
  "limitPrice": 45000.0,
  "marketPrice": 45100.0,
  "mode": "spot",
  
  "chainId": null,
  "tokenIn": null,
  "tokenOut": null,
  "amountIn": null,
  "slippageBps": null,
  "routeType": null
}
```

**Field Definitions:**

| Field | Type | Notes |
|-------|------|-------|
| `symbol` | string | Binance symbol (uppercase, e.g., `BTCUSDT`, `ETHUSDT`) |
| `venue` | string | Target venue: `binance` or `pancakeswap` |
| `side` | string | Position direction: `BUY` or `SELL` |
| `size` | number | Position size in base asset (e.g., 0.1 BTC) |
| `type` | string | Order type: `MARKET` or `LIMIT` |
| `limitPrice` | number or null | Price for LIMIT orders; null for MARKET orders |
| `marketPrice` | number or null | Current market price reference for context |
| `mode` | string | Trading mode: `spot` or `futures` |
| **PancakeSwap-only fields:** | | Required when `venue === "pancakeswap"` |
| `chainId` | number or null | Blockchain ID: 56 (BSC), 1 (Eth), 42161 (Arbitrum), 8453 (Base) |
| `tokenIn` | string or null | Input token (symbol or 0x-address for PancakeSwap) |
| `tokenOut` | string or null | Output token (symbol or 0x-address for PancakeSwap) |
| `amountIn` | number or null | Input amount for swap planning |
| `slippageBps` | number or null | Max slippage in basis points (1–5000) |
| `routeType` | string or null | Preferred route: `auto`, `v2`, `v3`, `stable` |

**Validation Rules:**
- `symbol`: Required, matches `/^[A-Z0-9]{5,20}$/` for Binance
- `venue`: Required, must be `binance` or `pancakeswap`
- `side`: Required, must be `BUY` or `SELL`
- `size`: Required, must be > 0 and <= 100,000,000
- `type`: Required, must be `MARKET` or `LIMIT`
- If `venue === "pancakeswap"`: all DEX fields must be provided and valid
- If `type === "LIMIT"`: `limitPrice` is required

**Example Request (Binance):**
```json
{
  "symbol": "ETHUSDT",
  "venue": "binance",
  "side": "BUY",
  "size": 1.5,
  "type": "MARKET",
  "marketPrice": 2800.0,
  "mode": "spot",
  "limitPrice": null,
  "chainId": null,
  "tokenIn": null,
  "tokenOut": null,
  "amountIn": null,
  "slippageBps": null,
  "routeType": null
}
```

**Example Request (PancakeSwap):**
```json
{
  "symbol": "BNBUSDT",
  "venue": "pancakeswap",
  "side": "BUY",
  "size": 10.0,
  "type": "LIMIT",
  "limitPrice": 600.0,
  "marketPrice": 602.5,
  "mode": "spot",
  "chainId": 56,
  "tokenIn": "BNB",
  "tokenOut": "USDT",
  "amountIn": "10.0",
  "slippageBps": 50,
  "routeType": "auto"
}
```

---

## 3) Response Contract

### Success Response (HTTP 200)

**Response Body:**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "trade_intent": {
      "venue": "binance",
      "symbol": "BTCUSDT",
      "side": "BUY",
      "size": 0.1,
      "confidence": 0.75,
      "rationale": "Entry intent is long-biased. Price reference is available for pre-trade sizing checks. No elevated heuristic risk flags. Market order execution carries moderate slippage risk.",
      "risk_flags": ["market_order_slippage"]
    },
    "execution_plan": {
      "mode": "assisted",
      "steps": [
        "Review symbol, side, and size against your strategy.",
        "Confirm risk flags and set stop-loss/take-profit levels.",
        "Place order manually after verification.",
        "Re-check fill status and adjust risk management."
      ],
      "deep_link": "https://www.binance.com/en/trade/BTC_USDT?type=spot",
      "route_type": "auto"
    },
    "risk_assessment": {
      "score": 25,
      "level": "low",
      "flags": ["market_order_slippage"]
    },
    "meta": {
      "source": "sidecar",
      "planner_version": "2.0.0",
      "venue": "binance",
      "slippage_bps": null,
      "request_id": "req-abc123xyz"
    }
  }
}
```

**Field Definitions:**

| Field | Type | Notes |
|-------|------|-------|
| `trade_intent.venue` | string | Echo of request venue |
| `trade_intent.symbol` | string | Echo of request symbol |
| `trade_intent.side` | string | Echo of request side |
| `trade_intent.size` | number | Echo of request size |
| `trade_intent.confidence` | number | 0.0–1.0; higher = more confident in advisory |
| `trade_intent.rationale` | string | Plain-text reasoning for the advisory |
| `trade_intent.risk_flags` | string[] | List of detected risk conditions |
| `execution_plan.mode` | string | Always `"assisted"` (advisory-only) |
| `execution_plan.steps` | string[] | Recommended action steps for user |
| `execution_plan.deep_link` | string | Pre-filled link to exchange (Binance or PancakeSwap) |
| `execution_plan.route_type` | string | For DEX: `auto`, `v2`, `v3`, or `stable` |
| `risk_assessment.score` | number | Risk score 0–100 (higher = riskier) |
| `risk_assessment.level` | string | Risk level: `low`, `medium`, or `high` |
| `risk_assessment.flags` | string[] | Same as `trade_intent.risk_flags` |
| `meta.source` | string | Always `"sidecar"` for sidecar responses |
| `meta.planner_version` | string | Sidecar planner version (e.g., `2.0.0`) |
| `meta.venue` | string | Echo of request venue |
| `meta.slippage_bps` | number or null | For PancakeSwap: echo of slippage setting |
| `meta.request_id` | string | Request ID for tracing |

### Error Responses

**HTTP 400 – Bad Request**
```json
{
  "status": "error",
  "success": false,
  "error": "Invalid venue",
  "details": {
    "allowed_values": ["binance", "pancakeswap"]
  }
}
```

**HTTP 401 – Unauthorized**
```json
{
  "status": "error",
  "success": false,
  "error": "Invalid or missing authentication token"
}
```

**HTTP 422 – Unprocessable Entity**
```json
{
  "status": "error",
  "success": false,
  "error": "Invalid size",
  "details": {
    "provided": -0.5,
    "valid_range": "0 < size <= 100000000"
  }
}
```

**HTTP 500 – Internal Server Error**
```json
{
  "status": "error",
  "success": false,
  "error": "Internal planner error",
  "details": {
    "message": "Failed to process advisory"
  }
}
```

### HTTP Timeout (5 seconds)

If the sidecar does not respond within **3–5 seconds**, the PHP backend:
1. Cancels the request
2. Returns HTTP 502 (Bad Gateway) with error metadata
3. Frontend displays warning and falls back to local planner

---

## 4) Risk Flags Reference

**Common Risk Flags:**

| Flag | Severity | Notes |
|------|----------|-------|
| `market_order_slippage` | Medium | Market order subject to slippage |
| `size_large` | Medium | Position size > 5 (configurable threshold) |
| `notional_high` | Medium | Position nominal value > $5000 |
| `price_reference_missing` | High | No market price provided for context |
| `price_impact_high` | High | PancakeSwap: size > 25 (DEX impact concern) |
| `slippage_wide` | Medium | PancakeSwap: slippageBps > 150 |
| `liquidity_low` | High | PancakeSwap: token pair low liquidity |
| `unknown_token_contract` | High | PancakeSwap: invalid or unverified token contract |

---

## 5) Deployment Integration

### Backend Configuration

**Environment Variables (set on InfinityFree hosting):**
```bash
# Enable sidecar planner integration
PLANNER_SIDECAR_URL="https://my-sidecar.railway.app/planner/intent"

# Optional: sidecar authentication token
PLANNER_SIDECAR_TOKEN="shared-secret-key-xyz"
```

### Backend Fallback Behavior (PHP)

```php
// Pseudo-code for reference
if ($provider === 'sidecar') {
  if (empty($sidecarUrl)) {
    errorResponse('Planner sidecar unavailable', 503);
  }

  $result = makeRequest(
    $sidecarUrl,
    'POST',
    ['X-Planner-Token: ' . $sidecarToken],
    json_encode($payload),
    ['timeout' => 5]
  );

  if ($result['code'] >= 400 || timeout) {
    // Fall back to local planner
    errorResponse('Sidecar unavailable, using local advisory', 202, [...]);
  }

  return $result;
}
```

### Frontend Behavior

1. User enables "Sidecar" provider in Settings
2. Frontend sends `/planner-intent` request to backend with `provider=sidecar`
3. Backend forwards to sidecar with 5-second timeout
4. If sidecar responds (success or error), return response to frontend
5. If sidecar times out or fails, backend returns local advisory with warning label
6. Frontend displays "Planner (Sidecar)" or "Planner (Local)" badge accordingly

---

## 6) Testing and Validation

### Unit Tests (Sidecar Service)

```bash
# Test valid Binance request
POST /planner/intent
{
  "symbol": "BTCUSDT",
  "venue": "binance",
  "side": "BUY",
  "size": 0.1,
  "type": "MARKET",
  "marketPrice": 45000,
  "mode": "spot",
  ...
}
# Expected: HTTP 200, valid advisory with high confidence

# Test invalid symbol
{
  "symbol": "INVALID$",
  ...
}
# Expected: HTTP 400, error with validation details

# Test missing PancakeSwap fields
{
  "symbol": "BNBUSDT",
  "venue": "pancakeswap",
  "side": "BUY",
  "size": 10,
  "type": "LIMIT",
  "marketPrice": 600,
  "mode": "spot",
  "chainId": null,
  "tokenIn": null,
  "tokenOut": null
}
# Expected: HTTP 422, error indicating required DEX fields
```

### Integration Tests (Backend + Sidecar)

```bash
# Test local provider (no sidecar)
backend /crypto/backend/api.php?action=planner-intent
payload: { "provider": "local", ... }
# Expected: HTTP 200, local advisory

# Test sidecar provider (healthy)
backend /crypto/backend/api.php?action=planner-intent
payload: { "provider": "sidecar", ... }
# Expected: HTTP 200, sidecar advisory

# Test sidecar provider (timeout)
PLANNER_SIDECAR_URL="http://localhost:9999" (unreachable)
# Expected: HTTP 502 or fallback to local
```

---

## 7) Monitoring and Observability

### Sidecar Health Endpoint (Optional)

```bash
GET /health
# Response:
{
  "status": "healthy",
  "uptime_seconds": 3600,
  "version": "2.0.0",
  "timestamp": "2026-03-05T12:00:00Z"
}
```

### Backend Request Logging

Log all sidecar requests in backend for auditing:
```
[2026-03-05 12:00:00] INFO: Planner request forwarded to sidecar
  Provider: sidecar
  Venue: pancakeswap
  Symbol: BNBUSDT
  StatusCode: 200
  Duration: 1243ms
  RequestId: req-abc123
```

### Frontend Error Tracking

Capture planner errors for debugging:
```javascript
console.warn('Planner advisory unavailable', {
  provider: 'sidecar',
  error: 'Sidecar timeout',
  timestamp: new Date().toISOString()
});
```

---

## 8) Security Considerations

### Authentication
- **Recommended:** Use `PLANNER_SIDECAR_TOKEN` for shared secret verification
- **Transport:** HTTPS only in production
- **Token rotation:** Rotate tokens every 90 days

### Input Validation
- Backend validates all request fields before forwarding to sidecar
- Sidecar re-validates all fields (defense in depth)
- Reject oversized requests to prevent DoS

### Rate Limiting
- Recommend: 100 requests/minute per IP via sidecar
- Backend timeout: 5 seconds (hard limit, no retry)

### Data Privacy
- Sidecar does not store request/advisory data
- All data ephemeral; purge after advisory generation
- No third-party data sharing

---

## 9) Versioning and Backward Compatibility

**Current Version:** 1.0

**Compatibility Guarantees:**
- Request field additions: backward-compatible (ignored by older sidecars)
- Response field additions: backward-compatible (handled gracefully by backend)
- Breaking changes (e.g., removed fields) require major version bump

**Migration Path:**
1. Sidecar v1.0 → v2.0: new fields in response, old backend ignores them
2. Backend recognizes version via `meta.planner_version`
3. If unsupported version detected, backend logs warning but continues

---

## 10) Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 502 Bad Gateway | Sidecar unreachable | Check `PLANNER_SIDECAR_URL` env var, verify sidecar is running |
| 401 Unauthorized | Wrong token | Verify `PLANNER_SIDECAR_TOKEN` matches sidecar config |
| 422 Unprocessable | Invalid payload | Check request field types and ranges (see section 2) |
| Timeout / Slow Advisory | Sidecar performance | Add async processing, increase server resources |
| Advisory quality poor | Model/logic issue | Review sidecar logs, update advisory algorithm |

---

## 11) References

- Backend integration: [crypto/backend/api.php](../crypto/backend/api.php)
- Frontend integration: [crypto/src/js/core/app.js](../crypto/src/js/core/app.js)
- Deployment guide: [docs/DEPLOYMENT_AND_OPERATIONS.md](../DEPLOYMENT_AND_OPERATIONS.md)
- Example sidecar (Node.js): See `node_modules` or external sidecar repo

---

**Contract Status:** ✓ Finalized for Phase 4  
**Next Steps:** Deploy sidecar to free tier, configure env vars, smoke test
