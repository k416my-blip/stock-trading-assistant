# Cursor OOM Recurrence — Hard Stop Report

Generated: 2026-07-10T19:45+08:00  
Phase: **Cursor OOM Recurrence Hard Stop Report**

---

## 1. OOM 再発記録

| 項目 | 記録 |
|------|------|
| 再発日時 | **不明**（2026-07-10 **17:50 以降**） |
| 正確なクラッシュ時刻 | **不明** |
| エラー（前回同型） | `The window terminated unexpectedly (reason: 'oom', code: '-536870904')`（ユーザー報告ベース） |
| 30 分安定確認 | **FAIL** — T+15/T+30 完走前に再 OOM |
| アプリ本体 OOM | **未確認**（Metro/adb logcat 停止中） |

### 時系列（判明分）

| 時点 | Cursor aggregate | 備考 |
|------|------------------|------|
| 隔離後 T0 | **4801 MB** | 5 GB 未満を一時達成 |
| watch T0（17:51） | **5575 MB** | `oom-crash-recheck.log` |
| 安定確認中（~18:03） | **7786 MB** | 急増後、再 OOM 前後 |
| 再発後（本確認 ~19:45） | **3875 MB** | Cursor 再起動後 |

→ **T0 → 上昇 → OOM 再発**。30 分無クラッシュ **未達**。

---

## 2. 現在状態（最小確認のみ）

| 項目 | 値 |
|------|-----|
| working tree | **11 行**（`git status --short`） |
| `.tmp-device-smoke/` WS 内 | **なし** |
| Cursor aggregate | **~3875 MB**（15 proc） |
| Extension Host | **~1721 MB**（8 proc） |
| System memory | **35.6%** (11640/32678 MB) |
| Metro | **停止** |
| node | **停止** |
| adb | **停止** |
| adb logcat | **停止** |
| TypeScript Server | 0 MB（status 集計上） |

---

## 3. 原因候補（更新）

1. **Cursor / Electron / Extension Host のメモリリーク** — 8 proc / ~1.7–2.0 GB が常態化
2. **長大 Agent 履歴・コンテキスト肥大** — 本プロジェクト全体を Agent に渡し続けた影響
3. **`.cursorignore` だけでは不十分** — 未追跡 3716→11 行に減らしても Cursor 側の履歴・拡張・索引負荷は残存
4. **インデックス / Extension Host 再肥大化** — 隔離後も aggregate が 4.8→7.8 GB まで再増
5. **アプリ本体 OOM** — **低**（Metro/node/logcat 停止、v46 AAB 品質とは別系統）

---

## 4. 方針変更（Hard Stop）

今後:

- **Cursor Agent で長時間連続作業しない**
- **大きなプロジェクト全体を開いたまま Agent に長文指示しない**
- Play upload 等の手動作業は **Cursor を使わず**進める（Play Console / ブラウザ / CLI）
- コード修正が必要な場合は **短時間・単一ファイル・小タスクのみ**
- レポート作成は **必要最小限**
- Cursor 完全再起動後も再発 → **VS Code / GitHub Web / CLI 中心**へ切り替え

**本フェーズ以降、Cursor Agent による長時間バッチ作業は停止。**

---

## 5. Internal testing への影響

| 項目 | 判定 |
|------|------|
| v46 AAB 品質 | **別問題** — AAB は生成済み（`4952baeb` / versionCode 46）。**再ビルド不要** |
| 開発環境 | **不安定** — Play upload 前の安全な確認作業を Cursor 上で完遂できていない |
| Internal testing | **HOLD** |
| Play upload | **HOLD 推奨**（手動のみ別判断可だが、現時点 HOLD） |
| 15 人送付 | **HOLD** |
| Play 公開 | **NO** |

HOLD 解除不可 — 30 分安定確認 **FAIL** + OOM **再発**。

---

## 6. 判定サマリ

| 項目 | 判定 |
|------|------|
| 30 分安定確認 | **FAIL** |
| Internal testing | **HOLD** |
| Play upload | **HOLD** |
| 15 人送付 | **HOLD** |
| Play 公開 | **NO** |
| 最終判定 | **FAIL**（Hard Stop） |

---

## 7. 残課題

1. 開発作業は **Cursor 以外**または **極小タスク**に限定
2. Play upload を進める場合は **Cursor 非使用**で手動実施（upload guide 参照）
3. Opt-in / 実機確認も Cursor Agent 長時間セッションなしで実施
4. `scripts/lib/*.mjs` 未追跡 6 件 — 別途小タスクで commit 要否を判断
5. quarantine 3749 files — ローカル整理（git 対象外）

---

## 8. 関連レポート

- `CURSOR_OOM_CRASH_RECOVERY_REPORT.md`
- `OOM_REGRESSION_INCIDENT_TRIAGE_REPORT.md`
- `P0_INTERNAL_TESTING_FINAL_GATE_REPORT.md`
