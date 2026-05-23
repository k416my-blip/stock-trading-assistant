# Post-Soak Failure Auto Analysis

Mechanical production sign-off from Redmi long soak JSON export.

## Usage

```typescript
import {
  analyzeRedmiSoakExportJson,
  analyzeRedmiSoakReportBundle,
} from './native/runtime/nativeRuntimeIntegration';

const json = getRedmiLongSoakJsonExport(); // from device
const bundle = analyzeRedmiSoakExportJson(json);

console.log(bundle.markdownReport);
console.log(bundle.report.productionSignOffSummaryJa);
```

Or from persisted soak:

```typescript
const bundle = await analyzePersistedRedmiSoakExport();
```

## Auto-FAIL conditions

| Condition | Threshold |
|-----------|-----------|
| duplicate_sockets | > 0 |
| ownership_violation | > 0 |
| native_reconnect_bypass | any |
| reconnect_storm | ≥ 4/min |
| hydration_overlap | ≥ 1 |
| timer_resurrection | drift ≥ 2s |
| delayed_resume | ≥ 3s |
| silent_websocket_disconnect | ≥ 1 |
| min_duration_not_met | < 8h elapsed |

## Scores

| Range | Tier |
|-------|------|
| 90–100 | production_ready |
| 80–89 | guarded_release |
| 70–79 | high_operational_risk |
| <70 | unstable_runtime |

Sub-scores: reconnect integrity, ownership consistency, storm suppression, MIUI resilience.

## Root event

`findRootOwnershipEvent()` returns the **first** ownership collapse (duplicate, orphan execute, native untagged, bypass) — not cascade followers.

## Outputs

- `report` — structured analysis
- `markdownReport` — human sign-off doc
- `jsonReport` — machine-readable
- `anomalyTimeline` — ordered events with ROOT marked
- `replayPackage` — anomaly replay snapshot

## CI

```bash
npx vitest run tests/unit/nativeBoundary/postSoakFailureAnalysis.test.ts
```
