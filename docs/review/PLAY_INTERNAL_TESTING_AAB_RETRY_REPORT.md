# PLAY Internal Testing — Production AAB Retry Report

## retry日時

2026-07-01 08:26–08:36 (+08:00) — EAS production build submitted and finished same session.

## git branch

`cursor/top3-maxdd-capital-audit`

## latest commit hash（ビルド時）

`eff2bdc0fd1fe08ceadfc0814ab464f48e2d0a0a` — docs: fill Play IT AAB report commit hash and push result

`git pull origin cursor/top3-maxdd-capital-audit` → **Already up to date.**

## quota状態

- **EAS account:** k416my (k416my@gmail.com)
- **Free-tier Android build quota:** **利用可能**（本リトライで production ビルドがキュー投入・完了）
- 直近 `build:list`（limit 3）は preview のみ（versionCode 14–15）。本番 production は別 ID。

## build command

```text
npm run build:android:production -- --non-interactive --wait
```

（実体: `npx eas-cli build -p android --profile production --non-interactive --wait`）

## EAS build ID

`acd1f04e-45e0-4dc9-86bd-773ca9be616c`

## EAS build URL

https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/acd1f04e-45e0-4dc9-86bd-773ca9be616c

## build結果

| 項目 | 値 |
|------|-----|
| Status | **finished**（CLI exit 0） |
| Profile | production |
| Distribution | store |
| Build type | app-bundle |
| SDK | 54.0.0 |
| Commit | eff2bdc0fd1fe08ceadfc0814ab464f48e2d0a0a |
| Started | 2026/7/1 8:27:19 (+08) |
| Finished | 2026/7/1 8:35:09 (+08) |
| EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR | **0**（production profile `eas.json`） |
| versionCode（ビルド前ローカル） | 27 |
| EAS autoIncrement | 27 → **28**（CLI ログ確認） |

Application Archive URL:

https://expo.dev/artifacts/eas/NoRzxjWuI8nea_RlRReNTJEkweYuH_3-woQPsjDJB2M.aab

## AABファイル名

`stock-trading-assistant-production-v28.aab`

（EAS artifact 直链下载；`eas-cli build:download` は TAR_BAD_ARCHIVE で失敗したため artifact URL を `Invoke-WebRequest` で取得）

## AAB保存場所

`C:\Users\k416m\Documents\Projects\stock-trading-assistant\docs\review\play-it-aab-retry\stock-trading-assistant-production-v28.aab`

- サイズ: **54,611,697 bytes**（EAS 表示 52.1 MB と整合）
- **Git 未コミット**（バイナリ大容量のため。Owner は上記パスまたは Expo artifact URL から取得）

## versionCode

**28**（EAS ビルド確定値。ローカル `app.json` も autoIncrement により **28** に更新済み — 本レポートコミットには含めず）

## package名

`com.assistant.stocktrading`

## app label

`Malaysia Stock AI Concierge`（`app.json` `expo.name`；AAB manifest は `@string/app_name`）

## smoke test結果

| 項目 | 結果 |
|------|------|
| adb device | **なし**（`adb devices` 空。FYRWXSNNAIOR9DCM 未接続） |
| 実機インストール | **BLOCKED** |
| Metro なし起動確認 | **未実施** |
| タブ / 言語 UI | **未実施** |
| logcat `12H-MONITOR` | **未実施** |

**AAB メタデータ検証（bundletool dump manifest）:** 成功 — 証跡 `docs/review/play-it-aab-retry/aab-manifest.xml`

- `package="com.assistant.stocktrading"`
- `android:versionCode="28"`
- `android:versionName="1.0.0"`

## Play Console upload可否

**可** — production store AAB、versionCode 28、署名は EAS remote keystore（Build Credentials MB3l4Jyy6N）。Owner は Internal testing へ `.aab` をアップロード可能。

## Owner次アクション

（`docs/review/PLAY_IT_OWNER_CONSOLE_CHECKLIST.md` より — Dev ビルド成功後）

1. Dev から受け取った production AAB を確認（versionCode **28**、package `com.assistant.stocktrading`）。
2. Play Console → **Release → Testing → Internal testing** → **Create new release** → **Upload** `.aab`。
3. Release notes 例: `Initial internal test release.`（checklist §3.1）
4. **Start rollout to Internal testing**
5. Testers タブで email list（例: `internal-testers-v1`）を Internal testing に紐付け
6. 未完了の Console 項目（Privacy Policy URL、Data Safety、Store listing 等）は checklist §1 を継続

AAB 取得先（Owner）:

- ローカル: `docs\review\play-it-aab-retry\stock-trading-assistant-production-v28.aab`
- または Expo artifact URL（上記）

## GitHub commit hash

（本レポートコミット後に記載 — 下記 push セクション参照）

## push結果

（push 実行後に記載）

---

## 補足

- `npx eas-cli build:download --build-id acd1f04e-45e0-4dc9-86bd-773ca9be616c` → **TAR_BAD_ARCHIVE: Unrecognized archive format**（eas-cli 20.x 既知問題の可能性）。回避: artifact URL 直接ダウンロード。
- 実機 smoke はデバイス接続後に checklist §3 以降と合わせて再実行推奨。
