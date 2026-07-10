# OOM Workspace Stabilization — Report

Generated: 2026-07-10T16:45+08:00  
Phase: **OOM Workspace Stabilization Before Internal Testing**

---

## 1. 実施日時

2026-07-10 15:37–16:42 (+08)

---

## 2. Cursor 再起動

| 項目 | 記録 |
|------|------|
| Agent からの完全終了 | **不可**（セッション中断のため） |
| ユーザー側再起動の痕跡 | **あり** — 15:30 付近に Extension Host プロセスが再生成（StartTime 15:30:40 台） |
| Reload Window | 未確認（完全終了と同等ではない可能性） |

---

## 3. `.tmp-device-smoke/` の処理

| 項目 | 処理前 | 処理後 |
|------|--------|--------|
| 場所 | `stock-trading-assistant/.tmp-device-smoke/` | **ワークスペース外へ移動** |
| ファイル数 | **1439** | 0（WS 内） |
| サイズ | **~776.28 MB** | 0（WS 内） |
| 移動先 | — | `C:\Users\k416m\Documents\Projects\stock-trading-artifacts\device-smoke-20260710\tmp-device-smoke\` |
| git | **未 add**（禁止どおり） |

内容: bundletool universal APK / AAB 展開 / uiautomator UI dump（v46 smoke 残骸）

---

## 4. `.cursorignore` 更新

commit `796f61f` 以降、本フェーズで追加:

| パターン | 状態 |
|----------|------|
| `.tmp-device-smoke/` | 済（前 commit） |
| `.expo-export-android/` | 済 |
| `.eas-prebuild-test/` | 済 |
| `dist/` | 済 |
| `*.aab` / `*.apk` / `*.apks` | 済 |
| `*.log` | 済 |
| `**/telemetry.jsonl` | **本フェーズ追加** |
| `**/checkpoint.json` | 済 |
| `docs/fable-evaluation.zip` | 済 |
| `docs/review/twelve-hour-test/adb-logcat*.log` | **本フェーズ追加** |
| `node_modules/` | 済 |
| `android/.gradle/` | **本フェーズ追加**（`android/` 全体も除外済み） |

---

## 5. 残留プロセス確認

| Process | 判定 | 備考 |
|---------|------|------|
| **adb** (PID 27980) | **維持** | `adb fork-server`。低メモリ ~8 MB。device smoke 用に妥当 |
| **node** (PID 10380) | **維持** | **Adobe Creative Cloud**（プロジェクト Metro ではない） |
| **java / gradle / bundletool** | **なし** | — |
| **Metro** | **停止** | status 0 proc |
| **adb logcat** | **停止** | — |
| **Extension Host** | **9 proc / ~2.7 GB** | 再起動後も再肥大化。要 Cursor 完全終了 |

強制停止: **実施せず**（Adobe node / adb server は用途不明リスクのため）

---

## 6. メモリ推移（T0 / T+15 / T+30）

### 自動 15/30 分 watch

バックグラウンド watch（15:40 開始）が **T+15 記録前に停滞**（log に start のみ）。以下は取得できた計測値。

| 時点 | 時刻 | Cursor aggregate | Extension Host | System |
|------|------|------------------|----------------|--------|
| **T0**（整理前） | 15:37 | **5592 MB** | 2703 MB | 65.6% |
| **T0**（`.tmp-device-smoke` 移動後） | 15:39 | **6045 MB** | 2719 MB | 67.8% |
| **T+15** | — | **未記録**（watch 停滞） | — | — |
| **T+30** | — | **未記録**（watch 停滞） | — | — |
| **T+63**（手動再計測） | 16:42 | **5734 MB** | 2699 MB | 67.9% |

### 所見

- `.tmp-device-smoke` 移動後も aggregate **5.7–6.0 GB 帯**（HOLD 解除条件 **未達**）
- 16:42 時点で T0 比 **-311 MB**（微減）だが **5 GB 超過は継続**
- Extension Host **9 proc / ~2.7 GB** が安定して残存
- 本セッション中の **新規 freeze / 再起動報告なし**

---

## 7. 大容量ファイル整理結果

| パス | 結果 |
|------|------|
| `.tmp-device-smoke/` | **移動済み**（776 MB 解放） |
| `.expo-export-android/` | 残存 ~16 MB（`.cursorignore` 対象） |
| `dist/` | 残存 ~16 MB（`.cursorignore` 対象） |
| `.eas-prebuild-test/` | 残存 ~12 MB（`.cursorignore` 対象） |
| 572 untracked | **未一括処理**（方針どおり次フェーズ） |

---

## 8. Internal testing HOLD 解除可否

| 条件 | 結果 |
|------|------|
| aggregate **3 GB 台以下** | **未達**（5734 MB） |
| **5 GB 未満** | **未達** |
| 15/30 分で増加傾向小 | **未評価**（T+15/T+30 未取得） |
| EH 再肥大化なし | **未達**（9 proc / ~2.7 GB 継続） |
| 不要 node/adb/Metro なし | **おおむね OK**（Metro なし。adb は server のみ） |

### 判定

**HOLD 解除不可** — Cursor 完全終了 + aggregate < 5 GB 安定後に再評価

| 項目 | 判定 |
|------|------|
| Internal testing | **HOLD** |
| 15人送付 | **HOLD** |
| Play upload | **HOLD** |
| Play 公開 | **NO** |

---

## 9. 残課題

1. **Cursor 完全終了** → 再起動（ユーザー操作）
2. 再起動直後 T0 → **15 分 / 30 分** `npm run status` を手動または watch スクリプトで完走
3. aggregate **< 5 GB**（理想 3 GB 台）まで安定確認
4. Extension Host プロセス数の正常化（9 → 少数）
5. 572 untracked の選別（別フェーズ）

---

## 10. 最終判定

# **PARTIAL**

- `.tmp-device-smoke` 整理: **PASS**
- `.cursorignore` 拡張: **PASS**
- 残留プロセス: **PASS**（無断 kill なし）
- 15/30 分安定確認: **FAIL**（watch 未完了）
- HOLD 解除: **FAIL**
- Play 公開: **NO**

**次アクション:** Cursor を完全終了 → 再起動 → 15/30 分 status 再計測 → HOLD 解除再判定。Play upload / 15人送付は **HOLD 維持**。
