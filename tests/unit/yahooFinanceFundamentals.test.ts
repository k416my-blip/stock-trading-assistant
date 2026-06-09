import { describe, expect, it } from 'vitest';
import { parseYahooQuoteSummaryJson } from '../../src/services/quoteProviders/yahooFinanceFundamentals';

describe('parseYahooQuoteSummaryJson', () => {
  it('parses real-shaped Yahoo quoteSummary payload', () => {
    const json = {
      quoteSummary: {
        result: [
          {
            summaryProfile: {
              longName: 'China Mobile Limited',
              sector: 'Communication Services',
              longBusinessSummary: 'Telecom operator in China.',
            },
            financialData: {
              totalRevenue: { raw: 900_000_000_000 },
              profitMargins: { raw: 0.18 },
              revenueGrowth: { raw: 0.042 },
              operatingCashflow: { raw: 120_000_000_000 },
              freeCashflow: { raw: 80_000_000_000 },
              debtToEquity: { raw: 0.4 },
            },
            defaultKeyStatistics: {
              marketCap: { raw: 1_400_000_000_000 },
              trailingPE: { raw: 9.8 },
              trailingEps: { raw: 6.99 },
              dividendYield: { raw: 0.062 },
            },
            incomeStatementHistory: {
              incomeStatementHistory: [
                {
                  totalRevenue: { raw: 900_000_000_000 },
                  netIncome: { raw: 130_000_000_000 },
                  ebit: { raw: 150_000_000_000 },
                },
              ],
            },
          },
        ],
      },
    };

    const result = parseYahooQuoteSummaryJson(json, '0941.HK', 'https://example.com');
    expect(result.ok).toBe(true);
    expect(result.companyName).toBe('China Mobile Limited');
    expect(result.sector).toBe('Communication Services');
    expect(result.pe).toBe(9.8);
    expect(result.eps).toBe(6.99);
    expect(result.dividendYieldPct).toBeCloseTo(6.2, 1);
    expect(result.revenue).toBe(900_000_000_000);
    expect(result.profit).toBe(130_000_000_000);
    expect(result.fetched).toContain('companyName');
    expect(result.fetched).toContain('revenue');
  });
});
