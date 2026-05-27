# App Full Review Package

> **Purpose:** External review input for ChatGPT (architecture, stability, trading/AI flows).  
> **Generated:** 2026-05-23 (local workspace snapshot)  
> **Constraints for reviewers:** No secrets included. Do not request `.env` values or API keys.

---

## 1. Project Overview

**Stock Trading Assistant** is a React Native + Expo (TypeScript) mobile app for **personal investment analysis and paper-trading simulation**. It does **not** connect to real brokers or execute live orders — users place trades manually in their broker apps.

| Item | Value |
|------|--------|
| Package | `stock-trading-assistant@1.0.0` |
| Entry | `expo/AppEntry.js` → `App.tsx` |
| Platform | Expo ~54, React 19, React Native 0.81 |
| Target device (stability focus) | Redmi Note 13 Pro 5G (MIUI / long-session soak) |
| Trading mode | **Paper Trading only** — `REAL_TRADING_ENABLED = false` (compile-time lock across kernel/telemetry/orchestrator constants) |
| Primary market | Bursa Malaysia (+ US symbols via providers) |

**Core user flows:** portfolio tracking → quote refresh → AI concierge Q&A → allocation/risk dashboards → optional paper broker simulation → settings/diagnostics.

---

## 2. Architecture Summary

```
App.tsx
  └─ Context providers (App, PerformanceCost, ProductionStability, Urgency, ProactiveConcierge, AiConcierge)
  └─ RootNavigator (tabs + stack screens)
  └─ AiConciergeOverlay (FAB + bottom sheet)

Services layer (~420 files)
  └─ marketDataService (Twelve Data gateway + queue)
  └─ portfolio*, aiStrategyService, paperBroker/*, secretStorage

Runtime kernel (src/runtime/* ~226 files)
  └─ unified orchestrator tick (deterministic phase order)
  └─ stability trackers (WS reconnect, hydration, thermal, async queue)
  └─ observability / selfHealing / metabolism / curiosity / longevity layers

Native + non-policy extensions (outside runtime policy mutation)
  └─ src/native/* — Android bridge, telemetry, soak runner
  └─ src/scheduler/jsThreadStabilization/*
  └─ src/rn/bridgeSurvivability/*
  └─ src/recovery/failureRecovery/*
```

**Design principle (recent work):** Many subsystems are **observe / profile / recover / export only** — they must not alter unified tick semantics, safe mode, or telemetry field meanings. Recovery and bridge modules live **outside** `src/runtime/` policy paths where possible.

**Unified tick phase order** (`runtimeUnifiedOrchestratorIntegration.ts`):
Observability → Self-Healing → Evolution → Constitution → Metabolism → Curiosity → Longevity → Orchestration → UX

---

## 3. Folder Structure

### Top-level

| Folder | Role |
|--------|------|
| `App.tsx` | App root, providers, deferred boot |
| `src/` | Application source (~1,300+ TS/TSX files) |
| `tests/` | Vitest unit/integration/recovery tests (175 files) |
| `modules/sta-native-runtime/` | Expo native module (Android heap/thermal/bridge metrics) |
| `docs/review/` | Architecture & subsystem review notes |
| `assets/` | Static assets |
| `.github/` | CI/workflows (if configured) |

### `src/` important directories

| Path | Files (approx) | Role |
|------|----------------|------|
| `src/services/` | 420 | Business logic: market data, portfolio, AI, paper broker, persistence |
| `src/components/` | 144 | UI including 60+ concierge dashboard panels |
| `src/screens/` | 43 | Tab + stack screens |
| `src/runtime/` | 226 | Runtime kernel, unified orchestrator, stability, analysis layers |
| `src/native/` | 82 | Native bridge, device telemetry, automated soak runner |
| `src/recovery/failureRecovery/` | 24 | Self-healing recovery orchestrator (non-policy) |
| `src/rn/bridgeSurvivability/` | 22 | RN bridge/render pressure profiling |
| `src/scheduler/jsThreadStabilization/` | 23 | JS thread stall/drift stabilization |
| `src/context/` | — | React context (App, AI concierge, performance) |
| `src/navigation/` | 4 | Root + tab navigators |
| `src/hooks/` | — | Market session, notifications, async helpers |
| `src/types/` | — | Shared TypeScript contracts |
| `src/constants/` | — | Feature flags, UI labels, locked trading constants |
| `src/verify/` | — | Node verify scripts (static + live checks) |

---

## 4. Key Files and Responsibilities

### Entry & navigation

| File | Responsibility |
|------|----------------|
| `App.tsx` | SafeArea, error boundary, notification hooks (dev build only), `runDeferredBootTasks`, mounts `AiConciergeOverlay` |
| `src/navigation/RootNavigator.tsx` | Stack over tab navigator; settings/diagnostics screens |
| `src/navigation/MainTabNavigator.tsx` | Tabs: Home, AllocationPlan, Screener, Portfolio, History, BeginnerGuide |

### Configuration

| File | Responsibility |
|------|----------------|
| `package.json` | Expo scripts, `typecheck`, `test` (= release verify runner), 40+ `verify:*` scripts |
| `tsconfig.json` | Strict TypeScript for RN/Expo |
| `modules/sta-native-runtime/` | Native Android module exposing runtime snapshot to JS |

### Integration hub

| File | Responsibility |
|------|----------------|
| `src/native/runtime/nativeRuntimeIntegration.ts` | **Central native observe hook.** Initializes ANR layer, native bridge, telemetry, soak, JS stabilization, RN bridge survivability, failure recovery. Merges native into telemetry; wires `observeNativeDeviceTelemetryFromMetrics` without policy mutation. |
| `src/services/runtimeTelemetryEngine.ts` | Builds telemetry metrics snapshot consumed by runtime layers |
| `src/runtime/stability/runtimeStabilityIntegration.ts` | Stability snapshot wiring for dashboard |
| `src/runtime/kernel/runtimeKernelIntegration.ts` | Runtime kernel effects entry |

### `src/runtime/stability/*` (19 files)

| File | Role |
|------|------|
| `RuntimeHealthMonitor.ts` | Health score, anomaly detection, stability metrics assembly |
| `RuntimeReconnectTracker.ts` | Reconnect rate, duplicate WS detection |
| `RuntimeHeartbeatTracker.ts` | Heartbeat age / stale connection |
| `hydrationLock.ts` / `hydrationReconnectGate.ts` | Post-resume hydration serialization |
| `reconnectCoordinator.ts` / `reconnectSequenceTrace.ts` | WS reconnect orchestration tracing |
| `asyncStarvationMonitor.ts` | Async queue starvation signals |
| `miuiBatteryDiagnostics.ts` | MIUI background/battery diagnostics |
| `runtimeStabilitySelectors.ts` | Dashboard selector helpers |

### `src/runtime/unified/*` (31 files)

| File | Role |
|------|------|
| `runtimeUnifiedOrchestratorIntegration.ts` | Deterministic unified tick coordinator |
| `safeModeRuntime.ts` | Safe mode runtime envelope |
| `unifiedCooldownManager.ts` | Cross-layer tick cooldown |
| `tickBudgetEngine.ts` / `layerResourceAllocator.ts` | Per-layer tick budgets |
| `thermalAuthorityLayer.ts` / `batteryGovernanceLayer.ts` | Device pressure routing |
| `deterministicTickScheduler.ts` | Phase sequence validation |

### `src/runtime/metabolism/*` (20 files)

Long-session memory/graph “metabolism” — replay decay, toxic memory isolation, metabolic health score, self-healing addiction guard. Integrated via `runtimeMetabolismIntegration.ts`.

### `src/runtime/curiosity/*` (29 files)

Controlled exploration of dormant runtime paths; curiosity budget and rollback addiction recovery. Does not mutate trading strategy.

### `src/runtime/longevity/*` (33 files)

Long-horizon session aging, replay ecology eld, mutation cemetery — longevity dashboard bundle.

### `src/runtime/observability/*` (12 files)

Event journal, timeline reconstruction, failure replay mode, long-session degradation analyzer — read-only forensics.

### `src/runtime/selfHealing/*` (12 files)

Runtime-layer self-healing (memory reclamation, zombie tasks, WS zombie recovery, thermal recovery). **Distinct from** `src/recovery/failureRecovery/` which is non-policy recovery orchestration.

### `src/recovery/failureRecovery/*` (24 files)

Failure recovery orchestrator: degradation state machine, quarantine, freeze/bridge/thermal/memory/network recovery flows, soak timeline integration, export bundles. Dashboard section: **Self-Healing**.

### `src/rn/bridgeSurvivability/*` (22 files)

Bridge traffic profiler, rerender storm detector, subscription auditor, batched bridge scheduler, immutable metrics cache. Dashboard section: **RN Bridge Survivability**.

### `src/scheduler/jsThreadStabilization/*` (23 files)

Event loop stall profiler, scheduler drift, freeze-safe recovery, cooperative export yield. Dashboard section: **JS Thread Stabilization**.

### Dashboard UI

| File | Role |
|------|------|
| `src/components/concierge/RuntimeStabilityDashboardPanel.tsx` | Consolidated stability dashboard: Redmi soak, Native Telemetry, Soak Runner, Telemetry Overhead, Self-Healing, RN Bridge, JS Thread, Unified/Metabolism/Curiosity/Longevity (budgeted rows) |
| `src/components/concierge/AiConciergeOverlay.tsx` | Global FAB + sheet entry |
| `src/components/concierge/AiConciergeSheet.tsx` | Modal sheet hosting `AiAssistantChat` |
| `src/components/concierge/lazyConciergePanels.tsx` | Lazy-loaded heavy dashboard panels |
| `src/components/AiAssistantChat.tsx` | Concierge chat UI and composer |

### AI concierge

| File | Role |
|------|------|
| `src/context/AiConciergeContext.tsx` | Panel open/close state |
| `src/context/ProactiveConciergeContext.tsx` | Proactive suggestions / unread count |
| `src/services/aiStrategyService.ts` | OpenAI-compatible chat API, retries, health tracking, context compression |
| `src/services/aiContextBuilder.ts` / `aiContextCompressor.ts` | Builds compressed strategy context for AI |
| `src/services/aiApiKey.ts` | AI key via SecureStore (`aiApiKey`) |
| `src/services/aiPersonalityGuard.ts` | Disclosure / hype language guards |

### Portfolio / stock / trading

| File | Role |
|------|------|
| `src/services/portfolio.ts` | Position normalization, PnL, stale metadata |
| `src/services/portfolioHoldings.ts` / `portfolioSnapshot.ts` | Holdings CRUD and snapshots |
| `src/services/portfolioRefreshCoordinator.ts` | Coordinated quote refresh |
| `src/services/marketDataService.ts` | **Single Twelve Data HTTP gateway** + FIFO queue, rate limits |
| `src/services/quoteProviders/*` | Fallback providers: Yahoo, Stooq, Alpha Vantage, RapidAPI Yahoo |
| `src/services/paperBroker/*` | Paper trading simulation (mock broker adapter, risk layer, storage) |
| `src/services/dataReliabilityEngine.ts` | Quote quality scoring, AI gate on bad data |
| `src/screens/PortfolioScreen.tsx` | Holdings UI |
| `src/screens/HomeScreen.tsx` | Dashboard home |

---

## 5. Runtime / Stability Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| Stability trackers | `src/runtime/stability/` | WS, hydration, thermal, async, MIUI diagnostics |
| Unified orchestrator | `src/runtime/unified/` | Single deterministic tick, safe mode, budgets |
| Native telemetry | `src/native/telemetry/` | Device-side profilers (heap, FPS, bridge, thermal) |
| Telemetry overhead | `src/native/telemetry/overhead/` | Sampling/throttling/compaction to reduce observer cost |
| Soak runner | `src/native/soak/` | Automated long-session scenarios on device |
| JS thread stabilization | `src/scheduler/jsThreadStabilization/` | Event loop / timer drift / freeze recovery paths |
| RN bridge survivability | `src/rn/bridgeSurvivability/` | Bridge traffic, rerender storm, subscription audit |
| Failure recovery | `src/recovery/failureRecovery/` | Escalation, quarantine, staged recovery (non-policy) |
| Runtime self-healing | `src/runtime/selfHealing/` | Resource reclamation inside unified tick phases |
| Redmi soak | `src/native/runtime/redmiLongSoakValidation.ts` | Device long soak (`EXPO_PUBLIC_REDMI_SOAK=1`) |

**Native integration flow:** `runtimeTelemetryEngine` → `observeNativeDeviceTelemetryFromMetrics` → throttled samples for JS stabilization, RN bridge, failure recovery, soak tick.

---

## 6. AI Concierge Flow

1. User taps **FAB** (`AiConciergeFab`) → `AiConciergeContext.openPanel()`.
2. `AiConciergeSheet` opens modal with `AiAssistantChat`.
3. User message → `aiStrategyService` loads API key from SecureStore → builds context via `aiContextBuilder` + `aiContextCompressor` (portfolio, regime, governance bundles, reliability gates).
4. HTTP call to configured AI endpoint (`AI_API_CHAT_URL`, model from constants).
5. Response sanitized (`aiPersonalityGuard`, disclosure checks) → rendered with `SelectableText`.
6. **Proactive** path: `ProactiveConciergeContext` + background monitors suggest actions (notifications disabled on Expo Go).
7. Advanced panels (lazy): governance, epistemic integrity, runtime telemetry, stability, etc. — many read-only dashboards.

**AI is advisory only** — tied to `paperTradingOnly: true` / `realTradingEnabled: false` in context types.

---

## 7. Stock / Portfolio / Trading Flow

1. **Holdings** stored locally (AsyncStorage + integrity envelopes); normalized via `portfolio.ts`.
2. **Quotes:** primary path `marketDataService` → Twelve Data API (queued, rate-limited). Fallback chain in `quoteProviders/` when primary fails.
3. **Refresh:** `portfolioRefreshCoordinator` / price update services respect cooldowns and API health.
4. **Paper trading:** `src/services/paperBroker/*` simulates orders with human confirmation gates — no broker API.
5. **Real trading:** **Disabled** at constant level (`REAL_TRADING_ENABLED = false`). UI copy warns users to trade manually.
6. **Shadow trading / capital allocation:** Separate screens for simulation and allocation planning — not live execution.

---

## 8. API and Environment Variables

**Never commit `.env`.** Keys are loaded from SecureStore first, then env fallbacks.

### Environment variable names (values omitted)

| Variable | Used for |
|----------|----------|
| `EXPO_PUBLIC_TWELVE_DATA_API_KEY` / `TWELVE_DATA_API_KEY` | Twelve Data quotes (primary) |
| `EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY` / `ALPHA_VANTAGE_API_KEY` | Fallback quotes |
| `EXPO_PUBLIC_RAPIDAPI_KEY` / `RAPIDAPI_KEY` | RapidAPI Yahoo fallback |
| `EXPO_PUBLIC_RAPIDAPI_YAHOO_HOST` | RapidAPI host override |
| `EXPO_PUBLIC_X_BEARER_TOKEN` / `X_BEARER_TOKEN` | X (Twitter) API |
| `EXPO_PUBLIC_MARKETAUX_API_KEY` / `MARKETAUX_API_KEY` | News fallback |
| `EXPO_PUBLIC_REDMI_SOAK` | Enable Redmi long soak on device (`1`) |
| `NODE_ENV` | Dev/test/production behavior |

### SecureStore secret IDs (`src/constants/secretStorage.ts`)

- `twelveDataApiKey`, `newsApiKey`, `snsApiKey`, `redditApiKey`, `xApiKey`, `earningsApiKey`, `aiApiKey`

AI key has **no** public env name — app settings / SecureStore only.

---

## 9. Current Test Results

### Typecheck

```
npm run typecheck  →  PASS (tsc --noEmit)
```

### npm test

```
npm test  →  runs src/verify/runRelease.verify.ts (full vitest + hardening scripts)
Result: FAIL (exit 1)
  Test Files: 48–53 failed to load | 108–113 passed (156–166 total)
  Tests: 3 assertion failures | 509–515 passed
```

**3 real assertion failures:**

| Test | Issue |
|------|-------|
| `tests/unit/aiConciergeUiLayout.test.ts` | Expects `conciergeSystemStatusBlock` in `AiAssistantChat.tsx` — missing |
| `tests/unit/dataReliabilityEngine.test.ts` | `bad_tick` detection on extreme move — not triggering |
| `tests/unit/paperBrokerExecution.test.ts` | Paper buy returns `ok: false` |

**~48 suite load failures:** Most import chains that pull `react-native` fail under Node/vitest with esbuild error (`Unexpected "typeof"` in `react-native/index.js`). Affects native boundary tests, runtime orchestrator tests, many integration suites when run via full `npm test`.

### verify:security

```
PASS — secretStorage abstraction, no raw AsyncStorage secrets, masking utilities
```

### verify:execution

```
FAIL — tsx/esbuild cannot transform react-native when loading execution safety module
```

### Recent runtime verify scripts (all PASS on 2026-05-23)

| Script | Result |
|--------|--------|
| `verify:failure-recovery` | 4 tests + verify OK |
| `verify:rn-bridge-survivability` | 4 tests + verify OK |
| `verify:js-thread-stabilization` | 4 tests + verify OK |
| `verify:telemetry-overhead` | 5 tests + verify OK |
| `verify:soak-runner` | 3 tests + verify OK (10 scenarios) |
| `verify:native-telemetry` | 3 tests + verify OK |
| `verify:runtime-stress` | 6 tests + verify OK (20 scenarios) |

### Full `verify:*` list (package.json)

`verify:integration`, `verify:diagnostics`, `verify:release`, `verify:portfolio`, `verify:market-data`, `verify:quote-providers`, `verify:market-boundary`, `verify:recovery`, `verify:queue`, `verify:execution`, `verify:security`, `verify:personal-production`, `verify:ai-strategy`, `verify:x-bearer`, `verify:full-audit`, `verify:redmi-soak`, `verify:post-soak`, `verify:causal-graph`, `verify:temporal-causality`, `verify:latent-state`, `verify:hierarchical-latent`, `verify:adaptive-runtime`, `verify:adaptive-governance`, `verify:observability`, `verify:self-healing`, `verify:evolution`, `verify:constitution`, `verify:metabolism`, `verify:curiosity`, `verify:unified-orchestrator`, `verify:longevity`, `verify:runtime-stress`, `verify:native-telemetry`, `verify:soak-runner`, `verify:telemetry-overhead`, `verify:js-thread-stabilization`, `verify:rn-bridge-survivability`, `verify:failure-recovery`

---

## 10. Known Issues

### Bugs / test regressions

- AI concierge layout test out of sync with `AiAssistantChat.tsx` UI structure.
- Data reliability `bad_tick` heuristic may be too strict or inputs changed.
- Paper broker execution test failing (`result.ok === false`) — validation or mock path regression.
- Vitest + React Native import path breaks ~48 test files in Node (infrastructure, not necessarily prod bugs).

### Unimplemented / partial

- **Real trading / broker integration** — intentionally locked off.
- **Push notifications on Expo Go** — skipped by design (`runtimeEnvironment.ts`).
- **Live API verify scripts** (`verify:quote-providers`, etc.) — require keys/network; not run in this snapshot.
- **Long Redmi soak** — requires physical device + `EXPO_PUBLIC_REDMI_SOAK=1` + dev build for full native metrics.

### Needs device validation

- MIUI aggressive background kill / resume races.
- Native bridge metrics accuracy (`sta-native-runtime` module).
- Thermal throttling + screen-off behavior over 8h+ sessions.
- AsyncStorage fragmentation under soak persist cycles.

---

## 11. Performance Risks

| Area | Risk |
|------|------|
| **Codebase size** | 1,300+ src files, 420 service files — large bundle, long TS compile |
| **Unified tick** | Many layers per tick; budget engine mitigates but complexity is high |
| **Concierge dashboards** | 60+ panels; lazy loading + telemetry row budget help, still heavy on low-end devices |
| **Market data queue** | API rate limits; storm of refreshes can lag UI |
| **AI context compression** | Large context payloads → latency + token cost |
| **Runtime observability journal** | Growth over long sessions if not compacted |
| **Hermes heap** | Long session + replay/adaptive graph storage |
| **Cursor / IDE** | Large repo indexing — `.cursorignore` excludes node_modules, build artifacts |

---

## 12. Mobile / Redmi Note 13 Pro 5G Notes

- **MIUI reclaim detection** via `miuiReclaimDetector.ts` + native trim signals.
- **Redmi long soak** (`redmiLongSoakValidation.ts`) — persistence, export, post-soak analysis.
- **Automated soak runner** — scenario rotation, freeze/deadlock detectors, recovery timeline.
- **Screen-off / background** — bridge suppression, deferred AsyncStorage flush, low-frequency telemetry.
- **Thermal** — thermal authority layer + thermal-safe telemetry modes + recovery cooldown.
- **ANR prevention** — `anrPreventionLayer.ts`, event loop ping.
- Native module: `modules/sta-native-runtime` (Android) — heap, battery saver, frame drops, bridge pressure.

---

## 13. Security Notes

- Secrets in **Expo SecureStore** via `secretStorage.ts`; legacy plain AsyncStorage keys migrated.
- `verify:security` passes static checks (no direct secret writes outside abstraction).
- `secureLog` / masking utilities for API debug output.
- `AppErrorBoundary` + safe boot mode on fatal errors.
- **AI payloads** screened by `assertAiPayloadSafe` / personality guard.
- **Paper-only trading lock** — multiple constants enforce `realTradingEnabled: false`.
- User-facing: manual order disclaimer in README.
- **Risk:** `logTwelveDataEnvKeyAtStartup` logs first4/last4 of key length — review for production builds.
- **Risk:** Live verify scripts may hit real APIs if keys present in local `.env`.

---

## 14. Questions for External Review

1. **Architecture:** Is the split between `src/runtime/*` (policy tick) and `src/recovery/*` / `src/rn/*` / `src/scheduler/*` (non-policy) clear and maintainable?
2. **Complexity:** Does the unified orchestrator phase chain (10+ layers) justify its operational benefit vs. debugging cost?
3. **Test strategy:** Best approach to fix RN-in-vitest load failures — mock bridge, separate node-safe entry points, or detox/e2e only?
4. **Paper broker:** Review human-confirmation gates and whether failing unit test indicates a real UX regression.
5. **Market data:** Is Twelve Data + fallback provider chain robust enough for Bursa tickers?
6. **AI concierge:** Is context compression losing critical portfolio/risk fields? Token budget vs. answer quality tradeoff?
7. **Performance:** Which dashboard panels should be removed or merged for Redmi-class devices?
8. **Security:** Any concerns with SecureStore + env fallback migration pattern?
9. **Observability:** Is telemetry/journal volume bounded adequately for 24h+ sessions?
10. **Product:** Given paper-only lock, is the app scope clear to end users vs. “trading bot” expectations?
11. **Native module:** Is `sta-native-runtime` the right boundary for device metrics vs. pure JS?
12. **Recovery:** Should failure recovery orchestrator remain strictly non-policy, or merge with runtime self-healing?

---

*End of review package. For subsystem details see `docs/review/*.md` (RUNTIME_*, NATIVE_*, RN_BRIDGE_*, FAILURE_RECOVERY_*, etc.).*
