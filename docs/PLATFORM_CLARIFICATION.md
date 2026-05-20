# Platform clarification — analysis OS, not broker execution

## Positioning

This app is an **AI investment operating system** and **decision-support platform**:

- AI analysis and strategy suggestions
- Portfolio tracking and risk diagnostics
- Practice trading and execution **simulation**
- Reconciliation and structured diagnostics

It is **not** a broker terminal and does **not** place live orders.

## Modes

| UI label | Purpose |
|----------|---------|
| **練習モード** | Virtual capital, simulation only |
| **実運用分析モード** | Real portfolio **analysis and record-keeping** after you trade in your broker app |

Legacy wording such as 「本番モード」 or 「手動売買モード」 is replaced by **実運用分析モード** to avoid implying connected broker execution.

## User-facing rule

> 実際の注文は証券会社アプリ側で実行してください

> このアプリは投資判断を補助する分析ツールです。実際の注文はRakuten Tradeなどの証券会社アプリでユーザー自身が行ってください。

## Not supported (current release)

- Direct Rakuten Trade order execution
- Broker API trading
- Automatic live trading
- Unofficial scraping or automation

## Supported (kept)

- Practice trading
- AI recommendations and urgency analysis
- Execution safety simulation
- Reconciliation and diagnostics

## AI assistant

The concierge answers as an **analysis support system**:

> 現在は分析支援システムとして動作しています

## Future live trading (architecture note only)

Future broker-connected live execution would require:

1. Official broker API
2. Authentication and consent flows
3. Broker-side order confirmation
4. Regulatory review

No unofficial automation is planned in this codebase.
