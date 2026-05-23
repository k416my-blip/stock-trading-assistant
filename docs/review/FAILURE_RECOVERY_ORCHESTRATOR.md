# Self-Healing Runtime & Failure Recovery Orchestrator

Recovery/isolation/staged restore only — no runtime policy or telemetry semantics changes.

## CI

```bash
npm run verify:failure-recovery
```

## Location

`src/recovery/failureRecovery/` — 20 modules + coordinator. Wired from `observeNativeDeviceTelemetryFromMetrics` and automated soak runner.

## Flows

- Freeze → idle → gradual restore
- Bridge congestion → batch/cooldown
- Thermal → defer AsyncStorage / render degrade
- Background starvation → low-frequency preserve
- Memory → immutable reuse / listener cleanup
- Network → half-open detect / WS backoff
