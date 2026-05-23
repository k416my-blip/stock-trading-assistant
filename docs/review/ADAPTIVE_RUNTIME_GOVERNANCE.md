# Adaptive Runtime Governance & Drift Control

Prevents adaptive drift, overfitting, stale optimizations, and cross-device contamination while keeping **strategy changes forbidden** and `realTradingEnabled=false`.

## Modules

| Module | Role |
|--------|------|
| `adaptiveDriftEngine.ts` | Drift velocity, instability, replay divergence → `DRIFT_*` phases |
| `learningReliabilityScoring.ts` | Per-edge confidence, stability, reproducibility, rollback candidates |
| `sessionOverfitGuard.ts` | Short-session / thermal / reconnect bias cooldown |
| `deviceBiasIsolation.ts` | Device-scoped learning stores |
| `adaptiveRollbackSystem.ts` | Snapshots + baseline restore |
| `causalContradictionDetector.ts` | Inconsistent edges, loops, latent conflicts |
| `longTermDecayGovernance.ts` | 7d/30d stale pruning |
| `safeAdaptiveConstraints.ts` | Forbidden learning patterns + protected invariants |
| `adaptiveGovernanceDashboard.ts` | Dashboard aggregation |
| `adaptiveRuntimeGovernance.ts` | Orchestrator `runAdaptiveGovernance()` |

## Integration

`buildRuntimeCausalGraphWithAdaptive()` → learn → **governance** → `bundle.governanceReport`

## Safety (hard)

Never suppress or bypass:

- `ownership_violation`, `duplicate_socket`, `budget_block`, `coalesce`
- Patterns: governance_bypass, strategy_change, real_trading_enable, etc.

## Redmi long-term

`buildRedmiNote13ProLongTermGovernanceReport(ctx)` after sustained replay on Redmi profile.

## CI

```bash
npm run verify:adaptive-governance
```
