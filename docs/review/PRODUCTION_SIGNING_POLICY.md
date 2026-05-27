# Production Signing Policy

Status: signing policy for Android production deployment

Scope: signing/integrity guidance only. No signing secrets are stored in this repository.

## Signing Mode

Recommended mode:

- Use EAS managed credentials for Android production signing.

Alternative mode:

- Use an externally managed keystore uploaded through EAS credentials workflows.

Repository rule:

- Do not commit keystores, service account files, Play Console JSON credentials, or signing passwords.

## Protected Files

`.gitignore` excludes release-sensitive material including:

- `.env`
- `.env.*`
- `*.pem`
- `*.key`
- `*.p12`
- `*.pfx`
- `*.jks`
- `credentials.json`
- `secrets.json`
- `google-services.json`
- `GoogleService-Info.plist`

## Package Identity Consistency

Production package identity:

- `com.assistant.stocktrading`

Policy:

- Treat this package ID as immutable after the first Play Store upload.
- Do not use a different package ID for production unless starting a new app listing.

## Keystore Readiness

Before production submission, release owner must confirm:

- EAS credentials are configured for `com.assistant.stocktrading`.
- Upload key and app signing key ownership are documented.
- Recovery process is known to the release owner.
- Build provenance links EAS artifact, commit, version, versionCode, and Play Console upload.

## Signing Config Consistency

Expected production path:

```sh
eas build --platform android --profile production
```

Expected internal validation paths:

```sh
eas build --platform android --profile preview
eas build --platform android --profile apk
```

## Integrity Checks

Before upload:

- Confirm artifact package name.
- Confirm artifact version name and version code.
- Confirm signing certificate displayed in EAS/Play Console.
- Confirm no signing files were added to Git.
- Confirm `git diff --check` passes.

## Runtime Freeze Integrity

Signing policy does not change runtime behavior, hydration, replay, orchestration, reducers, providers, recommendation logic, execution logic, AI reasoning, telemetry behavior, or state machines.
