# PHASE24_UI_REVALIDATION_REPORT

## 概要

versionCode **16** 実機 APK にて Phase24 Analyst Consensus Intelligence の UI 再検証を実施。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| デバイス | `FYRWXSNNAIOR9DCM`（23090RA98G / Xiaomi） |
| APK | `artifacts/preview-v16-local.apk`（versionCode **16**） |
| 検証スクリプト | `scripts/bursa-v16-ui-revalidation-focused.mjs` |
| Git commit（APK ビルド時） | `9dda7c797fbc519a9128448b690de5a63e21ada9` |

---

## 結果サマリー

| 項目 | 結果 |
|------|------|
| 材料分析ロード | **PASS** |
| Phase24 見出し | **PASS** |
| Phase24 マーカー | **6/6** |
| 1155 Maybank | **PASS** |
| 6銘柄 UI 表示 | **1/6**（1155 のみ · ポートフォリオ制約） |
| クラッシュ / FATAL / ANR | **なし** |

**総合判定（Phase24）:** **PASS**（1155 · 材料分析画面）

---

## 検出内容

| マーカー | 検出 |
|----------|------|
| `Phase24 Analyst Consensus Intelligence` | ✅ |
| `Source:` | ✅ |
| `Consensus:` | ✅ |
| `Target:` | ✅ |
| `Score:` | ✅ |
| `Confidence:` | ✅ |

スクロール: **0**（ロード直後の XML に見出し・フィールドすべて検出）

---

## 1155 Maybank

| 項目 | 値 |
|------|-----|
| 材料分析 UI に表示 | ✅ |
| Phase24 見出し | ✅ |
| マーカー | 6/6 |
| スクリーンショット | `docs/review/v16-ui-revalidation/v16-03-phase24.png` |
| | `docs/review/v16-ui-revalidation/v16-05-maybank-1155.png` |

---

## 6銘柄スキャン

| code | label | 材料分析 UI |
|------|-------|-------------|
| 1155 | Maybank | ✅ Phase24 PASS |
| 1023 | CIMB | ❌ 未表示（ポートフォリオ未登録） |
| 1295 | Public Bank | ❌ 未表示 |
| 5347 | Tenaga | ❌ 未表示 |
| 4707 | Nestle | ❌ 未表示 |
| 6033 | Petronas Gas | ❌ 未表示 |

---

## 証跡

- JSON: `docs/review/v16-ui-revalidation/revalidation-results-focused.json`
- UI dump: `docs/review/v16-ui-revalidation/v16-phase24-0.xml`

---

## 備考

- 初回実行（4分待機）は材料分析タイムアウト。7分待機 + タブ再選択でロード成功。
- Phase24 UI は v16 release bundle に同梱済みであることを実機で確認。
