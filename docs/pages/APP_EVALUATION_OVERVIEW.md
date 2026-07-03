# App Evaluation Overview / アプリ評価概要

**Stock Trading Assistant** — React Native + Expo (TypeScript) mobile app for **investment analysis and decision support only**.

| Item | Detail |
|------|--------|
| **Purpose** | Portfolio tracking, Bursa Malaysia-style analysis, material/news analysis, AI concierge |
| **Real orders** | **No** — REAL_TRADING_ENABLED = false (compile-time lock) |
| **Broker API** | **None** — no automated order placement |
| **Real-world use** | Place orders manually at your broker (e.g. **Rakuten Trade Malaysia**); record fills in the app |
| **Markets** | Bursa (primary), US, HK (price/basic analysis) |

## Safety model / 安全設計

- Analysis and suggestions only — not financial advice (NOT_FINANCIAL_ADVICE, risk screens).
- Manual order list is a **checklist** for human execution at the broker.
- **Rakuten manual entry**: add holdings, trades, dividends; OCR import for Rakuten screenshots (Settings).
- API keys stored in **Expo SecureStore**, never in this repo.

## Evaluation audience / 評価対象者

- AI reviewers (ChatGPT, third-party audit)
- Human QA / product review
- No production trading credentials required

## Build info

| Field | Value |
|-------|-------|
| versionCode | **44** |
| versionName | 1.0.0 |
| Branch | cursor/top3-maxdd-capital-audit |

See also: [Current Features](CURRENT_FEATURES.md) · [Known Issues](KNOWN_ISSUES.md) · [Latest Release](LATEST_RELEASE.md) · [Screenshots](SCREENSHOTS.md) · [Test Report Summary](TEST_REPORT_SUMMARY.md)
