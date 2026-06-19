# CONCIERGE_UI_REVALIDATION_REPORT

## 概要

versionCode **16** 実機 APK にて Concierge FAB および Enhanced Analysis の UI 再検証を実施。

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
| Concierge FAB（content-desc） | **PASS** |
| パネルオープン | **PASS** |
| Enhanced Analysis（`AI分析結果`） | **FAIL** |
| Phase24 in Concierge | **FAIL** |
| Phase23.1 in Concierge | **FAIL** |
| クラッシュ / FATAL / ANR | **なし** |

**総合判定（Concierge）:** **PARTIAL PASS**（FAB のみ）

---

## FAB 検証

| 項目 | 値 |
|------|-----|
| 検出方法 | `content-desc` = **`AIコンシェルジュを開く`** |
| 座標タップ | 未使用（content-desc / text / resource-id のみ） |
| パネル表示 | `AIコンシェルジュ` 見出しを確認 |
| スクリーンショット | `v16-06-concierge-open.png` |

---

## Enhanced Analysis 検証

| 項目 | 結果 |
|------|------|
| クイック質問 / 1155 送信 | 実行 |
| `AI分析結果` 見出し | **未検出**（25 scroll 後も） |
| `Analyst Consensus Intelligence (Phase24)` | **未検出** |
| `Phase23.1 Cross Signal` | **未検出** |
| Concierge マーカー | **0/5** |
| スクリーンショット | `v16-07-concierge-enhanced.png` |

### 想定原因

- 自動テスト時点で **Enhanced Analysis ブロックまで到達せず**（チャット応答未生成 or 別セクションに留まる）
- 過去実行では **AI Input Gate 閉鎖** / **openai 未設定** が UI に表示された事例あり（本 run では該当フラグ false だが `AI分析結果` 未到達）

### 推奨手動確認

1. 設定 → **OpenAI API キー** 保存
2. Concierge → 「**1155 を分析**」または同等プロンプト送信
3. スクロールして **`AI分析結果`** セクション表示を確認

---

## 安定性

| 項目 | 値 |
|------|-----|
| FATAL（前） | 0 |
| FATAL（後） | 0 |
| ANR | なし |

---

## 証跡

- JSON: `docs/review/v16-ui-revalidation/revalidation-results-focused.json`
- UI dump: `docs/review/v16-ui-revalidation/fab-open.xml`, `v16-concierge-enh-*.xml`
