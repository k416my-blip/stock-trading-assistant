# Release AAB Build Report — Duplicate Detection v40

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Profile:** `production` (Release / Play Store)

---

## ビルド概要

重複判定修正 v40（参照番号を含む date+amount+reference 判定）、ホーム「入金を記録する」ボタン、AI相談入金記録 hotfix 等を含む最新版の **Release AAB** を EAS production プロファイルでビルドしました。

**ビルド結果:** ✅ **FINISHED**

---

## バージョン情報

| 項目 | 値 |
|------|-----|
| **versionName** | `1.0.0` |
| **versionCode** | **40** |
| **package** | `com.assistant.stocktrading` |

---

## AAB 提出物

| 項目 | 値 |
|------|-----|
| **AAB ファイル名** | `malaysia-stock-ai-concierge-v40-production.aab` |
| **保存場所（フルパス）** | `C:\Users\k416m\Documents\Projects\stock-trading-assistant\docs\review\play-it-aab-duplicate-detection-v40\malaysia-stock-ai-concierge-v40-production.aab` |
| **ファイルサイズ** | 54,656,779 bytes（約 52.1 MB） |
| **SHA-256** | `694F8053C9047AA143DC4CC80A70282262E79F13C27AC5EF7B181C2B74E1B0C2` |

---

## EAS ビルド情報

| 項目 | 値 |
|------|-----|
| **EAS build ID** | `771e43ec-2ae5-46a0-a3dc-59cc0794fdc4` |
| **EAS build URL** | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/771e43ec-2ae5-46a0-a3dc-59cc0794fdc4 |
| **Artifact URL** | https://expo.dev/artifacts/eas/iU13KZMSmpLneAELUnYhIQYo6_pBlGvafEVBUUDKOk4.aab |
| **status** | **FINISHED** |
| **gitCommitHash (EAS)** | `8ed9a3d0e87ae1c7e2312cdffdd1bc19964fa9b5` |

---

## 含まれる主な変更（v39 → v40）

| Commit | 内容 |
|--------|------|
| `3977514` | 重複判定: date+amount+reference 完全一致のみブロック |
| `8ed9a3d` | v40 重複判定 hotfix レポート |
| `1e9be7a` | ホーム「入金を記録する」ボタン |
| `6c8fe3d` | AI相談入金記録 staging/navigation hotfix |

---

## Play Console 次ステップ

1. Internal Testing トラックに **versionCode 40** AAB をアップロード
2. テスター端末で更新インストール
3. 重複判定確認:
   - 同日・同額・**参照番号異なる** → 「同じ金額・同日の記録があります」→ **記録する** で保存可
   - 同日・同額・**参照番号一致** → 保存不可

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| **ビルド元 commit** | `8ed9a3d` — Document duplicate detection hotfix commit in v40 report. |
| **機能 commit** | `3977514` — Fix deposit duplicate detection to require matching reference number. |
| **Push** | ✅ `origin/cursor/top3-maxdd-capital-audit` へ push 済み（ビルド前） |

---

## 検証コマンド（再現用）

```powershell
Get-FileHash "C:\Users\k416m\Documents\Projects\stock-trading-assistant\docs\review\play-it-aab-duplicate-detection-v40\malaysia-stock-ai-concierge-v40-production.aab" -Algorithm SHA256
```

```text
npm run build:android:production -- --non-interactive --wait
```
