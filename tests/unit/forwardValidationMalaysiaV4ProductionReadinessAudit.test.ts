import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { buildMalaysiaV4ProductionReadinessAuditReport } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4ProductionReadinessAudit';

describe('forwardValidationMalaysiaV4ProductionReadinessAudit', () => {
  it('aggregates audits 73 through 83.6', () => {
    const report = buildMalaysiaV4ProductionReadinessAuditReport({
      scriptsDir: join(process.cwd(), 'scripts'),
    });
    expect(report.auditSummaries.length).toBe(13);
    expect(report.auditSummaries.map((s) => s.auditNo)).toContain('79');
    expect(report.auditSummaries.map((s) => s.auditNo)).toContain('83.6');
  });

  it('has zero critical issues and conditional verdict from audit data', () => {
    const report = buildMalaysiaV4ProductionReadinessAuditReport({
      scriptsDir: join(process.cwd(), 'scripts'),
    });
    expect(report.criticalCount).toBe(0);
    expect(report.productionVerdict).toBe('conditional');
  });

  it('marks portfolio save as un audited', () => {
    const report = buildMalaysiaV4ProductionReadinessAuditReport({
      scriptsDir: join(process.cwd(), 'scripts'),
    });
    const portfolio = report.opsAreaStatuses.find((o) => o.areaJa === 'ポートフォリオ保存');
    expect(portfolio?.statusJa).toBe('未監査');
  });
});
