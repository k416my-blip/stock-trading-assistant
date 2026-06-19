# PHASE23_1_UI_REVALIDATION_REPORT

## 概要

versionCode **16** ローカル release APK インストール後の Phase23.1 UI 再検証。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| 対象銘柄 | 1155（Maybank） |
| 期待 UI | `Phase23.1 Earnings Revision Cross Signal` 見出し + Cross Signal / Direction / Alignment / Material Impact |
| APK | `artifacts/preview-v16-local.apk`（versionCode 16） |

---

## 前提条件

| 条件 | 状態 |
|------|------|
| APK ビルド | **PASS** |
| 実機インストール | **BLOCKED** — `INSTALL_FAILED_USER_RESTRICTED` |

---

## 再検証結果

| 項目 | 結果 |
|------|------|
| 実行 | **未実施**（インストールブロック） |
| Phase23.1 見出し検出 | **PENDING** |
| スクリーンショット | **PENDING** |

---

## 再実行手順（インストール承認後）

```powershell
adb install "artifacts/preview-v16-local.apk"
node scripts/bursa-phase11-ui-visibility-verify.mjs
```

スクリプト定数:

- `PHASE231_HEADING = 'Phase23.1 Earnings Revision Cross Signal'`
- マーカー: Cross Signal / Direction / Alignment / Material Impact

証跡: `docs/review/phase11-ui-visibility/`

---

## 前回（v15）との比較

| 実行 | versionCode | Phase23.1 見出し |
|------|-------------|------------------|
| PHASE23_1_UI_VISIBILITY_REPORT | 15 | **0**（45 scroll 後も未検出 — APK に UI 未同梱） |
| 本再検証 | 16 | **PENDING**（インストール後に実行） |

---

## 結論

| 項目 | 状態 |
|------|------|
| Phase23.1 UI 再検証 | **PENDING INSTALL** |
| ブロッカー | HyperOS USB インストール制限 |
