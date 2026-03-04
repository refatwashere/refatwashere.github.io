# RefatIsHere Project Documentation Hub

Last updated: 2026-03-04

This repository contains a static personal site, a legacy PHP API for trade/journal data, and a full crypto tracker/trading frontend with a PHP backend proxy.

## Repository Overview

- Root static site pages: `index.html`, `about.html`, `projects.html`, `resources.html`, `contact.html`, `Tradejournal.html`, `mom.html`
- Memorial legacy compatibility pages: `mem.html`, `memory.html` (redirect to `mom.html`)
- Shared frontend assets: `style.css`, `script.js`
- Legacy API: `api/`
- Crypto app: `crypto/`
- Deployment runbook: `DEPLOY_RUNBOOK.md`
- Automated smoke tests: `scripts/smoke_test.ps1`

## Quick Start

### Local static preview

1. Serve the repo with any static server.
2. Open `index.html` for the main site.
3. Open `crypto/crypto.html` for the crypto app.

Note: crypto chart history calls `crypto/backend/api.php?action=klines`. For full behavior, use a PHP-capable hosting/runtime and set required environment variables.

### Deployment quick path

1. Configure environment variables (legacy API + crypto backend).
2. Deploy root files, `api/`, `crypto/`, `images/`, and `resources/`.
3. Run smoke tests:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1 `
  -BaseUrl "https://your-domain.example" `
  -LegacyToken "<API_TOKEN_LEGACY>" `
  -CryptoToken "<API_TOKEN_CRYPTO>" `
  -AllowedOrigin "https://your-domain.example"
```

## Documentation Index

Canonical documentation:

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Deployment and Operations](docs/DEPLOYMENT_AND_OPERATIONS.md)
- [InfinityFree Deployment](docs/INFINITYFREE_DEPLOYMENT.md)
- [Free/No-Card Deployment Options](docs/DEPLOYMENT_OPTIONS_FREE.md)
- [Frontend Pages](docs/FRONTEND_PAGES.md)
- [Crypto App](docs/CRYPTO_APP.md)
- [AI Planner Architecture](docs/AI_PLANNER_ARCHITECTURE.md)
- [Project Organization](docs/PROJECT_ORGANIZATION.md)
- [Project Changelog](docs/CHANGELOG_PROJECT.md)

Module-specific entry points:

- [Legacy API module README](api/README.md)
- [Crypto module README](crypto/README.md)
- [Crypto backend README](crypto/backend/README.md)

## Current Status

- Security controls are token-gated for both API groups.
- CORS allow-listing and request-id tracing are in place.
- Smoke tests include negative auth/CORS checks, readiness checks, API checks, and frontend regression checks.
- Crypto chart reliability now uses backend `klines` proxy + fallback model.
- Memorial pages are consolidated into canonical `mom.html` with legacy redirects.

## Known Constraints

- Crypto backend requires PHP with cURL and outbound network access.
- Local `file://` loading will not fully simulate deployed behavior.
- Some legacy API compatibility behavior remains intentionally (example: trades GET legacy array response when no pagination/filter params are supplied).

