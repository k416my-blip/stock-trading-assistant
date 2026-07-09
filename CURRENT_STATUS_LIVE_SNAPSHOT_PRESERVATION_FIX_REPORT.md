# CURRENT_STATUS Live Snapshot Preservation Fix Report

Generated: 2026-07-09T10:47+08:00

---

## Executive Summary

| 項目 | 結果 |
|------|------|
| **最終判定** | **PASS** |
| 問題 | `npm run status` / memory watchdog が `CURRENT_STATUS.md` 全体を上書きし PASS セクションが消失 |
| 対応 | `## Memory note` / `## Live snapshot` 以降のみ置換する merge 方式に変更 |
| テスト | `tests/unit/devStatus.test.ts` 6/6 PASS |
| 実機確認 | `npm run status` 後も AI Concierge / OOM 12h PASS セクション維持 |

---

## 原因

`scripts/dev-status.mjs` と `scripts/memory-watchdog.mjs` が `buildCurrentStatusMarkdown()` の戻り値で `CURRENT_STATUS.md` を **全文 `writeFileSync`** していました。

`buildCurrentStatusMarkdown()` は Quick resume / System memory / Dev processes / Git(簡易) のみを生成するため、手動で維持していた以下が毎回消えていました。

- AI Concierge Budget / Quantity UI Final Acceptance — PASS
- OOM 12h Stability Run — PASS
- 試行 #1 / #2、foreground WARN、次回 jsonl 改善方針
- Git 証跡セクション（12h commit / push 記録）

---

## 修正ファイル

| ファイル | 変更内容 |
|----------|----------|
| `scripts/lib/devStatusCore.mjs` | `mergeCurrentStatusLiveSections()`、`buildMemoryNoteAndLiveSnapshotMarkdown()`、`writeCurrentStatusPreserving()` を追加 |
| `scripts/dev-status.mjs` | 全文上書き → `writeCurrentStatusPreserving()` |
| `scripts/memory-watchdog.mjs` | 同上 |
| `tests/unit/devStatus.test.ts` | PASS セクション保持テストを追加 |

---

## 修正内容

### 1. 更新境界

- **保持:** `## Memory note` より上のすべて（PASS / Git 証跡含む）
- **置換:** `## Memory note` から `## Commands` 手前まで（Memory note + Live snapshot）
- **保持:** 末尾の `## Commands` セクション（存在する場合）
- **マーカーなし:** 末尾に Memory note + Live snapshot を追加

### 2. 新関数

```text
buildMemoryNoteAndLiveSnapshotMarkdown()  — Memory note + Live snapshot 本文
extractSuffixAfterLiveSnapshot()        — ## Commands 以降を抽出
mergeCurrentStatusLiveSections()        — 既存 + ライブ部分をマージ
writeCurrentStatusPreserving()          — ファイル読込 → マージ → 書込
```

### 3. Memory note 更新項目

- 現在の Cursor aggregate
- Metro / adb / node 稼働状態
- 判定（正常 / 注意 / 危険）

---

## npm run status 実行結果

```
System memory: 45.6% (14915/32678 MB)
Cursor aggregate: ~6303.6 MB (22 proc)
Metro / adb / node: 停止
Wrote CURRENT_STATUS.md
```

---

## PASS セクション維持の証拠

`npm run status` 実行後も以下が残存:

- `AI Concierge Budget / Quantity UI Final Acceptance — PASS`
- `OOM 12h Stability Run — PASS`
- `## Git`（12h commit `9ab6458` 等）
- `foreground WARN` / `次回 run 改善`
- `## Commands`（末尾）

---

## git diff の要約

`git diff CURRENT_STATUS.md`（`npm run status` 後）:

| 変更範囲 | 内容 |
|----------|------|
| Memory note | aggregate 6303.6 MB、判定「注意 — 5 GB 超過」に更新 |
| Live snapshot | 時刻 10:47 +08、system 45.6%、Cursor 6303.6 MB に更新 |
| **変更なし** | AI Concierge PASS、OOM 12h PASS、Git 証跡、試行 #1/#2 |

diff 行数: Memory note / Live snapshot 付近のみ（約 30 行）

---

## テスト結果

```
tests/unit/devStatus.test.ts — 6/6 PASS
```

追加テスト:

- `mergeCurrentStatusLiveSections preserves PASS blocks and updates live sections only`
- `buildMemoryNoteAndLiveSnapshotMarkdown marks cursor under 5GB as normal`

---

## 残課題

| 項目 | 内容 |
|------|------|
| Memory note 手動記述の一部 | 12h run 中 Cursor 最大 5101 MB 等の固定記述は git HEAD 版に依存。`npm run status` では Memory note テーブル全体が置換されるため、過去の「整理済み」注記は次回 status で上書きされる |
| Cursor aggregate | 現状 ~6303 MB（5 GB 超過）。Reload Window 推奨 |
| CURRENT_STATUS 未 commit | 本 fix 後の `npm run status` による Live snapshot 更新が working tree に残る |

---

## 最終判定

# **PASS**

`npm run status` が CURRENT_STATUS.md の重要 PASS 記録を破壊しないよう修正完了。AI Concierge と OOM 12h Stability Run は **PASS 済み**として維持。
