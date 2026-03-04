# Legacy API Module

Last updated: 2026-03-04

This module hosts the legacy journal/campaign/simple-earn API under `/api/*`.

Canonical references:

- `../docs/API_REFERENCE.md`
- `../docs/DEPLOYMENT_AND_OPERATIONS.md`
- `../docs/ARCHITECTURE.md`

## Required Environment Variables

- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `API_TOKEN_LEGACY` (preferred)
- `API_TOKEN` (temporary fallback)
- `ALLOWED_ORIGINS`

## Endpoints

- `GET /api/campaigns.php`
- `GET /api/simple_earn.php`
- `GET|POST /api/trades.php`
- `GET /api/health.php`

## Auth and CORS

- Send `X-API-Token` for all protected `/api/*.php` endpoints.
- CORS allowlist is controlled by `ALLOWED_ORIGINS`.

## Response Notes

- Standard success envelope:
  - `{ "status": "success", "data": ... }`
- Error envelope:
  - `{ "status": "error", "message": "...", "request_id": "..." }`

Legacy compatibility behavior:

- `GET /api/trades.php` returns a raw array when no pagination/filter/sort query params are provided.

For full request/response schemas and validation rules, see `../docs/API_REFERENCE.md`.
