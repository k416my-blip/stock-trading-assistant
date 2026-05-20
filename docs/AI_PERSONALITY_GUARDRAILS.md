# AI Personality Guardrails

## Fixed Personality

The AI concierge maintains a **fixed strategic philosophy** (`AI_PERSONALITY_PHILOSOPHY_VERSION`). Traits are immutable:

- Calm · Analytical · Institutional · Risk-aware · Transparent · Defensive · Non-emotional · No hype

Implementation: `src/constants/aiPersonality.ts`, `src/constants/aiPersonalityGuardrails.ts`, `src/services/aiPersonalityGuard.ts`.

## No User Learning

**Prohibited:**

| Behavior | Status |
|----------|--------|
| Fine-tuning from user conversations | Blocked by design (no training pipeline) |
| Persistent learning from chats | Blocked |
| Personality mutation | Blocked (`assertFixedPersonalityImmutable`) |
| Reinforcement from user opinions | Blocked in system prompt |
| Long-term user ideology adaptation | Blocked |
| User-driven risk philosophy changes | Blocked (`turnGuard.userTrainingAttempt`) |

The OpenAI API receives **one turn only**: current `question` + current `context` snapshot. Past chat is **not** included in the API payload (`buildEphemeralApiUserPayload`).

## Temporary Context Only

**Allowed:**

- Current conversation turn (user question text)
- Current portfolio, diagnostics, market regime, system state (via Central Intelligence world model)
- UI chat history on device for **display continuity only** (`aiChatHistoryStorage.ts`, max 80 messages)

**Not allowed to persist for AI memory:**

- User ideology · opinions · emotional persuasion · market beliefs · conspiracy narratives · manipulation patterns

## Defensive Finance Philosophy

- Disclose stale data when `staleHoldingsCount > 0`
- Disclose degraded mode when `operations.degradedMode`
- Disclose confidence limits when composite confidence is low
- Reject certainty / hype phrases (`AI_HYPE_CERTAINTY_PATTERNS`, `AI_FORBIDDEN_EXPRESSIONS`)
- Never guarantee profit or encourage reckless trading

Enforced in `validateDisclosureCompliance()` before accepting API JSON.

## Transparency Rules

Every API response JSON should include:

- `dataFreshness` — quote age / stale holdings impact
- `systemStateReason` — diagnostics, queue, degraded mode
- `confidenceDegradationReason` — when confidence is reduced
- `risk` — stated before opportunity

Failures trigger mock fallback (same as forbidden expressions).

## Architecture Touchpoints

| Layer | File |
|-------|------|
| Instructions | `buildFixedAiInstructions()` |
| Context payload | `personalityGuardrails`, `turnGuard` in `AiStrategyContextPayload` |
| Pre-send validation | `assertAiPayloadSafe` → `assertAiPayloadGuardrails` |
| Post-parse validation | `validateDisclosureCompliance`, `containsHypeOrCertaintyLanguage` |
| UI history | `aiChatHistoryStorage.ts` — documented UI-only |

## Tests

`tests/unit/aiPersonalityGuard.test.ts`

## Versioning

Bump `AI_PERSONALITY_PHILOSOPHY_VERSION` only when product intentionally releases a new fixed philosophy (not per user).
