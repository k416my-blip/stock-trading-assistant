import { describe, expect, it } from 'vitest';
import {
  buildEarningsCallAnalysis,
  extractQaRiskPoints,
  scoreTextTone,
  summarizeGuidance,
} from '../../src/services/bursa/bursaEarningsCallService';
import {
  EARNINGS_CALL_API_NOT_CONFIGURED_JA,
  EARNINGS_CALL_UNAVAILABLE_JA,
} from '../../src/types/bursaEarningsCall';
import type { BursaDisclosureBundle } from '../../src/types/bursaDisclosure';
import type { AnalysisApiKeys } from '../../src/services/analysisApiKeys';

const EMPTY_KEYS: AnalysisApiKeys = {
  newsApiKey: '',
  snsApiKey: '',
  earningsApiKey: '',
  redditApiKey: '',
  xApiKey: '',
};

function minimalBundle(overrides: Partial<BursaDisclosureBundle> = {}): BursaDisclosureBundle {
  return {
    stockCode: '1155',
    profile: {
      stockCode: '1155',
      companyName: 'Maybank',
      companyOverview: null,
      sector: null,
      subSector: null,
      marketCap: null,
      marketCapCurrency: 'MYR',
      sharesOutstanding: null,
      pe: null,
      eps: null,
      dividendYieldPct: null,
      fetchedFields: [],
      missingFields: [],
      status: 'ok',
      source: 'klse_screener',
      fetchedAt: new Date().toISOString(),
    },
    quarterly: {
      stockCode: '1155',
      latestQuarter: null,
      quarterlyHistory: [],
      annualRecords: [],
      fetchedFields: [],
      missingFields: [],
      status: 'ok',
      source: 'klse_screener',
      fetchedAt: new Date().toISOString(),
    },
    dividend: {
      stockCode: '1155',
      history: [],
      fetchedFields: [],
      missingFields: [],
      status: 'ok',
      source: 'klse_screener',
      fetchedAt: new Date().toISOString(),
    },
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
    ...overrides,
  };
}

describe('bursaPhase13 earnings call', () => {
  it('scores bullish management tone from text', () => {
    const tone = scoreTextTone(
      'CEO said we are confident in strong growth and record profit momentum this quarter.',
    );
    expect(tone.bullishWordCount).toBeGreaterThan(0);
    expect(tone.managementToneScore).toBeGreaterThan(0);
  });

  it('scores bearish tone without crashing on empty input', () => {
    const tone = scoreTextTone('');
    expect(tone.managementToneScore).toBe(0);
    expect(tone.bullishWordCount).toBe(0);
    expect(tone.bearishWordCount).toBe(0);
  });

  it('extracts Q&A risk keywords', () => {
    const points = extractQaRiskPoints(
      'An analyst question raised concern about margin pressure. Management remained cautious on headwinds.',
    );
    expect(points.length).toBeGreaterThan(0);
  });

  it('summarizes guidance direction', () => {
    expect(summarizeGuidance('We raise full year guidance and expect higher revenue.')).toContain('上方');
    expect(summarizeGuidance('')).toBe(EARNINGS_CALL_UNAVAILABLE_JA);
  });

  it('returns データなし when KLSE html present but no earnings match', async () => {
    const html = `<html>Recent Announcements<ul class="list-group"><li><h6><a href="/v2/announcements/view/1">Notice of AGM</a></h6></li></ul></html>`;
    const result = await buildEarningsCallAnalysis({
      stockCode: '1155',
      companyName: 'Maybank',
      bundle: minimalBundle(),
      stockHtml: html,
      apiKeys: EMPTY_KEYS,
      fetchLiveExternal: true,
    });
    expect(result.availability).toBe('unavailable');
    expect(result.evaluationJa).toBe(EARNINGS_CALL_UNAVAILABLE_JA);
  });

  it('returns API未設定 when no key and no KLSE text', async () => {
    const result = await buildEarningsCallAnalysis({
      stockCode: '1155',
      companyName: 'Maybank',
      bundle: minimalBundle(),
      stockHtml: null,
      apiKeys: EMPTY_KEYS,
      fetchLiveExternal: false,
    });
    expect(result.availability).toBe('api_not_configured');
    expect(result.evaluationJa).toBe(EARNINGS_CALL_API_NOT_CONFIGURED_JA);
    expect(result.displayJa.managementTone).toBe(EARNINGS_CALL_API_NOT_CONFIGURED_JA);
  });

  it('returns unavailable when API key set but fetch returns nothing', async () => {
    const result = await buildEarningsCallAnalysis({
      stockCode: '1155',
      companyName: 'Maybank',
      bundle: minimalBundle(),
      stockHtml: null,
      apiKeys: { ...EMPTY_KEYS, earningsApiKey: 'test-key-no-fetch' },
      fetchLiveExternal: false,
    });
    expect(result.availability).toBe('unavailable');
    expect(result.evaluationJa).toBe(EARNINGS_CALL_UNAVAILABLE_JA);
  });

  it('builds from earnings-related announcement titles in HTML', async () => {
    const html = `
      <html><body>
        Recent Announcements
        <ul class="list-group">
          <li><h6><a href="/v2/announcements/view/1">Quarterly financial results for Q1 FY2025</a></h6></li>
          <li><h6><a href="/v2/announcements/view/2">Notice of AGM</a></h6></li>
        </ul>
      </body></html>`;
    const result = await buildEarningsCallAnalysis({
      stockCode: '1155',
      companyName: 'Maybank',
      bundle: minimalBundle(),
      stockHtml: html,
      apiKeys: EMPTY_KEYS,
      fetchLiveExternal: false,
    });
    expect(result.availability).toBe('available');
    expect(result.record?.source).toBe('klse_announcement');
    expect(result.evaluationJa).toContain('Earnings Call');
  });
});
