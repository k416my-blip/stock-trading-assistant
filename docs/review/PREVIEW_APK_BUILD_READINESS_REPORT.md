# Preview APK Build Readiness Report

**記録日時:** 2026-06-13T07:55:00+08:00  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**HEAD:** `4b41d1745bf60c15d870258d017a57f8468026ce`  
**Commit19:** **済み** — `phase24: harden unit tests and edge-case handling` · push 済み · remote **0 / 0**  
**参照:** [`docs/review/STEP6_SHORT_TEST_PREPARATION_REPORT.md`](STEP6_SHORT_TEST_PREPARATION_REPORT.md)  
**実施範囲:** EAS / env / versionCode / build 可否確認 · build 前検証 · **本レポートのみ**

**未実施（本 Step の禁止事項遵守）:**

| 項目 | 状態 |
|------|------|
| preview APK build 実行 | **未実施** |
| EAS secret / env 作成 | **未実施**（設定案のみ提示） |
| versionCode 変更 / commit | **未実施** |
| git add / commit / push | **未実施** |
| 2〜3h 短期テスト本番 | **未実施** |
| 12h 本番 | **未実施** |
| 外部 API live fetch | **未実施** |

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| **preview APK build 可否** | **条件付き可能** — quota あり · **build 前に EAS env 設定必須** |
| **EAS quota** | **あり** — Android **1 / 15** 使用（残 **14**）· Free plan · 請求期間 2026-06-01〜07-01 |
| **EAS login** | **済み** — `k416my` |
| **EAS env** | **未設定** — preview 環境に変数 **0 件** · **build 前設定必要** |
| **versionCode bump** | **推奨** — 現在 `2` · 新 preview は **`3` 推奨**（未変更） |
| **typecheck** | **PASS** |
| **unit test** | **67/67 PASS** |
| **offline audit** | **6/6 PASS** |

---

## 1. 現在状態確認

```text
git branch --show-current → cursor/top3-maxdd-capital-audit
git rev-parse HEAD        → 4b41d1745bf60c15d870258d017a57f8468026ce
remote 同期               → 0 / 0
```

worktree に 12h 生成物（checkpoint · telemetry · ui-dump 等）が modified/untracked として残存。**build / 短期テスト前にローテート推奨**（本 Step では触らない）。

---

## 2. EAS login / quota 確認

### 2.1 実行コマンド

```powershell
npx eas-cli whoami
# → k416my / k416my@gmail.com

npx eas-cli account:view
# → k416my / k416my@gmail.com

npx eas-cli account:usage k416my --json --non-interactive
```

### 2.2 結果

| 項目 | 値 |
|------|-----|
| **ログイン** | **済み** |
| **アカウント** | **`k416my`** |
| **プラン** | **Free** |
| **請求期間** | 2026-06-01 〜 2026-07-01（残 19 日） |
| **Android builds（plan）** | **1 / 15** 使用 · **6%** · **残 14** |
| **iOS builds（plan）** | 0 / 15 |
| **Overage** | 0 · $0 |
| **Billing URL** | https://expo.dev/accounts/k416my/settings/billing |

### 2.3 判定

**quota あり → build 実行可能**（env 設定後）。

> 注: `PRODUCTION_BUILD_RESULTS.md` 記載の quota 枯渇は **2026-06-01 以前**の請求期間。現周期は **2026-06-01 リセット後**で、preview build 1 回成功実績あり（下記 §2.4）。

### 2.4 直近 EAS build 実績（参考 · 再利用不可）

```text
npx eas-cli build:list --platform android --limit 3
```

| 項目 | 値 |
|------|-----|
| Build ID | `73628bdc-b751-47d0-be1e-5039ef6bfcb4` |
| Profile | **preview** |
| Status | **finished** |
| versionCode | **2** |
| Commit | `ab494414eb6a221e50d29f845db65983106a3a1d`（**HEAD 4b41d17 より古い**） |
| Finished | 2026-06-08 |
| APK URL | https://expo.dev/artifacts/eas/ffp2GANqBAU9qnQih3osW1.apk |

**再利用判定: 不可** — Commit19 未反映 · `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` bake-in 未確認 · 2〜3h 短期テスト目的の **新 preview build が必要**。

---

## 3. EAS preview profile 確認

### 3.1 `eas.json`

| 項目 | 値 | 期待 | 結果 |
|------|-----|------|------|
| preview profile 存在 | あり | あり | **PASS** |
| `distribution` | `internal` | `internal` | **PASS** |
| `android.buildType` | `apk` | `apk` | **PASS** |
| `autoIncrement` | `false` | — | versionCode は **手動**（`app.json`） |

### 3.2 npm script

```json
"build:android:preview": "eas build -p android --profile preview"
```

**PASS** — `npm run build:android:preview` は正しい preview profile を指す。

---

## 4. EAS env / secret 方針

### 4.1 現状

```powershell
npx eas-cli secret:list
# → Secrets for this account and project: （空）

npx eas-cli env:list --environment preview
# → No variables found for this environment.
```

| 項目 | 状態 |
|------|------|
| EAS Secrets | **0 件** |
| preview 環境変数 | **0 件** |
| `eas.json` preview `env` ブロック | **なし** |

### 4.2 目的

preview APK 内で **`[12H-MONITOR]`** を有効化するため、build 時に:

```text
EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1
```

をバンドルへ bake-in する（`src/constants/twelveHourTestMonitor.ts`）。

### 4.3 設定方法（案のみ · **本 Step では未実行**）

**推奨 A — EAS Environment Variables（`eas env` · Secrets の後継）:**

```powershell
# 明示承認後に実行
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR --value 1 --visibility plaintext
```

**推奨 B — EAS Secrets（deprecated だが動作可）:**

```powershell
# 明示承認後に実行 — 本 Step では作成していない
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR --value 1 --type string
```

**代替 C — `eas.json` preview env（リポジトリ変更 · commit 要）:**

```json
"preview": {
  "distribution": "internal",
  "autoIncrement": false,
  "env": {
    "EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR": "1"
  },
  "android": { "buildType": "apk" }
}
```

> 機能フラグのみなので Git コミット可だが、**API キーは絶対に含めない**。本 Step では **変更・commit なし**。

### 4.4 API キー / secret リスク再確認

| 分類 | 方針 |
|------|------|
| **焼き込み可** | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1`（非 secret 機能フラグ） |
| **焼き込み非推奨** | OpenAI · Twelve Data · News · X 等の **本番 API キー** — APK 逆解析で抽出可能 |
| **優先** | **端末 SecureStore 既存値** — Phase12.5 実績でキー保存済み端末なら再設定不要の可能性大 |
| **Git 禁止** | `.env` · keystore · raw secrets |

**build 前確認（install 後 smoke）:**

```powershell
adb logcat -d | findstr "12H-MONITOR"
npm run verify:twelve-hour-api-audit   # 端末キー確認（任意）
```

---

## 5. versionCode 確認

### 5.1 現状（`app.json`）

| 項目 | 値 |
|------|-----|
| `expo.version` | `1.0.0` |
| `android.versionCode` | **`2`** |
| `android.package` | `com.assistant.stocktrading` |

### 5.2 bump 要否

| 観点 | 判定 |
|------|------|
| 実機 dev install | versionCode **2**（Metro 依存） |
| 直近 EAS preview | versionCode **2**（古い commit） |
| 新 preview 識別 | **3 以上推奨** — install 確認 · 混同防止 |
| 技術的必須 | **同一署名なら `-r` 上書き可能** — ただし **識別のため bump 推奨** |

### 5.3 変更案（未適用）

```json
"versionCode": 3
```

**本 Step:** 変更なし · commit なし · **ユーザー明示承認後**に bump + commit を検討。

---

## 6. build 前検証

### typecheck

```text
npm run typecheck → exit 0 (PASS)
```

### unit test

```text
npx vitest run tests/unit/bursaPhase24.test.ts \
  tests/unit/phase12-5RuntimeMode.test.ts \
  tests/unit/phase12-5InvalidDetectors.test.ts
→ 67/67 PASS
```

| ファイル | 件数 |
|----------|------|
| `bursaPhase24.test.ts` | 40 |
| `phase12-5RuntimeMode.test.ts` | 12 |
| `phase12-5InvalidDetectors.test.ts` | 15 |

### audit verify

```text
npx tsx scripts/bursa-phase24-audit-verify.ts
→ 6/6 PASS
```

| 銘柄 | Score | Confidence |
|------|-------|------------|
| 1155 | +20 | High |
| 1023 | +7 | High |
| 1295 | +3 | High |
| 5347 | +14 | High |
| 4707 | -10 | High |
| 6033 | +7 | High |

---

## 7. preview APK build 可否判定

| 条件 | 状態 | 判定 |
|------|------|------|
| EAS login | k416my 済み | ✅ |
| Android quota | 1/15 · 残 14 | ✅ **build 可能** |
| preview profile | internal · apk | ✅ |
| build 前検証 | typecheck · 67 test · audit | ✅ |
| EAS env（MONITOR=1） | **未設定** | ⚠️ **build 前に設定必須** |
| versionCode | 2（bump 未実施） | ⚠️ **3 へ bump 推奨**（ブロッカーではない） |
| API キー Git 混入 | なし | ✅ |
| secret 作成 | 未実施 | — 承認待ち |

### 総合判定

**preview APK build: 条件付き GO**

1. **先に** `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` を EAS preview env に設定（ユーザー承認後）
2. **推奨:** `app.json` versionCode を `3` に bump（別 commit · ユーザー承認後）
3. **その後** `npm run build:android:preview` を実行（別 Step · 本 Step では **未実行**）

---

## 8. build 実行有無

| 項目 | 状態 |
|------|------|
| `eas build` 実行 | **していない** |
| artifact ダウンロード | **していない** |
| `adb install` | **していない** |

---

## 9. git 操作

| 項目 | 状態 |
|------|------|
| git add | **未実施** |
| git commit | **未実施** |
| git push | **未実施** |

versionCode bump が必要な場合は **明示承認後**に別 commit を検討。

---

## 10. 次に必要な作業

| 順 | 作業 | 承認 |
|----|------|------|
| 1 | **EAS env 設定** — `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1`（preview 環境） | 要 |
| 2 | **versionCode bump** — `2` → `3`（`app.json`）+ commit | 推奨 · 要 |
| 3 | **preview APK build** — `npm run build:android:preview` | 要 |
| 4 | **adb install -r** + smoke（cold start · 12H-MONITOR · 6 銘柄） | build 後 |
| 5 | logcat ローテート · pre-run-watch · watchdog 起動 | 短期テスト前 |
| 6 | **2〜3h 短期テスト** — `PHASE12_5_RUNTIME_MODE=apk` · `PHASE12_5_HOURS=3` | smoke PASS 後 |

**build 実行コマンド（承認後 · 未実行）:**

```powershell
npm run build:android:preview
# または
npx eas-cli build -p android --profile preview --non-interactive
```

---

## 11. 参照

| 用途 | パス |
|------|------|
| Step 6 準備 | `docs/review/STEP6_SHORT_TEST_PREPARATION_REPORT.md` |
| APK 方針 | `docs/review/APK_PREVIEW_BUILD_STRATEGY_REPORT.md` |
| EAS 設定 | `eas.json` |
| Expo 設定 | `app.json` |
| 過去 quota 枯渇記録 | `docs/review/PRODUCTION_BUILD_RESULTS.md` |

---

**レポート作成者:** Cursor Agent（preview build readiness 確認のみ）  
**保存パス:** `docs/review/PREVIEW_APK_BUILD_READINESS_REPORT.md`
