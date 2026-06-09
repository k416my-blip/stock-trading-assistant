/**
 * Bursa Phase5 検証 — Maybank (1155)
 * npx tsx scripts/bursa-phase5-verify.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { buildBursaPhase3FromSnapshots } from '../src/services/bursa/bursaPhase3Analysis';
import { buildBursaPhase5Analysis } from '../src/services/bursa/bursaPhase5Analysis';
import { filterCompleteFyAnnual } from '../src/services/bursa/bursaTrendAnalysis';
import type { BursaDisclosureBundle, BursaPeerSnapshot } from '../src/types/bursaDisclosure';

const root = process.cwd();

function loadBundle(): BursaDisclosureBundle {
  const html = readFileSync(join(root, 'scripts/klse-sample-1155.html'), 'utf8');
  return {
    stockCode: '1155',
    profile: parseBursaCompanyProfileFromHtml(html, '1155'),
    quarterly: parseBursaQuarterlyFromHtml(html, '1155'),
    dividend: parseBursaDividendFromHtml(html, '1155'),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

function snapshotFromFixture(code: string): BursaPeerSnapshot | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  const profile = parseBursaCompanyProfileFromHtml(html, code);
  const quarterly = parseBursaQuarterlyFromHtml(html, code);
  const annual = filterCompleteFyAnnual(quarterly.annualRecords);
  const latestFy = annual[0] ?? null;
  let roePct: number | null = null;
  for (const q of quarterly.quarterlyHistory) {
    if (q.quarter === '4' && q.roePct != null) {
      roePct = q.roePct;
      break;
    }
  }
  return {
    stockCode: code,
    companyName: profile.companyName,
    marketCap: profile.marketCap,
    pe: profile.pe,
    dividendYieldPct: profile.dividendYieldPct,
    roePct,
    revenue: latestFy?.revenue ?? quarterly.latestQuarter?.revenue ?? null,
    netProfit: latestFy?.netProfit ?? quarterly.latestQuarter?.netProfit ?? null,
    eps: latestFy?.eps ?? quarterly.latestQuarter?.eps ?? null,
    status: profile.marketCap != null ? 'ok' : 'partial',
  };
}

function main() {
  const bundle = loadBundle();
  const codes = ['1155', '1023', '1295', '1066', '5819', '1015', '2488', '5185', '5258', '7054'];
  const peerSnapshots = codes.map(snapshotFromFixture).filter(Boolean) as BursaPeerSnapshot[];
  const phase3 = buildBursaPhase3FromSnapshots(bundle, peerSnapshots);
  const phase5 = buildBursaPhase5Analysis({
    bundle,
    phase3,
    currentPrice: 10.62,
  });

  const report = {
    dataSource: 'KLSE Screener + Twelve Data（現在価格）',
    additionalCost: 'USD 0 — HTML スクレイプ + 既存 Twelve Data',
    apiUsed: false,
    company: bundle.profile.companyName,
    enhancedPeerComparison: phase5.enhancedPeerComparison.map((r) => ({
      metric: r.labelJa,
      target: r.targetValue,
      industryAvg: r.industryAverage,
      diffPct: r.diffPct != null ? `${r.diffPct > 0 ? '+' : ''}${r.diffPct.toFixed(1)}%` : null,
    })),
    fairValue: {
      currentPrice: phase5.fairValue.currentPrice,
      fairPrice: phase5.fairValue.fairPrice,
      discountPct:
        phase5.fairValue.discountPct != null
          ? `${phase5.fairValue.discountPct > 0 ? '+' : ''}${phase5.fairValue.discountPct.toFixed(1)}%`
          : null,
      industryMedianPe: phase5.fairValue.industryMedianPe,
    },
    dividendJudgment: phase5.dividendJudgment,
    trendJudgment: phase5.trendJudgment,
    overallJudgment: phase5.overallJudgment,
    reasons: phase5.judgmentReasons,
    fetchedFields: phase5.fetchedFields,
    missingFields: phase5.missingFields,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
