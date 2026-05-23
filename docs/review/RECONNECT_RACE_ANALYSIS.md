# Reconnect Race Analysis

## Ownership (post-finalization)

```
requestReconnectSchedule (reconnectCoordinator)
  ├─ isResumeReconnectGated
  ├─ isReconnectPausedForHydration
  ├─ canScheduleReconnect (reconnectStormGuard budget)
  ├─ noteRuntimeReconnect(token)
  └─ executeWebsocketReconnectJitter (no double budget)

scheduleWebsocketReconnectWithJitter (legacy/direct)
  └─ registerReconnectAttempt + executeWebsocketReconnectJitter
```

## Race scenarios

| Race | Mitigation |
|------|------------|
| Double budget consume | Coordinator uses `execute*` only after single budget check |
| Hydration + reconnect | Gate blocks until lock released |
| Resume + reconnect | `noteResumeStormGate` debounce window |
| Duplicate socket key | `createReconnectSocketKey` monotonic token |
| Effect duplicate STABILITY_RECONNECT | Kernel coalesce + single dedupeKey `stab-ws-coalesced` |

## Trace

`getReconnectSequenceTrace()` — phases: defer, budget_block, schedule, execute, stable
