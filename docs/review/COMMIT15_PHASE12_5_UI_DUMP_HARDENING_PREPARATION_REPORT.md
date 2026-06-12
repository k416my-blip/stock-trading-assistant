# Commit 15 準備レポート — Phase12.5 UI Dump Hardening

**記録日時:** 2026-06-12T22:32:00+08:00  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**HEAD:** `9b82e7bf345bd6c811652751061915854bca11f2`  
**実施範囲:** dismiss.xml 固定名クラッシュ修正 · unit test · 検証 · 本レポートのみ（**git 操作なし** · **12h 本番未実施**）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| **修正** | **完了** |
| **typecheck** | **PASS** |
| **unit test** | **14/14 PASS** |
| **dry-run（修正後）** | **環境要因で長時間ハング**（後述）— 修正ロジック自体は unit test で検証済み |
| **12h 本番** | **未実施** |
| **Commit 可能か** | **はい**（本レポート + 修正 + test 同梱で commit 可能） |

---

## 1. 原因

| 項目 | 内容 |
|------|------|
| **症状** | 本番 runner が `ensureAppForeground()` 内 `dumpUi('dismiss')` で **~2 分以内に異常終了** |
| **エラー** | `errno -4094` · `fs.writeFileSync` → `docs/review/phase12-5-long-run/dismiss.xml` |
| **根因** | `dumpUi()` が **`${name}.xml` 固定名上書き**（dismiss は 1 セッション内に最大 4 回連続上書き） |
| **同型事例** | 以前の `logcat-final.txt` 固定名上書き（`phase12-5-logcat-finalization.mjs` で修正済み） |

---

## 2. 修正ファイル

| ファイル | 変更 |
|----------|------|
| `scripts/lib/phase12-5-ui-dump-finalization.mjs` | **新規** — timestamp 付き UI dump 保存 · WARN-only |
| `scripts/phase12-5-long-run.mjs` | `dumpUi()` を lib 経由に変更 · `uiDumpWarnings` / `uiDumpPaths` 追加 |
| `tests/unit/phase12-5UiDumpFinalization.test.ts` | **新規** — 8 テスト |

---

## 3. 修正内容

### 3.1 timestamp 付き UI dump 仕様

| 項目 | 値 |
|------|-----|
| **ファイル名形式** | `ui-dump-{label}-{YYYYMMDD-HHMMSS}.xml` |
| **例（dismiss）** | `ui-dump-dismiss-20260612-215900.xml` |
| **衝突時** | `resolveUniquePath` により `-1`, `-2` … suffix |
| **保存先** | `docs/review/phase12-5-long-run/` |
| **固定 `dismiss.xml`** | **書き込まない**（既存 symlink/legacy ファイルの mtime も不変） |

### 3.2 WARN 化

| 失敗種別 | 挙動 |
|----------|------|
| adb キャプチャ空 | `EMPTY_CAPTURE` WARN · `dumpUi` は `''` を返す（throw しない） |
| `writeFileSync` errno -4094 等 | `recoverable: true` WARN · runner 継続 |
| `PHASE12_5_UI_DUMP_MOCK_FAIL=1` | モック WARN（テスト用） |

`state.uiDumpWarnings` に蓄積し、進捗レポート WARN セクションに出力。

### 3.3 dismiss.xml 固定名廃止の確認

- `phase12-5-long-run.mjs` 内に **`fs.writeFileSync(..., dismiss.xml)` パスは残存なし**
- unit test: legacy `dismiss.xml` を更新しないことを確認
- 検証用ファイル作成済み: `ui-dump-dismiss-20260612-215900.xml`

---

## 4. 実行したテスト結果

### 4.1 typecheck

```text
npm run typecheck → exit 0
```

### 4.2 unit test

```text
npx vitest run tests/unit/phase12-5LogcatFinalization.test.ts
npx vitest run tests/unit/phase12-5UiDumpFinalization.test.ts
→ 14/14 PASS（2026-06-12T22:32 再確認）
```

**UiDump テストカバレッジ:**

- timestamp 付き basename
- dismiss 固定名非使用
- 同名衝突 suffix
- mock / errno -4094 で throw せず WARN
- empty capture WARN

### 4.3 dry-run

| 試行 | 結果 |
|------|------|
| 修正前（21:22:55） | **exit 0**（当セッション再実行準備時） |
| 修正後 | **長時間ハング** — 複数 `phase12-5-long-run.mjs` プロセスが残存（**22:32 手動停止済み**） |

**ハング原因（修正とは無関係）:**

- `adb-logcat-live.log` が **~147 MB**（OneDrive 配下）
- dry-run の `finalizeLogcatSnapshot` が live log **全量 copyFileSync** するため **10 分以上ブロック**
- UI dump 修正は dry-run パスでは `dumpUi()` を呼ばない

**推奨:** 次回 dry-run 前に live logcat をローテート/アーカイブするか、copy 完了まで待つ（5〜15 分）。

---

## 5. 固まっていた件について

| 項目 | 説明 |
|------|------|
| **現象** | dry-run / 検証コマンドが応答なしに見えた |
| **原因** | 147 MB logcat の finalization コピー + 複数 dry-run プロセスの重複起動 |
| **UI dump 修正** | **問題なし** — unit test 14/14 PASS |
| **対処** | ハングプロセス **停止済み**（22:32+08） |

---

## 6. 本番 12h

| 項目 | 状態 |
|------|------|
| **12h 本番 runner** | **未開始**（ユーザー指示どおり） |
| **次ステップ** | commit → dry-run（logcat ローテート後）→ preflight → 新規 12h 本番 |

---

## 7. git · Commit

| 操作 | 状態 |
|------|------|
| `git add` / `commit` / `push` | **未実施** |
| **Commit 可能か** | **はい** |

**推奨 commit message:**

```text
phase12.5: harden UI dump writes for long-run tests
```

---

## 8. 変更ファイル一覧（commit 対象候補）

- `scripts/lib/phase12-5-ui-dump-finalization.mjs`（新規）
- `scripts/phase12-5-long-run.mjs`
- `tests/unit/phase12-5UiDumpFinalization.test.ts`（新規）
- `docs/review/COMMIT15_PHASE12_5_UI_DUMP_HARDENING_PREPARATION_REPORT.md`（本ファイル）

**注意:** `ui-dump-dismiss-20260612-215900.xml` は検証用生成物 — commit するかはユーザー判断。
