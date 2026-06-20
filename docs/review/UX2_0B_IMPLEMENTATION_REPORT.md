# UX2.0b Implementation Report

| 項目 | 内容 |
|------|------|
| フェーズ | **UX2.0b — Standard / Pro でも AIコンシェルジュ主役化** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |
| versionCode | **22** |
| APK | `artifacts/preview-v22-ux20b.apk`（35,939,493 bytes） |
| デバイス | FYRWXSNNAIOR9DCM |

---

## 1. 実装内容

### 1.1 Standard タブ 8 → 6

| タブ | ラベル |
|------|--------|
| Home | ホーム |
| Portfolio | 保有銘柄 |
| MaterialAnalysis | 銘柄チェック |
| ConciergeConsult | AI相談 |
| AiNotifications | **通知**（旧: AI通知） |
| Settings | **設定**（新規タブ） |

削除したタブはコード上は残存し、`isTabVisibleForAppUxMode` による非表示のみ。

### 1.2 Home 簡素化（Standard / Pro）

| 対象 | 対応 |
|------|------|
| Trust MD / 実績カード / TrustConciergeHomeCard | Standard（trust）で非表示 |
| BursaConciergeHomeCard | `conciergeFirstHome` 時非表示 |
| ProactiveSuggestionsHomeCard | `conciergeFirstHome` 時非表示 |
| CentralIntelligencePanel | `conciergeFirstHome` 時非表示 |
| TradeQueue 常設 | UX2.0a 通り Home から非表示（維持） |
| Home 最上位 | **今日のAIアドバイス → AIに相談する** |
| Standard ヘッダー歯車 | 設定タブへ移行のため非表示 |

### 1.3 FAB 整理

| モード | FAB「AI(n)」 |
|--------|-------------|
| Beginner | 非表示（維持） |
| Standard | **非表示** |
| Pro | **表示** |

`AiConciergeOverlay`: `hideFab = isBeginnerMode || isStandardMode`

### 1.4 AI相談内の情報量整理

| 項目 | 対応 |
|------|------|
| 今日のAI提案 | 最大3件（UX2.0a 維持） |
| TradeQueue 全文 | `defaultCollapsed` — デフォルト折りたたみ、「詳細を見る（N件）」 |
| 通知ダイジェスト | 「未確認の通知があります」「重要そうな通知を3件だけ表示します」 |

---

## 2. 変更ファイル一覧

- `src/navigation/beginnerTabNavigatorConfig.ts` — STANDARD_TABS 6件・通知ラベル
- `src/navigation/types.ts` — `Settings` を MainTabParamList に追加
- `src/navigation/MainTabNavigator.tsx` — Settings タブ登録
- `src/navigation/tabIcons.tsx` — Settings アイコン
- `src/screens/HomeScreen.tsx` — Home 簡素化・ヘッダー歯車制御
- `src/components/concierge/AiConciergeOverlay.tsx` — FAB 表示条件
- `src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx` — 通知文言
- `src/components/AiTradeQueueSection.tsx` — 折りたたみ UI
- `src/components/AiAssistantChat.tsx` — TradeQueue `defaultCollapsed`
- `tests/unit/appUxMode.test.ts` — Standard 6タブテスト
- `scripts/capture-ux20b-screenshots.mjs` — 実機キャプチャ
- `app.json` — versionCode **22**

---

## 3. 実機スクリーンショット

| モード | 画面 | ファイル |
|--------|------|----------|
| Beginner | ホーム | `docs/review/ux20b-screenshots/beginner-home.png` |
| Beginner | AI相談 | `docs/review/ux20b-screenshots/beginner-concierge.png` |
| Standard | ホーム | `docs/review/ux20b-screenshots/standard-home.png` |
| Standard | AI相談 | `docs/review/ux20b-screenshots/standard-concierge.png` |
| Pro | ホーム | `docs/review/ux20b-screenshots/pro-home.png` |
| Pro | AI相談 | `docs/review/ux20b-screenshots/pro-concierge.png` |

### 実機確認サマリ

| 確認項目 | Beginner | Standard | Pro |
|----------|----------|----------|-----|
| タブ数 | 4 | **6** | 12 |
| Home 最上位 | AIアドバイス → AI相談 CTA | ✓ | ✓ |
| FAB | なし | **なし** | **あり（AI 9）** |
| AI相談: 提案3件 | ✓ | ✓ | ✓ |
| AI相談: 通知文言 | ✓ | ✓ | ✓ |
| AI相談: TradeQueue 折りたたみ | ✓ | ✓ | ✓ |
| 設定タブ | — | ✓ | ヘッダー歯車 |

---

## 4. ユニットテスト結果

```
npx vitest run tests/unit/appUxMode.test.ts tests/unit/conciergeTodayProposalsBuilder.test.ts
```

| 結果 | 件数 |
|------|------|
| Test Files | 2 passed |
| Tests | **11 passed** |

---

## 5. GitHub

| 項目 | 値 |
|------|-----|
| commit | _(commit 後に更新)_ |
| push | _(push 後に更新)_ |

---

## 6. 制約遵守

- 新規分析機能: **追加なし**
- 新規 UX 設計レポート: **作成なし**（本実装レポートのみ）
- 既存機能のコード削除: **なし**（非表示・折りたたみ・導線整理のみ）
