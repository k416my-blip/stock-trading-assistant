# UI_SCREENSHOT_REPORT_V16

## 概要

versionCode **16** 実機 UI 再検証で取得したスクリーンショット一覧。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| デバイス | `FYRWXSNNAIOR9DCM` |
| APK | versionCode **16** · `artifacts/preview-v16-local.apk` |
| 証跡ディレクトリ | `docs/review/v16-ui-revalidation/` |
| Git commit（APK ビルド時） | `9dda7c797fbc519a9128448b690de5a63e21ada9` |

---

## スクリーンショット一覧

| ファイル | 内容 | 関連機能 |
|----------|------|----------|
| `v16-01-material-tab.png` | 材料分析タブ表示直後 | Material Analysis |
| `v16-02-material-loaded.png` | 【銘柄別材料分析】ロード完了 | Material Analysis |
| `v16-03-phase24.png` | Phase24 見出し・フィールド表示域 | **Phase24** |
| `v16-04-phase231.png` | Phase23.1 見出し・フィールド表示域 | **Phase23.1** |
| `v16-05-maybank-1155.png` | 1155 Maybank カード + Phase セクション | 1155 |
| `v16-06-concierge-open.png` | Concierge パネル（FAB content-desc 起動） | **Concierge** |
| `v16-07-concierge-enhanced.png` | Enhanced Analysis 探索後 | Concierge Enhanced |

---

## 検証結果（スクリーンショット対応）

| 確認項目 | 結果 | 根拠 SS |
|----------|------|---------|
| 材料分析ロード | PASS | `v16-02-material-loaded.png` |
| Phase24 見出し | PASS | `v16-03-phase24.png` |
| Phase23.1 見出し | PASS | `v16-04-phase231.png` |
| 1155 表示 | PASS | `v16-05-maybank-1155.png` |
| Concierge FAB | PASS | `v16-06-concierge-open.png` |
| Enhanced Analysis | FAIL | `v16-07-concierge-enhanced.png` |
| クラッシュ | なし | logcat 0 FATAL |

---

## UI dump（XML）

| ファイル | 用途 |
|----------|------|
| `v16-phase24-0.xml` | Phase24 マーカー 6/6 |
| `v16-phase231-0.xml` | Phase23.1 マーカー 5/5 |
| `fab-open.xml` | Concierge パネル |
| `revalidation-results-focused.json` | 機械可読サマリー |

---

## 再実行コマンド

```powershell
adb devices
adb shell dumpsys package com.assistant.stocktrading | findstr versionCode
node scripts/bursa-v16-ui-revalidation-focused.mjs
```

---

## Git

レポート提出コミット hash は本ファイル commit 後に `docs/review/UI_SCREENSHOT_REPORT_V16.md` 末尾または `git log -1` で確認。
