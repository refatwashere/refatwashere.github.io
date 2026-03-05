# Phase 0: Baseline Freeze & Safety Gates
**Branch:** `feature/pancakeswap-ai-planner-integration`  
**Date Frozen:** 2026-03-05  
**Scope:** PancakeSwap Adaptation + Full Crypto UI Rebrand

---

## 1) Impacted Files Inventory

### Backend (PHP)
- **`crypto/backend/api.php`** (774 lines)
  - Current actions: `klines`, `account`, `order`, `orders`, `cancel`, `order-status`, `planner-intent`
  - Validates Binance API credentials and proxies to Binance REST API
  - Response envelope: `{ status, success, data, request_id }`
  
- **`crypto/backend/bootstrap.php`**
  - Initialization, CORS, token validation
  
- **`api/db.php`, `api/bootstrap.php`**
  - Legacy journal database layer

### Frontend (JavaScript)
- **`crypto/src/js/core/app.js`** (2462 lines)
  - Core `CryptoApp` class with chart, ticker, trading, journal functionality
  - Binance WebSocket integration for live price streams
  - Chart rendering with EMA, RSI, signal detection
  
- **`crypto/src/js/services/api.js`**
  - HTTP client for backend calls
  
- **`crypto/src/js/services/config.js`**
  - Client configuration and constants

### Markup & Styling
- **`crypto/crypto.html`** (275 lines)
  - Tab structure: Market, Chart, Journal, Alerts, Trading
  - Form inputs for trading, settings modal
  - Current header: "Hydra Trade Desk | Binance Execution + PancakeSwap Advisor"
  
- **`crypto/src/css/main.css`** (515 lines)
  - CSS custom properties (--bg-primary, --accent, --positive, --negative)
  - Current theme: dark gradient with magenta accents (#f5576c)
  - Responsive breakpoints and component styles

### Testing & Documentation
- **`scripts/smoke_test.ps1`** (395 lines)
  - Comprehensive smoke tests for endpoints, CORS, health checks
  - Covers legacy API, crypto backend, trading flows
  
- **`DEPLOY_RUNBOOK.md`** (162 lines)
  - Deployment procedures, readiness gates, secrets management
  
- **`docs/CHANGELOG_PROJECT.md`** (72 lines)
  - Project-level changelog and milestones
  
- **`README.md`** (root)
  - Project overview and quick start
  
- **`crypto/README.md`**
  - Crypto module documentation
  
- **`crypto/backend/README.md`**
  - Backend service guide

---

## 2) Current Behavior & Existing Actions

### Binance-Only Execution Flow
```
Frontend Request → /crypto/backend/api.php?action=<ACTION>
                  → Binance API validation
                  → Response envelope (status, success, data, request_id)
```

### Supported Actions (Non-Breaking)
| Action | Purpose | Response Type |
|--------|---------|---------------|
| `klines` | Fetch OHLCV candles | Array of candles |
| `account` | User account info | Account object with balances |
| `order` | Place new order | Order confirmation |
| `orders` | List open/past orders | Array of orders |
| `cancel` | Cancel an order | Cancellation confirmation |
| `order-status` | Get single order status | Order object |
| `planner-intent` | Advisory only (currently local) | Advisory envelope |

### Request Validation Guarantees
- **API Token:** Required via header `X-API-Token`
- **CORS:** Strict origin checking (default: `https://refatishere.free.nf`)
- **Payload:** JSON required; invalid → `400 Invalid JSON payload`
- **recvWindow:** 1–60000 ms (default 5000)
- **Invalid fields:** `422` with `request_id` for tracking

### Error Codes (Stable)
- `400` – Malformed request
- `401` – Authentication failure
- `403` – CORS or permission denied
- `422` – Validation failure
- `502` – Upstream service unavailable

---

## 3) Non-Breaking Guarantees for Phase 1–6

### API Compatibility
✓ Existing actions remain unchanged in signature and semantics  
✓ Response envelope structure (`status`, `success`, `data`, `request_id`) preserved  
✓ Error codes and validation remain consistent  
✓ Backward-compatible env vars:
  - `API_TOKEN_CRYPTO` – Primary
  - `API_TOKEN` – Fallback (temporary, for transition)

### Frontend Behavior
✓ Existing Binance order flow unaffected  
✓ Existing chart data sources and fallback logic unchanged  
✓ Existing UI tabs and navigation remain accessible  
✓ Keyboard and screen-reader support preserved

### Deployment Model
✓ InfinityFree hosting layer unchanged  
✓ Database schema (trades, migrations) unchanged  
✓ Health endpoints (`/api/health.php`, `/crypto/backend/health.php`) remain stable

### Planner (Advisory-Only Context)
✓ Planner is never blocking (advisory only)  
✓ Planner provider default: `local` (deterministic heuristic)  
✓ Planner failures do not prevent manual order placement  
✓ Explicit "advisory-only" label required in UI

---

## 4) Changes Allowed in Phases 1–6

### Additive Only (No Removal)
- New optional request fields (e.g., `venue`, `chainId` for PancakeSwap context)
- New optional response fields (e.g., `execution_plan`, `risk_assessment`)
- New provider routing option (`provider=sidecar`, `provider=local`)
- New env vars (`PLANNER_SIDECAR_URL`, `PLANNER_SIDECAR_TOKEN`)

### UI/UX Enhancements
- New planner panel in trading context
- Rebranded styling and layout (as specified in Phase 3)
- New action buttons (e.g., "Open PancakeSwap", "Copy Route Summary")
- Responsive improvements without removing existing features

### Documentation
- New guides (e.g., `PANCAKESWAP_ADAPTATION_GUIDE.md`)
- Updated existing docs with planner/sidecar context
- Module README mirrors for clarity

---

## 5) Testing Baseline (Phase 0 → Phase 6)

### Regression Test Requirements
- [ ] All existing smoke tests pass without modification
- [ ] All existing crypto/legacy actions work end-to-end
- [ ] Binance order placement works with and without planner enabled
- [ ] Health checks remain responsive
- [ ] CORS and token validation unchanged

### New Test Cases (Phase 6)
- [ ] `planner-intent` with `venue=pancakeswap`
- [ ] Invalid DEX payload validation
- [ ] Sidecar unavailable behavior (fallback to local)
- [ ] Deep-link payload presence in responses
- [ ] UI advisory labels and status states

---

## 6) Release Gating Criteria

Before merge to main/production:
1. ✓ All Phase 0–5 implementation tasks complete
2. ✓ All existing smoke tests green
3. ✓ New planner/DEX tests green (Phase 6)
4. ✓ Manual QA sign-off: desktop/mobile/accessibility
5. ✓ Deployment runbook validated (InfinityFree + Sidecar modes)
6. ✓ Documentation canonical and consistent

---

## 7) Rollback Plan (If Needed)

**Scope:** Revert to production-stable state before this branch  
**Time:** ~15 minutes with pre-positioned backup

1. Restore prior `crypto/backend/api.php` (no PancakeSwap fields)
2. Restore prior `crypto/crypto.html` (old layout)
3. Restore prior `crypto/src/css/main.css` (old theme)
4. Clear cache (`/tmp/*`)
5. Smoke test (legacy actions only)

**Communication:** Notify stakeholders of rollback reason and timing.

---

## 8) Next Steps

- **Phase 1:** Expand `planner-intent` contract with PancakeSwap fields
- **Phase 2:** Frontend planner integration (advisory + deep-link)
- **Phase 3:** Full UI rebrand (layout, theming, responsiveness)
- **Phase 4:** Sidecar contract and fallback policy
- **Phase 5:** Documentation modernization
- **Phase 6:** QA and release gates

---

**Baseline Freeze Confirmation**  
✓ All files mapped and current implementation verified  
✓ Non-breaking guarantees documented  
✓ Safety gates defined  
**Status:** Ready for Phase 1
