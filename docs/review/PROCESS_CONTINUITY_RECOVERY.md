# Process Death Continuity & Persistent Runtime Recovery

Persistence/recovery paths only — no runtime policy or unified tick changes.

## CI

```bash
npm run verify:process-continuity
```

## Location

`src/recovery/processContinuity/` — 20 modules + coordinator. Wired from `initNativeRuntimeLayer` / `observeNativeDeviceTelemetryFromMetrics`.

## Soak

Scenario `process_death_continuity` in automated soak rotator (11 scenarios).

## Flows

- Process death → snapshot validate → journal replay → orphan cleanup → hydration → replay
- LMK → degraded cold boot
- Persistence corruption → quarantine → rollback
- Interrupted export → resumable restore
- Crash loop → minimal runtime observe → staged restore
