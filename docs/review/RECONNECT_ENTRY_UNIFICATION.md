# Runtime Reconnect Entry Unification

## Single owner

All reconnect scheduling flows through `requestReconnectSchedule` in `reconnectCoordinator.ts`.

Execution only via `executeWebsocketReconnectJitter` (internal, coordinator-invoked).

## Call graph

```
Kernel effects (WS_RECONNECT_*, STABILITY_RECONNECT_GUARD)
  └─ RuntimeEffectExecutor
       └─ requestReconnectSchedule(source: kernel_* | stability_guard)

Resume coordinator
  └─ RESUME_WS_RESTORE_SEQUENCE → hydrationRestoreSequencer
       └─ requestReconnectSchedule(source: hydration_sequencer)

Redmi / mobile signals
  └─ mobileRedmiRuntime / redmiOrchestratorGuard
       └─ requestReconnectSchedule(source: redmi_* | mobile_soft)

reconnectCoordinator
  ├─ gate: resume / hydration pause
  ├─ coalesce: duplicate window
  ├─ budget: reconnectStormGuard.registerReconnectAttempt
  └─ executeWebsocketReconnectJitter → scheduleDedupedTimer('ws-reconnect-jitter')
```

## Forbidden

- `scheduleWebsocketReconnectWithJitter` (removed)
- Hidden noop timers (`ws-reconnect-deferred`, `ws-reconnect-budget-blocked`)
- Direct `executeWebsocketReconnectJitter` outside coordinator

## Verification

```bash
npm run typecheck
npx vitest run tests/unit/runtimeStability/reconnectEntryAudit.test.ts
npx vitest run tests/unit/runtimeStability/reconnectEntryUnification.test.ts
rg scheduleWebsocketReconnectWithJitter src
```
