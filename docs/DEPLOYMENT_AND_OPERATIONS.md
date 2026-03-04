# Deployment and Operations

Last updated: 2026-03-04

This document is the canonical deployment and operations reference. `DEPLOY_RUNBOOK.md` remains a concise operational quick runbook.

For provider-selection strategy under free/no-card constraints, see:

- `DEPLOYMENT_OPTIONS_FREE.md`

## Environment Variables

## Legacy API (`/api/*`)

Required:

- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `API_TOKEN_LEGACY`

Compatibility fallback:

- `API_TOKEN` (temporary only)

## Crypto backend (`/crypto/backend/*`)

Required:

- `API_TOKEN_CRYPTO`

Compatibility fallback:

- `API_TOKEN` (temporary only)

## Shared

- `ALLOWED_ORIGINS` (comma-separated trusted origins)

## Deployment Sequence

1. Create timestamped backup of deployed files.
2. Export current environment values.
3. Apply/verify env vars for both API groups.
4. Deploy files/directories:
   - root HTML/CSS/JS
   - `api/`
   - `crypto/`
   - `resources/`
   - `images/`
5. Optional DB migration:
   - `api/migrations/2026_03_04_trades_indexes.sql`
6. Run smoke tests and enforce pass/fail gates.
7. If failed, rollback immediately.

## Runtime Client Configuration (crypto page)

In `crypto/crypto.html` settings:

- Set `Backend API Token` = `API_TOKEN_CRYPTO`
- Configure Binance API key/secret if using account/order actions
- Keep testnet enabled for safe validation

## Smoke Test Commands

Baseline:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1 `
  -BaseUrl "https://your-domain.example" `
  -LegacyToken "<API_TOKEN_LEGACY>" `
  -CryptoToken "<API_TOKEN_CRYPTO>" `
  -AllowedOrigin "https://your-domain.example"
```

Full trading-flow validation:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1 `
  -BaseUrl "https://your-domain.example" `
  -LegacyToken "<API_TOKEN_LEGACY>" `
  -CryptoToken "<API_TOKEN_CRYPTO>" `
  -AllowedOrigin "https://your-domain.example" `
  -RunTradingFlow `
  -BinanceApiKey "<BINANCE_TESTNET_KEY>" `
  -BinanceApiSecret "<BINANCE_TESTNET_SECRET>"
```

## Smoke Coverage (current)

- Negative auth checks (legacy + crypto)
- Validation failures and request-id checks
- CORS allow/deny behavior
- Trades pagination/meta response
- Crypto `klines` positive and negative checks
- Readiness endpoint checks
- Frontend critical page and resource checks
- Crypto UI regression markers

## Pass/Fail Gates

Mark deployment PASS only when all are true:

1. Smoke script exits successfully.
2. `/api/health.php` and `/crypto/backend/health.php` return ready.
3. No recurring 5xx in initial post-deploy window.
4. Frontend regression checks pass.

## Rollback Trigger Matrix

Rollback immediately if any trigger occurs:

- Unexpected 500s on critical API paths (3 consecutive checks)
- Valid-origin CORS requests blocked
- Readiness returns not ready
- Crypto trading flow fails in testnet validation
- Critical page/resource 404 after deploy

## Rollback Procedure (target SLA < 15 minutes)

1. Restore previous file backup.
2. Restore previous env vars.
3. Re-run minimal checks:
   - `/api/campaigns.php` authorized
   - `/crypto/backend/api.php?action=account` authorized
   - homepage + crypto page loads

## Post-Deploy Routine

Daily:

- API availability checks for health endpoints and key actions.

Weekly:

- Review error/latency trends from logs.
- Confirm token configuration and remove temporary fallback `API_TOKEN` when safe.
