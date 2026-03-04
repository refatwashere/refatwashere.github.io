# Crypto Module

Last updated: 2026-03-04

This folder contains the crypto tracker/trading frontend and its PHP backend proxy.

Canonical references:

- `../docs/CRYPTO_APP.md`
- `../docs/API_REFERENCE.md`
- `../docs/DEPLOYMENT_AND_OPERATIONS.md`

## Entry Points

- Frontend UI: `crypto.html`
- Core app logic: `src/js/core/app.js`
- Core styles: `src/css/main.css`
- Backend API: `backend/api.php`
- Backend readiness: `backend/health.php`

## Capabilities (current)

- Real-time multi-symbol market updates
- Candle-like chart with EMA and RSI panels
- Conservative signal markers
- Backend-proxied chart klines + fallback model
- Journal, alerts, watchlist, mock/real trading flows
- Tokenized backend access and request envelope compatibility
- Private-action timing controls (`recvWindow`) and `order-status` recovery checks
- Optional planner advisory flow (`planner-intent`) behind feature flag (`planner_enabled`)

## Notes

- This module documentation is intentionally concise.
- For detailed behavior, contracts, and operations, use root `docs/` files.
