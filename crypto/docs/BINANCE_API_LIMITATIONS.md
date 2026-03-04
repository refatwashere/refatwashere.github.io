# Binance API Limitations

Last updated: 2026-03-04

Operational constraints to keep in mind:

- Upstream Binance outages/rate-limits can impact backend proxy calls.
- API keys are required for private account/order actions, not for klines action.
- Exchange-side validation rules and symbol filters are enforced upstream.
- Testnet behavior can differ from production market behavior.

Canonical reference:

- `../../docs/API_REFERENCE.md`
- `../../docs/DEPLOYMENT_AND_OPERATIONS.md`
