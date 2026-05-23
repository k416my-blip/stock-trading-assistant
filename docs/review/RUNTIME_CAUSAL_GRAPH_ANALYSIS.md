# Runtime Causal Graph Analysis

Builds a causal DAG from runtime traces using **relation priority**, not timestamp order alone.  
v1.1 adds **temporal causality weighting** on edges (decay windows, composite confidence, burst collapse).

## Temporal weighting

```typescript
import { computeTemporalEdgeWeight } from '../runtime/analysis/runtimeTemporalCausality';

const w = computeTemporalEdgeWeight({
  sourceTimestampMs: t0,
  targetTimestampMs: t1,
  fromKind: 'trim_memory',
  toKind: 'timer_drift',
});
// w.temporalConfidence, w.decayStatus ('strong' | 'moderate' | 'weak' | 'stale')
```

Edge confidence = blend of **causal rule**, **temporal**, **replay**, **ownership** weights.

Decay examples: trim→timer strong ≤3s; resume→schedule ≤1s; hydration→dup ≤500ms; thermal→async ≤10s.

Root scoring penalizes candidates whose best outgoing hop is temporally **stale**.

## Latent state inference (v1.2)

```typescript
import { inferLatentRuntimeStates } from '../runtime/analysis/runtimeLatentStateInference';

const inference = inferLatentRuntimeStates({ graph, raw: input, previous });
// inference.states — posterior, persistence, supporting evidence
```

Mermaid: observables `["…"]`, latent `(("…"))`, critical latent red border (`:::criticalLatent`).

## Hierarchical latent graph (v1.3)

- Latent→latent edges with `P(s₂|s₁)` (e.g. `scheduler_frozen → timer_suspended → reconnect_feedback_loop`)
- Markov prior from previous tick (`buildRuntimeCausalGraphBundle(input, { previousLatent })`)
- Escalation: `transient` → `degraded` → `critical`
- Recovery events when a state drops out of posterior
- **Critical latent chain** as root path (`graph.latentCriticalChain`)
- Mermaid: dashed `-.->` transitions, `[[]]` double border critical, green `recoveredLatent`

## API

```typescript
import { buildRuntimeCausalGraphBundleFromSoak } from '../runtime/analysis/runtimeCausalGraph';

const bundle = buildRuntimeCausalGraphBundleFromSoak(soakExport);
// bundle.graph — DAG + root chain + attributions
// bundle.mermaid — flowchart
// bundle.markdown — report
// bundle.json — machine graph
```

## Causal relations (template)

| From | To |
|------|-----|
| resume | reconnect_schedule |
| trim_memory | timer_drift |
| timer_drift | delayed_resume |
| hydration_lock_overlap | duplicate_schedule |
| ownership_violation | duplicate_socket |
| silent_disconnect | reconnect_storm |

## Root selection

1. Extract normalized event nodes from all traces  
2. Add edges only when rule matches and `0 < gapMs ≤ maxGapMs`  
3. Root = lowest `rootPriority` node **without** incoming edge from a lower-priority parent  
4. `cascadeOnly` kinds (duplicate_socket, reconnect_storm, …) never root if a parent exists  

## vs Post-Soak root

`findRootOwnershipEvent` uses first ownership collapse by time.  
Causal graph uses **priority DAG** — preferred for multi-hop MIUI chains (trim → drift → resume → reconnect).

## CI

```bash
npx vitest run tests/unit/runtimeAnalysis/runtimeCausalGraph.test.ts
```
