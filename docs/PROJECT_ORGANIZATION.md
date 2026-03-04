# Project Organization

Last updated: 2026-03-04

This document defines file ownership and organization rules for backward-safe maintenance.

## Ownership Map

| Area | Paths | Owner | Contract level |
| --- | --- | --- | --- |
| Root frontend | `*.html`, `style.css`, `script.js` | Frontend | Public UX behavior |
| Legacy API | `api/*` | Backend (legacy) | Public API behavior |
| Crypto frontend | `crypto/crypto.html`, `crypto/src/*` | Frontend (crypto) | Public UX + API consumer |
| Crypto backend | `crypto/backend/*` | Backend (crypto) | Public API behavior |
| Deployment | `DEPLOY_RUNBOOK.md`, `deploy/infinityfree/*`, `scripts/smoke_test.ps1` | Ops | Release/readiness |
| Canonical docs | `docs/*` | Documentation | Source of truth |

## Canonical vs Supplemental Docs

Canonical:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/DEPLOYMENT_AND_OPERATIONS.md`
- `docs/CRYPTO_APP.md`

Supplemental (must not override canonical contracts):

- `crypto/docs/*`
- module quick guides in `crypto/*` and `api/README.md`

## `crypto/docs/*` classification

| File | Classification | Action |
| --- | --- | --- |
| `crypto/docs/API.md` | Pointer candidate | Keep concise, link to `docs/API_REFERENCE.md` |
| `crypto/docs/INSTALLATION.md` | Pointer candidate | Keep concise, link to deployment docs |
| `crypto/docs/PROJECT_STRUCTURE.md` | Keep (contextual) | Keep if synced to current tree |
| `crypto/docs/FEATURES.md` | Rewrite candidate | Ensure features match shipped behavior |
| `crypto/docs/CHANGELOG.md` | Keep (module history) | Keep, but cross-link project changelog |
| `crypto/docs/BINANCE_API_LIMITATIONS.md` | Keep (advisory) | Keep if technically current |
| `crypto/docs/CONSISTENCY_REPORT.md` | Archive-pointer | Convert to short summary + canonical links |
| `crypto/docs/CONTRIBUTING.md` | Keep | Keep contribution process instructions |

## Non-Breaking Organization Rules

1. No URL or endpoint removals without compatibility shims.
2. New behavior contracts must be documented first in `docs/*`.
3. Module docs should reference canonical docs and avoid duplicate contract prose.
4. Smoke tests must be updated with every backend contract change.
