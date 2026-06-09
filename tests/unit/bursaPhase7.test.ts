import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { formatAssetManagementReport } from '../../src/services/bursa/bursaAssetManagementService';
import {
  buildBursaPhase7FromBundles,
  buildBursaPhase7Analysis,
} from '../../src/services/bursa/bursaPhase7Analysis';
import {
  buildAddPositionJudgment,
  buildHoldingDiagnosis,
  mapOverallToHoldingAction,
} from '../../src/services/bursa/bursaHoldingsAction';
import { buildBursaPhase5Analysis } from '../../src/services/bursa/bursaPhase5Analysis';
import { buildBursaPhase3FromSnapshots } from '../../src/services/bursa/bursaPhase3Analysis';
import { peerSnapshotFromBundle } from '../../src/services/bursa/bursaPeerSnapshotService';
import type { BursaDisclosureBundle } from '../../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../../src/types';
import { bursaTestHolding } from '../helpers/bursaPortfolioFixture';

const root = process.cwd();

function loadBundle(code: string): BursaDisclosureBundle | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  return {
    stockCode: code,
    profile: parseBursaCompanyProfileFromHtml(html, code),
    quarterly: parseBursaQuarterlyFromHtml(html, code),
    dividend: parseBursaDividendFromHtml(html, code),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

describe('bursa Phase7 asset management', () => {
  it('maps 見送り to 売却候補 for held stocks', () => {
    expect(mapOverallToHoldingAction('見送り')).toBe('売却候補');
    expect(mapOverallToHoldingAction('買い')).toBe('買い');
    expect(mapOverallToHoldingAction(null)).toBeNull();
  });

  it('builds holding diagnosis and add-position from fixtures', () => {
    const codes = ['1155', '1066', '5819', '5183'].filter((c) =>
      existsSync(join(root, `scripts/klse-sample-${c}.html`)),
    );
    const bundles = codes.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    expect(bundles.length).toBeGreaterThanOrEqual(2);

    const snapshots = bundles.map(peerSnapshotFromBundle);
    const maybank = bundles.find((b) => b.stockCode === '1155');
    expect(maybank).toBeTruthy();

    const phase3 = buildBursaPhase3FromSnapshots(maybank!, snapshots);
    const phase5 = buildBursaPhase5Analysis({
      bundle: maybank!,
      phase3,
      currentPrice: 10.5,
    });

    const diagnosis = buildHoldingDiagnosis({
      symbol: '1155',
      companyName: 'Maybank',
      phase5,
      ranked: null,
    });
    expect(diagnosis.judgment).toBeTruthy();
    expect(diagnosis.reasons.length).toBeGreaterThan(0);

    const add = buildAddPositionJudgment({
      symbol: '1155',
      companyName: 'Maybank',
      phase5,
      holdingAction: mapOverallToHoldingAction(phase5.overallJudgment),
    });
    expect(add.verdict).toBeTruthy();
    expect(add.reasonJa).not.toBe('');
  });

  it('builds full phase7 report from fixture bundles with holdings', () => {
    const codes = ['1155', '1066', '5819', '5183'].filter((c) =>
      existsSync(join(root, `scripts/klse-sample-${c}.html`)),
    );
    const bundles = codes.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    const holdings: PortfolioPosition[] = [
      bursaTestHolding({
        id: 'h-maybank',
        symbol: '1155',
        shares: 1000,
        currentPrice: 10.5,
        companyName: 'Maybank',
      }),
    ];

    const phase7 = buildBursaPhase7FromBundles({ bundles, holdings });
    expect(phase7.holdingsDiagnosis.length).toBe(1);
    expect(phase7.holdingsDiagnosis[0]!.symbol).toBe('1155');
    expect(phase7.addPosition.length).toBe(1);
    expect(phase7.takeProfit.length).toBe(1);
    expect(phase7.stopLoss.length).toBe(1);
    expect(phase7.portfolioHealth.score).not.toBeNull();
    expect(phase7.investorType).toBeTruthy();

    const report = formatAssetManagementReport(phase7);
    expect(report.holdings[0]!.judgmentJa).not.toBe('データ未取得');
    expect(report.portfolioHealthScoreJa).toMatch(/\d+\/100/);
  });

  it('exports buildBursaPhase7Analysis async entry', () => {
    expect(typeof buildBursaPhase7Analysis).toBe('function');
  });
});
