# Crypto Backend Module

Last updated: 2026-03-04

This backend provides token-protected proxy endpoints for crypto frontend operations.

Canonical references:

- `../../docs/API_REFERENCE.md`
- `../../docs/DEPLOYMENT_AND_OPERATIONS.md`
- `../../docs/CRYPTO_APP.md`

## Files

- `bootstrap.php` - shared auth/CORS/error/request-id/logging helpers
- `api.php` - action router
- `health.php` - readiness check

## Environment Variables

- `API_TOKEN_CRYPTO` (preferred)
- `API_TOKEN` (temporary fallback)
- `ALLOWED_ORIGINS`
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` (required for 24-hour klines backup cache)
- `PLANNER_SIDECAR_URL` (optional; used when `planner-intent` requests provider `sidecar`)

## Endpoints

All `api.php` actions:

- Method: `POST`
- Header: `X-API-Token`

Actions:

- `action=klines`
- `action=account`
- `action=order`
- `action=orders`
- `action=cancel`
- `action=order-status`
- `action=planner-intent`

Readiness:

- `GET /crypto/backend/health.php`

## Action Credential Requirements

- `klines`: does **not** require Binance `apiKey`/`apiSecret`
- `account`, `order`, `orders`, `cancel`, `order-status`: require Binance `apiKey`/`apiSecret`
- `planner-intent`: advisory only, no Binance API key/secret required

Klines backup cache behavior:

- stores klines data in MySQL for up to 24 hours
- symbols covered: `BTCUSDT`, `BNBUSDT`, `ETHUSDT`, `DOGEUSDT`
- cache is refreshed on successful upstream klines fetch and used when upstream is unavailable

Private-action request controls:

- optional `recvWindow` (`1..60000`, default `5000`)
- `order` accepts optional `newClientOrderId` and auto-generates if absent
- uncertain upstream order execution returns recoverable error metadata with `clientOrderId`

This backend uses Binance REST/WebSocket HMAC credentials. FIX API (Ed25519) is out of runtime scope.

## Envelope Standard

Success:

```json
{ "status": "success", "success": true, "data": ... }
```

Error:

```json
{ "status": "error", "success": false, "message": "...", "error": "...", "request_id": "..." }
```

Frontend compatibility currently accepts `status` or `success` indicators.
