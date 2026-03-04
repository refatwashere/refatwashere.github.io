# Frontend Pages

Last updated: 2026-03-04

## Canonical Root Pages

- `index.html` - homepage
- `about.html` - profile/about
- `projects.html` - project cards/CTAs
- `resources.html` - downloadable resources
- `contact.html` - contact form/status messaging
- `Tradejournal.html` - legacy journal UI page
- `mom.html` - canonical memorial page

## Memorial Page Behavior

- Canonical page: `mom.html`
- Legacy compatibility routes:
  - `mem.html` redirects to `mom.html`
  - `memory.html` redirects to `mom.html`

This preserves old links while eliminating duplicate memorial content.

## Navigation and Shared UX Contracts

- Primary nav links include `mom.html` and `crypto/crypto.html`.
- Active-link highlighting is path-based in page scripts.
- Responsive nav behavior applies on smaller widths.

## Accessibility and Motion

Patterns currently implemented across key pages include:

- keyboard-visible focus styles
- semantic main content landmarks where present
- reduced-motion handling via `@media (prefers-reduced-motion: reduce)`
- dialog/tab semantics in rich pages (notably `Tradejournal.html` and crypto app)

## Root Asset Dependencies

- Shared CSS: `style.css`
- Shared JS: `script.js`
- Page-specific inline scripts for page-local behavior

## Frontend Regression Targets (smoke-tested)

- critical pages return HTTP 200
- resources downloads are reachable
- projects page has no placeholder alert CTA pattern
- crypto page contains required controls/labels and no mojibake patterns
- legacy memorial/journal pages checked for mojibake patterns

## Script/DOM Contracts

Examples of IDs/classes used by scripts and tests:

- Crypto page:
  - `themeToggle`, `settingsBtn`, `chartSymbolSelect`, `chartInterval`
  - `priceChart`, `rsiChart`, `rsiStatus`
  - `chartDataSourceBadge`
- Contact page:
  - status/live feedback region
- Tradejournal page:
  - tab controls and modal behavior IDs
