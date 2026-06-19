import { describe, expect, it } from 'vitest';

/** Mirrors scripts/verify-hyperos-v9-3h-screen-off.mjs resolveOrchestratorProcessExitCode */
function resolveOrchestratorProcessExitCode(
  eval_: { overall: boolean },
  phase12_5ExitCode: number | null,
): number {
  if (!eval_.overall) return 1;
  if (phase12_5ExitCode != null && phase12_5ExitCode !== 0) return 1;
  return 0;
}

describe('orchestrator exit code resolution', () => {
  it('returns 0 when all gates PASS and phase12-5 child exit is unknown (null)', () => {
    expect(resolveOrchestratorProcessExitCode({ overall: true }, null)).toBe(0);
  });

  it('returns 0 when all gates PASS and phase12-5 child exited 0', () => {
    expect(resolveOrchestratorProcessExitCode({ overall: true }, 0)).toBe(0);
  });

  it('returns 1 when gates fail even if phase12-5 exit is null', () => {
    expect(resolveOrchestratorProcessExitCode({ overall: false }, null)).toBe(1);
  });

  it('returns 1 when phase12-5 child failed even if gate eval passed', () => {
    expect(resolveOrchestratorProcessExitCode({ overall: true }, 1)).toBe(1);
  });
});
