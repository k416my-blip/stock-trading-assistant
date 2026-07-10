# Working Tree Audit After Fable Review

Generated: 2026-07-10T11:10+08:00  
Command basis: `git status --short` / `(git status --short | Measure-Object -Line).Lines`  
Context: Fable 外部評価受け入れ後の棚卸し（機能修正なし）

---

## 1. 総件数

| 時点 | 件数 | 備考 |
|------|------|------|
| Fable 指摘直後（確認時） | **577** | `??` 573 + ` M` 4 |
| ignore 追加後（本監査ドキュメント作成前） | **578** | `.tmp-eas*` が status から消え、`.gitignore` / `.easignore` の `M` と新規証跡 MD が加算 |

「多数の未 commit」という自己申告は **過小**。規模は **約 577 件**。

### 変更プレフィックス内訳（577 時点）

| 種別 | 件数 |
|------|------|
| `??` 未追跡 | 573 |
| ` M` 追跡済み変更 | 4 |
| staged | 0 |

---

## 2. 変更種別別の件数（概算分類）

| 分類 | 件数（概算） | 内容例 |
|------|--------------|--------|
| scripts/ 未追跡 | **441** | 監査スクリプト、forward-validation、一時 probe、monitor 系など |
| docs/review/ 未追跡 | **94** | COMMIT* レポート、検証レポート、twelve-hour-test 周辺 md/ps1 |
| tests/ 未追跡 | **16** | Concierge / OOM 関連テスト、`*.mjs.src` パッチ残骸 |
| ルート Markdown 未追跡 | **7** | Concierge/OOM 補助レポート、`PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md` 等 |
| ルートその他 | **12** | `_*.mjs`、`run-*.mjs`、`eas-build-view.json`、`ui-now2.xml` 等 |
| EAS/Expo 一時 | **2+2** | `.tmp-eas.json` / `.tmp-eas-build.json`（→ ignore 化）、`.eas-prebuild-test/` / `.expo-export-android/` |
| docs/fable-evaluation.zip | **1** | 評価用 zip（git 外運用） |
| docs/other | **1** | 例: `docs/AAB_BUILD_POLICY.md` |
| android 追跡変更 | **1** | `android/app/build.gradle` |
| scripts 追跡変更 | **3** | `top3-feature-walkforward-*.json` |
| src/ 変更 | **0** | 本監査時点で status 上の src 差分なし |

### 追跡済み変更（4）

| ファイル | 分類 | 本フェーズ |
|----------|------|------------|
| `android/app/build.gradle` | AAB / versionCode 関連の可能性 | **commit しない**（差分精査は次） |
| `scripts/top3-feature-walkforward-dd-audit.json` | 戦略監査データ | **commit しない** |
| `scripts/top3-feature-walkforward-oos-ranking-capital-normalized.json` | 同上 | **commit しない** |
| `scripts/top3-feature-walkforward-oos-ranking.json` | 同上 | **commit しない** |

---

## 3. commit 済みと未 commit の差分（重要）

### 既に commit 済み（例）

- Fable 評価パッケージ一式（`4d8a376`）
- Closed testing 運用 docs（`2709bda`）
- AAB / Release Readiness / changelog 関連の主要 docs
- `tests/unit/devStatus.test.ts`（tracked）

### 未 commit だが「release-critical」に使われた疑いが強いもの

| ファイル | git ls-files |
|----------|--------------|
| `tests/unit/devStatus.test.ts` | **tracked** |
| `tests/unit/conciergeBudgetOptimization.test.ts` | **未追跡** |
| `tests/unit/conciergeUiE2eOptimizationSmoke.test.ts` | **未追跡** |
| `tests/unit/oomHotfix.test.ts` | **未追跡** |
| `tests/unit/e2eMetroEnv.test.ts` | **未追跡** |

**危険な差分:** 「35/35 PASS」の一部テストファイルがリポジトリ未追跡のままローカル実行されている可能性が高い。CI / 他マシン再現性と Fable 指摘（型ズレ）の両面で、次フェーズの整理対象。

### Fable / Release readiness 関連（ルート未追跡の例）

- `PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md`（未追跡のまま残存しうる）
- Concierge / OOM 補助レポート複数

→ 必要なら別コミットで選別。本フェーズでは証跡 2 ファイル + ignore のみ。

---

## 4. commit すべきもの（本フェーズ）

| 対象 | 理由 |
|------|------|
| `FABLE_EXTERNAL_REVIEW_RESPONSE.md` | Fable 受け入れ証跡 |
| `WORKING_TREE_AUDIT_AFTER_FABLE.md` | 本監査 |
| `.gitignore` | `.tmp-eas*.json` 等の安全 ignore |
| `.easignore` | EAS アップロードからも除外 |

---

## 5. commit すべきでないもの

| 対象 | 理由 |
|------|------|
| 大容量 logcat | 既に ignore。絶対に add しない |
| AAB / APK 本体 | バイナリ |
| telemetry / checkpoint 全量 | 大容量 |
| `.tmp-eas.json` / `.tmp-eas-build.json` | 一時。ignore 化 |
| `.eas-prebuild-test/` / `.expo-export-android/` | ローカルビルド残骸 |
| `docs/fable-evaluation.zip` | 配布用。Markdown を正とする |
| `android/app/build.gradle` 差分 | 未精査 |
| top3 walkforward JSON 差分 | release 无关 |
| scripts/ 大量未追跡 | 選別なしの一括 commit 禁止 |
| docs/review/ 大量未追跡 | 同上 |
| 免責 UI / 型修正 / ロジック修正 | **次フェーズ** |

---

## 6. ignore すべきもの（本フェーズ対応）

| パターン | 状態 |
|----------|------|
| `.tmp-eas.json` | **追加済み**（`.gitignore` / `.easignore`） |
| `.tmp-eas*.json` | **追加済み** |
| `*.tmp.json` | **追加済み**（狭義の一時 JSON） |

検証:

```text
git check-ignore -v .tmp-eas.json
→ .gitignore: .tmp-eas*.json  .tmp-eas.json
```

既存のまま維持:

- `docs/review/twelve-hour-test/adb-logcat*.log`
- `.env*` / keystore 系
- `docs/review/` の大容量 evidence パターン

---

## 7. 削除候補（本フェーズでは削除しない・方針のみ）

| 候補 | 理由 |
|------|------|
| `.eas-prebuild-test/` | ローカル prebuild 残骸 |
| `.expo-export-android/` | export 残骸 |
| ルート `_*.mjs` / 一時 probe | 使い捨てデバッグ |
| `tests/unit/_*.mjs.src` / `_write-oom-*.mjs` | パッチ生成残骸の可能性 |
| `ui-now2.xml` | 一時 UI dump |
| `docs/fable-evaluation.zip` | 再生成可能（任意削除可） |

削除は誤爆リスクがあるため、次の整理フェーズでパス単位レビュー後に実施。

---

## 8. 大容量 logcat 除外確認

| 確認 | 結果 |
|------|------|
| `git ls-files …/adb-logcat-final-20260709-091018.log` | **空**（未管理） |
| `git check-ignore -v …` | `.gitignore:94:docs/review/twelve-hour-test/adb-logcat*.log` |
| commit 対象 | **含めない** |

---

## 9. 次フェーズ前に危険な差分

1. **未追跡の release-critical テスト**（Concierge / OOM）— 再現性と型整合の根拠が弱い
2. **未精査の `android/app/build.gradle`** — versionCode / 署名関連の可能性
3. **577 件規模の未整理** — `git add -A` は禁止
4. **一時 EAS JSON** — ignore 済みだが中身の秘密有無は未監査
5. **自己申告 PASS と working tree 実態の不一致** — 配布判断材料が「今のツリー」と一致しない

---

## 10. 最終判断

| 項目 | 判定 |
|------|------|
| 棚卸し | **完了** |
| 規模認識の修正 | 577 件を正式記録 |
| `.tmp-eas*` ignore | **完了・検証済み** |
| 大容量 logcat | **除外確認済み** |
| 機能修正 | **未実施（意図どおり）** |
| 次アクション | P0（免責・規制・API UX・typecheck 実態・ツリー整理継続） |

**WORKING_TREE: AUDITED — 整理は ignore + 証跡まで。大規模クリーンアップは次フェーズ。**
