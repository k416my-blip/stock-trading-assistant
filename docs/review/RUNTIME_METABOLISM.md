# Runtime Metabolism & Cognitive Garbage Collection Layer

Version: `1.0.0` · Paper trading only · `realTradingEnabled=false` fixed.

## Pipeline position

Observability → Self-Healing → Evolution → Constitution → **Metabolism** → Orchestration → UX

## Tombstone / archive (no physical delete)

- **Edges:** copied to tombstone registry; live edge weight decayed to ~0.02
- **Replays:** appended to replay cemetery with `recoverable: true`
- **Graph nodes:** `buried` / `dormant` overlay in metabolism storage
- **Toxic:** isolated quarantine records + audit trail

## Formulas

- **memoryNutritionScore** = (keepMass / totalMass) − cemeteryPenalty − tombstonePenalty
- **runtimeCalorie** = Σ(layerPressure / Σpressure × 100) per tick
- **metabolicHealth** = clamp(0..100, 40×nutrition + 25×heap + 15×detox + 10×(1−fossil) + 10×(1−addiction) − 5×tombstoneRatio)

## Redmi Note 13 Pro 5G

| Condition | GC mode |
|-----------|---------|
| Foreground | light / standard (cooldown) |
| Background | deferred (no deep GC) |
| Battery saver | tombstone_only |
| Thermal severe+ | deferred |
| Constitutional crisis | frozen |

## Verification

```bash
npm run verify:metabolism
```
