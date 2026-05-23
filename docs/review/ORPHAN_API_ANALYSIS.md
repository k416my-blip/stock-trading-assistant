# Orphan API Analysis

## applyImminentKillMitigations

| Item | Result |
|------|--------|
| Definition | `src/native/runtime/nativeRuntimeIntegration.ts` |
| Call sites (src) | **0** |
| Call sites (tests) | **0** |
| Call sites (docs only) | `RUNTIME_POLICY_OWNERSHIP.md` (historical) |

**Decision:** **Removed** — no callers; policy fully owned by `IMMINENT_KILL_MITIGATION` effect via `RuntimeDecision.buildAuxiliaryEffects`.

## applyMemoryClassAwareness

| Item | Result |
|------|--------|
| Definition | `src/native/runtime/memoryClassAwareness.ts` |
| Call sites | **0** (removed from `refreshNativeRuntimeCycle` earlier) |

**Decision:** **Removed** — policy merged in `mergeKernelOwnedPolicy` + `memoryClassHints` in preparation.

## dispatchRuntimePolicy

| Item | Result |
|------|--------|
| Definition | `src/runtime/kernel/RuntimePolicyKernel.ts` |
| Behavior | Pure `buildGuardStateFromPolicy` alias — **no mutations** |

**Decision:** **Deprecated adapter** — retained for type compatibility; kernel uses `buildGuardStateFromPolicy` directly.

## observeMemoryPressure (legacy)

| Item | Result |
|------|--------|
| Behavior | Previously ran cleanup inline |

**Decision:** **Deprecated** — split into `recordMemoryPressureSample` (signal) + `executeMemoryPressureCleanup` (executor). Legacy wrapper still calls both for backward compatibility in tests only.
