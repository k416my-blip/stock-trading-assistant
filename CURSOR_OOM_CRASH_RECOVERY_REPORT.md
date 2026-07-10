# Cursor OOM Crash Recovery — Report

Generated: 2026-07-10T17:50+08:00  
Phase: **Cursor OOM Crash Recovery and Workspace Quarantine**

---

## 1. OOM クラッシュ証跡

| 項目 | 記録 |
|------|------|
| 発生日時 | 2026-07-10 約 17:15 (+08)（ユーザー報告） |
| エラー | `The window terminated unexpectedly (reason: 'oom', code: '-536870904')` |
| 対象 | **Cursor 本体 OOM**（IDE ウィンドウ終了） |
| アプリ本体 OOM | **未確認**（Metro/adb logcat 停止中） |
| 再発（隔離作業中） | **なし**（本セッション継続） |

---

## 2. 実施概要

| 項目 | 結果 |
|------|------|
| working tree before | **3716** 行（`git status --porcelain -u`） |
| working tree after quarantine | **5** 行 |
| working tree after scripts/lib 復元 | **12** 行（目標 <100 **達成**） |
| `.tmp-device-smoke/` WS 内 | **なし**（前フェーズで device-smoke-20260710 へ移動済み） |
| `npm run status` | 隔離直後 **broken** → scripts/lib 復元後 **復旧** |

---

## 3. ワークスペース隔離（退避）

**退避先:** `C:\Users\k416m\Documents\Projects\stock-trading-artifacts\quarantine-20260710\`  
**退避ファイル数:** ~3749

### 退避した主要フォルダ

| 対象 | 備考 |
|------|------|
| `.eas-prebuild-test/` | ~3008 files（最大要因） |
| `.expo-export-android/` | export 生成物 |
| `dist/` | export 生成物 |
| `docs/fable-evaluation.zip` | zip |
| `docs/review/`（未追跡分） | 古い review レポート大量 |
| `scripts/`（未追跡分） | audit / probe / 一時 mjs・json 等 |
| ルート一時物 | `_*.mjs`, `run-*.mjs`, `ui-now2.xml`, `eas-build-view.json` 等 |
| `tests/unit/*.src` | OOM スクリプト退避コピー |

### 意図的に残したもの

- `src/` / 正式 `tests/` / 設定ファイル / **commit 済み** scripts
- 正式レポート Markdown（tracked / ルート P0 系）
- device-smoke 証跡（別パス `stock-trading-artifacts/device-smoke-20260710/`）

### scripts/lib 復元（隔離の副作用修正）

隔離で **未追跡だが `dev-status` 依存**のファイルが移動され `npm run status` が失敗。  
以下を quarantine から **WS にコピー復元**（git add **していない**）:

- `scripts/lib/e2eMetroEnv.mjs`
- `scripts/lib/oom-node-env.mjs`
- `scripts/lib/safeLocalEnv.mjs`
- `scripts/lib/chunked-runner.mjs`
- `scripts/lib/light-report.mjs`
- `scripts/lib/rotating-logcat-stream.mjs`

---

## 4. `.cursorignore` 更新

本フェーズ追加分:

| パターン | 状態 |
|----------|------|
| `.tmp*/` | **追加** |
| `*.zip` | **追加** |
| `.gradle/` | **追加** |
| 既存（`.eas-prebuild-test/`, `dist/`, `*.aab/apk/apks`, `coverage/`, `agent-transcripts/` 等） | 維持 |

---

## 5. メモリ推移（OOM クラッシュ後）

| 時点 | 時刻 | Cursor aggregate | Extension Host | System | 備考 |
|------|------|------------------|----------------|--------|------|
| **T0** | ~17:48 | **4801 MB** | **1764 MB (8 proc)** | 35.5% | **5 GB 未満** |
| T+15 | pending | — | — | — | watch 実行中 |
| T+30 | pending | — | — | — | watch 実行中 |

### T0 所見（クラッシュ後・隔離後）

- aggregate **4801 MB** → HOLD 解除の **5 GB 未満**条件を **初回達成**
- Extension Host **9 → 8 proc**、~1.76 GB（前 ~2.7 GB から改善）
- TypeScript Server ~118 MB（2 proc）— 再起動後に再出現
- Metro / adb / node / logcat: **停止**

---

## 6. 未追跡ファイル分類（参考）

| 区分 | 扱い |
|------|------|
| 必要レポート Markdown（tracked） | 維持 |
| build/export（`.eas-prebuild-test`, `dist`, `.expo-export-android`） | **退避** |
| docs/review 古い大量レポート | **退避** |
| 一時 scripts / probe mjs | **退避** |
| AAB/APK/APKS | 退避対象（WS 内に残存なし） |
| scripts/lib 依存（dev-status） | **復元**（未 commit） |

---

## 7. HOLD 解除可否

| 条件 | 結果 |
|------|------|
| aggregate **< 5 GB** | **T0 達成**（4801 MB） |
| 理想 3 GB 台 | **未達** |
| T+15 / T+30 急増なし | **未評価**（watch pending） |
| 30 分クラッシュなし | **未評価** |
| EH 再肥大化なし | T0 は改善（8 proc / 1.76 GB） |
| working tree 大幅減 | **達成**（3716 → 12） |
| `.tmp-device-smoke` 未復帰 | **達成** |

### 判定

| 項目 | 判定 |
|------|------|
| Internal testing | **HOLD**（T+15/T+30 + 30 分無クラッシュ待ち） |
| Play upload | **HOLD** |
| 15人送付 | **HOLD** |
| Play 公開 | **NO** |

T0 だけでは **CONDITIONAL GO に戻さない**。OOM クラッシュ直後のため **30 分安定 watch 完走**が必要。

---

## 8. 残課題

1. `logs/oom-crash-recheck.log` で T+15 / T+30 完走確認
2. 30 分間 Cursor OOM 再発なしを確認
3. 退避した `scripts/lib` 等の **正式 commit 要否**を別フェーズで選別
4. quarantine 内 3749 files の整理（削除は慎重に）
5. Play upload / 15人送付 — **HOLD 解除後**

---

## 9. 最終判定

# **PARTIAL**

- OOM クラッシュ証跡化: **PASS**
- ワークスペース隔離: **PASS**（3716 → 12 行）
- dev-status 復旧: **PASS**（scripts/lib 復元）
- T0 < 5 GB: **PASS**
- T+15/T+30 / 30 分無クラッシュ: **PENDING**
- HOLD 解除: **不可**（維持）

**次アクション:** T+30 watch 結果を確認 → 30 分無 OOM → aggregate 安定なら **CONDITIONAL GO** 再評価。それまでは Play upload / 15人送付 **禁止**。
