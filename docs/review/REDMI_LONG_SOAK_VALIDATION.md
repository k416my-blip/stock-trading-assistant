# Redmi Note 13 Pro — Long Soak Validation

## Purpose

8–24h MIUI device soak measuring runtime reconnect architecture durability.

## Enable on device

```bash
# .env or EAS env
EXPO_PUBLIC_REDMI_SOAK=1
```

Or programmatically:

```typescript
import { startRedmiLongSoakSession } from './native/runtime/redmiLongSoakValidation';

startRedmiLongSoakSession(8); // or 24
```

## Required scenarios (14)

| ID | Scenario | Auto-detect |
|----|----------|-------------|
| `background_foreground` | Background → foreground | ✅ resume latency |
| `screen_off_unlock` | Screen off → unlock | ✅ resume > 3s |
| `battery_saver_toggle` | Battery saver ON/OFF | ✅ native snapshot |
| `wifi_mobile_switch` | Wi-Fi ↔ mobile | ✅ network quality change |
| `network_loss` | Intermittent loss | ✅ offline |
| `long_suspend` | Long suspend | ✅ background > 30min |
| `resume_spam` | Rapid resume | ✅ 5+ resumes/min |
| `ws_forced_disconnect` | WS forced disconnect | ✅ silent disconnect |
| `hydration_overlap` | Hydration overlap | ✅ lock overlap |
| `thermal_throttle` | Thermal | ✅ severe+ |
| `low_memory_trim` | Low memory trim | ✅ native trim |
| `activity_recreation` | Activity recreation | ✅ trim + slow resume |
| `swipe_away_recovery` | Swipe-away recovery | ✅ reclaim + fg |
| `overnight_idle` | Overnight idle | ✅ 8h+ elapsed |

Manual: `noteRedmiSoakScenario('ws_forced_disconnect', false, 'user toggled airplane')`

## Critical checks (A–H)

| Key | Maps to |
|-----|---------|
| `native_reconnect_bypass` | A |
| `duplicate_reconnect` | B |
| `coordinator_ownership_violation` | C |
| `reconnect_storm` | D |
| `hydration_race` | E |
| `timer_resurrection` | F |
| `silent_websocket_disconnect` | G |
| `miui_delayed_resume` | H |

## Export (after 8h+)

```typescript
import {
  getRedmiLongSoakJsonExport,
  getRedmiLongSoakSummaryText,
} from './native/runtime/nativeRuntimeIntegration';

console.log(getRedmiLongSoakSummaryText());
// Save JSON to file / share
const json = getRedmiLongSoakJsonExport();
```

Persisted automatically every 10 min to `@sta/redmi_long_soak_v1`.

## CI verify

```bash
npx tsx src/verify/redmiLongSoak.verify.ts
npx vitest run tests/unit/nativeBoundary/redmiLongSoakValidation.test.ts
```

## Dashboard

Runtime Stability panel shows soak progress, failures, scenarios when session active.
