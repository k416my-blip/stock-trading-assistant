# UX2.0a Implementation Report

| 項目 | 内容 |
|------|------|
| フェーズ | **UX2.0a — AIコンシェルジュ主役化（統合のみ）** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |
| versionCode | **21** |
| APK | `artifacts/preview-v21-ux20a.apk`（35,937,869 bytes） |

---

## 1. 実装内容

### 1.1 AI相談タブ上部 — 「今日のAI提案」（最大3件）

| 項目 | 内容 |
|------|------|
| 新規 | `src/services/concierge/conciergeTodayProposalsBuilder.ts` |
| UI | `src/components/concierge/ConciergeTodayProposalsPanel.tsx` |
| 表示 | 保有継続 / 監視 / 買い候補 / 見送り |
| 件数 | アクティブ TradeQueue から最大 **3件** |

### 1.2 通知ダイジェスト統合

| 項目 | 内容 |
|------|------|
| 新規 | `src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx` |
| 表示 | 未読件数 + 最新3件要約 |
| Beginner | **通知タブへ遷移リンク非表示** |
| Standard / Pro | 「すべての通知を見る」→ `AiNotifications` |

### 1.3 TradeQueue → AI相談「今日の提案」

| 変更 | 内容 |
|------|------|
| `AiAssistantChat.tsx` | コンシェルジュ scroll 先頭に統合ブロック追加 |
| `AiTradeQueueSection.tsx` | タイトル上書きオプション追加 |
| Home | **常設 TradeQueue 削除**（コードは残存） |

### 1.4 ホーム → AI相談 導線強化

| モード | 変更 |
|--------|------|
| Beginner | **AIに相談する** Primary · 保有を確認 Ghost |
| Standard（trust） | アドバイスカード + Primary CTA を先頭追加 |
| Pro / 通常 | アドバイスカード + Primary CTA を先頭追加 |

### 1.5 バグ修正

Standard モード切替時の Hooks 不一致（`HomeScreen` `useMemo` 位置）を修正。

---

## 2. 変更ファイル一覧

- `src/services/concierge/conciergeTodayProposalsBuilder.ts`（新規）
- `src/components/concierge/ConciergeTodayProposalsPanel.tsx`（新規）
- `src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx`（新規）
- `tests/unit/conciergeTodayProposalsBuilder.test.ts`（新規）
- `scripts/capture-ux20a-screenshots.mjs`（新規）
- `src/components/AiAssistantChat.tsx`
- `src/components/AiTradeQueueSection.tsx`
- `src/screens/HomeScreen.tsx`
- `app.json`（versionCode **21**）

---

## 3. 実機スクリーンショット

| モード | 画面 | ファイル |
|--------|------|----------|
| Beginner | ホーム | `docs/review/ux20a-screenshots/beginner-home.png` |
| Beginner | AI相談 | `docs/review/ux20a-screenshots/beginner-concierge.png` |
| Standard | ホーム | `docs/review/ux20a-screenshots/standard-home.png` |
| Standard | AI相談 | `docs/review/ux20a-screenshots/standard-concierge.png` |
| Pro | ホーム | `docs/review/ux20a-screenshots/pro-home.png` |
| Pro | AI相談 | `docs/review/ux20a-screenshots/pro-concierge.png` |

---

## 4. APK · versionCode

| 項目 | 値 |
|------|-----|
| versionCode | **21** |
| APK | `artifacts/preview-v21-ux20a.apk` |
| ビルド | `C:\p\sta` · `gradlew assembleRelease` |
| install | **Success** |

---

## 5. ユニットテスト

```text
npx vitest run tests/unit/conciergeTodayProposalsBuilder.test.ts
→ 3/3 PASS
```

---

## 6. Git

| 項目 | 値 |
|------|-----|
| 実装コミット | （commit 後に更新） |
| push 結果 | （push 後に更新） |
