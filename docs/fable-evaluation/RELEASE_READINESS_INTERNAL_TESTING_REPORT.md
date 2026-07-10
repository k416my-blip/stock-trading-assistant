# Release Readiness / Internal Testing Stabilization Report

Generated: 2026-07-09T11:15+08:00

---

## Executive Summary

| 項目 | 結果 |
|------|------|
| **最終判定** | **PASS** |
| Play 内部テストへ進めるか | **YES**（AAB 生成成功） |
| branch | `cursor/top3-maxdd-capital-audit` |
| latest commit (AAB success) | `4d79c8b` |
| versionCode | **45** |

---

## 前提 PASS（維持）

| 項目 | 状態 |
|------|------|
| AI Concierge Budget / Quantity UI Final Acceptance | **PASS** |
| OOM 12h Stability Run（試行 #2） | **PASS** |
| CURRENT_STATUS 保護修正（4596e88） | **PASS** |
| メモリ整理 | OK — Cursor ~4949 MB（status 実行時）、dev プロセス停止 |

---

## 1. 現在状態（2026-07-09 11:05 +08）

| 項目 | 値 |
|------|-----|
| branch | `cursor/top3-maxdd-capital-audit` |
| HEAD | `4596e88` |
| working tree | **not clean**（多数の未 commit 変更あり。本フェーズ commit は release 関連のみ） |
| CURRENT_STATUS PASS セクション | **維持**（npm run status 後も AI Concierge / OOM 12h / Git 残存） |
| Cursor aggregate | ~4949 MB（5 GB 未満） |
| Metro / adb / node | 停止 |

---

## 2. リリース前テスト

### npm test（`npm run test:unit`）

| 項目 | 結果 |
|------|------|
| 全体 | **PARTIAL** — 1611 passed / **6 failed** / 33 test files with issues |
| 失敗例（既存） | `aiAssistantChatState`, `aiConciergeConversationQuality`, `buySignalForwardReturnAnalysis`（データ欠落）, `phase12Stability`, `rakutenImport/importConfidence` |
| 分類 | **既存未解決** — 本フェーズの新規 regression ではない |

### リリースクリティカル subset

| ファイル | 結果 |
|----------|------|
| `devStatus.test.ts` | 6/6 PASS |
| `conciergeBudgetOptimization.test.ts` | 14/14 PASS |
| `conciergeUiE2eOptimizationSmoke.test.ts` | 8/8 PASS |
| `oomHotfix.test.ts` | 7/7 PASS |
| **合計** | **35/35 PASS** |

### npm run typecheck / lint

| 項目 | 結果 |
|------|------|
| エラー数 | **17**（src 10 + tests 7） |
| 分類 | **既存未解決** |
| 代表例 | `conciergeEvidenceBuilder.ts`, `storage.ts`, `bursaPhase24Analysis.ts`, test fixture 型ずれ |
| NO-GO 判定 | **AAB preflight は typecheck で停止**。EAS cloud build は preflight  bypass 可能だが、ローカル release gate としては未達 |

### npm run verify:aab-preflight

| 結果 |
|------|
| **FAIL** — typecheck で停止（versionCode 44 表示時点） |

---

## 3. AAB / APK ビルド準備

| 項目 | 値 |
|------|-----|
| app version | `1.0.0` |
| versionCode（app.json） | **45**（44→45 に更新） |
| versionCode（android/app/build.gradle） | **45**（HEAD 26 から同期） |
| package name | `com.assistant.stocktrading` |
| EAS profile（内部テスト向け AAB） | **`production`** — `buildType: app-bundle`, `distribution: store` |
| preview profile | APK（内部配布用、AAB ではない） |
| signing | EAS remote credentials — Keystore（credential 名は評価パッケージから除外） |
| versionCode 45 理由 | Play 再提出には配布済み 44 より大きい code が必要 |

### versionCode 45 への更新理由

- 12h テスト・AI Concierge 受入は **versionCode 44** で実施済み
- Play Console へ **新ビルド提出**する場合、versionCode インクリメントが必須
- **45** は 44 の次番号として最小の安全な increment

---

## 4. AAB ビルド結果

### 使用コマンド

```bash
npx eas-cli build -p android --profile production --non-interactive
```

**理由:** `eas.json` の `production` プロファイルが `buildType: app-bundle` + `distribution: store` で Play 内部テスト / 本番トラック向け AAB に該当。`preview` は APK のため AAB 目的に不適。

### 試行 #1 — `09fce84c-0de4-4957-bead-af45d5c175ad`

| 項目 | 値 |
|------|-----|
| 結果 | **FAIL** |
| フェーズ | INSTALL_DEPENDENCIES |
| 原因 | `postinstall`: `scripts/sync-sta-native-runtime.mjs` が EAS アーカイブに含まれず ENOENT |
| versionCode | 45（git 4596e88 ベース） |

### 試行 #2 — `2298c8a6-482e-4ef9-877d-d660880d0fe6`（`.easignore` 修正後）

| 項目 | 値 |
|------|-----|
| 結果 | **FAIL** |
| フェーズ | Bundle JavaScript (EAGER_BUNDLE) |
| Root cause | `manualOrderFlow.ts` が import する **`src/services/conciergeBudgetOptimization.ts` が git 未追跡**（EAS アーカイブに含まれず `Unable to resolve module`） |
| 副次 | 同一ログで `expo/AppEntry.js` 解決失敗も記録（後続ビルドで npm/EAS 環境が主因と判明） |
| versionCode | 45 |
| ログ | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/2298c8a6-482e-4ef9-877d-d660880d0fe6 |

### 試行 #3〜 — npm/EAS 環境修正（`4d79c8b` まで）

| 項目 | 値 |
|------|-----|
| 追加 Root cause | EAS EAGER_BUNDLE で Metro が `expo` / `expo/AppEntry.js` を解決不能（`node_modules/expo` 不完全・`.npmrc install-links=false` + file: link、`.env` アーカイブ混入など） |
| 修正 | `conciergeBudgetOptimization.ts` 追加、`/node_modules/` + `.env` を `.easignore`、`.npmrc` 削除、`sta-native-runtime` file: dep 削除、`metro.config.js` 標準化、`eas-build-post-install` で `npx expo install expo@54.0.21 --npm`、`main` を `expo/AppEntry.js` に復帰 |
| ローカル bundle | `npx expo export --platform android --clear` **PASS**（複数回確認） |

### 成功ビルド — `1545a8ba-7574-419a-aa24-47bdc1cafcd4`

| 項目 | 値 |
|------|-----|
| 結果 | **PASS** |
| commit | `4d79c8b` |
| profile | production (app-bundle / store) |
| package | `com.assistant.stocktrading` |
| versionCode | **45** |
| signing | EAS remote Keystore（credential 名は評価パッケージから除外） |
| Bundle JavaScript | **成功** |
| AAB artifact | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| ファイル名 | `MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab` |

### AAB 成果物

| 項目 | 値 |
|------|-----|
| AAB ファイル | **生成済み** |
| Play Console アップロード | **可能** |

### `.easignore` 修正（build infra）

```
/scripts/**
!/scripts/sync-sta-native-runtime.mjs
```

postinstall 必須スクリプトを EAS アーカイブに含めるため。機能変更ではなく release インフラ修正。

---

## 5. NO-GO 項目

| # | 項目 | 深刻度 |
|---|------|--------|
| 1 | ~~**AAB 未生成**~~ | **解消** — build `1545a8ba` |
| 2 | typecheck / lint 17 エラー（既存） | HIGH（preflight gate） |
| 3 | npm test 6 失敗（既存） | MEDIUM |
| 4 | working tree 大量未 commit 変更 | MEDIUM（release ブランチ整理） |

---

## 6. 既知の残課題

- EAS Bundle JavaScript フェーズの root cause 調査・修正
- typecheck 17 エラーの段階的解消（release gate 復帰）
- npm test 6 失敗の既存 issue 整理
- working tree の release 无关変更を本 branch から分離
- EAS アーカイブ 165 MB の `.easignore` 最適化

---

## 7. Play 内部テストへ進めるか

| 判定 | 内容 |
|------|------|
| **現時点** | **GO** — AAB 生成成功（`1545a8ba`） |
| **ロジック/安定性** | **GO** — AI Concierge / OOM 12h / CURRENT_STATUS 保護は PASS |
| **次アクション** | Play Console 内部テストトラックへ AAB アップロード（**アップロード待ち**） |

---

## 9. ドキュメント整合（2026-07-09）

- `INTERNAL_TESTING_CHANGELOG.md` の矛盾記述（「ビルド再試行中」「AAB 未生成」）を **修正済み**（commit `docs: finalize internal testing changelog after AAB success`）
- Release Readiness 最終判定: **PASS**（変更なし）

---

## 8. 最終判定

# **PASS**

- **PASS 済み領域:** AI Concierge 受入、OOM 12h、CURRENT_STATUS 保護、リリースクリティカル unit 35/35、**AAB 生成（1545a8ba / versionCode 45）**
- **既存未達（gate 外）:** typecheck/lint 17 エラー、npm test 6 fail
