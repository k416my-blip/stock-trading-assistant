# Telemetry Overhead Reduction & Snapshot Compaction

**No runtime layers.** Monitoring-path optimization only.

## CI

```bash
npm run verify:telemetry-overhead
```

## Components (`src/native/telemetry/overhead/`)

Snapshot ring buffer, compaction, incremental diff, adaptive throttling, dashboard budget, graph decimation, AsyncStorage burst limiter, replay archive pruning, export chunk streaming, freeze/thermal/background/battery modes, idle heavy export, memory degradation, dashboard virtualization, event coalescing, drift window, compressed bundle, overhead profiler.

## Redmi behavior

- Background: suppress AsyncStorage writes, minimal telemetry interval
- Thermal severe: export pause, 90s throttle
- Battery saver: lightweight 45s interval
- Low refresh when memory pressure high
