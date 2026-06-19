# PHASE24_UI_REVALIDATION_REPORT

## 概要

versionCode **16** ローカル release APK インストール後の Phase24 UI 再検証。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| 対象銘柄 | 1155（Maybank） |
| 期待 UI | `Phase24 Analyst Consensus Intelligence` 見出し + Source / Consensus / Target / Score / Confidence |
| APK | `artifacts/preview-v16-local.apk`（versionCode 16） |

---

## 前提条件

| 条件 | 状態 |
|------|------|
| APK ビルド | **PASS**（Phase24 UI commit 以降の JS bundle 同梱） |
| 実機インストール | **BLOCKED** — `INSTALL_FAILED_USER_RESTRICTED` |

旧 preview-v15（EAS / versionCode 15）は Phase24 UI 未同梱のため、**v16 未インストールでは再検証不可**。

---

## 再検証結果

| 項目 | 結果 |
|------|------|
| 実行 | **未実施**（インストールブロック） |
| Phase24 見出し検出 | **PENDING** |
| スクリーンショット | **PENDING** |

---

## 再実行手順（インストール承認後）

```powershell
adb install "artifacts/preview-v16-local.apk"
adb shell dumpsys package com.assistant.stocktrading | findstr versionCode
# 期待: versionCode=16

node scripts/bursa-phase11-ui-visibility-verify.mjs
```

証跡出力先: `docs/review/phase11-ui-visibility/`

---

## 期待される改善（v15 → v16）

| v15（旧 APK） | v16（新 APK） |
|---------------|---------------|
| Phase24 見出し 0/45 scroll | commit `69cf90f+` UI 同梱で見出し検出見込み |
| EAS ビルド（Phase24 前 commit） | ローカル release bundle（最新 JS） |

---

## 結論

| 項目 | 状態 |
|------|------|
| Phase24 UI 再検証 | **PENDING INSTALL** |
| ブロッカー | HyperOS USB インストール制限 — 端末で許可後に再実行 |
