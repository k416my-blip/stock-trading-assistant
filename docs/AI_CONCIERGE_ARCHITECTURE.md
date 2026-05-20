# AI Concierge Architecture

## Concept

The AI Strategy Assistant is a **persistent cross-app concierge**:

- Concierge · Strategist · System guide · Portfolio assistant · Market explainer · Recovery advisor

Personality: **知的な軍師 + コンシェルジュ** — calm, institutional, transparent, never overconfident.

## Persistent Access

| Component | Path |
|-----------|------|
| Provider | `src/context/AiConciergeContext.tsx` |
| Floating FAB | `src/components/concierge/AiConciergeFab.tsx` |
| Bottom sheet | `src/components/concierge/AiConciergeSheet.tsx` |
| Root mount | `App.tsx` → `AiConciergeOverlay` |

The FAB is positioned above the tab bar (safe area + 64px). It hides while the panel is open.

## Concierge Panel Contents

- System status summary (regime, risk, composite confidence, queue, degraded reasons)
- Conversation history (shared `aiChatHistoryStorage`)
- Text input + send
- Voice input (speech-to-text only, no TTS/avatar)
- Quick actions per conversation mode
- API connection status (inside `AiAssistantChat`)

## Conversation Modes

Detected locally in `src/services/aiConciergeIntent.ts` (no extra API call):

| Mode | Japanese label | Examples |
|------|----------------|----------|
| `operation` | 操作説明 | 健全性チェックとは？ / stale data |
| `strategy` | 戦略 | なぜ買い推奨？ / 信頼度低下 |
| `system` | システム | API quota / 更新停止 |
| `portfolio` | ポートフォリオ | 保有バランス / セクター偏り |

Mode is passed to the LLM via `context.concierge.promptHint`.

## Voice Input

`src/services/aiVoiceInputService.ts`:

- **Web:** `SpeechRecognition` / `webkitSpeechRecognition` (`ja-JP`)
- **Native (iOS/Android):** graceful fallback with Japanese message (no AI voice output)

Permission denied → `AI_CONCIERGE_UI.voicePermissionDenied`

## World Model Integration

Concierge chat uses the same **Central Intelligence** payload as the home intelligence panel (`buildAiStrategyContext` → `buildCentralIntelligenceWorldModel`).

The AI must reference diagnostics, stale data, degraded mode, queue health, execution safety, recovery, and portfolio risk when answering.

## Safety

- No automatic trading · no broker integration
- `AI_FORBIDDEN_EXPRESSIONS` + sanitizer
- `assertAiPayloadSafe` — no secrets in context
- Degraded/stale state must not be hidden in responses (enforced in system prompt)

## Home Screen

`CentralIntelligencePanel` shows the intelligence dashboard; full chat is opened via the global FAB (avoids duplicate chat UIs).

## Testing

- `tests/unit/aiConcierge.test.ts` — modes, voice fallback, FAB visibility, degraded context, sanitizer

## Gaps

- Native STT requires future `expo-speech-recognition` or similar; currently web-only live capture
- No AI voice output / avatar (by design for this phase)
- Panel open/close not covered by component integration tests yet
