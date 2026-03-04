# PHP Backend Guide

Last updated: 2026-03-04

Use this guide to deploy and validate the crypto PHP backend on shared/free hosting.

Canonical references:

- `../docs/API_REFERENCE.md`
- `../docs/DEPLOYMENT_AND_OPERATIONS.md`

## Files to Deploy

- `crypto/backend/bootstrap.php`
- `crypto/backend/api.php`
- `crypto/backend/health.php`

## Required Server Capabilities

- PHP 7.4+ (8.x recommended)
- cURL extension enabled
- HTTPS enabled
- Outbound internet access for Binance requests

## Required Environment Variables

- `API_TOKEN_CRYPTO`
- `ALLOWED_ORIGINS`

Compatibility fallback:

- `API_TOKEN` (temporary)

## Action Contracts

All `api.php` actions use:

- Method: `POST`
- Header: `X-API-Token`
- Body: JSON

Actions:

- `action=klines` (no Binance credentials required)
- `action=account` (requires Binance credentials)
- `action=order` (requires Binance credentials)
- `action=orders` (requires Binance credentials)
- `action=cancel` (requires Binance credentials)

Readiness endpoint:

- `GET /crypto/backend/health.php`

## cURL Test Examples

Klines:

```bash
curl -X POST "https://your-domain.example/crypto/backend/api.php?action=klines" \
  -H "X-API-Token: YOUR_API_TOKEN_CRYPTO" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","interval":"5m","limit":100}'
```

Account:

```bash
curl -X POST "https://your-domain.example/crypto/backend/api.php?action=account" \
  -H "X-API-Token: YOUR_API_TOKEN_CRYPTO" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"YOUR_KEY","apiSecret":"YOUR_SECRET","useTestnet":true}'
```

## Security Notes

- Never commit real Binance credentials.
- Use testnet first.
- Keep origin allow-list restrictive.
- Rotate token values when exposure is suspected.
