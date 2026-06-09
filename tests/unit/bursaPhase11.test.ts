import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseRecentAnnouncementsFromKlseHtml } from '../../src/services/bursa/bursaAnnouncementParser';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import {
  classifyMaterialSentiment,
  clampMaterialScore,
  scoreMaterialItem,
} from '../../src/services/bursa/bursaMaterialSentiment';
import { buildBursaPhase11FromBundles } from '../../src/services/bursa/bursaPhase11Analysis';
import { formatMaterialAnalysisReport } from '../../src/services/bursa/bursaMaterialAnalysisService';
import type { BursaDisclosureBundle } from '../../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../../src/types';
import { bursaTestHolding } from '../helpers/bursaPortfolioFixture';

const root = process.cwd();
const VERIFY_CODES = [
  { code: '1155', label: 'Maybank' },
  { code: '1066', label: 'RHB' },
  { code: '5819', label: 'Hong Leong' },
  { code: '5183', label: 'Petronas Chemicals' },
];

function loadBundle(code: string): { bundle: BursaDisclosureBundle; html: string } | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  return {
    html,
    bundle: {
      stockCode: code,
      profile: parseBursaCompanyProfileFromHtml(html, code),
      quarterly: parseBursaQuarterlyFromHtml(html, code),
      dividend: parseBursaDividendFromHtml(html, code),
      dataSource: 'klse_screener',
      fetchedFields: [],
      missingFields: [],
      apiNotes: [],
    },
  };
}

describe('bursa Phase11 material analysis', () => {
  it('parses KLSE recent announcements from fixture HTML', () => {
    const loaded = loadBundle('1155');
    expect(loaded).not.toBeNull();
    const anns = parseRecentAnnouncementsFromKlseHtml(loaded!.html, '1155');
    expect(anns.length).toBeGreaterThan(0);
    expect(anns[0]!.title.length).toBeGreaterThan(8);
  });

  it('classifies sentiment from headline keywords', () => {
    expect(classifyMaterialSentiment('dividend increase announced')).toBe('好材料');
    expect(classifyMaterialSentiment('profit plunge on weak demand')).toBe('悪材料');
    expect(classifyMaterialSentiment('substantial shareholder change filing')).toBe('中立');
  });

  it('clamps material score to -100..+100', () => {
    expect(clampMaterialScore(150)).toBe(100);
    expect(clampMaterialScore(-120)).toBe(-100);
  });

  it('scores disclosure materials from 4-stock KLSE fixtures', async () => {
    const loaded = VERIFY_CODES.map((s) => loadBundle(s.code)).filter(Boolean) as Array<{
      bundle: BursaDisclosureBundle;
      html: string;
    }>;
    expect(loaded.length).toBe(4);

    const holdings: PortfolioPosition[] = VERIFY_CODES.map((s) =>
      bursaTestHolding({
        id: `h-${s.code}`,
        symbol: s.code,
        shares: 1000,
        currentPrice: 0,
        companyName: s.label,
      }),
    );

    const stockHtmlByCode = Object.fromEntries(loaded.map((l) => [l.bundle.stockCode, l.html]));

    const phase11 = await buildBursaPhase11FromBundles({
      bundles: loaded.map((l) => l.bundle),
      holdings,
      stockHtmlByCode,
      fetchLiveExternal: false,
    });

    const report = formatMaterialAnalysisReport(phase11);
    expect(report.stocks.length).toBe(4);

    for (const row of report.stocks) {
      expect(row.scoreJa).toMatch(/^[+-]?\d+$/);
      expect(row.summaryLines.length).toBe(3);
      expect(row.sources.some((s) => s.sourceJa === 'Bursa Announcement')).toBe(true);
    }

    const maybank = report.stocks.find((s) => s.stockCode === '1155');
    expect(maybank).toBeDefined();
    expect(maybank!.positive.length + maybank!.negative.length + maybank!.neutral.length).toBeGreaterThan(
      0,
    );

    const petronas = report.stocks.find((s) => s.stockCode === '5183');
    expect(petronas).toBeDefined();

    const scored = scoreMaterialItem({
      source: 'bursa_announcement',
      title: '利益急減',
      url: null,
      publishedAt: null,
    });
    expect(scored.score).toBeLessThan(0);
  });
});
