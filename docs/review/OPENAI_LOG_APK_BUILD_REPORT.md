# OPENAI_LOG_APK_BUILD_REPORT

## 概要

OpenAI 診断ログ強化（`[CONCIERGE_OPENAI] request_end` 等）と evidence 修正を含む **versionCode 17** preview APK をローカルビルドし、実機へインストールした。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| ビルド元 HEAD | `a12eaf8` + ローカル変更（v17 bump · evidence fix） |
| ビルド経路 | `C:\p\sta` 短パス · `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` |
| 証跡 APK | `artifacts/preview-v17-local.apk` |

---

## versionCode

| ファイル | 変更前 | 変更後 |
|----------|--------|--------|
| `app.json` | 16 | **17** |
| `android/app/build.gradle` | 16 | **17** |

---

## ビルド結果

| 項目 | 値 |
|------|-----|
| Gradle | **BUILD SUCCESSFUL in 2m 49s** |
| タスク | 470 actionable（235 executed · 235 up-to-date） |
| APK サイズ | **35,892,569 bytes**（約 34.2 MB） |
| 出力（短パス） | `C:\p\sta\android\app\build\outputs\apk\release\app-release.apk` |
| リポジトリコピー | `artifacts/preview-v17-local.apk` |

---

## 同梱ログ（OpenAI 診断）

`src/services/aiStrategyService.ts` の `[CONCIERGE_OPENAI]` イベント:

| phase | フィールド |
|-------|------------|
| `request_start` | `requestStart`, `totalPromptChars`, `maxOutputTokens`, `model` |
| `response_received` | `elapsedMs`, `httpStatus`, `responseSize` |
| **`request_end`** | **`elapsedMs`, `httpStatus`, `responseSize`, `parseResult`, `errorType`, `timeout`, `timeoutMs`** |

`src/services/conciergeEvidenceTrace.ts` — `[CONCIERGE_EVIDENCE_DIAG]` / `[EVIDENCE_TRACE]`

---

## 実機インストール

| 項目 | 値 |
|------|-----|
| デバイス | `FYRWXSNNAIOR9DCM` |
| コマンド | `adb install -r artifacts/preview-v17-local.apk` |
| 結果 | 本レポート作成時に実行（Step 3 前） |

---

## 判定

| 項目 | 結果 |
|------|------|
| versionCode 17 インクリメント | **OK** |
| ローカル assembleRelease | **PASS** |
| ログ強化同梱 | **OK**（prior commit + v17 再ビルド） |
| evidence 修正同梱 | **OK**（`AiAssistantChat.tsx` `mergeEvidenceOntoMessage`） |

---

## Git

| 項目 | 値 |
|------|-----|
| ビルド時ベース | `a12eaf89164337cd1651f4f55704f7637d48fd43` |
| Commit hash（full） | `aad1895b911531c582027a36d4a4f22ef4160f6e` |
| Commit hash（short） | `aad1895` |
| Push | `origin/cursor/top3-maxdd-capital-audit` — **成功** (`a12eaf8..aad1895`)

---

## 関連

| ファイル | 内容 |
|----------|------|
| `docs/review/LOCAL_APK_BUILD_REPORT.md` | Windows MAX_PATH 短パス手順 |
| `docs/review/CONCIERGE_OPENAI_ROOTCAUSE_REPORT.md` | ログ設計の背景 |
