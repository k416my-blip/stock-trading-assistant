# Runtime Long Session Stress Verification (Redmi Note 13 Pro 5G)

**No new runtime layers.** Verification harness only.

## CI (accelerated)

```bash
npm run verify:runtime-stress
npm run test:unit -- tests/unit/runtimeStress
```

Simulates 20 scenarios via `runUnifiedRuntimeLayersTick` with accelerated session time (~2 min per tick).

## On-device procedure

1. Build release/dev client, open AI Concierge, keep **Paper Trading** mode.
2. Open **Runtime Stability** dashboard panel.
3. Run each block below; note `orchestratorState`, `longevityState`, FPS, and anomalies.

| # | Test | Procedure | Pass criteria |
|---|------|-----------|---------------|
| 1 | Long session | Foreground 30→60→120→180 min | No crash; healthScore > 40 |
| 2 | Background | Home ↔ app ×20 | Reconnect OK; no duplicate timers |
| 3 | Thermal | Gaming/camera to heat device | thermalAuthority severe; curiosity frozen |
| 4 | Battery saver | System battery saver ON/OFF | survival-only; recovery when OFF |
| 5 | Replay flood | Heavy chart/orchestration use | replay growth bounded; sandbox only |
| 6 | Dashboard leak | Scroll dashboard 10 min | no UI freeze; throttling message OK |
| 7 | WS storm | Airplane mode toggle | curiosity deferred; no crash |
| 8 | GC oscillation | 120+ min session | gcMode light/deferred; no oscillation crash |
| 9 | Heap growth | 180 min | memoryTrend < 90%; no OOM |
| 10 | Async saturation | Many parallel actions | queue drains; dashboard may throttle |
| 11 | Curiosity flood | Long foreground session | mutationSandboxCount stable |
| 12 | Replay civilization | Same symbol replay | replayCivilizationRisk visible |
| 13 | Entropy collapse | Long monoculture use | entropyPulse may fire; no freeze |
| 14 | Safe mode | Trigger via Settings + stress | safeMode on |
| 15 | Emergency brake | Cascade anomalies | emergencyBrake on |
| 16 | Dashboard FPS | Continuous panel visible | FPS ≥ 12; no ANR |
| 17 | Memory snapshots | Every 30 min note heap | Monotonic growth < 40MB |
| 18 | State audit | Log state transitions | No illegal transitions |
| 19 | Kill recovery | Swipe away + reopen | App recovers; soak export OK |
| 20 | Final report | Export + `npm run verify:redmi-soak` | Critical checks clear |

## Existing soak tooling

- `npm run verify:redmi-soak` — export shape
- In-app **Redmi soak** section when `startRedmiLongSoakSession()` active
- Persisted export: `@sta/redmi_long_soak_v1`

## Allowed fixes during this phase

Only: leak, freeze, crash, runaway growth, starvation, deadlock.

Do **not** add new runtime layers.
