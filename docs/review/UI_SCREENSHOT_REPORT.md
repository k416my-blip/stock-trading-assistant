# UI_SCREENSHOT_REPORT

## 概要

Phase24 / Phase23.1 UI 露出後のスクリーンショット証跡レポート。

- 日付: 2026-06-19
- 対象画面: Material Analysis（材料分析タブ）

---

## 1. スクリーンショット取得状況

| 項目 | 結果 |
|------|------|
| ADB デバイス | **未接続**（`adb devices` 空） |
| 実機スクリーンショット | **未取得** |
| パイプライン UI 検証 | **6/6 PASS**（MaterialStockRow マッピング） |

実機スクリーンショットはデバイス接続後に以下で取得可能:

```bash
node scripts/bursa-phase24-23_1-ui-device-verify.mjs
```

出力先: `docs/review/phase24-23_1-ui-device/*.png`

---

## 2. 期待される UI 構成（Material AnalysisScreen）

### Phase24 セクション（Phase14 直後）

```
Phase24 Analyst Consensus Intelligence
  Source: Yahoo Finance
  Consensus: Buy（買い） · Analysts: N
  Target: MYR X.XX · Current: MYR X.XX · Upside: +X%
  Score: +N · Confidence: High
  Rating Revision: ... · Target Revision: ...
```

### Phase23.1 セクション（Phase23 と Conviction の間）

```
Phase23.1 Earnings Revision Cross Signal
  Cross Signal: Bullish（強気クロスシグナル）
  Direction: ... · Score: +5
  Alignment: 2 — Revision: 中立 · Insider: 強気 · Institutional: 強気
  Confidence: Medium · Material Impact: +3
```

---

## 3. Concierge ブロック

- **9-A. Analyst Consensus Intelligence (Phase24)** — Source / Consensus / Target / Score / Confidence
- **Phase23.1 Cross Signal評価** — Cross Signal / Direction / Alignment / Material Impact

---

## 4. パイプライン検証結果（UI データ相当）

6銘柄すべてで Phase24 + Phase23.1 の MaterialStockRow フィールドが正しく埋まることを確認。

詳細: `docs/review/phase24-23_1-ui-verify/results.json`

---

## 5. 再取得手順

1. Android デバイスを USB 接続し `adb devices` で確認
2. Preview APK をインストール済みであること
3. Metro / bundler が起動していること
4. `node scripts/bursa-phase24-23_1-ui-device-verify.mjs` を実行
5. `docs/review/phase24-23_1-ui-device/` の PNG を本レポートに添付

---

## 6. GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | （sync 後更新） |
