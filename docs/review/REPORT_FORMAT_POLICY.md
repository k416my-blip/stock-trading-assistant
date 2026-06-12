# Phase 作業完了レポート運用ルール **v4**

> エージェント向け: 作業完了時は本ルールに従い `docs/review/` に Markdown を必ず保存する。  
> v4 より **GitHub 安全同期** を Phase レポート提出フローに組み込む。

## 保存先

`docs/review/`

## ファイル名

`PHASE{番号}_{内容}_REPORT.md`

例:
- `docs/review/PHASE12_5_LONG_RUN_REPORT.md`
- `docs/review/PHASE22_ANALYST_TARGET_INTELLIGENCE_REPORT.md`

## 必須セクション（14項目 + 末尾監査ブロック）

1. 実施日時
2. **Git Commit Hash**
3. 対象Phase
4. 実装・修正したファイル一覧
5. 実装内容サマリー
6. テスト結果
7. PASS/FAIL判定
8. 残課題
9. 次に実施すべきこと
10. 再実行コマンド
11. 注意点
12. **実機監査結果**（下記フィールド必須）
13. **前回レポートとの差分**
14. **GitHub同期結果**（v4 追加 · 下記フィールド必須）

### 2. Git Commit Hash

- レポート作成・テスト実行時点の **short hash** を必ず記載する
- 取得: `git rev-parse --short HEAD`
- 記載例: `Commit: 338ebc4`
- **§6 テスト結果** には、テストを実行したコミットを必ず明記すること（§2 と同一であることが望ましい）

### 12. 実機監査結果 — 必須フィールド

| フィールド | 説明 |
|------------|------|
| heartbeatCount | 12H monitor ハートビート回数（logcat または AsyncStorage） |
| testEnded | `true` / `false` |
| AsyncStorage保存確認 | `@sta/twelve_hour_test_monitor_v1` 等の書き込み有無 |
| battery optimization状態 | 無制限 / 制限あり / 未確認 |
| foreground時間 | 推定または計測（分） |
| background時間 | 推定または計測（分） |
| 端末再起動回数 | logcat / telemetry から |
| プロセス消失回数 | runner `pidLostEvents` 等 |
| NewsAPI成功回数 | logcat / checkpoint |
| RSS成功回数 | logcat / checkpoint |
| X API成功回数 | logcat / 監査結果 |
| OpenAI成功回数 | logcat / AI 分析実行回数 |

> 実機監査が対象外の作業（ユニットテストのみ等）では各項目を `N/A（実機監査対象外）` と明記すること。

### 13. 前回レポートとの差分 — 必須フィールド

| フィールド | 説明 |
|------------|------|
| 前回レポート名 | 例: `PHASE22_1_VALUATION_GAP_INTELLIGENCE_REPORT.md` |
| 前回Commit | 例: `338ebc4` |
| 今回Commit | 例: `34ab221` |
| 変更ファイル数 | `git diff --shortstat` 等 |
| 追加機能 | 箇条書き |
| 修正内容 | 箇条書き |
| 削除機能 | 箇条書き（なければ「なし」） |
| テスト結果差分 | 例: `Unit Test 4/6 → 6/6` |

### 14. GitHub同期結果 — 必須フィールド（v4）

| フィールド | 説明 |
|------------|------|
| git status before | `git status --short` の出力（要約可） |
| commit hash before | push 前 HEAD |
| commit hash after | push 後 HEAD（skip 時は before と同一可） |
| commit message | 例: `phase22: add analyst target intelligence report and integration` |
| push result | `success` / `skipped` / `dry-run` / `commit failed` / `push failed` |
| remote branch | 例: `origin/cursor/top3-maxdd-capital-audit` |
| push URL | GitHub tree URL または remote URL |
| skipped reason | push しなかった理由（成功時は `—`） |

> §14 は `scripts/git-safe-sync-after-report.mjs` が自動追記する。手動作成時も同形式で記載すること。

## GitHub 安全同期（v4 運用）

### トリガー

以下 **すべて** 完了後:

1. Phase 作業完了
2. `docs/review/PHASE*_REPORT.md` 作成
3. テスト **PASS** または **CONDITIONAL PASS**

### 同期前チェック（必須）

1. `git status --short`
2. 秘密情報チェック（`.env` · API key · Bearer Token · OpenAI · Twelve Data · NewsAPI · X · Reddit secret）
3. `.gitignore` 確認（`.env` · `node_modules/` · `*.log`）
4. pre-commit hook 実行確認（`core.hooksPath = .githooks`）
5. テスト結果確認（Unit Test · Typecheck）

### 自動 push 条件（すべて満たす場合のみ）

- PASS または CONDITIONAL PASS
- Critical課題件数 = 0
- APIキー漏洩なし
- `.env` が git 管理対象外
- `git diff` に秘密情報なし
- Unit Test PASS
- Typecheck PASS
- **main / master へ push しない**
- **force push 禁止**

### FAIL 時

- **push しない**
- レポートファイルはローカルに保存
- チャットに **「FAILのためGitHub同期停止」** を明記
- §14 に `skipped reason` を記録

### Commit message 形式

```
phase{番号}: {内容} report and implementation update
```

例:

```
phase22: add analyst target intelligence report and integration
```

### push 先

**現在の作業ブランチ**（feature / cursor ブランチ）。`main` 直接 push 禁止。

### 実行コマンド

```powershell
node scripts/git-safe-sync-after-report.mjs `
  --report docs/review/PHASE22_REPORT.md `
  --phase 22 `
  --summary "add analyst target intelligence report and integration" `
  --pass-fail PASS `
  --critical-count 0
```

オプション:

| オプション | 用途 |
|------------|------|
| `--dry-run` | チェックのみ（commit/push なし） |
| `--no-push` | §14 更新のみ |
| `--skip-tests` | Unit Test スキップ（非推奨） |
| `--skip-typecheck` | Typecheck スキップ（非推奨） |

npm script: `npm run sync:report -- --report ... --phase ... --summary ...`

### 安全制限

- `main` / `master` へ直接 push **禁止**
- `git push --force` **禁止**
- API キー検出時 **絶対 push 禁止**
- `.env` push **禁止**
- `node_modules/` push **禁止**
- 大容量ログ（5MB超 · `*.log`）push **禁止**

## レポート末尾（必須）

末尾には **【監査サマリー】** と **【次回テスト実施可否】** をこの順で必ず記載する。

```markdown
---

## 【監査サマリー】

| 項目 | 値 |
|------|-----|
| Commit | 338ebc4 |
| PASS/FAIL | PASS |
| 次回テスト実施可否 | CONDITIONAL PASS |
| 残課題件数 | 3 |
| Critical課題件数 | 0 |
| Warning件数 | 2 |

## 【次回テスト実施可否】

**CONDITIONAL PASS**
```

## チャット報告に必ず含める項目（v4）

1. **レポート保存先**（フルパス）
2. **Commit Hash**
3. **総合判定**（PASS/FAIL/部分PASS）
4. **テスト結果**（コマンドと件数 · 実行コミット）
5. **前回との差分**（1〜3行サマリー）
6. **残課題件数**
7. **次回テスト実施可否**（PASS / CONDITIONAL PASS / FAIL）
8. **次の推奨アクション**
9. **GitHub同期結果**（success / skipped / dry-run）
10. **Commit Hash after push**（skip 時は before と同一を明記）
11. **Push URL または branch**
12. **push skipped reason**（該当時のみ）

FAIL 時は必ず **「FAILのためGitHub同期停止」** を含める。

## テンプレート（v4）

```markdown
# Phase{X}_{Y}_REPORT.md

## 1. 実施日時

## 2. Git Commit Hash

## 3. 対象 Phase

## 4. 実装・修正したファイル一覧

## 5. 実装内容サマリー

## 6. テスト結果

## 7. PASS/FAIL判定

## 8. 残課題

## 9. 次に実施すべきこと

## 10. 再実行コマンド

## 11. 注意点

## 12. 実機監査結果

## 13. 前回レポートとの差分

## 14. GitHub同期結果

| 項目 | 値 |
|------|-----|
| git status before | |
| commit hash before | |
| commit hash after | |
| commit message | |
| push result | |
| remote branch | |
| push URL | |
| skipped reason | |

---

## 【監査サマリー】

## 【次回テスト実施可否】
```

## 自動生成

| スクリプト | 役割 |
|------------|------|
| `scripts/report-audit-blocks.mjs` | §12 · §13 · §14 · 【監査サマリー】 |
| `scripts/git-safe-sync-after-report.mjs` | GitHub 安全同期 + §14 追記 |
| `scripts/phase12-5-long-run.mjs` | 12.5 長時間監査レポート |

環境変数（任意）:

- `PHASE12_5_PREV_REPORT` — 前回レポートファイル名
- `PHASE12_5_PREV_COMMIT` — 前回コミット hash

## 変更履歴

| 版 | 内容 |
|----|------|
| v1 | 10項目 + 保存先固定 |
| v2 | §12 実機監査 · 【次回テスト実施可否】 |
| v3 | §2 Commit Hash · §13 差分 · 【監査サマリー】 · チャット8項目 |
| v4 | §14 GitHub同期結果 · git-safe-sync-after-report.mjs · チャット12項目 · 安全 push 条件 |
