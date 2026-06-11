import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { analyzeFinancialReportHtml, extractFinancialReportPlainText } from '../../src/services/bursa/bursaFinancialReportAnalysis';
import { buildRuleBasedEarningsSummary, hasGeneratedSummary } from '../../src/services/bursa/earningsCallAiSummary';
import { scoreTextTone } from '../../src/services/bursa/bursaEarningsCallService';

const fixturePath = join(process.cwd(), 'scripts/klse-financial-report-1155-2024-12-31.html');

describe('bursaFinancialReportAnalysis Phase13.1', () => {
  it('extracts plain text from bursa-ann section', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const text = extractFinancialReportPlainText(html);
    expect(text.length).toBeGreaterThan(500);
    expect(text).toMatch(/Revenue/i);
  });

  it('extracts revenue and profit growth from financial table', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const report = analyzeFinancialReportHtml({
      stockCode: '1155',
      html,
      quarterEndDate: '2024-12-31',
    });
    expect(report.hasExtractableData).toBe(true);
    expect(report.extracted.revenueGrowth?.growthPct).not.toBeNull();
    expect(report.extracted.profitGrowth?.growthPct).not.toBeNull();
    expect((report.extracted.revenueGrowth?.growthPct ?? 0) > 0).toBe(true);
  });

  it('generates rule-based summary without OpenAI', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const report = analyzeFinancialReportHtml({
      stockCode: '1155',
      html,
      quarterEndDate: '2024-12-31',
    });
    const tone = scoreTextTone(extractFinancialReportPlainText(html));
    const summary = buildRuleBasedEarningsSummary({ report, tone });
    expect(hasGeneratedSummary(summary)).toBe(true);
    expect(summary.executiveSummaryJa).toContain('Financial Report Analysis');
    expect(summary.bullishFactorsJa.length).toBeGreaterThan(0);
    expect(summary.confidenceScore).toBeGreaterThan(0);
  });
});
