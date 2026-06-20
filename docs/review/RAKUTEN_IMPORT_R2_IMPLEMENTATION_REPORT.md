# Rakuten Transaction Import R2 — 実装レポート

| 項目 | 内容 |
|------|------|
| フェーズ | **R2 実装（自然文入力 · OCR なし）** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |
| versionCode | **24** |
| スコープ | AIコンシェルジュ自然文 → 候補パース → 確認カード → R1 確認画面連携 · 信頼度ゲート |

---

## 実装内容

### 自然文パイプライン（ルールベース · 決定論的）

| ファイル | 役割 |
|----------|------|
| `detectRakutenImportIntent.ts` | 入金/売買/配当の記録意図を日英ヒューリスティックで検出 |
| `naturalLanguageTransactionParser.ts` | 自然文 → 構造化フィールド + `fieldConfidence` / `overallConfidence` / `lowConfidenceFields` |
| `rakutenImportConfidence.ts` | 閾値（≥0.85 高 / 0.60–0.84 要確認 / &lt;0.60 保存不可）、`canSaveImportCandidate()` |
| `buildNaturalLanguageImportCandidate.ts` | `source=natural_language` でステージング · 信頼度に応じ `draft` / `ready_to_confirm` |

### コンシェルジュ UX

- `AiAssistantChat`: インポート意図検出時は OpenAI をスキップし、即時確認メッセージ + `ConciergeImportActionCard`
- `ConciergeImportActionCard`: 信頼度バッジ · 低信頼フィールド警告 · [記録する] [修正する] [キャンセル]
- `AiChatMessage` 拡張: `rakutenImportCandidateId`, `rakutenImportBlocked`

### R1 連携・ゲート

- `stageRakutenImportNaturalLanguage(text)` — AppContext 公開
- `commitImportCandidateInState` — `canSaveImportCandidate()` 未満は保存拒否
- ジャーナル `recordSource`: NL 候補は `rakuten_import_nl`
- `RakutenImportConfirmScreen` — NL 信頼度ラベル（高/要確認/保存不可）· 保存ボタン無効化

---

## 対応自然文一覧

| ユーザー入力 | 構造化結果 | 保存 |
|-------------|-----------|------|
| 500リンギット入金した | deposit · RM500 · 今日 | ○（高信頼） |
| RM500 deposit | 同上 | ○ |
| Maybankを100株買った | buy · 1155 · 100株 · 単価なし | ×（price 要確認） |
| MaybankをRM9.20で100株買った | buy · 1155 · 100 · 9.20 | ○ |
| CIMBを売った | sell · 1023 · 保有数量 · 単価なし | × |
| 配当が入った | dividend · 銘柄/金額不明 | ×（R1 commit 未対応 + 低信頼） |

---

## 変更ファイル（主要）

| 区分 | パス |
|------|------|
| パーサ | `src/services/rakutenImport/detectRakutenImportIntent.ts`, `naturalLanguageTransactionParser.ts`, `rakutenImportConfidence.ts`, `buildNaturalLanguageImportCandidate.ts` |
| コミット | `src/services/rakutenImport/commitImportCandidate.ts` |
| UI | `src/components/concierge/ConciergeImportActionCard.tsx`, `src/components/AiAssistantChat.tsx`, `src/screens/RakutenImportConfirmScreen.tsx` |
| コンテキスト | `src/context/app/useAppPortfolioActions.ts`, `AppContext.tsx` |
| 型 | `src/types/aiChat.ts`, `src/types/execution.ts` |
| テスト | `tests/unit/rakutenImport/naturalLanguageParser.test.ts`, `importConfidence.test.ts` |
| ビルド | `app.json` (24), `android/app/build.gradle` |
| 証跡 | `scripts/capture-rakuten-import-r2-screenshots.mjs`, `docs/review/rakuten-import-r2-screenshots/*` |

---

## v24 APK

| 項目 | 値 |
|------|-----|
| パス | `artifacts/preview-v24-rakuten-import-r2.apk` |
| サイズ | 35,976,313 bytes |
| ビルド経路 | `C:\p\sta` 短パス · `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` |
| 実機 versionCode | 24（`adb shell dumpsys package` 確認済み） |

---

## ユニットテスト結果

```
npx vitest run tests/unit/rakutenImport

 Test Files  5 passed (5)
      Tests  27 passed (27)
```

---

## 実機スクリーンショット

| ファイル | 内容 |
|----------|------|
| `docs/review/rakuten-import-r2-screenshots/01-concierge-home.png` | AI相談タブ |
| `docs/review/rakuten-import-r2-screenshots/02-nl-deposit-card.png` | RM500 deposit → 確認カード |
| `docs/review/rakuten-import-r2-screenshots/03-nl-deposit-confirm.png` | RakutenImportConfirm 画面 |
| `docs/review/rakuten-import-r2-screenshots/04-nl-buy-low-confidence.png` | 買付 NL · 単価不足で保存不可 |

---

## Git

| 項目 | 値 |
|------|-----|
| commit | `ddca194` |
| push | `origin/cursor/top3-maxdd-capital-audit` |

---

## 次フェーズ（R3 以降）

- OCR スクショ経路（`ocr_screenshot`）
- 配当 `commitImportCandidate` 対応
- OpenAI JSON schema フォールバック（API キーあり時 · 任意）
