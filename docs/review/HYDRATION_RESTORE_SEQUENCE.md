# Hydration Restore Sequence

```mermaid
sequenceDiagram
  participant App
  participant Hyd as hydrationCollisionGuard
  participant Gate as hydrationReconnectGate
  participant Seq as hydrationRestoreSequencer
  participant Coord as reconnectCoordinator
  App->>Hyd: runSerializedHydration
  Hyd->>Gate: phase=hydrating
  Hyd->>Hyd: detect overlap → lock
  Hyd->>Gate: phase=restore_pending
  Seq->>Seq: flush pending WS restore
  Seq->>Coord: requestReconnectSchedule
  Coord->>Coord: check lock + budget
```

## Phases

| Phase | Reconnect allowed |
|-------|-------------------|
| idle | yes |
| hydrating | **no** |
| restore_pending | after lock clear |
| reconnect_scheduled | yes (coordinated) |

## API

- `scheduleDelayedWebsocketRestore` — defers if lock/hydrating
- `noteHydrationSequenceStart/End` — wired in `runSerializedHydration`
