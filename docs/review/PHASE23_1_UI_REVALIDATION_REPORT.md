# PHASE23_1_UI_REVALIDATION_REPORT

## 概要

versionCode **16** 実機 APK にて Phase23.1 Earnings Revision Cross Signal の UI 再検証を実施。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| デバイス | `FYRWXSNNAIOR9DCM` |
| APK | versionCode **16** |
| Git commit（APK ビルド時） | `9dda7c797fbc519a9128448b690de5a63e21ada9` |

---

## 結果サマリー

| 項目 | 結果 |
|------|------|
| 材料分析ロード | **PASS** |
| Phase23.1 見出し | **PASS** |
| Phase23.1 マーカー | **5/5** |
| 1155 Maybank | **PASS** |
| 6銘柄 UI 表示 | **1/6** |
| クラッシュ / FATAL / ANR | **なし** |

**総合判定（Phase23.1）:** **PASS**（1155 · 材料分析画面）

---

## 検出内容

| マーカー | 検出 |
|----------|------|
| `Phase23.1 Earnings Revision Cross Signal` | ✅ |
| `Cross Signal:` | ✅ |
| `Direction:` | ✅ |
| `Alignment:` | ✅ |
| `Material Impact:` | ✅ |

スクロール: **0**（同一画面 XML で全マーカー検出）

---

## 1155 Maybank

| 項目 | 値 |
|------|-----|
| Phase23.1 見出し | ✅ |
| マーカー | 5/5 |
| スクリーンショット | `docs/review/v16-ui-revalidation/v16-04-phase231.png` |
| | `docs/review/v16-ui-revalidation/v16-05-maybank-1155.png` |

---

## v15 → v16 比較

| 実行 | versionCode | Phase23.1 見出し |
|------|-------------|------------------|
| PHASE23_1_UI_VISIBILITY_REPORT | 15 | **0**（APK に UI 未同梱） |
| 本再検証 | 16 | **5/5 マーカー検出** |

---

## 証跡

- JSON: `docs/review/v16-ui-revalidation/revalidation-results-focused.json`
- UI dump: `docs/review/v16-ui-revalidation/v16-phase231-0.xml`
