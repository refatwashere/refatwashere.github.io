# Project Changelog (Documentation Baseline)

Last updated: 2026-03-04

This file tracks major recent project-level changes reflected in current documentation.

## 2026-03 baseline

### Security and reliability

- Token split hardened:
  - `API_TOKEN_LEGACY` for `/api/*`
  - `API_TOKEN_CRYPTO` for `/crypto/backend/*`
- CORS controls and request-id propagation documented and smoke-tested.
- Readiness endpoints added/used in deployment gates:
  - `/api/health.php`
  - `/crypto/backend/health.php`

### API and backend behavior

- `GET /api/trades.php` supports paginated/filter/sort mode while retaining legacy response compatibility.
- Crypto backend added `action=klines` with validation and bounded limit.
- Crypto backend response envelope standardized (`status` + `success` fields).

### Crypto frontend

- Chart upgraded to candle-like price panel + EMA overlays + RSI panel.
- Conservative crossover/RSI signals added.
- Chart readability upgrades:
  - adaptive price range
  - right-axis labels
  - last-price tag
- Chart data reliability model:
  - backend `klines` primary
  - fallback to interval cache
  - source-state badge (`Loading/Proxy/Fallback/Unavailable`)
- Live price formatting updated to Binance-style symbol decimal defaults.

### Frontend quality

- Crypto and legacy UI label/encoding cleanups.
- Expanded smoke tests for frontend availability and mojibake checks.
- Memorial pages consolidated:
  - canonical `mom.html`
  - `mem.html` and `memory.html` redirect shims.
