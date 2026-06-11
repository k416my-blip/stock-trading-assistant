/**
 * Phase21  EFair Value Intelligence オーケストレータ
 */
import type { BursaDisclosureBundle, BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaFairValueIntelligenceAnalysis } from '../../types/bursaFairValueIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  buildFairValueIntelligenceAnalysis,
  fairValueIntelligenceMaterialScoreAdjustment,
  fairValueIntelligenceToMaterialInputs,
  scoreFairValueMaterialItem,
} from './bursaFairValueIntelligenceService';

function isPhase21FairValueMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase21/i.test(label) || /Fair Value Intelligence/i.test(label)) return true;
  if (id?.includes('phase21-fair-value')) return true;
  return false;
}

export async function enrichStockWithFairValueIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  sector?: string | null;
  fetchLiveExternal: boolean;
  bursaBundle?: BursaDisclosureBundle | null;
}): Promise<BursaStockMaterialAnalysis> {
  const fairValueIntelligence = await buildFairValueIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    sector: input.sector ?? null,
    dividendIntelligence: input.stock.dividendIntelligence,
    financialReportAnalysis: input.stock.earningsCall?.financialReportAnalysis ?? null,
    bursaProfile: input.bursaBundle?.profile ?? null,
    bursaQuarterly: input.bursaBundle?.quarterly ?? null,
    bursaDividend: input.bursaBundle?.dividend ?? null,
    bursaBundle: input.bursaBundle ?? null,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase21FairValueMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = fairValueIntelligenceToMaterialInputs(fairValueIntelligence);
  const adj = fairValueIntelligenceMaterialScoreAdjustment(fairValueIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreFairValueMaterialItem(fairValueIntelligence, m);
    if (adj === 0) return item;
    return withAdjustedMaterialScore(item, item.score + adj);
  });

  for (const item of extraItems) {
    if (item.score > 0) positiveMaterials.push(item);
    else if (item.score < 0) negativeMaterials.push(item);
    else neutralMaterials.push(item);
  }

  const allItems = [...positiveMaterials, ...negativeMaterials, ...neutralMaterials];
  const { total, breakdown } = aggregateMaterialScore(allItems);

  const stockWithMaterials: BursaStockMaterialAnalysis = {
    ...input.stock,
    materialScore: total,
    scoreBreakdown: breakdown,
    positiveMaterials,
    negativeMaterials,
    neutralMaterials,
    summaryLines: ['', '', ''] as [string, string, string],
  };
  stockWithMaterials.summaryLines = buildMaterialSummaryLines(stockWithMaterials);

  const fetchedFields = [...(input.stock.fetchedFields ?? [])];
  const missingFields = [...(input.stock.missingFields ?? [])];

  if (fairValueIntelligence.availability === 'available' && fairValueIntelligence.hasExtractableData) {
    fetchedFields.push('phase21.fair_value_intelligence');
  } else {
    missingFields.push('phase21.fair_value_intelligence');
  }

  return {
    ...stockWithMaterials,
    fairValueIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaFairValueIntelligenceAnalysis };
