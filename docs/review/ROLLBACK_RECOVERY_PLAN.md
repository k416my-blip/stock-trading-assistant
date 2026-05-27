# Rollback Recovery Plan

Status: deployment rollback/recovery plan for `runtime-freeze-v1`

Scope: release operations only. No runtime recovery behavior, self-healing behavior, reducers, providers, orchestration, hydration, replay, telemetry, recommendation logic, execution logic, or AI reasoning is changed by this plan.

## Rollback Principles

Rollback is an operational Play Console/EAS action, not an in-app runtime behavior.

Allowed rollback actions:

- Halt rollout in Play Console.
- Roll back to a previous Play production track release if available.
- Promote a known-good internal/closed/open testing artifact.
- Disable a staged rollout before full production release.
- Publish a new fixed binary with a higher versionCode.

Disallowed runtime actions:

- No automatic runtime rollback.
- No state mutation repair.
- No provider or reducer changes.
- No hydration or replay behavior changes.
- No trading/recommendation/execution behavior changes.

## Pre-Release Recovery Preparation

Before production rollout:

- Keep the previous known-good artifact available in Play Console.
- Keep EAS build links and commit SHAs in release notes.
- Confirm `android.versionCode` increments for each uploaded artifact.
- Keep signing credentials recoverable through EAS/Play ownership.
- Prepare support response for install/startup issues.

## Rollout Strategy

Recommended rollout:

1. Internal testing track.
2. Closed testing track.
3. Open testing or limited staged production rollout.
4. Expand production rollout after smoke metrics and support checks are clean.

## Recovery Triggers

Consider halting rollout if testers report:

- Install failure on supported Android versions.
- Startup crash before first screen.
- Missing icon/splash asset in production artifact.
- Notification permission dead end on Android 13+.
- Reconnect/offline recovery failure in smoke path.
- Security or privacy disclosure mismatch.

## Recovery Actions

If a release issue is detected:

- Stop staged rollout in Play Console.
- Keep the current runtime code frozen until root cause is understood.
- Fix only deployment/config/asset issues when the defect is deployment-only.
- Use a new versionCode for any replacement artifact.
- Re-run local verification and EAS build before re-upload.

## Communication Template

Internal status fields:

- Affected version/versionCode.
- Artifact URL.
- Devices affected.
- Reproduction path.
- Decision: halt rollout, continue monitoring, or build replacement artifact.

## Freeze Integrity

This rollback plan is operational documentation. It does not add runtime rollback, automatic recovery, throttling, self-healing, or behavior mutation.
