# Runtime-Aware Trading Intelligence & Survivability-Aware AI Concierge

Observe-only orchestration layer. Does **not** modify trading engine buy/sell logic, recommendation semantics, or runtime policy.

## Location

- Types: `src/types/tradingSurvivabilityOrchestration.ts`
- Constants: `src/constants/tradingSurvivabilityOrchestration.ts`
- Modules: `src/tradingSurvivability/` (20 modules + coordinator + orchestrator)
- Integration: `observeNativeDeviceTelemetryFromMetrics` in `nativeRuntimeIntegration.ts`
- Dashboard: Runtime Stability → **Trading Survivability**
- Soak scenario: `trading_survivability` (13 total scenarios)
- Verify: `npm run verify:trading-survivability`

## Flows (A–F)

| Flow | Purpose |
|------|---------|
| A. Trading runtime | Health → survivability mode → pacing → gate |
| B. AI concierge pacing | Bridge pressure → reduce proactive AI |
| C. Thermal trading | Extend polling · suppress heavy analytics |
| D. Low-memory trading | Watchlist compression · essential positions |
| E. Emergency lightweight | Holdings / prices / alerts / manual trade only |
| F. Long-session survivability | Fatigue · websocket · hydration continuity |

## Redmi / MIUI

- Screen-off observer suppression
- Reclaim-adapted trading mode
- Battery saver lightweight polling
- Websocket reconnect pacing
- Background starvation adaptation

## Exports

- Trading survivability timeline
- AI pacing transitions
- Lightweight mode transitions
- Runtime-aware polling history
- Concierge suppression report
