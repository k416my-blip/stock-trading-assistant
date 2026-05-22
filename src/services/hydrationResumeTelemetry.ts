import type { HydrationResumeTelemetrySnapshot } from '../types/runtimeTelemetry';

type HydrationObsState = {
  hydrationStarts: number[];
  hydrationDurations: number[];
  duplicateSkips: number;
  resumeRecoveryMs: number | null;
};

const state: HydrationObsState = {
  hydrationStarts: [],
  hydrationDurations: [],
  duplicateSkips: 0,
  resumeRecoveryMs: null,
};

export function resetHydrationResumeTelemetryForTest(): void {
  state.hydrationStarts = [];
  state.hydrationDurations = [];
  state.duplicateSkips = 0;
  state.resumeRecoveryMs = null;
}

export function noteHydrationStarted(key: string): void {
  state.hydrationStarts.push(Date.now());
  const recent = state.hydrationStarts.filter((t) => Date.now() - t < 60_000);
  if (recent.length >= 2) state.duplicateSkips += 1;
  state.hydrationStarts = recent;
  void key;
}

export function noteHydrationCompleted(durationMs: number): void {
  state.hydrationDurations.push(durationMs);
  if (state.hydrationDurations.length > 24) state.hydrationDurations.shift();
}

export function noteResumeRecoveryMs(ms: number | null): void {
  state.resumeRecoveryMs = ms;
}

export function observeHydrationResume(input: {
  backgroundResumeRecoveryMs: number | null;
  queueSize: number;
  cascadePressure: number;
}): HydrationResumeTelemetrySnapshot {
  if (input.backgroundResumeRecoveryMs != null) {
    noteResumeRecoveryMs(input.backgroundResumeRecoveryMs);
  }

  const avgHydration =
    state.hydrationDurations.length > 0
      ? Math.round(
          state.hydrationDurations.reduce((a, b) => a + b, 0) / state.hydrationDurations.length,
        )
      : null;

  const duplicateRate = Math.min(
    100,
    Math.round(state.duplicateSkips * 12 + state.hydrationStarts.length * 2),
  );

  const postResumePressure = Math.min(
    100,
    Math.round(
      (state.resumeRecoveryMs ?? 0) / 40 +
        input.queueSize * 0.5 +
        input.cascadePressure * 0.2,
    ),
  );

  const resumeCascadeRisk = Math.min(
    100,
    postResumePressure + (duplicateRate > 30 ? 18 : 0) + (state.resumeRecoveryMs != null && state.resumeRecoveryMs > 800 ? 15 : 0),
  );

  return {
    hydrationDurationMs: avgHydration,
    resumeRecoveryTimeMs: state.resumeRecoveryMs ?? input.backgroundResumeRecoveryMs,
    duplicateHydrationRate: duplicateRate,
    postResumePressurePct: postResumePressure,
    resumeCascadeRiskPct: resumeCascadeRisk,
  };
}
