# Post Phase13–23 Working Tree 残差分整理レポート

監査日: 2026-06-02  
前提: Phase13–23 Commits 1〜6 は GitHub push 完了（`1254701`）  
実施範囲: **分類・監査のみ**（`git add` / `commit` / `push` は未実施）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD | `125470171dad71ba51b795ffb4d9f2be7bfd158f` |
| remote 同期 | **0	0 — PASS** |
| 未コミット残差分 | **701 件**（modified **91** / untracked **610**） |
| **A. 次にコミットすべき** | **~45 件**（Twelve-Hour 監視機能バンドル + 監査 docs 任意） |
| **B. 破棄してよい** | **~375 件**（実行成果物・分析 JSON・ログ・画像） |
| **C. 判断保留** | **~280 件**（forward-validation 監査群・横断 src 変更・IDE） |
| **D. 絶対コミット禁止** | **.env + 禁止カテゴリ一式** |
| **総合判定** | **PASS**（整理方針確定。commit は未実施） |

---

## 1. HEAD hash

```
125470171dad71ba51b795ffb4d9f2be7bfd158f
```

message: `phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring`

---

## 2. remote 同期確認

```bash
git rev-list --left-right --count origin/cursor/top3-maxdd-capital-audit...HEAD
```

| 結果 | 期待値 | 判定 |
|------|--------|------|
| `0	0` | `0 0` | **PASS** |

`cursor/top3-maxdd-capital-audit` は `origin` と同期済み。

---

## 3. `git status` サマリー

```bash
git status --porcelain
```

| 区分 | 件数 |
|------|------|
| **合計** | **701** |
| modified (` M`) | 91 |
| untracked (`??`) | 610 |

### 3.1 カテゴリ別内訳（全 701 件）

| カテゴリ | 件数 | 典型パス |
|----------|------|----------|
| `scripts/forward-validation*` | 232 | バックテスト監査 CSV/TS |
| `scripts/` その他 | 162 | probe / malaysia-v4 / verify 等 |
| `docs/review/`（phase12-5 以外） | 64 | 監査レポート・evidence |
| `scripts/openai-*.json` | 55 | OpenAI 分析成果物 |
| device verify 成果物 | 46 | `scripts/ai-enhanced-analysis-device-verify/**` |
| `docs/review/phase12-5-long-run/**` | 45 | 長時間実行ログ・png・xml |
| `src/**` | 35 | アプリコード差分 |
| `*.png` / `*.jpg` / `*.log` 等 | 27 | スクリーンショット・ログ |
| dotfiles | 3 | `.cursorignore`, `.vscode/settings.json`, `.expo-start-log.txt` |
| その他 | 32 | `vitest.soak.config.ts`, PDF 等 |

### 3.2 優先確認パス

| パス | 状態 | 備考 |
|------|------|------|
| `App.tsx` | **clean** | 未コミット差分なし |
| `src/context/BursaMaterialContext.tsx` | `M` (+18) | Twelve-Hour + diagnostics 配線 |
| `package.json` | `M` (+6 scripts) | twelve-hour / device audit 用 npm scripts |
| `.vscode/settings.json` | `M` | IDE 設定 |
| `.cursorignore` | `M` | ローカル ignore 拡張 |
| `docs/review/**` | `M` + `??` 多数 | 監査レポート + phase12-5 成果物混在 |
| `scripts/openai-*.json` | `??` 55 件 | 分析成果物 |
| `*.png` / `*.jpg` / `*.log` | `M`/`??` 27 件 | 主に device verify / phase12-5 |
| `.env` | ローカル存在 | **`.gitignore` 対象 — untracked ではない** |

---

## 4. 未コミットファイル分類

### A. 次にコミットすべき

#### A-1. Twelve-Hour Test Monitor 機能バンドル（推奨 Commit 7）

Phase13–23 とは独立した **12 時間実機監視** 機能。Commit 5 で意図的に外した `BursaMaterialContext` 配線を含む一連の変更。

| パス | 状態 | 理由 |
|------|------|------|
| `src/context/BursaMaterialContext.tsx` | M | `mapBursaAnalysisError` / 1h リフレッシュ / `noteTwelveHourNewsFetch` |
| `src/context/ProactiveConciergeContext.tsx` | M | `isTwelveHourBackgroundOpsAllowed` / `noteTwelveHourAiResponse` |
| `src/screens/SettingsScreen.tsx` | M | 実機監査ボタン（`deviceLiveApiAudit`） |
| `src/constants/storageKeys.ts` | M | 監視用 storage key 追加 |
| `src/services/twelveHourTestMonitor.ts` | ?? | コア API |
| `src/services/twelveHourTestMonitorCore.ts` | ?? | |
| `src/services/twelveHourTestMonitorPersistence.ts` | ?? | |
| `src/types/twelveHourTestMonitor.ts` | ?? | |
| `src/constants/twelveHourTestMonitor.ts` | ?? | |
| `src/hooks/useTwelveHourTestRuntime.ts` | ?? | |
| `src/services/deviceLiveApiAudit.ts` | ?? | Settings から呼び出し |
| `src/constants/deviceLiveApiAudit.ts` | ?? | |
| `src/constants/newsApiRateLimit.ts` | ?? | NewsAPI 429 対策 |
| `src/components/BursaDataErrorBoundary.tsx` | ?? | エラー境界 |
| `tests/unit/twelveHourTestMonitor.test.ts` | ?? | |
| `tests/unit/newsApiRateLimit.test.ts` | ?? | |
| `tests/unit/phase12Stability.test.ts` | ?? | Phase12 安定性（関連） |
| `package.json` | M | `verify:twelve-hour-*` 等 5 scripts + `sync:report` |
| `scripts/twelve-hour-test-preflight-verify.ts` | ?? | preflight |
| `scripts/twelve-hour-api-key-audit.mjs` | ?? | API キー監査 |
| `scripts/verify-material-fallback-without-newsapi.ts` | ?? | material fallback 検証 |
| `scripts/newsapi-429-diagnosis.mjs` | ?? | 429 診断 |
| `scripts/git-safe-sync-after-report.mjs` | ?? | `sync:report` 実体 |
| `scripts/phase12-stability-test.mjs` | ?? | （HEAD に既存の場合は差分のみ） |

> **注意**: A-1 は **まとめて 1 コミット** が望ましい（`BursaMaterialContext` 単体は `twelveHourTestMonitor` 未コミットだと import 不能）。

#### A-2. Phase13–23 監査ドキュメント（任意 Commit 8 — docs のみ）

GitHub 上のコード push 後の監査証跡。コード変更なし。

| パス | 状態 |
|------|------|
| `docs/review/PHASE13_16_*` | ?? |
| `docs/review/PHASE17_19_5_*` | ?? |
| `docs/review/PHASE20_21_8_*` | ?? |
| `docs/review/PHASE22_*` | ?? |
| `docs/review/PHASE23_*` | ?? |
| `docs/review/PHASE13_23_*` | ?? |
| `docs/review/PHASE13_16_DISCLOSURE_SPLIT_PLAN.md` | ?? |
| `docs/review/PHASE13_23_COMMIT_STRATEGY_REPORT.md` | ?? |
| `docs/review/POST_PHASE13_23_WORKTREE_CLEANUP_AUDIT_REPORT.md` | ??（本レポート） |

**含めない**: `docs/review/phase12-5-long-run/**`（→ B/D）、`evidence/*.log`（→ B/D）

---

### B. 破棄してよい

ローカル実行・検証の生成物。リポジトリ履歴に残す必要なし。`git restore` / 削除 / `.gitignore` 強化で整理。

| カテゴリ | 件数 | 代表パス | 理由 |
|----------|------|----------|------|
| phase12-5 長時間実行 | 45 | `docs/review/phase12-5-long-run/**` | png/xml/log/jsonl — 実行スナップショット |
| device verify（modified） | 46 | `scripts/ai-enhanced-analysis-device-verify/**` | スクリーンショット・UI dump |
| openai 分析 JSON | 55 | `scripts/openai-*.json` | 再生成可能な分析成果物 |
| メディア・ログ | 27 | `scripts/portfolio-*.png`, `*logcat*.txt`, `.expo-start-log.txt` | 一時ログ・スクショ |
| 監査 CSV/JSON 出力（modified） | 数件 | `scripts/top3-feature-walkforward-*.json` | ローカル監査の再出力 |
| phase12 レポート差分（内容古化） | 2 | `PHASE12_5_LONG_RUN_REPORT.md`, `PHASE12_5_PARTIAL_REPORT.md` | push スコープ外・実行途中状態 |

**推奨操作例**（実行はユーザー判断後）:

```bash
git restore docs/review/phase12-5-long-run scripts/ai-enhanced-analysis-device-verify
# openai-*.json / ログ類は削除または .gitignore 追加
```

---

### C. 判断保留

コミット価値はあるが、スコープ未確定・別ブランチ候補・要レビュー。

| カテゴリ | 件数 | 代表 | 保留理由 |
|----------|------|------|----------|
| forward-validation 監査群 | 232 | `scripts/forward-validation-*.ts` | 大量・US 戦略監査。別 PR / 別リポジトリ検討 |
| scripts その他 | ~100+ | `malaysia-v4-rakuten-*`, `monitor8*`, `probe-*` | 口座・運用監査。本番アプリと分離検討 |
| 横断 src 変更 | ~15 | 下表 | Phase12/安定化と Twelve-Hour 以外の並行作業 |
| IDE / ツール | 3 | `.vscode/settings.json`, `.cursorignore` | 個人環境設定。チーム方針次第 |
| docs その他 | ~20 | `FINAL_*`, `device-live-api-audit/`, `evidence/` | 第三者レビュー証跡。公開範囲要確認 |
| `vitest.soak.config.ts` | 1 | soak テスト設定 | nativeSoak 方針確定後 |
| `scripts/loadAuditApiKeys.mjs` | 1 | Node 監査用 .env 読み込み | コミット可だが .env 依存 — ドキュメント必須 |

#### C — 横断 `src/` modified 一覧（Twelve-Hour 外）

| パス | 差分規模 | 保留理由 |
|------|----------|----------|
| `src/navigation/MainTabNavigator.tsx` | +48 行 | UI ナビ変更 — 要単体確認 |
| `src/components/AppErrorBoundary.tsx` | M | 安定化 — Twelve-Hour と別軸 |
| `src/context/ProductionStabilityContext.tsx` | M | 同上 |
| `src/context/app/useAppApiKeys.ts` | M | API キー UI |
| `src/screens/AssetManagementScreen.tsx` | M | 画面横断変更 |
| `src/screens/MarketMonitoringScreen.tsx` | M | 同上 |
| `src/screens/TodayTradingScreen.tsx` | M | 同上 |
| `src/services/bursa/bursaPhase6–8Analysis.ts` | 小 | Bursa ランキング微修正 |
| `src/services/bursa/bursaMonitoring*.ts` | M | 監視ストレージ |
| `src/services/bursa/bursaMaterialDataQuality.ts` | M | 品質チェック |
| `src/services/bursa/bursaPeerSnapshotService.ts` | M | |
| `src/services/bursa/bursaRankingMetrics.ts` | M | |
| `src/services/bursa/bursaShikihoComments.ts` | M | |
| `src/services/aiStrategyService.ts` | M | AI 戦略 |
| `src/services/newsApiEverythingTest.ts` | M | NewsAPI テスト |
| `src/services/performanceCostRuntime.ts` | M | パフォーマンス |
| `src/services/productionStability/*` | M | 安定化 |
| `src/utils/consoleLogFilter.ts` | M | ログフィルタ |

---

### D. 絶対にコミットしてはいけない

| 対象 | 状態 | 理由 |
|------|------|------|
| `.env` | ローカル存在（gitignore 済） | API キー・シークレット本体 |
| `scripts/openai-*.json` | ?? 55 件 | 禁止カテゴリ + 分析データ混入リスク |
| `docs/review/phase12-5-long-run/**` | M/?? | 明示禁止（png/log/xml 混在） |
| `*.png` / `*.jpg` / `*.log`（verify / long-run） | 多数 | 禁止カテゴリ |
| device verify 成果物 | 46 件 | 禁止カテゴリ |
| Bearer / sk- / AIza 生キー | — | スキャン対象。fixture 以外は DUMMY 化必須 |
| `scripts/maybank-*.pdf` 等 | ?? | 取得ドキュメント — ライセンス・サイズ |

**シークレットスキャン（サンプル）**: `loadAuditApiKeys.mjs` は `.env` を **実行時読み込み** のみ（ファイル内にキー埋め込みなし）→ コミットする場合は **C**、キー本体は **D**。

---

## 5. コミット候補（A）まとめ

| 候補コミット | 想定件数 | 内容 |
|--------------|----------|------|
| **Commit 7** | ~25–35 | Twelve-Hour Test Monitor + Material/Concierge/Settings 配線 + tests + package.json scripts |
| **Commit 8（任意）** | ~30–40 | `docs/review/PHASE13–23` 監査レポートのみ |

---

## 6. 破棄候補（B）まとめ

| 操作対象 | 件数（概算） |
|----------|-------------|
| `git restore` — phase12-5-long-run, device-verify modified | ~91 modified の一部 |
| 削除推奨 — `scripts/openai-*.json` | 55 |
| 削除推奨 — png/log/txt 一時ファイル | 27+ |
| **合計整理対象** | **~375 件** |

---

## 7. コミット禁止候補（D）まとめ

- `.env`（絶対 add 禁止）
- `scripts/openai-*.json`（55 件）
- `docs/review/phase12-5-long-run/**`（45 件）
- device verify スクリーンショット/XML（46 件）
- 検証用 `*.log` / 実行ログ

---

## 8. 次の推奨アクション

1. **B を先に整理** — phase12-5 / device-verify / openai-json / ログを restore または削除し、working tree を視認可能にする。
2. **A-1 を Commit 7 として準備** — Twelve-Hour バンドルを一覧化 → typecheck → 関連 unit test → commit（push は別承認）。
3. **A-2 を任意 Commit 8** — 監査 docs のみ。`evidence/*.log` は含めない。
4. **C はブランチ分離を検討** — `forward-validation-*`（232 件）は別トピック。`MainTabNavigator` 等はレビュー後にコミット判断。
5. **D の再発防止** — `.gitignore` に `scripts/openai-*.json`, `docs/review/phase12-5-long-run/`（未追跡分）等を追加検討。

---

## 9. PASS / FAIL

| チェック | 判定 |
|----------|------|
| HEAD = `1254701` | **PASS** |
| remote 同期 `0 0` | **PASS** |
| `git status` 一覧化 | **PASS**（701 件） |
| 優先パス確認 | **PASS** |
| A/B/C/D 分類 | **PASS** |
| commit / push 未実施 | **PASS** |
| **総合（残差分整理監査）** | **PASS** |

---

## 10. 停止宣言

残差分整理監査完了。`git add` / `commit` / `push` は **一切実行していない**。

---

*Evidence: `git status --porcelain`（701 lines）, `git rev-list --left-right --count`, `git diff HEAD` on priority paths, カテゴリ集計スクリプト*
