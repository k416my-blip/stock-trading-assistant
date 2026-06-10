# Phase12.5 Long Run Validation — 部分停止レポート

## 総合判定: **未完了（参考記録のみ）**

**12時間連続テストは未完了。夜に最初から再実行予定。**

本レポートは PASS 判定用ではなく、日中実行分の参考記録です。

---

## 停止情報

| 項目 | 値 |
|------|-----|
| 停止理由 | ユーザー指示（17:00 USB切断前の部分停止） |
| 本番開始 (UTC) | 2026-06-10T02:44:17Z |
| 停止 (UTC) | 2026-06-10T03:12:00Z（概算） |
| 計画時間 | 12 時間 |
| **実経過** | **約 28分** |
| 12hループ突入 | **YES**（hour-0 完了後） |
| 12hループ完走 | **NO** |
| Node runner PID | 33608（停止済み） |
| アプリ PID | 29439 |

---

## PASS条件（本セッション）

| 条件 | 判定 | 結果 |
|------|------|------|
| 12時間連続稼働 | **未完了** | 約28分で中断 |
| クラッシュ0 | 参考 | FATAL=0 |
| ANR0 | 参考 | ANR=0 |
| メモリ増加20%以内 | 未評価 | 12h未完走のため暫定不可 |
| 全銘柄正常表示 | **FAIL** | 6銘柄中2銘柄のみOK（1295, 6033） |

---

## 実施できた項目（参考）

| 項目 | 回数 / 状態 |
|------|-------------|
| 材料分析（hour-0） | 1回 — OK |
| 株価更新 | 2回（h0-m0, h0-m15）— いずれも OK |
| 銘柄検証（hour-0） | 1155 NG, 1023 NG, **1295 OK**, 5347 NG, 4707 NG, **6033 OK** |
| メモリ baseline | 797,764 KB |
| メモリ（停止時） | 844,865 KB PSS |
| AsyncStorage RKStorage | 1,396 KB |
| hourly スナップショット | hour 0 のみ（baseline） |

---

## 保存済みエビデンス

| ファイル | 説明 |
|----------|------|
| `docs/review/phase12-5-long-run/telemetry.jsonl` | 全イベント追記ログ |
| `docs/review/phase12-5-long-run/runner.log` | コンソール出力 |
| `docs/review/phase12-5-long-run/checkpoint.json` | 最終チェックポイント |
| `docs/review/phase12-5-long-run/partial-stop.json` | 中断メタデータ |
| `docs/review/phase12-5-long-run/logcat-partial-stop.txt` | 停止時 logcat |
| `docs/review/phase12-5-long-run/logcat-final.txt` | 直近スキャン logcat |
| `docs/review/phase12-5-long-run/meminfo-baseline.txt` | 開始時 meminfo |
| `docs/review/phase12-5-long-run/meminfo-partial-stop.txt` | 停止時 meminfo |
| `docs/review/phase12-5-long-run/meminfo-hour-00.txt` | hour-0 meminfo |
| `docs/review/phase12-5-long-run/node-stocks.json` | Node 銘柄検証 |

---

## 失敗・中断の経緯

1. 初回実行は `PHASE12_5_SMOKE=1` 残留で約5分で終了（12h未開始）
2. 再実行（`hours:12`）は hour-0 銘柄検証に時間を要した後、12hループに突入
3. ループ内で h0-m0 / h0-m15 株価更新まで実施
4. 本停止時点で hour-1 未到達（12hの約4%）

---

## 夜間再実行予定

```powershell
Remove-Item Env:PHASE12_5_SMOKE -ErrorAction SilentlyContinue
$env:PHASE12_5_HOURS="12"
node scripts/phase12-5-long-run.mjs
```

- **最初から** 12時間本番を再実行
- 本部分レポートは参考記録として保持
- 再実行完了後は `PHASE12_5_LONG_RUN_REPORT.md` を別途作成

---

## 関連ドキュメント

- `docs/review/PHASE12_5_EVIDENCE_STATUS.md` — 証拠提出スナップショット
- `docs/review/PHASE12_5_LONG_RUN_REPORT.md` — 旧ステータス（RUNNING/FAILED）
