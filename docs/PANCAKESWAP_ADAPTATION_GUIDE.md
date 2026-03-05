# PancakeSwap Adaptation Guide

**Document:** Implementation Reference and Migration Guide  
**Date:** 2026-03-05  
**Branch:** `feature/pancakeswap-ai-planner-integration`  
**Target Audience:** Developers, DevOps, Product

---

## 1) Overview: What's New

The **PancakeSwap Adaptation** extends the Hydra Trade Desk with DEX-focused advisory capabilities alongside existing Binance execution. This guide explains:

- What PancakeSwap integration includes (and explicitly excludes)
- How it relates to the baseline Binance engine
- How to configure, deploy, and operate it in production
- Common integration patterns and gotchas

### Key Points

- **Advisory-only:** No direct wallet interaction, no token swaps, no transaction-sending
- **Deep-link based:** Route users to PancakeSwap.finance pre-filled with parameters
- **Binance execution intact:** Existing order placement, chart, market data flows unchanged
- **Optional sidecar:** Advanced AI planner available but never required
- **Backward-compatible:** All existing API contracts and configs remain valid

---

## 2) Architecture Context

### Component Overview

```
┌─────────────────────────────────────────┐
│    Frontend: crypto/crypto.html         │
│ ┌─────────────────────────────────────┐ │
│ │ Planner Workspace (new)             │ │
│ │ - Venue selector (Binance/PancakeSwap) │
│ │ - DEX token/chain inputs             │ │
│ │ - Advisory + deep-link output        │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Execution Tab (existing)             │ │
│ │ - Binance order form                │ │
│ │ - Chart + market data               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                   │
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────┐
│     Backend: crypto/backend/api.php      │
│ ┌──────────────────────────────────────┐ │
│ │ Planner Intent Route (new)           │ │
│ │ - Binance advisory (local)           │ │
│ │ - PancakeSwap advisory (local + sidecar) │
│ │ - Deep-link generation               │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Existing Routes (unchanged)          │ │
│ │ - klines (Binance price data)        │ │
│ │ - account (Binance account)          │ │
│ │ - order/cancel/order-status          │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
        ▼                      ▼
   Binance API            Sidecar (optional)
   (existing)             /planner/intent
```

---

## 3) What's Implemented

### Backend (crypto/backend/api.php)

✅ **Planner Intent Endpoint Enhancements:**
- `venue` parameter: `binance` (default) or `pancakeswap`
- `chainId` parameter: 56 (BSC), 1 (Eth), 42161 (Arbitrum), 8453 (Base)
- `tokenIn`, `tokenOut` parameters: token symbols or 0x contract addresses
- `amountIn`, `slippageBps` parameters: swap size and slippage tolerance
- `routeType` parameter: `auto`, `v2`, `v3`, `stable`
- `provider` parameter: `local` (heuristic) or `sidecar` (AI-based)

✅ **PancakeSwap Deep-Link Generation:**
- Builds pre-filled URLs: `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=...`
- Incorporates chainId, token pair, slippage

✅ **Risk Assessment for DEX:**
- `price_impact_high`: Large swaps (size > 25) on PancakeSwap
- `slippage_wide`: Slippage > 150 bps
- `liquidity_low`: Missing token pair contract addresses
- `unknown_token_contract`: Invalid token contract format

✅ **Provider Routing:**
- Local heuristic: Deterministic, always available
- Sidecar: AI-based, optional, graceful fallback

✅ **Validation & Error Handling:**
- 422 responses for invalid DEX payloads
- 202 responses for sidecar fallback scenarios
- Request ID propagation for tracing

### Frontend (crypto/src/js/core/app.js + crypto.html)

✅ **Planner Request Builder Enhancements:**
- `getPlannerVenue()`: Read venue from localStorage
- `getPlannerProvider()`: Read provider from localStorage
- DEX-specific fields passed to backend when venue is PancakeSwap

✅ **Planner Output Renderer (new):**
- Confidence badge (color-coded: green/yellow/red)
- Rationale text panel
- Risk flags as clickable chips
- Action buttons: "Open PancakeSwap" (deep-link), "Copy Route Summary", "Close"
- Source label (Local vs Sidecar)

✅ **Advisory-Only UX:**
- Prominent "Advisory-only mode" notice in Trading tab
- "Planner (Local)" / "Planner (Sidecar)" badges
- Planner failures never block manual order placement
- Explicit "Copy Route Summary" button for traders

✅ **Planner Workspace UI:**
- Venue selector dropdown
- Provider selector (Local / Sidecar)
- Chain selector (BSC / Ethereum / Arbitrum / Base)
- Token input fields (symbol or contract)
- Amount, slippage, route type inputs
- "Generate Advisory" button

✅ **Settings Modal Updates:**
- Planner enabled toggle
- Planner sidecar token input
- PancakeSwap disclaimer text

### CSS/UX Theme (crypto/src/css/main.css)

✅ **Rebrand 2026:**
- High-contrast color system (--accent-primary, --accent-secondary, etc.)
- Typography improvements (--font-display, --font-body, --font-mono)
- Planner panel styling
- Responsive design improvements (360px mobile minimum)
- Planner badges and chips

---

## 4) What's Intentionally Out of Scope

### NOT Implemented

❌ **Direct Wallet Integration:**
- No MetaMask / WalletConnect setup
- No transaction signing
- No actual token swaps on-chain
- Users manually copy route and execute on PancakeSwap.finance

❌ **Multi-Signature & Complex Strategies:**
- Single trade advisory only
- No portfolio rebalancing
- No auto-compounding

❌ **Full DEX Price Quotes:**
- No real-time DEX quotes API integration
- Advisory is heuristic-based, not live market data
- Users should verify slippage and pricing on PancakeSwap before executing

❌ **Wallet Management:**
- No balance tracking for DEX tokens
- No transaction history import
- No cross-exchange portfolio aggregation

❌ **Compliance/Regulatory:**
- Advisory does not constitute investment advice
- Users responsible for portfolio risk management
- No AML/KYC integration

---

## 5) Configuration & Deployment

### Environment Variables

**For PancakeSwap dealer support:**

```bash
# Backend (InfinityFree / PHP Host)
PLANNER_SIDECAR_URL=https://planner-sidecar.railway.app/planner/intent
PLANNER_SIDECAR_TOKEN=shared-secret-key  # Optional

# Frontend settings (via UI or localStorage):
planner_enabled = true
planner_venue = "binance" | "pancakeswap"
planner_provider = "local" | "sidecar"
planner_chainId = "56" | "1" | "42161" | "8453"
planner_tokenIn = "BNB" | "0x..." 
planner_tokenOut = "USDT" | "0x..."
planner_amountIn = "10.0"
planner_slippageBps = "50"
planner_routeType = "auto" | "v2" | "v3" | "stable"
```

### Quick-Start Deployment

1. **Backend (already done on InfinityFree):**
   - api.php knows about pancakeswap venue ✓
   - Deep-link generation enabled ✓
   - Sidecar routing implemented ✓

2. **Frontend (deploy updated HTML/JS/CSS):**
   - Upload `/crypto/crypto.html` (venue selector, planner workspace)
   - Upload `/crypto/src/js/core/app.js` (planner builder, renderer)
   - Upload `/crypto/src/css/main.css` (rebrand + planner styles)

3. **Sidecar (optional, for advanced advisories):**
   - Deploy Node app to Railway / Heroku
   - Set `PLANNER_SIDECAR_URL` in backend config
   - No code changes needed if sidecar not deployed (uses local fallback)

---

## 6) Integration Patterns

### Pattern 1: Binance-Only User (Default)

```javascript
// Settings
planner_venue = "binance"
planner_provider = "local"

// Workflow
1. User opens Trading tab
2. Selects symbol (e.g., BTCUSDT)
3. Fills order form (price, quantity)
4. (Optional) Clicks "Generate Advisory"
5. Backend returns local Binance advisory
6. User places order manually

// Result: Existing Binance flow, no DEX involvement
```

### Pattern 2: PancakeSwap Deep-Link Advisory

```javascript
// Settings
planner_venue = "pancakeswap"
planner_provider = "local"
planner_chainId = "56"
planner_tokenIn = "BNB"
planner_tokenOut = "USDT"

// Workflow
1. User opens Trading tab
2. Opens Planner Workspace sidebar
3. Fills venue/chain/token inputs
4. Clicks "Generate Advisory"
5. Backend returns local PancakeSwap advisory with deep link
6. User clicks "Open PancakeSwap" button
7. PancakeSwap opens with pre-filled route:
   https://pancakeswap.finance/swap?chain=bsc&inputCurrency=BNB&outputCurrency=USDT&exactAmount=10
8. User executes swap on PancakeSwap

// Result: Advisory guides user to DEX, no auto-execution
```

### Pattern 3: Sidecar AI Advisory (Advanced)

```javascript
// Settings
planner_venue = "pancakeswap"
planner_provider = "sidecar"
PLANNER_SIDECAR_URL = "https://sidecar.app/planner/intent"

// Workflow
1. User enables Sidecar in settings
2. Fills planner workspace
3. Clicks "Generate Advisory"
4. Backend forwards request to sidecar (5s timeout)
5. If sidecar responds: advanced AI advisory with confidence, risk flags
6. If sidecar times out: falls back to local heuristic
7. Frontend displays "Planner (Sidecar)" or "Planner (Local)" badge

// Result: Enhanced advisory quality if sidecar available
```

---

## 7) API Changes Summary

### Backend Routes (Backward-Compatible Additions)

**POST /crypto/backend/api.php?action=planner-intent**

**New Optional Fields:**
| Field | Type | Venue | Notes |
|-------|------|-------|-------|
| venue | string | all | `binance` (default) or `pancakeswap` |
| provider | string | all | `local` (default) or `sidecar` |
| chainId | number | pancakeswap | Blockchain ID |
| tokenIn | string | pancakeswap | Token symbol or 0x address |
| tokenOut | string | pancakeswap | Token symbol or 0x address |
| amountIn | number | pancakeswap | Swap amount |
| slippageBps | number | pancakeswap | Slippage basis points |
| routeType | string | pancakeswap | Route preference |

**Response Envelope (Unchanged):**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "trade_intent": { ... },
    "execution_plan": { ... },
    "risk_assessment": { ... },
    "meta": { "source": "local_heuristic" | "sidecar", ... }
  }
}
```

---

## 8) Common Integration Tasks

### Task 1: Enable PancakeSwap Advisory in Frontend

```javascript
// app.js: User clicks "Generate Advisory" in planner workspace
document.getElementById('plannerRunBtn').addEventListener('click', async () => {
  const venue = document.getElementById('plannerVenue').value;
  const chainId = document.getElementById('plannerChainId').value;
  const tokenIn = document.getElementById('plannerTokenIn').value;
  const tokenOut = document.getElementById('plannerTokenOut').value;
  const amountIn = document.getElementById('plannerAmountIn').value;
  
  const order = {
    symbol: "BNBUSDT",  // Can be dummy for PancakeSwap context
    side: "BUY",
    quantity: parseFloat(amountIn),
    type: "MARKET",
    price: null,
    venue: venue,
    chainId: parseInt(chainId),
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    amountIn: amountIn
  };
  
  const result = await app.requestPlannerIntent(order);
  if (result.ok) {
    app.showPlannerAdvice(result);
  }
});
```

### Task 2: Integrate Sidecar for Better Advisories

```bash
# 1. Deploy sidecar to Railway
railway init  # Follow prompts
railway variables --set PLANNER_SECRET=your-secret
git push railway main

# 2. Get sidecar URL
railway open
# Copy: https://sidecar-xyz.railway.app

# 3. Update InfinityFree backend config
# In .htaccess or php.ini:
SetEnv PLANNER_SIDECAR_URL https://sidecar-xyz.railway.app/planner/intent
SetEnv PLANNER_SIDECAR_TOKEN your-secret

# 4. Restart PHP workers (InfinityFree auto-restarts)

# 5. Test
curl -X POST https://refatishere.free.nf/crypto/backend/api.php?action=planner-intent \
  -H "X-API-Token: your-token" \
  -d '{"venue":"pancakeswap","provider":"sidecar",...}'
```

### Task 3: Add Advisory to Order Form

```html
<!-- crypto.html: After order form, add planner panel -->
<div id="plannerAdvicePanel" class="planner-panel" style="display: none;">
  <!-- Populated by JavaScript -->
</div>

<!-- Script -->
<script>
  document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const order = buildOrder();  // Existing function
    const planner = await app.requestPlannerIntent(order);
    
    if (planner.ok) {
      const panel = document.getElementById('plannerAdvicePanel');
      panel.innerHTML = app.renderPlannerPanel(planner);
      panel.style.display = 'block';
    }
    
    // Continue with order submission...
  });
</script>
```

---

## 9) Troubleshooting

### Issue: "Planner advisory not showing"

**Checklist:**
1. Is planner enabled? Check: `localStorage.getItem('planner_enabled')`
2. Is venue set? Check: `localStorage.getItem('planner_venue')`
3. Backend returning data? Check browser Network tab
4. Any JavaScript errors? Open DevTools Console

**Fix:**
```javascript
// Enable in DevTools console
localStorage.setItem('planner_enabled', 'true');
localStorage.setItem('planner_venue', 'binance');
// Reload page
```

### Issue: "Sidecar shows as unavailable"

**Checklist:**
1. Is sidecar URL set? Check: `echo $PLANNER_SIDECAR_URL` in PHP
2. Is sidecar service running? Check: `curl https://sidecar-url/health`
3. Network connectivity? From InfinityFree server can reach sidecar?
4. Token mismatch? Check `PLANNER_SIDECAR_TOKEN` matches both ends

**Fix:**
```bash
# Temporarily disable sidecar
unset PLANNER_SIDECAR_URL
# Backend falls back to local planner automatically
```

### Issue: "Deep-link to PancakeSwap not working"

**Common Cause:** URL encoding issue

**Fix:**
```javascript
// Ensure tokens are URL-encoded
const tokenIn = encodeURIComponent(document.getElementById('planner TokenIn').value);
const tokenOut = encodeURIComponent(document.getElementById('plannerTokenOut').value);
const deepLink = `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=${tokenIn}&outputCurrency=${tokenOut}`;
```

---

## 10) Migration Path from Binance-Only

### Phase 1: Deploy Without PancakeSwap (Current)

- Existing Binance execution works as before
- Planner workspace is added but optional
- Users can ignore PancakeSwap if not needed
- **Impact:** None if not used

### Phase 2: Enable PancakeSwap Advisory (Next)

- Document PancakeSwap advisory workflow
- User education in-app notices
- Optional sidecar deployment for higher accuracy
- **Impact:** New UX, no breaking changes

### Phase 3: Advanced Features (Future)

- Wallet integration (optional)
- Portfolio tracking for DEX tokens
- Cross-exchange arbitrage suggestions
- **Impact:** Requires opt-in, backward-compatible

---

## 11) References & Further Reading

- **API Reference:** [docs/API_REFERENCE.md](../docs/API_REFERENCE.md)
- **Sidecar Contract:** [docs/SIDECAR_API_CONTRACT.md](../docs/SIDECAR_API_CONTRACT.md)
- **Deployment Config:** [docs/SIDECAR_DEPLOYMENT_CONFIG.md](../docs/SIDECAR_DEPLOYMENT_CONFIG.md)
- **Planner Architecture:** [docs/AI_PLANNER_ARCHITECTURE.md](../docs/AI_PLANNER_ARCHITECTURE.md)
- **PancakeSwap Docs:** https://docs.pancakeswap.finance/
- **Binance Spot API:** https://binance-docs.github.io/apidocs/

---

**Status:** ✓ Complete for Phase 5  
**Next:** Update AI_PLANNER_ARCHITECTURE.md, sync README files
