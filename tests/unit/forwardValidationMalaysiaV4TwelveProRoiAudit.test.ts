import { describe, expect, it } from 'vitest';
import {
  TWELVE_DATA_PRO_ANNUAL_BILLED_USD,
  TWELVE_DATA_PRO_MONTHLY_USD,
  buildMalaysiaV4TwelveProRoiAuditReport,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4TwelveProRoiAudit';

describe('forwardValidationMalaysiaV4TwelveProRoiAudit', () => {
  it('uses official Twelve Pro pricing constants', () => {
    expect(TWELVE_DATA_PRO_MONTHLY_USD).toBe(229);
    expect(TWELVE_DATA_PRO_ANNUAL_BILLED_USD).toBe(2290);
  });

  it('builds report with yahoo_only recommendation when audit81 metrics pass', () => {
    const report = buildMalaysiaV4TwelveProRoiAuditReport();
    expect(report.yahooSuccessRatePct).toBeGreaterThanOrEqual(100);
    expect(report.v4CumulativeReturnPct).toBe(38.36);
    expect(report.recommendation).toBe('yahoo_only');
    expect(report.dataGapRows.length).toBeGreaterThanOrEqual(5);
    expect(report.opsComparisonRows).toHaveLength(5);
  });

  it('states ROI not measured in codebase', () => {
    const report = buildMalaysiaV4TwelveProRoiAuditReport();
    expect(report.roiMeasuredUpliftJa).toContain('未計測');
    expect(report.roiVerdictJa).toContain('ROI否定');
  });
});
