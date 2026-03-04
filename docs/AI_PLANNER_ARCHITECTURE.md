# AI Planner Architecture

Last updated: 2026-03-04

This document defines a backward-safe planner layer for the crypto app without changing existing trade execution contracts.

## Goals

- Keep current Binance REST/WebSocket trading workflow unchanged by default.
- Add optional advisory planning (`planner_enabled`) before order execution.
- Preserve InfinityFree compatibility (PHP backend remains primary runtime).
- Support optional sidecar planner proxying without making it mandatory.

## Runtime Model

- Canonical runtime: frontend (`crypto/src/js/core/app.js`) + PHP backend (`crypto/backend/api.php`).
- Planner action endpoint: `POST /crypto/backend/api.php?action=planner-intent`.
- Auth: same backend token model (`X-API-Token`).
- Feature flag: `planner_enabled` in browser local storage.

## Planner Contracts

## `TradeIntent`

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "size": 0.01,
  "confidence": 0.62,
  "rationale": "Entry intent is long-biased.",
  "risk_flags": ["market_order_slippage"]
}
```

## `RiskAssessment`

```json
{
  "score": 38,
  "level": "medium",
  "flags": ["market_order_slippage"]
}
```

## `ExecutionPlan`

```json
{
  "mode": "assisted",
  "steps": [
    "Review symbol, side, and size against your strategy.",
    "Confirm risk flags and set stop-loss/take-profit levels.",
    "Place order manually after verification.",
    "Re-check fill status and adjust risk management."
  ],
  "deep_link": "https://www.binance.com/en/trade/BTC_USDT?type=spot"
}
```

## Data Flow

1. User submits spot order from trading form.
2. Frontend checks `planner_enabled`.
3. If enabled, frontend calls `action=planner-intent` with `symbol/side/size/type`.
4. Frontend displays advisory message (confidence + risk flags).
5. Order submission continues using existing `action=order` flow.

If planner call fails, frontend shows a warning and continues manual flow.

## Provider Strategy

- `provider=local` (default): backend heuristic planner.
- `provider=sidecar` (optional): proxy to `PLANNER_SIDECAR_URL`.

If sidecar is unavailable, backend returns controlled error and order flow can continue manually.

## Safety Boundaries

- Planner is advisory only, never auto-submits trades.
- Existing order API remains source of truth for execution.
- Planner failures do not block normal manual trade behavior.

## Environment

- Optional: `PLANNER_SIDECAR_URL` for external planner proxy.
- Required unchanged: `API_TOKEN_CRYPTO`, `ALLOWED_ORIGINS`.

## Validation Rules

- `symbol`: `^[A-Z0-9]{5,20}$`
- `side`: `BUY|SELL`
- `size`: numeric, `> 0`, `<= 100000000`
- `type`: `MARKET|LIMIT`
- `provider`: `local|sidecar`

## Testing

Smoke coverage should include:

- Unauthorized `planner-intent` handling (401 via token model)
- Invalid payload (422 + `request_id`)
- Valid payload (200 + `trade_intent`, `risk_assessment`, `execution_plan`)
- Planner failure path does not block order placement
