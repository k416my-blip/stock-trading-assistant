# P0 Device Smoke Before Internal Testing — Report

Generated: 2026-07-10T13:00+08:00  
Phase: **P0 Device Smoke Before Internal Testing**  
Code changes this phase: **なし**（証跡のみ）  
Prior fix: `8d64ce6`（CompactSafetyNotice 等）

---

## 1. 実施日時

2026-07-10（+08）

---

## 2. adb unauthorized 解消状況

| 項目 | 結果 |
|------|------|
| 前回 | `FYRWXSNNAIOR9DCM` = **unauthorized** |
| 実施 | `adb kill-server` → `adb start-server` → `adb devices` |
| 結果 | **解消** — `device` として認識 |
| 端末 | Xiaomi **23090RA98G** / serial `FYRWXSNNAIOR9DCM` |
| Android | **16** |

---

## 3. 確認方法

**採用: B（bundletool で AAB → universal APK → 実機インストール）**

| 項目 | 内容 |
|------|------|
| AAB | EAS artifact `1545a8ba` / https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| ツール | bundletool 1.17.2 |
| 署名 | **ローカル debug keystore**（Play / EAS store 署名ではない） |
| 注意 | 署名が異なるため既存 v44 を uninstall 後に install。**Play 内部テスト配布物そのものではない**が、**同一 AAB バイナリ由来**の sideload スモーク |
| A（Play Opt-in） | 未実施（アップロード待ち） |
| C（代替のみ） | 不採用（B まで実施） |

ローカル作業ディレクトリ: `.tmp-device-smoke/`（**git 対象外**）

---

## 4. versionCode 45 確認可否

| 項目 | 結果 |
|------|------|
| インストール前 | 端末は versionCode **44** |
| インストール後 | `dumpsys package` → versionCode **45** / versionName `1.0.0` |
| 起動 | LAUNCHER 起動成功、`MainActivity` 前面 |
| 判定 | **PASS**（45 実機起動確認） |

---

## 5. APIキー未設定UX確認結果

| 確認 | 結果 |
|------|------|
| Settings 上のキー状態 | **「保存状態: 未設定」** を UI dump で確認（Alpha Vantage 等） |
| 起動 | **OK**（言語選択 → ホーム到達） |
| Home | **OK** |
| Settings | **OK** |
| AI相談タブ | **OK**（銘柄カード・入力欄表示） |
| 真っ白画面 | **なし** |
| FATAL / AndroidRuntime crash（logcat サンプル） | **検出なし** |
| 無限ローディング | ホームで一時的に「AIアドバイスを取得中…」表示あり → その後ホーム操作継続可能。**無限ロックは未確認（短時間スモーク）** |
| 新 API 文言（`apiSettings.ts` 改善） | **本 AAB には未収録**（AAB は `4d79c8b` 由来、文言改善は `8d64ce6`） |
| 判定 | **PASS（クラッシュなし・未設定で基本画面到達）** / 新文言の実機確認は **未達** |

---

## 6. 免責 / 非自動売買表示（画面別）

### 本 AAB（1545a8ba）で見えたもの

| 画面 | 結果 |
|------|------|
| Home | **PASS** — `実際の注文は証券会社アプリ側で実行してください。本アプリは注文を送信しません。`（`MANUAL_ORDER_WARNING`） |
| Manual order 導線 | **PASS** — 同上 |
| Settings | API 未設定表示あり。詳細免責ブロックはスクロール範囲で部分確認 |
| AI相談タブ | 短時間 dump では上記短文は未ヒット（画面構成が異なる） |
| Allocation 相当 | 手動注文作成 UI 上で同上警告を確認 |

### `8d64ce6` の新文言（CompactSafetyNotice）

短縮文「参考情報のみ。利益保証なし。実際の注文は証券会社アプリで手動確認・手動入力してください。」

| 結果 | **本 AAB の UI dump では未検出** |
|------|------|
| 理由 | AAB `1545a8ba` は **P0 Minimal Safety Fix（`8d64ce6`）より前**の commit `4d79c8b` でビルドされている |
| 判定 | 新文言の実機視認 = **FAIL（この AAB では含まれない）** / 既存非自動売買明示 = **PASS** |

**総合 safety notice visibility: PARTIAL**

---

## 7. 画面スモーク結果（要約）

| 項目 | 結果 |
|------|------|
| 起動 | PASS |
| Home | PASS |
| AI Concierge / AI相談 | PASS（タブ表示・カード表示） |
| 今日のおすすめ / アドバイス | 一時「取得中…」→ ホーム継続。空状態の厳密確認は短時間のため PARTIAL |
| RM5000 / RM50000 | 本スモークでは金額入力フィールドへの確実な入力確認まで未完了 → **PARTIAL** |
| Manual order 非自動売買明示 | PASS |
| Settings API 説明 / 未設定 | PASS（未設定表示） |
| クラッシュ / 赤画面 | なし |
| OOM 兆候 | 短時間スモークではなし |

---

## 8. focused vitest / CURRENT_STATUS

| 項目 | 結果 |
|------|------|
| `npx vitest run` 4 files | **35/35 PASS** |
| `npm run status` | 実行済。PASS セクション維持（保護動作確認） |
| typecheck/lint | 既存 FAIL（本フェーズ未修正） |

---

## 9. Internal testing / Play 判定

| 項目 | 判定 |
|------|------|
| Internal testing | **CONDITIONAL GO** |
| Play 公開 | **NO**（維持） |

### CONDITIONAL GO の理由

**満たした条件:**

- versionCode **45** 実機起動
- API キー未設定相当で **クラッシュせず** 基本画面到達
- 既存の非自動売買明示（注文送信しない）が Home / Manual で見える
- focused **35/35 PASS**
- CURRENT_STATUS 保護維持

**未達 / 制約:**

- 配布予定 AAB に **`8d64ce6` の CompactSafetyNotice が入っていない**
- 本スモークは **debug 再署名 sideload**（Play Opt-in 経路ではない）
- RM5000 表示・今日のおすすめ空状態の厳密確認が不足
- 新 API 未設定文言の実機確認は次ビルド待ち

**正式 GO に上げるには（推奨）:**

1. `8d64ce6` 以降で **AAB 再ビルド** → 新免責を含めた 45+ を実機確認  
   または Play 内部テストへ現行 AAB を上げ、テスター文面で既存免責を補足したまま CONDITIONAL 運用
2. Play Opt-in（方法 A）での最終確認
3. RM5000 / おすすめなしの短時間手動確認

---

## 10. 残課題

1. CompactSafetyNotice 入り AAB の再ビルド or Play 経路での確認
2. Play Console アップロード + Opt-in
3. RM5000 / 今日のおすすめなしの厳密確認
4. API キー完全削除状態での Concierge 長時間ローディング有無
5. typecheck 既存 FAIL（別フェーズ）

---

## 11. 最終判定

# **PARTIAL**

- adb: **PASS**（unauthorized 解消）
- versionCode 45 起動: **PASS**
- API 未設定クラッシュなし: **PASS**
- 既存非自動売買明示: **PASS**
- 新 CompactSafetyNotice 実機: **未収録のため未確認**
- Internal: **CONDITIONAL GO**
- Play: **NO**
