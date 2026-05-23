# Runtime Unified Orchestrator & Deterministic Governance

Single deterministic tick coordinator for all runtime layers. Paper trading only; production graph immutable.

## Tick order (sequential, no parallelism)

1. Observability  
2. Self-Healing  
3. Evolution  
4. Constitution  
5. Metabolism  
6. Curiosity  
7. Orchestration (Runtime Kernel)  
8. UX (dashboard gating)

Entry: `runUnifiedRuntimeLayersTick` (1–6), `observeRuntimeStabilityTick` delegates here. Kernel apply runs phase 7–8 via `runUnifiedOrchestrationUxPhases`.

## State machine

`HEALTHY → DEGRADED → RECOVERING → STRESSED → CRITICAL → EMERGENCY → SAFE_MODE`

## Verify

```bash
npm run verify:unified-orchestrator
```
