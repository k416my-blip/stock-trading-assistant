/**
 * Bursa Phase 8 — 今日の売買オーケストレータ
 */
import type { PortfolioPosition } from '../../types';
import type {
  BursaDisclosureBundle,
  BursaPhase5Analysis,
  BursaPhase8Analysis,
} from '../../types/bursaDisclosure';
import { fetchBursaDisclosureBundle } from './bursaDisclosureService';
import { buildBursaPhase3FromSnapshots } from './bursaPhase3Analysis';
import { buildBursaPhase5Analysis } from './bursaPhase5Analysis';
import { buildBursaPhase6FromBundles } from './bursaPhase6Analysis';
import { buildBursaPhase7FromBundles } from './bursaPhase7Analysis';
import { peerSnapshotFromBundle } from './bursaPeerSnapshotService';
import {
  BURSA_TODAY_BUDGETS_MYR,
  getBursaUniverseStockCodes,
} from './bursaStockUniverse';
import {
  buildBudgetPlans,
  buildBuyTop10,
  buildConciergeNotifications,
  buildPrimaryAction,
  buildPriorityOrder,
  buildSellCandidates,
} from './bursaTodayActions';

function buildPhase5Map(
  bundles: BursaDisclosureBundle[],
  ranked: import('../../types/bursaDisclosure').BursaPhase6RankedEntry[],
  snapshots: ReturnType<typeof peerSnapshotFromBundle>[],
): Map<string, BursaPhase5Analysis> {
  const map = new Map<string, BursaPhase5Analysis>();
  for (const r of ranked) {
    const bundle = bundles.find((b) => b.stockCode === r.stockCode);
    if (!bundle || bundle.dataSource === 'none') continue;
    const phase3 = buildBursaPhase3FromSnapshots(bundle, snapshots);
    const phase5 = buildBursaPhase5Analysis({
      bundle,
      phase3,
      currentPrice: r.currentPrice,
    });
    map.set(r.stockCode, phase5);
  }
  return map;
}

function assemblePhase8(input: {
  bundles: BursaDisclosureBundle[];
  holdings: PortfolioPosition[];
  budgetsMYR?: number[];
  fetchedFields: string[];
  missingFields: string[];
}): BursaPhase8Analysis {
  const snapshots = input.bundles.map(peerSnapshotFromBundle);
  const phase6 = buildBursaPhase6FromBundles({
    bundles: input.bundles,
    holdings: input.holdings,
  });
  const phase7 = buildBursaPhase7FromBundles({
    bundles: input.bundles,
    holdings: input.holdings,
  });

  const allRanked = [...phase6.rankedTop100];
  const phase5ByCode = buildPhase5Map(input.bundles, allRanked, snapshots);

  const buyTop10 = buildBuyTop10({ ranked: allRanked, phase5ByCode });
  const sellCandidates = buildSellCandidates(phase7);
  const budgetPlans = buildBudgetPlans({
    buyTop10,
    ranked: allRanked,
    budgetsMYR: input.budgetsMYR,
  });
  const primaryAction = buildPrimaryAction({ buyTop10, sellCandidates, budgetPlans });
  const priorityOrder = buildPriorityOrder({ phase7, buyTop10, sellCandidates });
  const notifications = buildConciergeNotifications({
    buyTop10,
    sellCandidates,
    primaryAction,
  });

  const fetchedFields = [...input.fetchedFields];
  const missingFields = [...input.missingFields];

  if (buyTop10.length > 0) fetchedFields.push('phase8.buyTop10');
  else missingFields.push('phase8.buyTop10');

  if (budgetPlans.some((p) => p.rows.length > 0)) fetchedFields.push('phase8.budgetPlans');
  else missingFields.push('phase8.budgetPlans');

  fetchedFields.push('phase8.primaryAction');

  return {
    buyTop10,
    sellCandidates,
    budgetPlans,
    primaryAction,
    priorityOrder,
    notifications,
    fetchedFields,
    missingFields,
  };
}

export async function buildBursaPhase8Analysis(input: {
  holdings?: PortfolioPosition[];
  budgetsMYR?: number[];
}): Promise<BursaPhase8Analysis> {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];
  const holdings = input.holdings ?? [];
  const budgetsMYR = input.budgetsMYR ?? [...BURSA_TODAY_BUDGETS_MYR];

  const universeCodes = getBursaUniverseStockCodes();
  const holdingCodes = holdings
    .filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0)
    .map((h) => h.symbol.replace(/\.KL$/i, '').trim());
  const allCodes = [...new Set([...universeCodes, ...holdingCodes])];

  const bundles = await Promise.all(allCodes.map((c) => fetchBursaDisclosureBundle(c)));
  for (const b of bundles) {
    if (b.dataSource !== 'none') fetchedFields.push(`phase8.${b.stockCode}`);
    else missingFields.push(`phase8.${b.stockCode}`);
  }

  const universeBundles = bundles.filter((b) => universeCodes.includes(b.stockCode));

  return assemblePhase8({
    bundles: universeBundles.length > 0 ? universeBundles : bundles,
    holdings,
    budgetsMYR,
    fetchedFields,
    missingFields,
  });
}

export function buildBursaPhase8FromBundles(input: {
  bundles: BursaDisclosureBundle[];
  holdings?: PortfolioPosition[];
  budgetsMYR?: number[];
}): BursaPhase8Analysis {
  return assemblePhase8({
    bundles: input.bundles,
    holdings: input.holdings ?? [],
    budgetsMYR: input.budgetsMYR,
    fetchedFields: ['phase8.offline'],
    missingFields: [],
  });
}
