# Central Intelligence Architecture

## Overview

The **AI Strategy Assistant** (`AI戦略アシスタント`) is the single visible intelligence layer of the Self-Healing AI Investment Assistant. It is not an isolated chat widget; it is the unified personality and operating interface of the application.

```
「AI戦略アシスタント」 = 「自己修復型AI投資支援システムの人格」
```

## AI人格統合 (Personality Integration)

- **Role (internal):** Self-healing AI investment assistant — institutional, calm, risk-aware, transparent.
- **Tone (user-facing, Japanese):** 外資系証券会社MD調 — without arrogance, hype, or guaranteed-profit language.
- **Constants:** `src/constants/aiPersonality.ts`
- **System prompt:** `src/constants/aiStrategy.ts` — requires references to `systemAwareness`, degraded mode, stale data, and queue/API constraints.

## Context Aggregation

### Central Intelligence Context Layer

| Module | Path |
|--------|------|
| World model builder | `src/services/centralIntelligenceContext.ts` |
| AI payload adapter | `src/services/aiContextBuilder.ts` |
| React hook | `src/hooks/useCentralIntelligence.ts` |
| Types | `src/types/centralIntelligence.ts` |

`buildCentralIntelligenceWorldModel()` aggregates:

- Market regime & portfolio holdings (normalized, no secrets)
- Stale data metadata & price sync state
- Diagnostics summary & severity counts
- Health check report
- Execution journal & reconciliation mismatches
- Market data queue / API rate-limit snapshot
- Kill switches & degraded / safe boot state
- Recovery recommendations & backup snapshot integrity

This becomes the AI **world model** sent to OpenAI via `AiStrategyContextPayload`.

### AI Context Sources (wired from AppContext)

| Source | Field in payload |
|--------|------------------|
| `marketRegime` | `marketRegimeLabel`, `riskMode` |
| `healthReport` | `operations.healthOverall`, `healthSummaryJa` |
| `degradedMode`, `bootMode`, `securityWarnings` | `operations.degraded*` |
| `structuredDiagnostics` | `operations.diagnostics*` |
| `priceSync` | data freshness confidence |
| `killSwitches` | `operations.killSwitchSummaryJa` |
| Portfolio positions | `holdings`, `portfolioRisk` |
| Execution journal | `journalSummary` |
| Reconciliation service | `operations.reconciliationJa` |
| Queue snapshot | `operations.queueStateJa`, `rateLimitActive` |
| Healthy snapshot | `operations.backupIntegrityJa` |
| Mock trade queue | `recommendations` (confidence-adjusted) |

## System Awareness

`AiSystemAwareness` tracks four confidence dimensions (0–100):

| Dimension | Driven by |
|-----------|-----------|
| `dataFreshnessConfidence` | Stale holdings %, price sync errors |
| `executionConfidence` | Journal uncertain/in-flight, reconciliation mismatches |
| `recoveryConfidence` | Safe boot, backup checksum |
| `systemConfidence` | Health check, diagnostics, rate limits, degraded mode |
| `compositeConfidence` | Weighted blend used for recommendation display |

Degradation reasons are surfaced in Japanese (`degradationReasonsJa`) without logging secrets or raw payloads.

## UI: Unified Operating Interface

`CentralIntelligencePanel` on **Home** (`src/screens/HomeScreen.tsx`):

- AI avatar placeholder
- Market regime & risk mode
- System health & degraded warnings
- Confidence pills (system / data / execution / recovery)
- Top recommendations with adjusted confidence
- Embedded `AiAssistantChat` (API conversation)

## Safety Philosophy

The AI must **never**:

- Guarantee profit or claim certainty
- Hide stale data or degraded mode
- Ignore diagnostics failures
- Encourage reckless behavior

Enforced by:

- `AI_FORBIDDEN_EXPRESSIONS` + `aiResponseSanitizer`
- `assertAiPayloadSafe()` (no api keys / secrets in context)
- `secureLog` only (no payload logging)
- Existing execution safety, kill switches, and recovery paths unchanged

## Testing

- `tests/unit/centralIntelligenceContext.test.ts` — degraded mode, stale data, diagnostics, confidence, missing health
- `tests/unit/aiStrategyService.test.ts` — API path with extended context fixture
- `tests/helpers/aiContextFixture.ts` — minimal safe payload for unit tests

## Remaining Architectural Gaps

- Trade queue briefing data is still **mock-sourced** (`mockAiStrategyBriefing.ts`); live quant signals are not yet wired.
- `useCentralIntelligence` rebuilds on many AppContext deps; consider incremental refresh or shared cache.
- No dedicated integration test for `CentralIntelligencePanel` UI.
- Cross-asset flow and meta-allocation modules are not yet in the world model.
