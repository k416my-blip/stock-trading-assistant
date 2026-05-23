# Runtime Self-Healing & Resource Reclamation Layer

Version: `1.0.0` · Constraints: `realTradingEnabled=false`, no strategy mutation, no governance bypass, **foreground/session only**.

## Purpose

Long-running mobile operation self-recovery: heap stabilization, zombie cleanup, timer drift correction, websocket zombie recovery, adaptive graph compaction, thermal staged recovery.

## Phases

| Phase | Trigger |
|-------|---------|
| `HEALTHY` | Nominal signals |
| `RECOVERING` | Mild heap/queue/reconnect pressure |
| `SELF_HEALING` | Multi-signal degradation |
| `EMERGENCY_RECOVERY` | Critical heap + thermal + reconnect loops |

## Modules

| Module | Path |
|--------|------|
| Orchestrator | `runtimeSelfHealingOrchestrator.ts` |
| Memory reclamation | `memoryReclamationEngine.ts` |
| Zombie cleaner | `zombieTaskCleaner.ts` |
| Timer drift | `timerDriftCorrector.ts` |
| Graph compactor | `adaptiveGraphCompactor.ts` |
| WS zombie recovery | `websocketZombieRecovery.ts` |
| Observer leak prevention | `observerLeakPrevention.ts` |
| Thermal recovery | `thermalRecoveryLayer.ts` |
| Long-session maintenance | `longSessionAutoMaintenance.ts` |
| Safety constraints | `recoverySafetyConstraints.ts` |
| Dashboard | `recoveryDashboard.ts` |
| Integration | `runtimeSelfHealingIntegration.ts` |

## Integration

- `observeRuntimeStabilityTick` → `observeRuntimeSelfHealingTick`
- Cooldown: `SELF_HEALING_COOLDOWN_MS` (45s) between heavy passes

## Verification

```bash
npm run verify:self-healing
```

## Redmi report

`buildRedmiNote13ProSelfHealingReport(bundle)` — heap stabilization, reclamation efficiency, zombie/WS recovery, timer drift, thermal survivability, 3h stability score.
