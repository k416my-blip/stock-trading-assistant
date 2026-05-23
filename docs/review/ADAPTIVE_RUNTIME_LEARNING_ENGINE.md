# Adaptive Runtime Learning Engine

Evolves fixed causal / latent inference into a **self-improving** runtime engine using observed failures, replay, and device profiles.

## Capabilities

| Area | Behavior |
|------|----------|
| Adaptive edge weighting | `hitCount`, `successfulPredictionCount`, `falsePositiveCount`, `decayReliability`, `runtimeLearnedWeight` |
| Transition learning | `P(s₂\|s₁)` updated from observations (blend with base table) |
| False positive suppression | Mismatch penalty — **never** on ownership / duplicate socket invariants |
| Device profiles | `redmi`, `samsung`, `pixel`, `emulator` — drift / resume / decay overrides |
| Dynamic decay | Histogram p75/p95 → `strongMs` / `maxMs` (e.g. Redmi resume→reconnect ~2.8s) |
| Stabilization | EMA, hysteresis, latent persistence bias |
| Recovery tracking | `reconnect_defer`, `coalesce`, `hydration_pause`, `storm_suppression` success rates |
| Adaptive root ranking | temporal + historical + cascade + replay similarity |
| Replay learning | `replaySoakExportForLearning(export)` |

## Usage

```typescript
import { buildRuntimeCausalGraphWithAdaptive, createAdaptiveRuntimeContext } from '../runtime/analysis/runtimeCausalGraphAdaptive';

const ctx = createAdaptiveRuntimeContext('Redmi Note 12');
const bundle = buildRuntimeCausalGraphWithAdaptive(input, {
  adaptive: ctx,
  previousLatent: lastStates,
});

bundle.adaptiveReport; // learnedTransitions, unstableEdges, falsePositiveEdges, ...
bundle.graph.latentCriticalChain; // latent root path
```

## Safety

Protected invariants (hard — no suppress):

- `ownership_violation`
- `duplicate_socket`
- native bypass relations

## Mermaid

- Edge label: confidence, learned Δ, stability, replay support
- Unstable edge: orange dashed `-.->`
- High-confidence learned: thick green `==>`

## CI

```bash
npm run verify:adaptive-runtime
```
