# Automated Real Device Soak Runner (Redmi Note 13 Pro 5G)

**No new runtime layers.** Execution-only automation — does not change tick policy or governance.

## Start on device

```typescript
import { startAutomatedSoakRunner } from './src/native/soak';

startAutomatedSoakRunner(8); // target hours
```

Stop: `stopAutomatedSoakRunner()`

Ticks automatically from `observeNativeDeviceTelemetryFromMetrics` when Concierge cycle runs.

## CI

```bash
npm run verify:soak-runner
```

## Export

```typescript
import {
  formatAutomatedSoakExportJson,
  formatAutomatedSoakMarkdownReport,
  buildCompressedSoakBundle,
} from './src/native/soak';
```

Persist key: `@sta/automated_soak_runner_v1`

## Redmi device procedure

1. Install release/dev build on Redmi Note 13 Pro 5G.
2. Paper Trading + open Runtime Stability dashboard.
3. Dev menu / debugger: `startAutomatedSoakRunner(8)`.
4. Leave foreground/background, network toggles, screen off — lifecycle is recorded automatically.
5. After session: export JSON + Markdown + compressed bundle.
6. Compare survival score ≥ 70 for 8h soak acceptance (project threshold).

## Scenarios (rotated every 4 min)

Foreground/background · WS disconnect · thermal · battery saver · memory trim signal · async observe · replay observe · render storm telemetry · native reclaim observe · lifecycle stress.
