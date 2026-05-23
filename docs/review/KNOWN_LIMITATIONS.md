# Known Limitations

## Expo Go

- Custom native module `StaNativeRuntime` is **not available**.
- All native metrics use **heuristic fallback** (`confidence ~0.48`).
- MIUI reclaim detection relies on JS-side signals (AppState, reconnect counters) without ActivityManager trim events.

## Dev Client requirement

- To use Android native bridge: `npx expo prebuild --platform android` and `expo run:android` (or EAS dev build).
- Local package: `sta-native-runtime` (`file:./modules/sta-native-runtime`).

## Android native bridge — partial coverage

| Signal | Status |
|--------|--------|
| Memory pressure / trim | Implemented (ActivityManager + ComponentCallbacks2) |
| Thermal | PowerManager API 29+ |
| Battery saver | PowerManager |
| Network quality | ConnectivityManager |
| Memory class / low-RAM | ActivityManager |
| Xiaomi / Redmi family | Build.MANUFACTURER / BRAND |
| Dropped frames | **Not wired** (returns 0; no FrameMetricsAggregator) |
| ANR risk | Heuristic composite only |

## Redmi Note 13 Pro (HyperOS) — not fully validated on device

- MIUI aggressive reclaim escalation (instant SURVIVAL) — logic present, **needs field soak**
- Short-background reconnect storm — instrumented, **needs field confirmation**
- 6h soak mode + CSV export — implemented in JS, **not field-verified**
- Kill predictor IMMINENT mitigations — **not soak-tested on device**

## Trading / safety

- `realTradingEnabled=false` throughout telemetry/dashboard bundles.
- Runtime/orchestrator/survival layers **observe and throttle**; they do not change strategy actions or governance overrides in this build.
- Paper broker paths only for execution tests.

## Dependencies

- `babel-preset-expo@55` vs Expo 54 expected `~54.0.10` — warning on `expo start`; align with `npx expo install babel-preset-expo` before release builds.

## Secrets

- API keys loaded from `.env` at runtime (not in git, not in this ZIP).
- Secure storage via `expo-secure-store` in app; not exported in review archive.
