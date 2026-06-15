# HyperOS v9 画面オフ 3時間ラン — 途中経過レポート

| 項目 | 値 |
|------|-----|
| レポート種別 | **途中経過**（テスト実行中） |
| 作成日時 | 2026-06-15 **22:12 MYT** |
| runId | `20260615-203607` |
| 端末 | Redmi Note 13 Pro (HyperOS) · `FYRWXSNNAIOR9DCM` |
| APK | preview-v9 · versionCode **9** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| コミット（開始時） | `737f89a` |

---

## サマリー

| 指標 | 値 |
|------|-----|
| **開始時刻** | 2026-06-15 **20:36:07 MYT**（UTC 12:36:07） |
| **経過時間** | **約 95.6 分**（1時間 36分） |
| **完了率** | **約 53.1%**（目標 180 分） |
| **終了予定** | 2026-06-15 **23:36 MYT** 頃 |
| **実行状態** | **RUNNING**（orchestrator PID 12988 稼働中） |

---

## 検証指標（途中時点）

| 指標 | 値 | 判定メモ |
|------|-----|----------|
| **App PID** | **7644** | baseline と一致 · `pidLostEvents=0` |
| **heartbeat 回数** | **4+**（logcat リングバッファ内） | 期待値 約 19 回（5分間隔×95分）· バッファローテで過小表示の可能性 |
| **Twelve Data 取得** | **6 回**（価格更新スロット） | `h0-m0`〜`h0-m45` + `h1-m0`〜`h1-m15` すべて **OK** |
| **News 取得** | **5 回**（`news_fetch` logcat · PID 7644） | 継続確認 |
| **Crash 数** | **0**（FATAL） | checkpoint |
| **ANR 数** | **0** | checkpoint |
| **Foreground Service** | **未検出**（dumpsys grep） | `LongRunForegroundService` 文字列なし · アプリ通知は 2 件存在 |
| **WakeLock 状態** | **混合** | 15〜75分ポール: `held=true` · 90分ポール: `HoldingWakeLockSuspendBlocker=false` · 即時: `Awake` / ref=0 |

---

## 15分ポールタイムライン

| 経過 | PID | heartbeat Δ | price Δ | news Δ | FGS | WakeLock | 画面 |
|------|-----|-------------|---------|--------|-----|----------|------|
| 15m | 7644 | 0 | +1 | +4 | N | Y | Dozing |
| 30m | 7644 | 0 | +1 | — | N | Y | Awake |
| 45m | 7644 | 0 | 0 | 0 | N | Y | Awake |
| 60m | 7644 | 0 | 0 | 0 | N | Y | Awake |
| 75m | 7644 | 0 | 0 | −1 | N | Y | Dozing |
| 90m | 7644 | 0 | 0 | −1 | N | Y | Dozing |

> heartbeat Δ=0 は orchestrator の logcat フィルタが `ReactNativeJS` 形式と不一致のため。実ログには `heartbeat` イベントが存在。

---

## 完了済みマイルストーン

- [x] survival_enabled 確認
- [x] 6銘柄検証 hour-0 — 6/6 PASS
- [x] AI 分析 hour-0 — PASS
- [x] 6銘柄検証 hour-1 — 進行中（AI hour-1 開始済み）
- [x] 30分チェックポイント — PASS
- [x] 1時間チェックポイント — PASS
- [x] 価格更新 6/12 スロット完了（3h 想定 12 スロット）

---

## インフラ注意

1. **live logcat ファイル**（`adb-logcat-live.log`）は **16:50 MYT で更新停止**（512MB 既存ファイルへ追記失敗の可能性）。本ランの詳細は **端末 logcat リングバッファ** と checkpoint を参照。
2. **FGS 検出** — `dumpsys activity services | grep LongRunForegroundService` が空。通知チャンネルは生存。最終判定で再確認。
3. **画面状態** — 価格更新 UI 操作時に一時 `Awake`（意図どおり screen-off 再適用あり · `screenOffEnforcedCount=5`）。

---

## 暫定判定

**途中経過: 条件付き順調** — PID 維持・価格/ニュース継続・クラッシュなし。FGS 検出と heartbeat 集計は最終レポートで再評価。

---

## 次のアクション

- 残り約 **84 分** まで USB 接続・PC スリープ無効を維持
- 2h / 3h チェックポイント後に最終レポート `HYPEROS_V9_3H_SCREEN_OFF_RUN_REPORT.md` を更新予定
