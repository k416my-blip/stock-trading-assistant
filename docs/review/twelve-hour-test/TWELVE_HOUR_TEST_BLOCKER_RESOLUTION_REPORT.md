# 12時間テスト BLOCKER 解消レポート

記録日: 2026-06-11T21:14:00+08:00  
HEAD: `9e59afa44c6e46952ebd7e19a9f5d413e153040b`  
`git add` / `commit` / `push` — **未実施**

---

## 1. BLOCKED 理由（当初）

| 項目 | 状態 |
|------|------|
| API 監査 `verdict.twelveHourTestAllowed` | **false** |
| 6銘柄ニュース | HTTP 200 だが **0件 × 6**（`no_articles`） |
| `[12H-MONITOR]` | **0行**（監視 env 未反映 + audit Metro） |
| Metro | **audit mode**（`EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT=1`） |

---

## 2. ニュース 0件 × 6 の原因調査

### 2.1 監査ログ・実機ログの確認

参照:

- `docs/review/DEVICE_LIVE_API_AUDIT_REPORT.md`
- `docs/review/twelve-hour-test/api-connectivity.log`（生成 JSON 全文）
- adb logcat `Phase11 MaterialAnalysisService` / `[DEVICE-LIVE-AUDIT]`

### 2.2 実際の検索条件（コード）

`src/services/deviceLiveApiAudit.ts` / `bursaMaterialSources.ts` 共通:

```
GET https://newsapi.org/v2/everything
  ?q={label} {code} Malaysia
  &language=en
  &sortBy=publishedAt
  &pageSize=8   (監査) / 6 (材料分析)
```

**from / to 日付範囲:** なし  
**sortBy:** `publishedAt`  
**language:** `en` のみ

### 2.3 対象 6 銘柄（監査スクリプト）

| code | label（監査クエリ） |
|------|---------------------|
| 1155 | Maybank |
| 1023 | CIMB |
| 1295 | Public Bank |
| 5347 | Tenaga |
| 4707 | Nestle |
| 6033 | Petronas Gas |

例: `q=Maybank 1155 Malaysia`（URL エンコード済み）

### 2.4 観測結果

| テスト | HTTP | 件数 | 備考 |
|--------|------|------|------|
| 接続テスト `q=Maybank` | 200 | **5** | `newsApiEverythingTest.ts` — **API キー有効** |
| 6銘柄 `label+code+Malaysia` | 200 | **0** × 6 | `errorReason: no_articles` |
| アプリ材料分析（実機） | 200 | **0** | 会社名 `MALAYAN BANKING BERHAD` 等でも同様 |

**response body:** HTTP 200・`status: ok`（エラーではない）・`articles: []`（`totalResults: 0` 相当）  
**rate limit:** なし（429 ではない）  
**読み取りロジック:** `articles.length` で判定 — **バグではない**

### 2.5 原因分類

| 候補 | 該当 | 根拠 |
|------|------|------|
| 銘柄コード付きクエリがヒットしない | **主因** | `Maybank` 単体は 5 件、`Maybank 1155 Malaysia` は 0 件 |
| マレーシア社名・Bursa 変換不足 | **副因** | 実機は `MALAYAN BANKING BERHAD 1155 Malaysia` でも 0 件 |
| `language=en` が厳しい | **有力** | マレーシア本地報道が英語インデックス外の可能性 |
| 日付範囲が狭い | 否 | `from`/`to` 未指定 |
| プラン制限で 200+空 | 一部 | Developer プランは `/everything` のソース範囲に制限あり（接続テストは通る） |
| API 200 だが条件が非実用的 | **はい** | 接続は正常、銘柄別クエリ設計の問題 |
| response 読み取りバグ | 否 | 実装は正しく空配列を検出 |

**結論:** ニュース 0 件は **API 障害ではなく検索クエリ設計**（コード数字 + `language=en` + 短い英語ラベル）による **実用上のヒット不足**。材料分析は `partial` 扱いが妥当。

---

## 3. 修正方針（本段階 — 提案のみ、コード未変更）

### 採用提案: **B. 12時間安定性テスト用の許可条件見直し**

**A. クエリ改善**（将来・別コミット候補）:

- `Maybank` / `MALAYAN BANKING` / `Bursa Malaysia` を OR 結合
- 銘柄コード単体をクエリから外す
- `language=en` を緩和または削除して検証

**B. 許可条件見直し**（推奨・最小）:

現状 `scripts/device-live-api-audit.mjs` には **判定の不整合** がある:

| 変数 | 式 |
|------|-----|
| `operationalPass` | `x.ok && (news.ok \|\| newsTempRateLimit)` → **true**（今回） |
| `process.exit` 用 `twelveHourTestAllowed` | `devicePass \|\| operationalPass \|\| nodePass` → **true**（exit 0） |
| `verdict.twelveHourTestAllowed`（JSON） | `devicePass \|\| nodePass` のみ → **false** |

**提案する明文化（WARN_ALLOW）:**

```
IF operationalPass === true AND devicePass === false:
  twelveHourTestAllowed = true   # 安定性テスト可
  verdictLabel = "WARN_ALLOW — 銘柄ニュース0件 · 材料分析partial · API接続OK"
  materialAnalysisStatus = "partial"
```

12時間テストの目的（価格更新・BG 生存・Metro 接続）と、材料ニュース完全取得は **別要件** と切り離す。

**本レポート時点:** 上記は **提案のみ**。`device-live-api-audit.mjs` は **未修正**。

---

## 4. [12H-MONITOR] 有効化

### 実施内容

1. `npm run kill:metro` — audit Metro 停止
2. 通常 Metro 起動:

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_HOURS="12"
npm run start:clear
```

3. `adb reverse tcp:8081 tcp:8081`
4. アプリ再起動: `com.assistant.stocktrading`

### 確認結果

| 項目 | 結果 |
|------|------|
| env が Metro バンドルに載るか | **はい** — 再起動 + アプリ reload で反映 |
| 開発ビルド再起動 | **JS リロードで可**（フル `expo run:android` は再ビルド時のみ必須） |
| Expo Go | `EXPO_PUBLIC_*` はバンドル時注入 — Go でも Metro 起動時 env が必要 |
| `app-runtime.log` | **`[12H-MONITOR]` 4行以上**（`test_started`, `heartbeat` 確認） |

logcat 抜粋:

```
[12H-MONITOR] test_started { targetHours: 12, allowBackground: true, ... }
[12H-MONITOR] heartbeat { elapsedMin: 0, ... }
```

保存: `docs/review/twelve-hour-test/app-runtime.log`

---

## 5. Metro 通常モード確認

| 項目 | 結果 |
|------|------|
| `kill:metro` 実施 | **PASS** |
| `EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT` | **未設定**（削除済み） |
| ポート 8081 | **LISTENING** |
| `metro.log` | `expo start -c` — 通常モード |

---

## 6. 再 preflight 結果

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
npm run verify:twelve-hour-preflight
```

| # | 項目 | 結果 |
|---|------|------|
| 1–7 | 監視ロジック・unit test | **PASS** |
| 8 | 実機接続 | **PASS**（PID 15969） |
| 9 | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` | **PASS** |

**総合: PASS**（FAIL 0）

出力: `docs/review/TWELVE_HOUR_TEST_PREFLIGHT_REPORT.md`（更新）

### API 監査（再実行は省略 — Metro 通常モード維持のため）

前回結果を再掲:

| 項目 | 値 |
|------|-----|
| NewsAPI 接続 | HTTP 200 / 5件 — OK |
| X API | HTTP 200 / 10件 — OK |
| 6銘柄ニュース | 0件 × 6 |
| `operationalPass` | **true** |
| `devicePass` | **false** |
| `verdict.twelveHourTestAllowed`（JSON・現行） | **false** |
| exit 判定（`operationalPass` 込み） | **true**（exit 0） |

**推奨 `twelveHourTestAllowed`（B 適用後）:** **true（WARN_ALLOW）**

---

## 7. 12時間テスト開始可否

| 観点 | 判定 |
|------|------|
| typecheck / unit test | **PASS** |
| adb / 充電 93% | **PASS** |
| Metro 通常 + 監視 env | **PASS** |
| `[12H-MONITOR]` 出力 | **PASS** |
| 銘柄ニュース 6/6 | **FAIL**（材料 partial） |
| 現行 JSON `twelveHourTestAllowed` | **false** |
| **B 提案適用後の実務判断** | **WARN_ALLOW — 開始可（材料は partial）** |

**本セッション:** `verify:phase12-5` は **未開始**（ユーザー指示どおり）。

**開始してよいか:**

- **厳格 JSON 基準:** まだ **不可**（`verdict` 修正または明示承認が必要）
- **安定性テスト目的 + operationalPass 基準:** **可（WARN）** — ユーザー承認後に `verify:phase12-5` 実行

---

## 8. 残リスク

| リスク | 内容 |
|--------|------|
| 銘柄ニュース 0 件 | 12h 中も材料分析は partial のまま |
| `verdict` 不整合 | JSON と exit 判定が食い違う — 修正推奨 |
| Metro 再起動 | API 監査を再実行すると audit mode に戻る |
| PC スリープ | 12h 中は電源設定要確認 |
| logcat バックグラウンド | `adb-logcat-live.log` 継続確認 |

---

## 9. 次のアクション（ユーザー）

1. **B 提案を承認**するか、`device-live-api-audit.mjs` の `verdict.twelveHourTestAllowed` 修正を依頼
2. 12h 本番開始:

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_HOURS="12"
npm run verify:phase12-5
```

3. （任意・別タスク）ニュースクエリ改善 **A** を実装

---

## 10. ログ保存先

```
docs/review/twelve-hour-test/
  TWELVE_HOUR_TEST_BLOCKER_RESOLUTION_REPORT.md  ← 本ファイル
  test-start-info.md
  api-connectivity.log
  metro.log
  app-runtime.log
  adb-logcat-live.log
```
