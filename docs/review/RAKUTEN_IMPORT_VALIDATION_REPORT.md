# Rakuten Import Validation — 検証レポート

| 項目 | 内容 |
|------|------|
| フェーズ | **Import Validation（OCR · NL · 重複検出）** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-21 |
| スコープ | **新機能追加なし** — 検証スクリプト · フィクスチャ · JSON 結果 · 実機 NL スクショ · レポートのみ |
| 前提 commit | `3388bdcbda73d97e21cd12c0c39713ce8d51f367`（検証実行時点 · 本レポート commit は後述） |

---

## 1. フィクスチャ収集

### 1.1 実施した収集手段

| 手段 | 結果 |
|------|------|
| `docs/review/` 既存画像 | Rakuten Trade **Transaction History 実データ行** を含む画像 **0 件**（R1–R3 証跡は自アプリ UI のみ） |
| adb `/sdcard/DCIM/Screenshots` キーワード検索 | `rakuten` / `ispeed` / `trade` 一致 **0 件** |
| adb 実機キャプチャ（`ispeed.rakutentrade.my`） | Menu → **Transaction History (Cash)** · Order → **Trade History** — いずれも **取引行 0 件（空画面）** |

### 1.2 収集済みフィクスチャ

| ID | ファイル | 画面 | 期待行数 |
|----|----------|------|----------|
| `txn-history-cash-empty` | `fixtures/transaction-history-cash-empty.png` | Transaction History > Cash | 0 |
| `trade-history-empty` | `fixtures/trade-history-empty.png` | Order > Trade History > Bursa | 0 |

manifest: `docs/review/rakuten-import-validation/fixtures/manifest.json`

### 1.3 未収集（フィールド精度検証不可）

| 種別 | 状態 |
|------|------|
| Deposit | **未収集** — 実機アカウントに該当履歴なし |
| Buy | **未収集** |
| Sell | **未収集** |
| Dividend | **未収集** |
| Withdrawal | **未収集** |

**推奨:** ユーザーが上記種別を含む Rakuten Trade Transaction History スクショを `fixtures/` に追加し、`manifest.json` の `expectedRows` を手動転記のうえ `node scripts/rakuten-import-validation.mjs` を再実行してください。

---

## 2. OCR 精度

**OpenAI Vision:** 利用可（`.env` · ソース: `.env`）  
**実行:** `node scripts/rakuten-import-validation.mjs` → `ocr-results.json`

### 2.1 空画面フィクスチャ（2 件）

| フィクスチャ | Vision 行数 | 幻覚行 | 空画面一致 |
|-------------|------------|--------|-----------|
| transaction-history-cash-empty.png | 0 | 0 | **○** |
| trade-history-empty.png | 0 | 0 | **○** |

Vision は空リストを返し、幻覚行は **0**。空 Transaction History に対する誤検出は **なし**。

### 2.2 フィールド別精度（正解 / 誤認識 / 未取得）

| フィールド | 正解 | 誤認識 | 未取得 | 正解率 |
|-----------|------|--------|--------|--------|
| date | 0 | 0 | 0 | — |
| symbol | 0 | 0 | 0 | — |
| quantity | 0 | 0 | 0 | — |
| price | 0 | 0 | 0 | — |
| fee | 0 | 0 | 0 | — |
| total | 0 | 0 | 0 | — |
| currency | 0 | 0 | 0 | — |

**注:** 実データ行を含むフィクスチャが無いため、フィールド単位の精度は **N/A（評価対象 0 件）**。空画面のみではパーサ精度は測定できない。

### 2.3 パイプライン所見（空画面）

`parseOcrVisionJson` は行 0 件を `empty_rows` エラーとして扱う。Vision 自体は 0 行を正しく返すが、**`buildOcrImportBatch` 経路では「有効な取引候補を生成できませんでした」で失敗**する（空履歴スクショをユーザーが選んだ場合の UX ギャップ）。

---

## 3. 自然文精度（4 フレーズ）

**実行:** 同一スクリプト → `nl-results.json`  
**ユニット:** `tests/unit/rakutenImport/validationHarness.test.ts`

| フレーズ | 種別 | 構造化 | saveable | 結果 |
|---------|------|--------|----------|------|
| 500リンギット入金した | deposit · RM500 | overall 0.92 | **Y** | **PASS** |
| MaybankをRM9.20で100株買った | buy · 1155 · 100株 · RM9.20 | overall 0.90 | **Y** | **PASS** |
| Maybankの配当がRM50入った | dividend · 1155 · RM50 | overall 0.80 | **Y** | **PASS** |
| RM500 withdrawal | withdrawal · RM500 | overall 0.90 | **Y** | **PASS** |

**合計: 4 / 4 PASS** · いずれも `buildStatus: ready_to_confirm`

---

## 4. 重複検出

**実行:** モック Vision 固定データで同一画像を 2 回 `buildOcrImportBatch`（1 回目候補を state に反映後）→ `duplicate-results.json`

| パス | deposit | buy | 結果 |
|------|---------|-----|------|
| 1 回目 | duplicateHint なし · ready_to_confirm | 同上 | — |
| 2 回目 | **duplicate_blocked** · ref 一致 score 0.98 | **duplicate_blocked** · 日付+銘柄+数量+金額 score 0.95 | **PASS** |

---

## 5. 実機 NL スクリーンショット

**スクリプト:** `node scripts/capture-rakuten-import-validation-screenshots.mjs`  
**端末:** adb 接続済み（Redmi / HyperOS）

| ファイル | 内容 |
|----------|------|
| `screenshots/00-concierge-home.png` | AI コンシェルジュホーム |
| `screenshots/01-deposit.png` | 「500リンギット入金した」送信後 |
| `screenshots/02-buy.png` | 「MaybankをRM9.20で100株買った」送信後 |
| `screenshots/03-dividend.png` | 「Maybankの配当がRM50入った」送信後 |
| `screenshots/04-withdrawal.png` | 「RM500 withdrawal」送信後 |

メタ: `docs/review/rakuten-import-validation/screenshots/capture-meta.json`

---

## 6. 検証ツール一覧

| パス | 役割 |
|------|------|
| `scripts/rakuten-import-validation.mjs` | 検証エントリ（vitest ランナー起動） |
| `scripts/rakuten-import-validation.vitest.ts` | OCR / NL / 重複 JSON 出力 |
| `vitest.validation.config.ts` | RN スタブ付き vitest 設定 |
| `scripts/capture-rakuten-import-validation-screenshots.mjs` | 実機 NL カードキャプチャ |
| `tests/unit/rakutenImport/validationHarness.test.ts` | 決定論 NL + 重複（API 不要） |

**再実行:**

```bash
node scripts/rakuten-import-validation.mjs
npx vitest run tests/unit/rakutenImport
node scripts/capture-rakuten-import-validation-screenshots.mjs
```

---

## 7. ユニットテスト

```text
npx vitest run tests/unit/rakutenImport
Test Files  9 passed (9)
Tests       55 passed (55)   # 既存 50 + validationHarness 5
```

---

## 8. 発見された問題（優先度順）

| 優先度 | 問題 | 影響 |
|--------|------|------|
| **P0** | **実 Transaction History スクショ（Deposit/Buy/Sell/Dividend/Withdrawal）が未収集** | OCR フィールド精度を本番データで未検証 |
| **P1** | 空 Transaction History で `parseOcrVisionJson` → `empty_rows` → `buildOcrImportBatch` 全体失敗 | 履歴が空のユーザーがスクショを選ぶとエラー表示（0 候補の正常系を扱えない） |
| **P2** | Trade History（Order タブ）と Transaction History（Menu）で UI レイアウトが異なる | Vision プロンプトが Transaction History 前提 — Trade History 専用行は未検証 |
| **P2** | 検証ランナーは vitest 経由（`tsx` 直接 import だと expo-file-system → RN で失敗） | CI では `node scripts/rakuten-import-validation.mjs` を使用 |

**本検証ではアプリコード変更なし**（P1 は推奨のみ · 実装は別タスク）。

---

## 9. Git

| 項目 | 値 |
|------|-----|
| 検証実行時 commit | `3388bdcbda73d97e21cd12c0c39713ce8d51f367` |
| 本レポート commit | `72ade71`（検証ハーネス `5b660c4` + 実機 NL スクショ） |
| push | **成功** · `origin/cursor/top3-maxdd-capital-audit` · `3388bdc..e63c7a4` |

---

## 10. 結論

| 領域 | 結果 |
|------|------|
| OCR（空画面） | 幻覚行 0 · 空一致 **OK** · **フィールド精度 N/A** |
| NL 4 フレーズ | **4/4 PASS** · 保存可 |
| 重複検出 | **PASS**（2 回目 deposit/buy とも duplicate_blocked） |
| 実機 NL スクショ | **5 枚取得** |

**次アクション:** ユーザー提供の実履歴スクショを `fixtures/` に追加 → manifest 更新 → 検証スクリプト再実行で OCR フィールド精度を確定する。
