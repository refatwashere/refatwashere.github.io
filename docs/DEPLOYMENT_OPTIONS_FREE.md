# Free/No-Card Deployment Options

Last updated: 2026-03-04

This guide analyzes free deployment options for the current repository under these constraints:

- Always free tier
- No credit card requirement
- Keep current PHP + MySQL backend contracts unchanged

## Current Architecture Fit

The current project requires:

1. Static frontend hosting:
   - root `*.html`, `style.css`, `script.js`
   - `crypto/crypto.html` and frontend assets
2. PHP runtime + MySQL for backend:
   - `/api/*` endpoints
   - `/crypto/backend/*` endpoints

Critical crypto flow dependency:

- `POST /crypto/backend/api.php?action=klines`

## Provider Fit (Preferred Platforms)

## InfinityFree

- Fit: excellent for current PHP + MySQL + static stack
- Outcome: can host the entire project without backend rewrite

## GitHub Pages

- Fit: static frontend only
- Limitation: cannot run PHP endpoints
- Outcome: usable only in hybrid setup with external PHP host

## Vercel

- Fit: strong for static frontend
- Limitation: current PHP backend is not a native drop-in deployment model
- Outcome: best as frontend host in hybrid setup unless backend is rewritten

## Render

- Fit: can host static and services
- Limitation: no native PHP runtime path for this project without containerization/rework
- Outcome: not preferred for this repo as-is under no-card/free constraints

## Supabase

- Fit: backend/database platform
- Limitation: current code uses MySQL + PHP APIs, not Supabase Postgres stack
- Outcome: requires migration/rewrite; not a drop-in option

## Recommended Options

## Option A (Primary): All-in InfinityFree

Best balance of reliability and implementation effort for this codebase.

Topology:

- Host root static files, `/api/*`, `/crypto/*`, `/images`, `/resources` on InfinityFree.

Required environment configuration:

- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `ALLOWED_ORIGINS`
- `API_TOKEN_LEGACY`, `API_TOKEN_CRYPTO`
- Optional temporary fallback: `API_TOKEN`

Validation:

- Run `scripts/smoke_test.ps1` against production URL.
- Verify `/api/health.php` and `/crypto/backend/health.php`.
- Confirm crypto chart uses klines proxy path successfully.

## Option B: GitHub Pages (Frontend) + InfinityFree (Backend)

Topology:

- GitHub Pages: static pages/assets + crypto frontend files
- InfinityFree: `/api/*` and `/crypto/backend/*`

Required adjustments:

- Frontend backend URLs must be absolute to InfinityFree backend origin.
- `ALLOWED_ORIGINS` must include GitHub Pages origin.

Validation focus:

- CORS preflight allow behavior for frontend origin
- token-protected API accessibility cross-origin

## Option C: Vercel (Frontend) + InfinityFree (Backend)

Topology:

- Vercel: static frontend
- InfinityFree: PHP APIs and MySQL

Required adjustments:

- Same as Option B (absolute backend URLs + CORS origin updates)

Validation focus:

- Same as Option B, using Vercel origin

## Not Recommended Right Now

- Render-only deployment for this exact repo without backend rework
- Supabase-first migration without deliberate MySQL/PHP to Postgres/service rewrite

## Rollout Checklist (Any Option)

1. Prepare production tokens and DB environment variables.
2. Deploy topology-specific files.
3. Run smoke tests for:
   - auth negatives
   - CORS allow/deny
   - readiness endpoints
   - legacy API pagination/meta behavior
   - crypto `klines` behavior
   - frontend page/resource checks
4. Verify crypto chart source badge transitions (`Loading`, `Proxy`, `Fallback`, `Unavailable`).
5. Monitor first 24h for 5xx/CORS/token issues.

## Acceptance Criteria

1. Project is deployed on a no-card free topology.
2. All required PHP endpoints are functional and token-protected.
3. Frontend and crypto flows pass smoke/regression checks.
4. Chosen host model is documented and reproducible.

## Source Links

- InfinityFree free hosting: https://www.infinityfree.com/
- GitHub Pages static hosting docs: https://docs.github.com/articles/using-a-static-site-generator-other-than-jekyll
- Vercel pricing: https://vercel.com/pricing
- Vercel Hobby plan docs: https://vercel.com/docs/plans/hobby
- Render free plan: https://render.com/free
- Render runtime/language support: https://render.com/docs/language-support
- Supabase billing/free plan docs: https://supabase.com/docs/guides/platform/billing-on-supabase
