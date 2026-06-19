# BUNDLE_RECOVERY_REPORT

## 概要

Release Build 復旧の第一段階 — Metro release bundle（`createBundleReleaseJsAndAssets`）の復旧結果。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 対象 | `src/services/bursa/bursaRevenueRevisionSnapshotStore.ts` |
| 目標 versionCode | 16 |

---

## 問題

`:app:createBundleReleaseJsAndAssets` が以下で **FAIL**:

```
Error: Unable to resolve module fs from
  src\services\bursa\bursaRevenueRevisionSnapshotStore.ts
```

Phase23 Revenue Revision スナップショット store が Node 専用 `fs` をトップレベル import しており、React Native release bundle に含められなかった。

---

## 修正内容

### プラットフォーム分離（`.native.ts` + `.shared.ts`）

| ファイル | 役割 |
|----------|------|
| `bursaRevenueRevisionSnapshotStore.shared.ts` | 型・マージ・計算ロジック（fs 非依存） |
| `bursaRevenueRevisionSnapshotStore.native.ts` | React Native — **in-memory のみ**（AsyncStorage / fs 不使用） |
| `bursaRevenueRevisionSnapshotStore.ts` | Node/CLI — `fs` 永続化（vitest / tsx 用） |

Metro は React Native 向けに `.native.ts` を自動解決するため、release bundle から `fs` import が除外される。

### Import チェーン（変更なし）

```
bursaRevenueRevisionProviders.ts
  → bursaRevenueRevisionSnapshotStore（native 解決）
```

---

## 検証

### `:app:createBundleReleaseJsAndAssets`

| 実行 | 結果 | 備考 |
|------|------|------|
| 修正前 | **FAIL** | `fs` モジュール解決不可 |
| 修正後（2026-06-19） | **PASS** | `BUILD SUCCESSFUL` |
| 再確認（main パス） | **PASS** | `UP-TO-DATE` / `BUILD SUCCESSFUL in 3s` |

**bundle エラー:** なし（修正後）

### ユニットテスト

```
tests/unit/bursaRevenueRevisionProviders.test.ts → 4/4 PASS
```

---

## 結論

| 項目 | 状態 |
|------|------|
| bundle PASS/FAIL | **PASS** |
| エラー有無 | **なし**（`fs` 解決問題は解消） |
| 次ステップ | `assembleRelease`（Windows MAX_PATH 対策は `LOCAL_APK_BUILD_REPORT.md` 参照） |
