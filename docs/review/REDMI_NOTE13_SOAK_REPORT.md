# Redmi Note 13 Pro — Native Boundary Soak Report (Diagnostic Framework)

**Report version:** 1.0.0  
**Generated:** framework commit (pre-device soak)  
**Target device:** Redmi Note 13 Pro / MIUI / HyperOS  
**Session type:** diagnostic instrumentation validation (not live device capture)

---

## Executive summary

This report documents the **Runtime Native Boundary Validation** diagnostic layer deployed for MIUI long-session soak. Live device metrics must be collected on hardware using the export APIs below; this document defines methodology, expected signals, and initial static-audit findings.

---

## Soak protocol (device)

1. Install release build with `StaNativeRuntime` module (not Expo Go).
2. Run ≥ 6 hours foreground/background cycles (soak mode activates at 360 min).
3. Trigger: lock screen 30s → unlock, MIUI battery saver toggle, Wi‑Fi flap.
4. Export every 2h:
   - `getNativeBoundarySoakReportText()`
   - `exportTrackerReplaySnapshot()` via debug hook
   - `getSoakCsvForExport()`

---

## Instrumentation checklist

| Signal | Source | Status |
|--------|--------|--------|
| Native reconnect trace | JS coordinator + native lifecycle | ✅ wired |
| Lifecycle timeline | `lifecycleTimeline` + boundary trace | ✅ wired |
| Websocket ownership UUID | `websocketOwnershipTrace` | ✅ wired |
| Foreground/background phase | `app_phase` boundary events | ✅ wired |
| Coordinator vs native compare | `buildNativeBoundaryValidationReport` | ✅ wired |
| Duplicate socket detection | `RuntimeReconnectTracker` | ✅ existing |
| Reconnect latency histogram | `nativeBoundaryHistograms` | ✅ wired |
| Event loop lag histogram | ANR layer + boundary tick | ✅ wired |
| Memory pressure timeline | boundary tick + native snapshot | ✅ wired |
| Thermal timeline | boundary tick + native snapshot | ✅ wired |

---

## Static audit findings (pre-soak)

| Check | Result |
|-------|--------|
| `scheduleWebsocketReconnectWithJitter` in `src/` | **0 hits** — no JS bypass |
| Reconnect single owner | `requestReconnectSchedule` only |
| Native module reconnect scheduling | **None** — `reconnectOwner: none` |
| execute without coordinator | Detected by validation report |

---

## Expected MIUI failure signatures

| Scenario | Expected boundary trace |
|----------|-------------------------|
| Resume storm | `app_phase foreground` → `coordinator_reconnect` → `resume_gate defer` |
| MIUI trim burst | `native_lifecycle trim_memory` × N within 3s |
| Timer resurrection | `timerDriftMs` spike in MIUI diagnostics + event loop lag histogram tail |
| Hydration overlap | `hydration_overlap` events before `js_reconnect_execute` |
| Native bypass | `ownership_mismatch` or `orphanNativeReconnect > 0` |

---

## Placeholder metrics (fill on device)

| Metric | Target | Device measured |
|--------|--------|-----------------|
| JS schedule/execute ratio | 1:1 ± coalesce | _pending_ |
| Duplicate sockets / session | 0 | _pending_ |
| Bridge fetch p95 | < 250ms | _pending_ |
| Event loop lag p95 | < 150ms | _pending_ |
| Native bypass events | 0 | _pending_ |

---

## Export commands

```typescript
import {
  getNativeBoundarySoakReportText,
  getNativeBoundaryValidationJson,
} from '../src/native/runtime/nativeRuntimeIntegration';
import { exportTrackerReplaySnapshot } from '../src/runtime/stability/trackerReplaySnapshot';

console.log(getNativeBoundarySoakReportText());
console.log(getNativeBoundaryValidationJson());
console.log(JSON.stringify(exportTrackerReplaySnapshot(), null, 2));
```

---

## Next steps

1. Run 8h Redmi Note 13 Pro soak with battery optimization **on**.
2. Compare `native_lifecycle` trim bursts vs JS reconnect timeline.
3. If `bypassDetected: true`, grep orphan execute paths and native WebSocket libs.
4. Attach CSV + JSON exports to this report for production sign-off.
