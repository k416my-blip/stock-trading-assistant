# Phase12.5 証拠提出 — 現状スナップショット

**取得日時 (UTC):** 2026-06-10T02:52:21Z  
**総合:** 12時間本番テストは**未完了・12hループ未突入**。PASS判定不可。

---

## 1. PHASE12_5_SMOKE クリア後の本番開始ログ

`docs/review/phase12-5-long-run/runner.log` より（再実行分）:

```
[p12.5] Started — 12h run, ends ~2026-06-10T14:44:19.256Z
[p12.5] AI analysis hour-0
[p12.5] verify stock 1155 Maybank
[p12.5] verify stock 1023 CIMB
[p12.5] verify stock 1295 Public Bank
[p12.5] verify stock 5347 Tenaga
[p12.5] verify stock 4707 Nestle
[p12.5] verify stock 6033 Petronas Gas
```

`telemetry.jsonl` 開始行 (`hours:12`):

```json
{"type":"start","baseline":{"kb":797764,"at":"2026-06-10T02:44:17.120Z"},"hours":12}
```

Node runner PID: **33608** (`scripts/phase12-5-long-run.mjs`)

---

## 2. runner.log 最新20行

（再実行分のみ8行 — Tee-Object上書きのため旧ログなし）

```
[p12.5] Started — 12h run, ends ~2026-06-10T14:44:19.256Z
[p12.5] AI analysis hour-0
[p12.5] verify stock 1155 Maybank
[p12.5] verify stock 1023 CIMB
[p12.5] verify stock 1295 Public Bank
[p12.5] verify stock 5347 Tenaga
[p12.5] verify stock 4707 Nestle
[p12.5] verify stock 6033 Petronas Gas
```

---

## 3. checkpoint.json の内容

**注意:** 以下は **0.12h 短縮実行 (02:06終了)** の古いチェックポイント。  
**12h本番 (02:44開始) の checkpoint は未更新。**

`endedAt: 2026-06-10T02:05:58.601Z` — 本番12hとは別セッション。

---

## 4. 現在の経過時間

| 項目 | 値 |
|------|-----|
| 本番開始 (UTC) | 2026-06-10T02:44:17Z |
| 取得時刻 (UTC) | 2026-06-10T02:52:21Z |
| **経過** | **約 8分**（12時間ではない） |

---

## 5. 現在のメモリ使用量

`adb shell dumpsys meminfo com.assistant.stocktrading` (取得時):

```
TOTAL PSS: 793966 KB
```

本番開始時 baseline (telemetry): **797764 KB**

---

## 6. クラッシュ件数（現時点）

logcat スキャン: **FATAL EXCEPTION = 0**

---

## 7. ANR件数（現時点）

logcat スキャン: **ANR in = 0**

---

## 8. 現在のPID

| 対象 | PID |
|------|-----|
| アプリ `com.assistant.stocktrading` | **29439** |
| Node runner `phase12-5-long-run.mjs` | **33608** |

---

## 9. adb devices

```
List of devices attached
FYRWXSNNAIOR9DCM	device
```

---

## 10. 12時間ループ突入の証拠

**なし（12hループ未突入）**

根拠:
- `telemetry.jsonl` に `hours:12` 開始後の `hourly` / `price_refresh` エントリなし
- `checkpoint.json` 未更新（hour-0 銘柄検証中）
- 12hループは `runAiAnalysis(0)` + `runPriceRefresh(0,0)` 完了後に `while` 突入 — 現状 hour-0 検証中
- 経過約8分（720分必要）

---

## 過去の失敗実行（参考）

| 実行 | 時刻 | 結果 |
|------|------|------|
| SMOKE=1 誤残留 | 02:37–02:43 | 約5分で exit 1、12h未開始 |
| 0.12h / 0.05h 短縮 | 01:52–02:06 | 短縮テストのみ |

**結論: 証拠に基づき PASS 判定は行わない。12h本番は開始済みだがループ未突入・未完了。**
