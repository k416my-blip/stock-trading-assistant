# OOM Regression Incident Triage — Report

Generated: 2026-07-10T15:20+08:00  
Phase: **OOM Regression Incident Triage Before Internal Testing**

---

## 1. 発生日時

| 項目 | 記録 |
|------|------|
| 報告日時 | 2026-07-10 約 15:10–15:17 (+08) |
| 直前フェーズ | P0 Internal Testing Final Gate Cleanup 完了（commit `3d153c9`） |
| 12h OOM PASS からの経過 | 数日〜数セッション（開発 IDE 側の再発。アプリ 12h 完走 PASS は別系統） |

---

## 2. 発生状況

| 項目 | 記録 |
|------|------|
| 固まった対象 | **Cursor / PC**（ユーザー報告）。Android 端末・アプリ本体の OOM とは未確認 |
| 再起動 | **Cursor 再起動**（プロセス StartTime 15:10 付近の EH 再起動を確認）。PC 全体再起動の要否はユーザー報告ベース |
| Android 端末 | 本 incident では再起動報告なし |
| Expo / Metro | **停止中**（`npm run status` で Metro/node 0） |
| EAS build | 本 incident **前**に v46 AAB 生成済み（`4952baeb`）。incident 時点で EAS 実行中ではない |

### 直前操作（高関連）

| 操作 | 関連度 | 備考 |
|------|--------|------|
| P0 Final Gate docs commit/push | 中 | 大量 markdown 編集 |
| v46 device smoke（bundletool / adb / uiautomator） | **高** | `.tmp-device-smoke/` に **776 MB / 1439 files** 残留 |
| `npm run status` / triage 中の `oom:report` | 中 | triage 中に aggregate **5286 → 7025 MB** に増加 |
| Play 資料・CURRENT_STATUS 更新 | 低〜中 | テキスト中心 |
| 572 件 untracked working tree | **高** | Cursor ファイル監視・索引負荷の候補 |
| Extension Host 9 プロセス / ~2.5 GB | **高** | 再起動後も再肥大化 |

---

## 3. 現在のメモリ状態（T0 証跡）

### T0 — `npm run status`（2026-07-10 15:12 +08）

| 項目 | 値 |
|------|-----|
| System memory | **65.1%** (21257 / 32678 MB) |
| **Cursor aggregate** | **~5286.2 MB** (17 proc) |
| Extension Host | **2617.1 MB** (9 proc) |
| Cursor Main | 819.4 MB (3 proc) |
| Cursor Other | 1849.7 MB (5 proc) |
| TypeScript Server | 0 MB |
| Metro / node / adb logcat | **停止** |

### T1 — `npm run oom:report` 直後（同一セッション）

| 項目 | 値 |
|------|-----|
| System memory | **69.4%** (22688 / 32678 MB) |
| **Cursor aggregate** | **~7025.3 MB** (+1740 MB) |
| Extension Host | 2542.4 MB (9 proc) |
| Cursor Other | 3773.7 MB |

→ **過去 Live snapshot の ~5389 MB と同水準以上。** triage 作業自体でも aggregate が増加。

### OS プロセス（PowerShell 抜粋）

| Process | PM (MB) | 備考 |
|---------|---------|------|
| Cursor (PID 28740) | 1395 | Extension Host 系 |
| Cursor (PID 29120) | 1162 | Extension Host 系 |
| Cursor (PID 23416) | 577 | Main（高 CPU 履歴） |
| Cursor (PID 6020) | 328 | Extension Host |
| adb (PID 27980) | 8 | **残留**（12:41 起動）。低メモリ |
| node (PID 10380) | 52 | **残留**（前日 10:15 起動）。Metro ではない可能性 |
| java / gradle | **なし** | bundletool 実行後は終了 |

---

## 4. 大容量ファイル確認

| パス | ファイル数 | サイズ | リスク |
|------|-----------|--------|--------|
| **`.tmp-device-smoke/`** | **1439** | **~776 MB** | **高** — bundletool universal APK / AAB 展開 / UI dump |
| `.expo-export-android/` | 38 | ~16 MB | 中 |
| `dist/` | 38 | ~16 MB | 中（export 生成物） |
| `.eas-prebuild-test/` | 3008 | ~12 MB | 中（ファイル数多） |
| `docs/fable-evaluation.zip` | 1 | ~0.04 MB | 低 |
| `logs/` | 4 | ~0.01 MB | 低 |
| `node_modules/` | — | 除外走査 | 通常 |

ワークスペース内 logcat 全量ダンプの新規残留は **未確認**（`docs/review/twelve-hour-test/` は `.cursorignore` で docs/ 配下除外済み）。

**git untracked:** **572 件**（scripts/docs 大量 .md/.json/.mjs — Cursor 監視負荷候補）

---

## 5. `.cursorignore` 確認・対応

### 変更前の不足

- `.tmp-device-smoke/` — **未記載**（776 MB が監視対象になり得た）
- `.expo-export-android/` — 未記載
- `.eas-prebuild-test/` — 未記載
- `*.apks` — 未記載
- `checkpoint.json` / `telemetry.json` — 未記載

### 本 incident 対応（commit 予定）

上記を `.cursorignore` に追加。既存の `docs/` / `scripts/` / `*.aab` / `*.apk` / `agent-transcripts/` は維持。

---

## 6. 原因候補（優先度順）

1. **Cursor Extension Host 肥大化（~2.5 GB × 9 proc）** — 長時間 Agent セッション + 大 context + 多数 tool call
2. **`.tmp-device-smoke/` 776 MB 残留** — v46 bundletool/adb smoke の生成物。索引・監視負荷
3. **572 untracked files** — 未精査 scripts/docs が watcher 対象（`.gitignore` 外）
4. **会話 context 要約・再開** — 長大 transcript の再読込
5. **アプリ OOM / Metro OOM** — **低**（Metro/adb logcat 停止、12h PASS は別系統。本 incident は IDE 側が主）

**否定しにくいが副次:** bundletool/java は終了済み。EAS build は incident 前完了。

---

## 7. 暫定対策

| 対策 | 状態 | 備考 |
|------|------|------|
| Internal testing / 15人送付 | **HOLD** | 本 incident 解消まで |
| `.cursorignore` 拡張 | **実施** | 本 commit |
| `.tmp-device-smoke/` ワークスペース外へ移動 | **推奨（手動）** | 776 MB。削除前に必要 XML/txt のみアーカイブ |
| Cursor Reload Window / 再起動 | **推奨** | aggregate 5–7 GB 時 |
| Extension Host プロセス数監視 | **推奨** | 9 proc は異常多 |
| `npm run status` を 15/30 分間隔で再計測 | **pending** | 本レポート時点 T0/T1 のみ |
| `npm run memory:watch` 短時間 | **pending** | 次セッション |
| AAB 再ビルド | **禁止**（ユーザー指示） |
| 新機能 / 投資ロジック変更 | **禁止** |

---

## 8. 内部テスター配布への影響

| 項目 | 判定 |
|------|------|
| versionCode 46 AAB | 生成済み・品質判定は Final Gate 時点のまま |
| Play upload | **HOLD** |
| 15人送付 | **HOLD** |
| Play Opt-in | **HOLD** |
| 再開条件 | Cursor aggregate **< 3 GB 安定** + 15/30 分監視で増加なし + `.tmp-device-smoke` 整理 |

---

## 9. Internal testing / Play 判定

| 項目 | 判定 |
|------|------|
| Internal testing | **HOLD**（Final Gate の CONDITIONAL GO から降格） |
| Play 公開 | **NO**（維持） |
| アプリ 12h OOM PASS | 履歴として有効だが **IDE 安全性は別問題** |

---

## 10. 次アクション

1. **Cursor Reload Window** または完全終了 → 再起動
2. `.tmp-device-smoke/` を `C:\Users\k416m\Documents\Projects\stock-trading-artifacts\` 等へ移動（776 MB）
3. 15 分 / 30 分後に `npm run status` — aggregate 推移記録
4. aggregate < 3 GB 安定後、Internal testing HOLD 解除を再評価
5. Play upload / 15人送付は **HOLD 解除後**

---

## 11. メモリ監視ログ（本セッション）

| 時刻 | Cursor aggregate | System % | 備考 |
|------|------------------|----------|------|
| T0 15:12 | 5286 MB | 65.1% | incident triage 開始 |
| T1 15:17 | 7025 MB | 69.4% | `oom:report` 実行後 |
| T+15m | pending | — | 手動再計測推奨 |
| T+30m | pending | — | 手動再計測推奨 |

---

## 12. 最終判定

# **HOLD**

- incident: Cursor OOM / freeze / restart（IDE 側）
- アプリ v46 AAB: 生成済み（再ビルド不要）
- 内部テスター配布: **停止**
- Play 公開: **NO**
