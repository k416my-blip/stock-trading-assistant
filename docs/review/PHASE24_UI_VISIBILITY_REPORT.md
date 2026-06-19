# PHASE24_UI_VISIBILITY_REPORT

## 概要

1155（Maybank）実機 — **Phase24 Analyst Consensus Intelligence** 見出しの UI 到達検証。

| 項目 | 値 |
|------|-----|
| 実行日時 | 2026-06-19T06:01:39Z 〜 06:16:57Z |
| デバイス | Xiaomi 23090RA98G (`FYRWXSNNAIOR9DCM`) |
| インストール APK | `preview-v15.apk`（versionCode **15**） |
| スクリプト | `scripts/bursa-phase11-ui-visibility-verify.mjs` |
| 証跡 | `docs/review/phase11-ui-visibility/` |

---

## 判定

**UI VALIDATION INCOMPLETE** — バックエンド/E2E は PASS。実機 APK が Phase24 UI コードを含まないため、見出し到達不可。

| 層 | 結果 |
|----|------|
| Phase11 E2E UI Map | **PASS** — 19/19（HEAD `6c00efc`） |
| scrollUntil 見出し必須 | **実装済** — `"Phase24 Analyst Consensus Intelligence"` |
| 実機見出し検出 | **FAIL** — 45 scroll 後も 0 件 |
| スクリーンショット | **取得** — `phase24-1155.png`（Phase11.5 監査到達点） |

---

## Preview APK 再ビルド

| 試行 | 結果 |
|------|------|
| EAS `preview` build | **BLOCKED** — Free plan Android builds 今月 exhausted（2026-07-01 リセット） |
| ローカル `gradlew assembleRelease` | **FAIL** — `settings.gradle` 評価エラー（Windows） |
| 代替 | `artifacts/preview-v15.apk` 再インストール — **Success** |

### 根本原因（APK 鮮度）

| 項目 | 値 |
|------|-----|
| インストール v15 build commit | `c3916f8` |
| Phase24 UI 追加 commit | `69cf90f` |
| 関係 | **`69cf90f` は `c3916f8` の祖先ではない** — v15 バンドルに Phase24 セクション未同梱 |

`git show c3916f8:src/screens/MaterialAnalysisScreen.tsx` に `Phase24` 文字列 **0 件** を確認。

---

## scrollUntil 改善（実施済）

```javascript
const PHASE24_HEADING = 'Phase24 Analyst Consensus Intelligence';
await scrollUntilHeading(PHASE24_HEADING, 'phase24-1155', 45);
```

- 座標タップ禁止 — UI ノード探索のみ
- 画面スリープ対策 — `wakeDevice()` + `dismiss-keyguard`

---

## 実機スクロール証跡（1155）

| Scroll | 視認 Phase ラベル（uiautomator） |
|--------|----------------------------------|
| 0 | 1155 カード上部 |
| 7 | Phase13, **Phase14 Analyst Consensus** |
| 8 | Phase15, Phase16 |
| 15 | Phase17〜19.5 |
| 24+ | Phase11.5 API 監査 |

**Phase14 直後に Phase24 見出しが存在しない** — 現行 APK では Phase14 → Phase15 に直接遷移する旧 UI。

---

## スクリーンショット

| ファイル | 内容 |
|----------|------|
| `phase24-1155.png` | 45 scroll 後 — Phase11.5 監査（見出し未到達） |

---

## 再検証条件

1. EAS quota 復帰後、`69cf90f` 以降 HEAD で preview build（versionCode **16** 想定）
2. `adb install -r artifacts/preview-v16.apk`
3. `node scripts/bursa-phase11-ui-visibility-verify.mjs`

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | **（本提出コミット）** |
| Push | **（push 結果参照）** |
