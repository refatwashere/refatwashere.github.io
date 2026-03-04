# Crypto Quick Start

Last updated: 2026-03-04

## 1) Deploy Files

Upload the entire `crypto/` directory so these paths exist:

- `/crypto/crypto.html`
- `/crypto/src/...`
- `/crypto/backend/api.php`
- `/crypto/backend/health.php`

## 2) Configure Environment Variables

Required on hosting:

- `API_TOKEN_CRYPTO` (preferred)
- `ALLOWED_ORIGINS`

Optional compatibility fallback:

- `API_TOKEN`

## 3) Open and Configure App

1. Open `/crypto/crypto.html`
2. Go to `Settings`
3. Set `Backend API Token` to `API_TOKEN_CRYPTO`
4. Optionally provide Binance API key/secret for account/order actions
5. Keep testnet enabled for safe validation

## 4) Validate

Run smoke tests from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1 `
  -BaseUrl "https://your-domain.example" `
  -LegacyToken "<API_TOKEN_LEGACY>" `
  -CryptoToken "<API_TOKEN_CRYPTO>" `
  -AllowedOrigin "https://your-domain.example"
```

## Troubleshooting

- `Unauthorized`: verify `X-API-Token` value and server env var.
- Chart history unavailable: verify backend is deployed and `action=klines` reachable.
- Trading actions fail: verify Binance credentials and testnet settings.

For full details:

- `../docs/CRYPTO_APP.md`
- `../docs/API_REFERENCE.md`
- `../docs/DEPLOYMENT_AND_OPERATIONS.md`
