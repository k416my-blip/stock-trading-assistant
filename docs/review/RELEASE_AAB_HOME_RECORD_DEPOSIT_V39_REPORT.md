# Release AAB Build Report — Home Record Deposit (v39)

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Profile:** `production` (Release / Play Store)

---

## ビルド概要

ホーム画面「入金を記録する」ボタン、AI相談入金記録 hotfix、Home AI advice loading hotfix を含む最新版の **Release AAB** を EAS production プロファイルでビルドしました。

---

## バージョン情報

| 項目 | 値 |
|------|-----|
| **versionName** | `1.0.0` |
| **versionCode** | **39** |
| **package** | `com.assistant.stocktrading` |

---

## AAB 提出物

| 項目 | 値 |
|------|-----|
| **AAB ファイル名** | `malaysia-stock-ai-concierge-v39-production.aab` |
| **保存場所（フルパス）** | `C:\Users\k416m\Documents\Projects\stock-trading-assistant\docs\review\play-it-aab-home-record-deposit-v39\malaysia-stock-ai-concierge-v39-production.aab` |
| **ファイルサイズ** | 54,655,835 bytes（約 52.1 MB） |
| **SHA-256** | `CBCAAA5DA2449264F556C17D7C3D2EC4301C3BC93E271B6BB8FBCE8004B66532` |

---

## EAS ビルド情報

| 項目 | 値 |
|------|-----|
| **EAS build ID** | `b25f6680-b142-4a77-b1b9-96124d78c03f` |
| **EAS build URL** | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/b25f6680-b142-4a77-b1b9-96124d78c03f |
| **Artifact URL** | https://expo.dev/artifacts/eas/ImnVyyLZ55ehW1p_zVXPw1G0LeEjApLVN5zlMZ4di9M.aab |
| **gitCommitHash (EAS)** | `3411d2225669b1a60e5a7e8c9b5adfaad478f797` |
| **ビルド結果** | ✅ FINISHED |

---

## 含まれる主な変更（v38 → v39）

| Commit | 内容 |
|--------|------|
| `b5054a8` | Home「入金を記録する」ボタン + レポート |
| `1e9be7a` | Home → Rakuten取引記録（入金タブ初期選択） |
| `6c8fe3d` | AI相談入金記録 staging/navigation hotfix |
| `45dfcf4` | Home AI advice loading hotfix |
| `3411d22` | versionCode 39 bump |

---

## Play Console 次ステップ

1. Internal Testing（または Production）トラックを開く
2. **versionCode 39** の AAB をアップロード
3. リリースノート例: ホームから入金記録、AI相談入金フロー修正
4. テスター端末で確認:
   - ホーム → **入金を記録する** → Rakuten取引記録（入金タブ）
   - AI相談 → `RM5000入金しました` → 記録 → 保存

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| **Commit (version bump)** | `3411d22` — Bump Android versionCode to 39 for home record-deposit release. |
| **Commit (report)** | `acf95ac` — Add Release AAB v39 build report for home record-deposit release. |
| **Push** | ✅ `origin/cursor/top3-maxdd-capital-audit` へ push 済み (`b5054a8..acf95ac`) |

---

## 検証コマンド（再現用）

```powershell
Get-FileHash "C:\Users\k416m\Documents\Projects\stock-trading-assistant\docs\review\play-it-aab-home-record-deposit-v39\malaysia-stock-ai-concierge-v39-production.aab" -Algorithm SHA256
```

```text
npm run build:android:production -- --non-interactive --wait
```
