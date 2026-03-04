# Deploy Runbook

> Canonical detailed operations guide: docs/DEPLOYMENT_AND_OPERATIONS.md 
> Free/no-card provider options guide: docs/DEPLOYMENT_OPTIONS_FREE.md
> InfinityFree step-by-step guide: docs/INFINITYFREE_DEPLOYMENT.md
> InfinityFree command checklist: docs/INFINITYFREE_DEPLOYMENT_COMMANDS.md

## Scope

This runbook covers production rollout, smoke tests, and rollback for:

- `/api/*` (legacy journal API)
- `/crypto/backend/*` (crypto proxy API)
- static pages/assets under project root and `/crypto/*`

## 1) Pre-Deploy Backups

1. Create a timestamped backup of current site files.
2. Export existing environment variables.
3. Keep prior token values until smoke tests pass.
4. Confirm migration plan for `trades` table index updates (if applying `api/migrations/2026_03_04_trades_indexes.sql`).
5. Confirm rollback owner and communication channel before deploy starts.

## 2) Secret Rotation and Environment Mapping

Set these variables in hosting:

- `DB_HOST`
- `DB_USER`
- `DB_PASS` (new rotated DB password)
- `DB_NAME`
- `ALLOWED_ORIGINS` (example: `https://refatishere.free.nf`)
- `API_TOKEN_LEGACY` (for `/api/*`)
- `API_TOKEN_CRYPTO` (for `/crypto/backend/*`)

Compatibility fallback (temporary only):

- `API_TOKEN` can remain set while transitioning.

Readiness endpoints introduced:

- `/api/health.php`
- `/crypto/backend/health.php`

InfinityFree templates:

- `deploy/infinityfree/root.htaccess.example`
- `deploy/infinityfree/api.htaccess.example`
- `deploy/infinityfree/crypto-backend.htaccess.example`

## 3) Deploy Files

Upload updated directories/files:

- root `*.html`, `style.css`, `script.js`
- `/api/*`
- `/crypto/*`
- `/resources/*`
- `/images/*`
- `/docs/*` (recommended)
- `/scripts/smoke_test.ps1` (optional, local validation helper)

Permissions:

- files `644`
- directories `755`

## 4) Runtime Client Settings

On `crypto/crypto.html` > Settings:

- set Binance REST API key/secret
- set Backend API Token = `API_TOKEN_CRYPTO`
- keep Testnet enabled for validation
- keep `recvWindow` at `5000` unless tuning is required
- note: FIX API (Ed25519) is not used in this runtime

## 5) Smoke Tests

### Automated (recommended)

Run from a machine with network access to deployed site:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1 `
  -BaseUrl "https://your-domain.example" `
  -LegacyToken "<API_TOKEN_LEGACY>" `
  -CryptoToken "<API_TOKEN_CRYPTO>" `
  -AllowedOrigin "https://refatishere.free.nf"
```

Optional toggles:

- `-SkipNegativeTests`
- `-SkipReadinessChecks`
- `-SkipFrontendChecks`

Full trading-flow validation:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1 `
  -BaseUrl "https://your-domain.example" `
  -LegacyToken "<API_TOKEN_LEGACY>" `
  -CryptoToken "<API_TOKEN_CRYPTO>" `
  -AllowedOrigin "https://refatishere.free.nf" `
  -RunTradingFlow `
  -BinanceApiKey "<BINANCE_TESTNET_KEY>" `
  -BinanceApiSecret "<BINANCE_TESTNET_SECRET>"
```

### Manual browser regression

1. Verify root nav links return 200 and no 404 assets.
2. Verify memorial pages and redirects load as expected.
3. Verify `resources.html` downloads all resource files.
4. Verify `Tradejournal.html` and `crypto/crypto.html` load without console errors.
5. Verify crypto chart/ticker/watchlist/alerts/trading UI controls.
6. Verify crypto order flow paths:
- normal order success/failure notification
- recoverable unknown-order path resolves via `order-status`

## 6) Mandatory Pass/Fail Gates

Deployment is marked **PASS** only if all are true:

1. Automated smoke test exits successfully.
2. `/api/health.php` and `/crypto/backend/health.php` return `ready: true`.
3. No 5xx responses observed in first 10 minutes of post-deploy monitoring.
4. Frontend regression checks pass for critical pages and resource downloads.

Deployment is marked **FAIL** if any gate fails.

## 7) Rollback Trigger Matrix

Rollback immediately if:

1. Any API endpoint returns unexpected `500` for 3 consecutive requests.
2. Crypto order flow fails in testnet.
3. Valid-origin CORS requests are blocked.
4. Readiness endpoint reports `ready: false`.
5. Critical page or resource returns 404 post-deploy.

## 8) Rollback Procedure

1. Restore previous file backup.
2. Restore prior environment variable set.
3. Re-run minimal checks:
- `/api/campaigns.php` authorized request
- `/crypto/backend/api.php?action=account` authorized request
- load homepage + crypto page in browser

Rollback SLA: **complete rollback within 15 minutes** from trigger.

## 9) Post-Deploy Cleanup

After successful validation window:

1. Remove fallback `API_TOKEN`.
2. Keep only split tokens:
- `API_TOKEN_LEGACY`
- `API_TOKEN_CRYPTO`
