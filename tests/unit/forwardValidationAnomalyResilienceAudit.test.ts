import { describe, expect, it } from 'vitest';
import {
  ANOMALY_CASE_DEFS,
  buildAnomalyResilienceAuditReport,
  computeAnomalySafetyScore,
  gradeAnomalySafety,
} from '../../src/services/forwardValidation/forwardValidationAnomalyResilienceAudit';
import type { ForwardAnomalyCaseResult } from '../../src/types/forwardValidation';

function mockRow(severity: 'pass' | 'warn' | 'fail'): ForwardAnomalyCaseResult {
  const def = ANOMALY_CASE_DEFS[0]!;
  return {
    caseId: def.caseId,
    categoryJa: def.categoryJa,
    labelJa: def.labelJa,
    crashBlocked: severity !== 'fail',
    erroneousOrderBlocked: true,
    dataLossBlocked: severity !== 'fail',
    uiFreezeBlocked: true,
    recoverable: true,
    guardModuleJa: 'test',
    severity,
    noteJa: 'test',
  };
}

describe('forwardValidationAnomalyResilienceAudit', () => {
  it('computeAnomalySafetyScore penalizes fail and warn', () => {
    const rows = [mockRow('pass'), mockRow('warn'), mockRow('fail')];
    const score = computeAnomalySafetyScore(rows);
    expect(score).toBe(84);
  });

  it('gradeAnomalySafety returns A for high score', () => {
    const rows = Array.from({ length: 22 }, () => mockRow('pass'));
    const { grade } = gradeAnomalySafety({ rows, safetyScore: 96 });
    expect(grade).toBe('A');
  });

  it('buildAnomalyResilienceAuditReport runs all cases', async () => {
    const report = await buildAnomalyResilienceAuditReport();
    expect(report.caseRows.length).toBe(22);
    expect(report.safetyScore).toBeGreaterThanOrEqual(0);
    expect(report.safetyScore).toBeLessThanOrEqual(100);
  });
});
