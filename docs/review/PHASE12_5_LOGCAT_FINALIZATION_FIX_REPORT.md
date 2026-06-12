# Phase12.5 Logcat Finalization Fix Report

**作成:** 2026-06-12  
**対象ラン:** 2026-06-11T21:20+08 開始 → 23:24+08 中断（約 2h04m / 12h）  
**git add / commit / push:** 未実施

---

## 1. 失敗原因（確定）

| 項目 | 内容 |
|------|------|
| 停止箇所 | `scripts/phase12-5-long-run.mjs` → `scanLogcatDelta()` L340（旧） |
| API | **`fs.writeFileSync`**（`fs.copyFile` / `rename` / `appendFile` ではない） |
| 対象パス | `docs/review/phase12-5-long-run/logcat-final.txt`（**固定名・10分毎上書き**） |
| エラー | `Error: UNKNOWN: unknown error, open '...\logcat-final.txt'` **`errno: -4094`** |
| 発生タイミング | hour-2 中、10分周期スキャン（`elapsed/60000 % 10 === 0`） |
| オーケストレータ | `main().catch` → **exit 1**（ログ保存失敗＝テスト全体 FAIL 扱い） |

### 競合の実態

| ファイル | 役割 | プロセス |
|----------|------|----------|
| `docs/review/twelve-hour-test/adb-logcat-live.log` | バックグラウンド adb logcat **追記専用** | 別 PowerShell（Tee-Object 等） |
| `docs/review/phase12-5-long-run/logcat-final.txt` | オーケストレータが **上書き** | `verify:phase12-5` Node |

live と final は別ファイルだが、**final 側の問題**:

1. **31MB 級の固定ファイルを 10 分毎に `writeFileSync` 上書き** → Windows で AV / インデクサ / エディタ監視とのロック競合（errno -4094）
2. 書き込み失敗が **未捕捉** → 12 時間テスト本体が停止
3. 端末・アプリ（PID 15969）・Metro（:8081）は **停止後も生存**（PC 側ログ処理のみ FAIL）

### 関連エビデンス

- `docs/review/twelve-hour-test/phase12-5-runner.log` — stack trace
- `docs/review/phase12-5-long-run/checkpoint.json` — `endedAt: 2026-06-11T15:24:24.769Z`（telemetry から復元済み）
- `docs/review/PHASE12_5_LONG_RUN_REPORT.md` — FAILED（中断）に更新済み

---

## 2. 対策方針（採用）

| 方針 | 採用 |
|------|------|
| live / final を同一ファイルにしない | ✅ 維持（live=追記、final=timestamp 付きコピー） |
| 周期スキャンは **メモリ内メトリクスのみ**（ファイル書き込みなし） | ✅ |
| final は終了時のみ timestamp 付きファイル | ✅ |
| 既存ファイルは上書きしない（`-1`, `-2` サフィックス） | ✅ |
| copy / write 失敗は **WARN**、`logFinalizationWarnings` に記録 | ✅ |
| log finalization 失敗だけで **exit 1 にしない** | ✅ |
| テスト本体 FAIL と WARN を分離 | ✅ |

---

## 3. 修正内容

### 新規

| ファイル | 内容 |
|----------|------|
| `scripts/lib/phase12-5-logcat-finalization.mjs` | timestamp ファイル名、live コピー、adb dump スナップショット、WARN 返却 |
| `tests/unit/phase12-5LogcatFinalization.test.ts` | 6 テスト |

### 変更

| ファイル | 内容 |
|----------|------|
| `scripts/phase12-5-long-run.mjs` | 上記 lib 利用、`scanLogcatDelta` からファイル書き込み削除、`finalizeLogcatArtifacts` 追加、`evaluateTestBodyPass` / `evaluateWarnings` 分離、`PHASE12_5_DRY_RUN=1` 短時間検証、`PHASE12_5_LOGCAT_FINALIZE_MOCK_FAIL=1` 模擬 WARN |
| `docs/review/PHASE12_5_LONG_RUN_REPORT.md` | FAILED（中断 · 約2h04m）確定、「進行中」削除 |
| `docs/review/phase12-5-long-run/checkpoint.json` | dry-run 上書き後、telemetry から **失敗ラン記録を復元** |

### 出力ファイル命名（新）

```
docs/review/twelve-hour-test/adb-logcat-live.log          # 追記専用（変更なし）
docs/review/twelve-hour-test/adb-logcat-final-YYYYMMDD-HHMMSS.log
docs/review/phase12-5-long-run/logcat-snapshot-YYYYMMDD-HHMMSS.txt
```

旧 `logcat-final.txt` は **削除せず** 既存ランの最終スナップショットとして残存。

---

## 4. FAIL / WARN 分離

### A. テスト本体 FAIL（exit 1 の条件）

- app crash（FATAL / undefined）
- ANR
- app PID 喪失（`pidLostEvents`）
- adb device 消失
- Metro :8081 非 LISTENING
- 価格更新が直近 4 回連続失敗（復帰不能）

### B. WARN（本体 FAIL にしない）

- logcat final copy / write 失敗 → `logFinalizationWarnings[]`
- UI 自動操作 card not found
- メモリ +20% 超（参考値）
- （既知）銘柄ニュース 0 件 — 監視側 `[12H-MONITOR]` / API 監査

---

## 5. 検証結果

| 検証 | 結果 |
|------|------|
| `npm run typecheck` | **PASS** |
| `vitest run tests/unit/phase12-5LogcatFinalization.test.ts` | **6/6 PASS** |
| `vitest run tests/unit/phase12Stability.test.ts` | **5/5 PASS** |
| `PHASE12_5_DRY_RUN=1 node scripts/phase12-5-long-run.mjs` | **exit 0** — live コピー + adb snapshot 作成 |
| `PHASE12_5_DRY_RUN=1 PHASE12_5_LOGCAT_FINALIZE_MOCK_FAIL=1` | **exit 0** — WARN 記録、本体停止なし |

dry-run 作成例:

- `docs/review/twelve-hour-test/adb-logcat-final-20260612-062916.log`
- `docs/review/phase12-5-long-run/logcat-snapshot-20260612-062916.txt`

---

## 6. 再 12 時間テスト開始可否

| 判定 | **可（条件付き）** |
|------|-------------------|
| 理由 | logcat finalization が WARN 化され、固定名上書きが廃止されたため、**同一 errno -4094 によるオーケストレータ停止リスクは大幅低減** |
| 前提 | 既存の WARN_ALLOW（NewsAPI 0×6）、`adb-logcat-live.log` バックグラウンド追記、Metro 監視 env、端末充電設定 |
| 推奨 | 再開前に `PHASE12_5_DRY_RUN=1` を 1 回実行して final ファイル生成を確認 |

---

## 7. 残リスク

| リスク | 深刻度 | 備考 |
|--------|--------|------|
| Windows AV が live log 追記中にロック | 低 | final 失敗は WARN のみ |
| `adb logcat -d` が巨大化してメモリ圧迫 | 中 | 周期書き込みは廃止済み；必要なら将来 tail 化 |
| FATAL=1 が logcat 履歴全体に含まれる | 中 | テスト本体 FAIL 条件のまま（要別途 triage） |
| UI card not found | 低 | WARN；adb UI 操作の既知問題 |
| dry-run が checkpoint を一時上書き | 済 | telemetry から失敗ラン checkpoint を復元 |

---

## 8. git 操作

`git add` / `git commit` / `git push` — **未実施**
