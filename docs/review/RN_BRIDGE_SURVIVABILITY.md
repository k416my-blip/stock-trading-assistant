# RN Bridge Survivability & Render Pressure Control

**No runtime layers.** Bridge/render/profile optimization only.

## CI

```bash
npm run verify:rn-bridge-survivability
```

## Modules

`src/rn/bridgeSurvivability/` — 20 components + coordinator. Wired from `observeNativeDeviceTelemetryFromMetrics`.

## Redmi

- Screen-off / background: bridge suppression
- Thermal: bridge cooldown mode
- AsyncStorage: deferred flush when suppressed
- Low memory: immutable metrics reuse
