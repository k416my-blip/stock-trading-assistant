# Production Build Results

Status: real Android production build attempt recorded for `runtime-freeze-v1`

Scope: build execution result only. Runtime behavior, providers, reducers, orchestration, hydration, replay, telemetry behavior, recommendation logic, execution logic, and AI reasoning were not changed.

## Environment

EAS CLI:

- `eas-cli/19.1.0`

Authenticated account:

- `k416my`

Linked EAS project:

- `@k416my/stock-trading-assistant`
- Project ID: `70000a9b-cffc-4738-b615-3e10edb0b865`
- Project URL: `https://expo.dev/accounts/k416my/projects/stock-trading-assistant`

## Production AAB Build Attempt

Command executed:

```sh
npx --yes eas-cli@latest build --platform android --profile production --non-interactive
```

Result:

- EAS project linking succeeded after `eas init --non-interactive --force`.
- Remote Android credentials were used.
- EAS generated a cloud keystore.
- `android.versionCode` was auto-incremented from `1` to `2`.
- Project archive uploaded to EAS successfully.
- Project fingerprint computed successfully.
- Build failed before artifact generation because the account had used its Android builds from the Free plan for the month.

Failure message summary:

- Android build quota exhausted.
- Quota reset date reported by EAS: `Mon Jun 01 2026`.

## APK Fallback Build Attempt

Command executed:

```sh
npx --yes eas-cli@latest build --platform android --profile apk --non-interactive
```

Result:

- Remote Android credentials were reused.
- Existing EAS keystore was found: `Build Credentials MB3l4Jyy6N (default)`.
- Project archive uploaded to EAS successfully.
- Project fingerprint computed successfully.
- Build failed before artifact generation because the Android build quota was exhausted.

## Generated Artifact List

No AAB or APK artifact was generated in this run because EAS stopped both production and APK builds at the account quota gate before queueing a build.

Artifact sizes:

- AAB size: not available.
- APK size: not available.

## Signing Status

Signing pipeline status:

- EAS managed credentials path is active.
- Cloud keystore generation succeeded.
- Subsequent APK fallback attempt reused the EAS keystore.
- Signing certificate integrity still requires a completed EAS build artifact or Play Console certificate view.

## Installability Status

Installability could not be validated because no APK artifact was produced. The APK fallback profile remains configured and reached the EAS quota gate after archive upload and credential resolution.

## Build Output Verification

Validated before quota failure:

- EAS project linked.
- Production profile parsed.
- APK fallback profile parsed.
- Remote Android credentials resolved.
- Project archive upload succeeded.
- Fingerprint computation succeeded.
- Asset bundling preconditions are satisfied by existing configured asset files.

Not validated due to quota failure:

- Final AAB size.
- Final APK size.
- Completed Hermes production bundle output.
- Final signed artifact metadata.
- On-device installability.

## Remaining Blocker

Current blocker:

- EAS Android build quota exhausted for the account. Wait for quota reset or upgrade/use another authorized build capacity, then rerun production and APK builds.

## Runtime Freeze Integrity

This build attempt did not change runtime behavior. All changes remain deployment infrastructure, EAS configuration, assets, and documentation only.
