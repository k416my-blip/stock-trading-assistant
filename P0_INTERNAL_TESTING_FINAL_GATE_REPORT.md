# P0 Internal Testing Final Gate — Report

Generated: 2026-07-10T14:50+08:00  
Phase: **P0 Internal Testing Final Gate Cleanup**

---

## 1. 目的

versionCode 46 AAB を Play 内部テストへ上げる直前に、ドキュメント矛盾の解消と残存未達の整理。内部テスター 15 人へ送れる状態への整備（新機能・投資ロジック変更なし）。

---

## 2. 配布対象の確定

| 項目 | 値 |
|------|-----|
| **配布対象** | **versionCode 46** のみ |
| build ID | `4952baeb-d6cd-46e9-bff1-a2afc6fe1859` |
| commit | `1afa9f4` |
| package | `com.assistant.stocktrading` |
| artifact | https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab |
| CompactSafetyNotice | bundle 検証 **PASS** |
| **使用禁止** | versionCode **45**（CompactSafetyNotice 未収録） |

---

## 3. ドキュメント整合修正

### INTERNAL_TESTING_CHANGELOG.md

| 修正 | 状態 |
|------|------|
| 「ビルド / 配布（本フェーズ）」を versionCode **46** に更新 | **完了** |
| versionCode 45 を旧ビルド・配布禁止として明記 | **完了** |
| 内部テスト確認ポイントに CompactSafetyNotice 追加 | **完了** |
| 既知の制限に 45 配布禁止・Opt-in pending を追記 | **完了** |

### PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md

| 修正 | 状態 |
|------|------|
| build ID / artifact / commit を **46** に統一 | **完了** |
| Release name 案: `v1.0.0 (46) — Internal RC — P0 Safety Notice` | **完了** |
| versionCode 45 使用禁止の注意 | **完了** |
| Play Opt-in をアップロード後手動作業として明記 | **完了** |

### CURRENT_STATUS.md

| 修正 | 状態 |
|------|------|
| Closed Testing セクションを versionCode **46** に更新 | **完了** |
| P0 Final Gate セクション追加 | **完了** |

---

## 4. v46 実機確認サマリ（前フェーズ + 本 gate）

| 項目 | 結果 |
|------|------|
| v46 起動 / versionCode 46 | **PASS** |
| CompactSafetyNotice — Home | **PASS** |
| CompactSafetyNotice — Concierge / 今日の提案 | **PASS** |
| CompactSafetyNotice — ManualOrderFlow | **PASS** |
| CompactSafetyNotice — Settings | **PASS** |
| API キー未設定 UX | **PASS** |
| RM5000 表示 | **PASS**（RM50000 誤表示なし） |
| focused vitest | **PASS**（35/35） |
| sideload smoke 総合 | **PARTIAL PASS** |

---

## 5. AllocationPlan 視認確認

### 実機

| 項目 | 結果 |
|------|------|
| 本 gate 再スモーク | **未達** |
| 理由 | 端末がロック画面 / NotificationShade 状態で uiautomator が systemui のみ取得。Allocation 画面へ遷移不可 |
| 前セッション | Home / Manual / Concierge / Settings は PASS 済み。Allocation は未遷移 |

### コード確認

`AllocationPlanScreen.tsx` に `CompactSafetyNotice` が配線済み:

```532:532:src/screens/AllocationPlanScreen.tsx
      <CompactSafetyNotice />
```

**判定:** 実機視認は未達。コード配線 **PASS**。テスター重点確認項目に残す。

---

## 6. 今日のおすすめ空状態（v46）

### 実機

| 項目 | 結果 |
|------|------|
| 本 gate 再スモーク | **未達** |
| 理由 | 同上（端末ロック画面）。e2e force-empty probe 未到達 |
| 前セッション Concierge | モック提案あり状態で CompactSafetyNotice **PASS**（空状態ではない） |
| v45 受入 | 「今日のおすすめなし」正常表示は **実機 PASS 済み**（別ビルド） |

### コード確認

`ConciergeTodayProposalsPanel.tsx` — 空状態時:

- `testID="concierge-today-proposals-empty"`
- 文言: `todayProposalsEmpty` = 「現在、優先提案はありません」
- `CompactSafetyNotice` 配線済み（空状態・非空状態の両方）

**判定:** v46 実機空状態は未達（端末状態）。コード配線 **PASS**。テスター重点確認項目に残す。

---

## 7. Play Opt-in 経路

| 項目 | 状態 |
|------|------|
| sideload smoke (debug 再署名) | **PARTIAL PASS**（主要画面 OK） |
| Play Opt-in / store-signed | **pending** — Play Console へ v46 AAB アップロード後に手動確認 |
| 推奨手順 | `PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md` §3 → §4 |

---

## 8. Internal testing / Play 判定

| 項目 | 判定 |
|------|------|
| Internal testing | **CONDITIONAL GO** |
| Play 公開 | **NO**（維持） |
| テスター 15 人へ送付 | **可**（Play アップロード + Opt-in URL 取得後） |

### CONDITIONAL GO の根拠

**満たした条件:**

- versionCode **46** AAB 生成済み・CompactSafetyNotice bundle 検証 PASS
- ドキュメント（changelog / upload guide / status）を **46 に整合**
- v46 実機: 起動 / 主要画面 notice / API 未設定 / RM5000 **PASS**
- focused vitest **35/35 PASS**
- versionCode 45 配布禁止を明文化

**残課題（正式 GO 前 / テスター重点）:**

- Play Console アップロード + **Opt-in 経路**確認（pending）
- AllocationPlan 実機視認（コード配線済み）
- 今日のおすすめ **空状態** v46 実機（コード配線済み）
- typecheck / npm test 既存 debt（BLOCKER ではない）

---

## 9. テスター 15 人募集 — 進めてよいか

**はい — Play アップロードと Opt-in URL 取得後に送付してよい。**

送付前チェック:

1. Play Console に **versionCode 46** AAB をアップロード（45 禁止）
2. Opt-in URL で運用者自身がインストール確認
3. `TESTER_INVITATION_MESSAGE_JA.md` / changelog 要点を添付
4. 重点確認: AllocationPlan notice、今日のおすすめ空状態、長時間安定性

---

## 10. 残課題

1. Play Console へ v46 AAB アップロード → Opt-in smoke
2. AllocationPlan / 空状態の v46 実機確認（端末ロック解除後 or テスター報告）
3. typecheck 17 errors / npm test 6 fail（別フェーズ）
4. Play 公開 — **NO 維持**

---

## 11. 最終判定

# **CONDITIONAL GO**

- 配布 AAB: **versionCode 46**
- ドキュメント整合: **PASS**
- sideload smoke: **PARTIAL PASS**
- Play Opt-in: **pending**
- 15 人送付: **アップロード後 OK**
- Play 公開: **NO**
