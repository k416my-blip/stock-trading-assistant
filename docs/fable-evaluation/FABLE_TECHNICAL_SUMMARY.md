# Fable Technical Summary

Generated: 2026-07-10  
対象: Malaysia Stock AI Concierge / `com.assistant.stocktrading` / versionCode **45**

---

## 1. スタック構成

| 項目 | 値 |
|------|-----|
| アプリ名 | Malaysia Stock AI Concierge |
| リポジトリ | stock-trading-assistant |
| UI | React Native |
| フレームワーク | Expo **54.0.21** |
| React Native | **0.81.5** |
| 配布 | EAS Build（Android AAB） |
| branch | `cursor/top3-maxdd-capital-audit` |

---

## 2. ビルド識別

| 項目 | 値 |
|------|-----|
| package | `com.assistant.stocktrading` |
| versionName | `1.0.0` |
| versionCode | **45** |
| EAS profile | `production`（`buildType: app-bundle`, `distribution: store`） |
| signing | EAS remote keystore（クラウド管理。本資料に秘密は含めない） |
| AAB build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| AAB commit | `4d79c8b` |
| artifact URL | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| AAB 結果 | **PASS** |

---

## 3. 12h OOM 安定性

| 項目 | 値 |
|------|-----|
| 判定 | **PASS**（試行 #2） |
| 実行時間 | 12h 15m 51s |
| app versionCode（実機） | **44** |
| OOM | なし |
| ERR_STRING_TOO_LONG | なし |
| RN / Metro / Expo DevTools | 0 |
| Metro / adb | 維持 |
| health_restart | 0 |
| foreground WARN | 35（停止条件外） |
| logcat | **ストリーム + ローテーション**（全量 `adb logcat -d` 保持に逆戻りなし） |
| memory_watch | 153 エントリ継続。次回から `logs/memory_watch_<session>.jsonl` 固定予定 |
| report | `OOM_12H_RUN_REPORT.md` |

---

## 4. CURRENT_STATUS 保護

| 項目 | 値 |
|------|-----|
| 問題 | `npm run status` が PASS セクションを全文上書きで消去 |
| 修正 | Memory note / Live snapshot のみ merge 置換 |
| テスト | `devStatus.test.ts` 6/6 PASS |
| 判定 | **PASS** |
| report | `CURRENT_STATUS_LIVE_SNAPSHOT_PRESERVATION_FIX_REPORT.md` |

---

## 5. テスト結果サマリ

| ゲート | 結果 |
|--------|------|
| release-critical subset | **35/35 PASS** |
| npm test（unit 全体） | **1611 pass / 6 fail**（既存） |
| typecheck / lint | **17 errors**（既存） |
| ローカル AAB preflight | typecheck で停止しうる |
| EAS AAB | **PASS**（上記 build） |
| ローカル `expo export --platform android` | PASS（AAB 安定化時に確認） |

失敗は新規 regression ではなく既存未解決として Release Readiness で分類済み。

---

## 6. EAS ビルドで起きた過去の問題と修正

| 問題 | 対応 |
|------|------|
| postinstall スクリプトが EAS アーカイブに無い | `.easignore` で必須 script を include |
| `conciergeBudgetOptimization.ts` が git 未追跡 | ファイルを commit |
| Metro が `expo` / `expo/AppEntry.js` を解決不能 | `.npmrc` 削除、file: dep 削除、`.env` 除外、`metro.config.js` 標準化、post-install で expo 再 install、`main` を `expo/AppEntry.js` に復帰 |
| 結果 | build `1545a8ba` **PASS** |

---

## 7. GitHub Pages ビルド失敗（関連）

| 項目 | 内容 |
|------|------|
| 事象 | GitHub Pages build failure #120 |
| 原因 | 一部 docs Markdown の不正 UTF-8（orphan `0x81` 等） |
| 対応 | UTF-8 正規化 + `check-docs-utf8` / `fix-doc-encoding`（commit `6c179fb`） |
| 結果 | 修正後 Pages deploy 成功 |
| 残 | git tracked の log 系 `.txt` に NUL/非 UTF-8 が残る可能性（#120 直接原因外） |

---

## 8. 技術的な残課題（評価用）

1. typecheck / lint 17 errors の段階的解消（release gate 復帰）
2. npm test 6 fail の整理
3. `ensureAppForeground` 誤検知候補の安定化
4. memory_watch session jsonl 固定
5. Play Console 手動アップロードと Closed testing 運用
6. working tree の release 无关変更の分離
7. EAS アーカイブサイズ最適化（`.easignore`）

---

## 9. 本資料に含めないもの

- AAB バイナリ
- keystore / 秘密鍵 / API キー
- logcat 全量・telemetry 全量
