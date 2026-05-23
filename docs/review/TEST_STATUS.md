# Test Status (snapshot at ZIP build)

## Typecheck

```bash
npm run typecheck   # tsc --noEmit
```

**Result**: PASS (no errors)

## Unit tests executed for this review

| Command | Result |
|---------|--------|
| `npx vitest run tests/unit/nativeRuntimeBridge.test.ts` | 3/3 PASS |

## Full unit suite (`npm run test:unit`)

**Not run** for ZIP build (runtime ~7s+; many suites).

### Known issues (full suite)

1. **React Native parse in Vitest**: Some test files fail at collection with RollupError on `react-native/index.js` (`import typeof`). Affects suites that import RN without mocks (e.g. `nativeRuntimeBridge.test.ts` passes because it mocks `react-native`).
2. **Layout assertion**: `tests/unit/aiConciergeUiLayout.test.ts` — expects `conciergeSystemStatusBlock` in `AiAssistantChat.tsx` (may be outdated).
3. **Pre-existing suite failures**: ~28 test files failed to load in a prior full run; 87 files / 393 tests passed.

### Recommended targeted commands

```bash
npx vitest run tests/unit/runtimeOrchestrator.test.ts
npx vitest run tests/unit/runtimeTelemetryEngine.test.ts
npx vitest run tests/unit/nativeRuntimeBridge.test.ts
npx vitest run tests/unit/hydrationCollisionGuard.test.ts
```

## Integration / verify scripts

- `npm test` runs `src/verify/runRelease.verify.ts` (not executed for ZIP).
- Multiple `npm run verify:*` scripts exist for market data, security, release.

## Mock patterns

- `nativeRuntimeBridge.test.ts`: mocks `react-native`, `performanceCostRuntime`
- `runtimeTelemetryEngine.test.ts`: mocks `nativeDeviceObservation`, `mobileRedmiRuntime`
