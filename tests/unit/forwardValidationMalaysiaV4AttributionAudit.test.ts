import { describe, expect, it } from 'vitest';
import {
  explainYtlDependencyDrop,
  gradeV4Attribution,
  V4_PHASE2_SYMBOLS,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4AttributionAudit';
import { buildV4PhaseWeights } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4CandidateAudit';

describe('forwardValidationMalaysiaV4AttributionAudit', () => {
  it('V4_PHASE2_SYMBOLS includes IJM and YTL', () => {
    expect(V4_PHASE2_SYMBOLS).toContain('3336');
    expect(V4_PHASE2_SYMBOLS).toContain('6742');
    expect(V4_PHASE2_SYMBOLS).toHaveLength(5);
  });

  it('buildV4PhaseWeights sets YTL to 15% for audit77 config', () => {
    const w = buildV4PhaseWeights({ candidateSymbol: '3336', ytlCapPct: 15 });
    expect(w.phase4['6742']).toBe(15);
    expect(w.phase4['3336']).toBeGreaterThan(0);
  });

  it('explainYtlDependencyDrop describes weight and IJM dilution', () => {
    const text = explainYtlDependencyDrop({
      v3YtlPct: 54.5,
      v4YtlPct: 32.8,
      v3YtlPnl: 37613,
      v4YtlPnl: 22000,
      v4IjmPnl: 15000,
      v3YtlAvgNotional: 50000,
      v4YtlAvgNotional: 28000,
      v3YtlWeight: 28.333,
      v4YtlWeight: 15,
    });
    expect(text).toContain('28.333%→15%');
    expect(text).toContain('IJM新規');
  });

  it('gradeV4Attribution returns A when reconciled', () => {
    const { grade } = gradeV4Attribution({
      v3YtlReconciled: true,
      v4YtlReconciled: true,
      v4CumulativePct: 38.36,
      ijmAddedProfitMYR: 15000,
      dropExplained: true,
    });
    expect(grade).toBe('A');
  });

  it('gradeV4Attribution returns C when unexplained', () => {
    const { grade } = gradeV4Attribution({
      v3YtlReconciled: false,
      v4YtlReconciled: false,
      v4CumulativePct: 30,
      ijmAddedProfitMYR: 0,
      dropExplained: false,
    });
    expect(grade).toBe('C');
  });
});
