# JS Thread Contention & Scheduler Drift Stabilization

**No runtime layers.** Does not change runtime policy or existing telemetry metric meanings.

## CI

```bash
npm run verify:js-thread-stabilization
```

## Scope

`src/scheduler/jsThreadStabilization/` — 20 stabilization modules + coordinator. Wired from `observeNativeDeviceTelemetryFromMetrics` only.

## Redmi

- Screen-off: 4× polling interval, timer reduction
- Thermal: callback suppression, frame observer degradation
- Hermes: GC cooldown gate for stabilization timers
- Export: cooperative yield between chunks when idle
