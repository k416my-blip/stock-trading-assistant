# Runtime Native Boundary Validation

Diagnostic layer for JS coordinator ↔ Android/RN/native boundary conflicts.

## Components

| Module | Role |
|--------|------|
| `nativeBoundaryTrace.ts` | Unified ring buffer (bridge, app phase, native lifecycle, coordinator) |
| `nativeBoundaryHistograms.ts` | Reconnect latency, event loop lag, memory, thermal, bridge fetch |
| `websocketOwnershipTrace.ts` | Reconnect UUID + owner (`js_coordinator` / `js_execute` / `native_untagged`) |
| `nativeBoundaryValidation.ts` | Report builder + bypass detection |
| `trackerReplaySnapshot.ts` | One-shot export including boundary validation |

## Native instrumentation

`StaNativeRuntimeModule.kt` emits `onNativeLifecycle` alongside `onTrimMemory`:
- `kind`: trim_memory | low_memory
- `phase`: trim phase label
- `reconnectOwner`: always `none` (native does not schedule reconnect)

## Export on device

```typescript
import {
  getNativeBoundarySoakReportText,
  getNativeBoundaryValidationJson,
} from './native/runtime/nativeRuntimeIntegration';

// After long session / resume cycles:
console.log(getNativeBoundarySoakReportText());
```

Or via `exportTrackerReplaySnapshot()` for full replay bundle.

## Verification scenarios (Redmi Note 13 Pro)

1. background → foreground resume — compare `app_phase` + `coordinator_reconnect` timeline
2. MIUI battery optimization — native `trim_memory` bursts vs JS resume gate
3. websocket revive — schedule/execute UUID match in `websocketOwnership`
4. reconnect storm — histogram + coalesce count
5. hydration overlap — `hydration_overlap` boundary events
6. async saturation — queue/lag boundary events

## Static audit

```bash
rg scheduleWebsocketReconnectWithJitter src   # must be empty
npm run typecheck
npx vitest run tests/unit/nativeBoundary tests/unit/runtimeStability/reconnectEntryAudit.test.ts
```
