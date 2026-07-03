# Current Features / 実装済み機能

Updated for **versionCode 44** (2026-07).

## Core tabs / メインタブ

| Tab | Description |
|-----|-------------|
| **Home / ホーム** | Portfolio summary, quick actions, manual order entry |
| **Holdings / 保有銘柄** | Positions, P&L, price refresh |
| **Material analysis / 材料分析** | News, RSS, X, Reddit, Bursa announcements, sentiment scores |
| **AI analyst / AI分析** | Enhanced 15-block concierge analysis |
| **Settings / 設定** | API keys, language, Rakuten OCR import, diagnostics |

## Manual trading support / 手動売買支援

- **Manual order list** — create checklist flows; delete pending items (v43+).
- **Manual add holding** — direct position entry.
- **Add trade / dividend** — record executions after broker fills.
- **Rakuten OCR import** — screenshot to staged review (Settings).
- **Capital screen** — investment amount tracking.

## AI concierge / AIコンシェルジュ

- 15-item enhanced analysis block (price, holdings, sentiment, risks, action guide).
- Confidence gate: below 45% — no speculative recommendations.
- OpenAI when key configured; mock mode when off.

## Explicitly not implemented

- Live broker order API
- Real-money auto-trading
- Reddit OAuth (RSS only)
