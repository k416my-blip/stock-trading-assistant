# Preview APK Build — EAS Env & versionCode 準備レポート

**記録日時:** 2026-06-13T08:06:30+08:00  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**parent HEAD:** `4b41d1745bf60c15d870258d017a57f8468026ce`  
**commit hash:** `6c14ff8b525519d3b734aab8215aa6248e072b8d`  
**commit message:** `build: prepare preview apk monitor env and version code`  
**push:** **成功** → `4b41d17..6c14ff8 cursor/top3-maxdd-capital-audit -> cursor/top3-maxdd-capital-audit`  
**remote 同期:** **0 / 0**

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| **EAS preview env** | **設定完了** — `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` |
| **versionCode** | **2 → 3**（`app.json`） |
| **typecheck** | **PASS** |
| **unit test** | **67/67 PASS** |
| **offline audit** | **6/6 PASS** |
| **secret scan** | **CLEAN** |
| **preview APK build** | **未実施** |
| **2〜3h 短期テスト** | **未実施** |
| **12h 本番** | **未実施** |

---

## 1. 現在状態確認（作業前）

```text
git branch --show-current → cursor/top3-maxdd-capital-audit
git rev-parse HEAD        → 4b41d1745bf60c15d870258d017a57f8468026ce
remote 同期               → 0 / 0
```

---

## 2. EAS preview env 設定

### 2.1 実行コマンド

```powershell
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR --value 1 --visibility plaintext --non-interactive
```

**結果:** **成功**

```text
√ Created a new variable EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR on project @k416my/stock-trading-assistant.
```

### 2.2 確認

```powershell
npx eas-cli env:list --environment preview
```

**結果:**

```text
Environment: preview
EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1
```

| 確認項目 | 結果 |
|----------|------|
| preview 環境に存在 | **YES** |
| 値 | **1** |
| API キー類を追加 | **なし**（MONITOR フラグのみ） |

### 2.3 設定しなかったもの

- OpenAI / Twelve Data / News / X 等の API キー — **意図的に未設定**
- EAS Secrets 追加 — **未実施**
- `eas.json` env ブロック — **未変更**（EAS cloud env のみ）

---

## 3. versionCode bump

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| `expo.version` | `1.0.0` | `1.0.0`（据え置き） |
| `android.package` | `com.assistant.stocktrading` | 据え置き |
| `android.versionCode` | **2** | **3** |

**変更ファイル:** `app.json`（1 行）

---

## 4. 検証結果

### typecheck

```text
npm run typecheck → exit 0 (PASS)
```

### unit test

```text
npx vitest run tests/unit/bursaPhase24.test.ts tests/unit/phase12-5RuntimeMode.test.ts tests/unit/phase12-5InvalidDetectors.test.ts
→ 67/67 PASS
```

### audit verify

```text
npx tsx scripts/bursa-phase24-audit-verify.ts
→ 6/6 PASS
```

---

## 5. Secret scan

staged diff を secret-scan ポリシー（API キー · Bearer トークン · パスワード類の典型パターン）で確認。

**結果: SECRET_SCAN_CLEAN**

---

## 6. Committed files

| # | ファイル |
|---|----------|
| 1 | `app.json` |
| 2 | `docs/review/PREVIEW_APK_BUILD_READINESS_REPORT.md` |
| 3 | `docs/review/PREVIEW_APK_BUILD_ENV_VERSIONCODE_PREP_REPORT.md` |

---

## 7. 未実施事項

| 項目 | 状態 |
|------|------|
| `eas build` / preview APK build | **未実施** |
| `adb install -r` | **未実施** |
| 2〜3h 短期テスト | **未実施** |
| 12h 本番 | **未実施** |

---

## 8. 次の作業

**preview APK build 実行**（ユーザー明示承認後）:

```powershell
npm run build:android:preview
# または
npx eas-cli build -p android --profile preview --non-interactive
```

build 成功後: artifact ダウンロード → `adb install -r` → smoke → 2〜3h 短期テスト（`PHASE12_5_RUNTIME_MODE=apk`）

---

**保存パス:** `docs/review/PREVIEW_APK_BUILD_ENV_VERSIONCODE_PREP_REPORT.md`
