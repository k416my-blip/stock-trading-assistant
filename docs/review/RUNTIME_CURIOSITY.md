# Runtime Curiosity & Controlled Mutation Layer

Paper trading only. Production adaptive graph is **immutable**; all mutations occur on isolated sandbox clones with `productionApplied: false`.

## Pipeline position

```
Observability → Self-Healing → Evolution → Constitution → Metabolism → Curiosity → Dynamic Orchestration → UX
```

## Safety

- `realTradingEnabled=false` (unchanged)
- No strategy rewrite, governance bypass, hidden learning, or direct production graph writes
- Constitution remains final arbiter via `curiosityGovernanceBridge`
- Forbidden mutation tags rejected before sandbox apply

## Formulas

**noveltyPressure** = `sameRootDominance + replayReuseRate + rollbackFrequency - minorityEdgeUsage * 0.5` (clamped 0–1)

**curiosityHealth** = `clamp(0, 100, 35×diversityRetention + 20×innovationScore + 15×minorityEdgeHealth + 10×dormantRevivalHealth + 10×entropyBalance + 10×(1−replayMonocultureRisk) − 10×fossilizationRisk)`

## Redmi Note 13 Pro 5G

- Foreground: lightweight / sandbox-only curiosity
- Background: stopped (no mutation)
- Battery saver: stopped
- Thermal severe/critical: frozen
- WS reconnect storm / hydration lock: deferred
- 60s tick cooldown; max 3 sandbox replays per tick; 1 dormant revival per tick

## Verify

```bash
npm run verify:curiosity
```
