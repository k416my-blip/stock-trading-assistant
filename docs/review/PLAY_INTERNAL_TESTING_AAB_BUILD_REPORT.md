# PLAY_INTERNAL_TESTING_AAB_BUILD_REPORT

**Date:** 2026-07-01  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Workflow:** Play Internal Testing — production AAB build + prep (no feature / i18n / UI changes)

---

## 1. Git

| Item | Value |
|------|-------|
| Branch | `cursor/top3-maxdd-capital-audit` |
| Latest commit (pre-report) | `279440cfb73c2559607224dfc0e7340d9de68340` — `docs: finalize Play IT checklist git section at bc6e64b` |
| `git pull origin cursor/top3-maxdd-capital-audit` | **Already up to date** |
| Working tree | Many unrelated local modifications/untracked files; **only this report committed** |

---

## 2. Phase 1 — Pre-flight

| Check | Result |
|-------|--------|
| `app.json` `android.versionCode` (committed) | **27** (EAS `autoIncrement: true` would bump to **28** on a successful production build) |
| `npm ls expo-localization` | **17.0.9** (Expo SDK 54 compatible) |
| `npx eas-cli whoami` | **Logged in** — `k416my` / `k416my@gmail.com` |
| `adb devices` | **No devices attached** (expected device `FYRWXSNNAIOR9DCM` not present) |

---

## 3. Phase 2 — Production AAB build

**Command:**

```powershell
cd c:\Users\k416m\Documents\Projects\stock-trading-assistant
npm run build:android:production -- --non-interactive --wait
```

**Equivalent:** `npx eas-cli build -p android --profile production --non-interactive --wait`

**Expected profile (from `eas.json`):**

| Setting | Expected |
|---------|----------|
| Profile | `production` |
| Distribution | `store` |
| Android build type | `app-bundle` |
| Package | `com.assistant.stocktrading` |
| App label | `Malaysia Stock AI Concierge` |
| Env | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=0` |
| Credentials | remote keystore (Expo) |

**Build result:** **FAILED** (not queued on EAS)

**Failure reason:** EAS Free plan **Android build quota exhausted** for the current billing period.

CLI messages (summary):

- *You've reached your included build credits this billing period.*
- *This account has used its Android builds from the Free plan this month, which will reset in **1 hour** (on Wed Jul 01 2026).*
- Archive upload and fingerprint computation **succeeded**; build was **blocked** before queueing.
- Local CLI attempted `Bumping expo.android.versionCode from 27 to 28` — **reverted** in working tree (`git checkout -- app.json`) so committed `versionCode` remains **27**.

**EAS build URL:** *None* — no build ID was created for this attempt.

**EAS project builds page:** https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds

**Historical note:** `eas build:list --platform android --limit 50` shows **no** completed `production` / store **AAB** builds; recent artifacts are **preview APKs** only (wrong profile for Play IT upload).

---

## 4. Phase 3 — Download AAB

**Command attempted (from checklist — flags not supported in eas-cli 20.5.0):**

```powershell
npx eas-cli build:download --platform android --profile production --latest
```

**Result:** **FAILED** — `Nonexistent flags: --profile, --latest`

**Supported download:** `eas build:download --build-id <id>` (requires a finished build).

| Item | Value |
|------|-------|
| AAB filename | **N/A** |
| AAB save location | **N/A** |
| **Actual versionCode in AAB** | **N/A** (no AAB produced) |

---

## 5. Phase 4 — Standalone smoke test (device / adb)

**Status:** **BLOCKED** — no ADB device; no installable production AAB.

| Check | Result |
|-------|--------|
| App starts (standalone, no Metro) | **BLOCKED** |
| App name `Malaysia Stock AI Concierge` | **BLOCKED** (source: `strings.xml` / `app.json` match expected label) |
| Package `com.assistant.stocktrading` | **BLOCKED** (source: `app.json` matches) |
| versionCode matches AAB | **BLOCKED** |
| First-launch / saved language selection | **BLOCKED** |
| Settings > Language: 日本語 / English / 简体中文 | **BLOCKED** |
| Primary tabs (Home, Portfolio, Stock Check, AI Concierge, Settings — device may show Alerts between Portfolio and Stock Check) | **BLOCKED** |
| No crash | **BLOCKED** |
| No expo-localization `NoSuchMethodError getDirectConverter` | **BLOCKED** (dependency pinned 17.0.9 in repo) |
| No `[12H-MONITOR]` in logcat | **BLOCKED** (`adb logcat -d \| findstr "12H-MONITOR"` not run — no device) |

**Source-only verification (not a substitute for AAB smoke):**

- `android/app/src/main/res/values/strings.xml`: `app_name` = `Malaysia Stock AI Concierge`
- Production profile sets `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=0`

---

## 6. Remaining blockers

1. **EAS Free Android build quota** — retry production AAB after billing reset (~1 hour from failed attempt on 2026-07-01) or upgrade plan: https://expo.dev/accounts/k416my/settings/billing
2. **No production AAB artifact** — cannot upload to Play Internal testing until build succeeds.
3. **Device smoke** — reconnect device (`adb devices`) after AAB is available; install via bundletool (`build-apks` + `install-apks`) or EAS install link.
4. **First Play production AAB** — no prior store AAB in EAS history; versionCode **28** expected on next successful `autoIncrement` build from base **27**.

---

## 7. Owner next steps (Play Console)

From [`docs/review/PLAY_IT_OWNER_CONSOLE_CHECKLIST.md`](PLAY_IT_OWNER_CONSOLE_CHECKLIST.md):

**Owner can proceed now (no AAB required):**

- Create app / basic settings: name **Malaysia Stock AI Concierge**, Finance, Free, contact `k416my@gmail.com`
- Privacy policy URL: `https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html`
- Complete **Data Safety**, **Ads** (no ads), **Content rating (IARC)**, **Target audience (13+)**, **Financial features** declaration
- **Store listing**: copy, icon, feature graphic, phone screenshots per checklist §1.8

**After Dev delivers production `.aab`:**

- Play Console → **Release → Testing → Internal testing**
- Upload AAB, create release, add testers, roll out
- Confirm versionCode matches uploaded bundle (expect **28** on first successful production build)

**Dev retry (after quota reset):**

```powershell
npm run build:android:production -- --non-interactive --wait
npx eas-cli build:download --build-id <FINISHED_BUILD_ID>
```

---

## 8. Summary

| Field | Value |
|-------|-------|
| Build success | **FAIL** (quota) |
| versionCode (committed / expected in next AAB) | **27** committed → **28** on next successful production build |
| AAB path | **N/A** |
| Smoke summary | **BLOCKED** (no device + no AAB) |
| Report commit hash | *(filled after commit)* |
| Push result | *(filled after push)* |

---

## 9. EAS login (reference)

If `whoami` fails in future sessions:

```powershell
npx eas-cli login
npx eas-cli whoami
```
