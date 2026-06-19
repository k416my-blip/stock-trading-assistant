# PHASE23_1_UI_VISIBILITY_REPORT

## 概要

1155（Maybank）実機 — **Phase23.1 Earnings Revision Cross Signal** 見出しの UI 到達検証。

| 項目 | 値 |
|------|-----|
| 実行日時 | 2026-06-19T06:01:39Z 〜 06:16:57Z |
| デバイス | Xiaomi 23090RA98G (`FYRWXSNNAIOR9DCM`) |
| インストール APK | `preview-v15.apk`（versionCode **15**） |
| スクリプト | `scripts/bursa-phase11-ui-visibility-verify.mjs` |

---

## 判定

**UI VALIDATION INCOMPLETE** — E2E UI Map 19/19 PASS。実機 APK に Phase23.1 セクション未同梱。

| 層 | 結果 |
|----|------|
| Phase11 E2E Phase23.1 UI Map | **PASS** |
| scrollUntil 見出し必須 | **実装済** — `"Phase23.1 Earnings Revision Cross Signal"` |
| 実機見出し検出 | **FAIL** — 45 scroll 後も 0 件 |
| 部分マーカー | 1/5（`Direction:` のみ — 他 Phase 由来の可能性） |

---

## scrollUntil 改善（実施済）

Phase24 到達試行の後、同一セッションで Phase23.1 見出しを必須条件に追加スクロール（最大 45）。

```javascript
const PHASE231_HEADING = 'Phase23.1 Earnings Revision Cross Signal';
await scrollUntilHeading(PHASE231_HEADING, 'phase23_1-1155', 45);
```

---

## 実機観測

| 項目 | 結果 |
|------|------|
| Phase23 Earnings Revision Intelligence | scroll 5 付近で **表示**（`データ未取得` 含む） |
| Phase23.1 Cross Signal 見出し | **全 XML dump で 0 件** |
| Phase22.2 Conviction | scroll 5 で表示 |

Phase23 本体は APK に存在するが、**Phase23.1 サブセクションは `69cf90f` 以降の UI 追加** — v15 には未包含。

---

## スクリーンショット

| ファイル | 内容 |
|----------|------|
| `phase23_1-1155.png` | Phase23.1 見出し未到達 — Phase11.5 監査ビュー |

---

## APK 再ビルド

Phase24 レポートと同一 — EAS quota blocked · v15 は `69cf90f` 以前の build。

---

## 再検証

```bash
node scripts/bursa-phase11-ui-visibility-verify.mjs
# 期待: phase23_1-1155.png に Cross Signal / Alignment / Material Impact
```

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | **（本提出コミット）** |
| Push | **（push 結果参照）** |
