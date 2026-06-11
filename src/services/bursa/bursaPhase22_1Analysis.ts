/**
 * Phase22.1  EValuation Gap Intelligence オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaValuationGapIntelligenceAnalysis } from '../../types/bursaValuationGapIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  buildValuationGapIntelligenceAnalysis,
  scoreValuationGapMaterialItem,
  valuationGapIntelligenceMaterialScoreAdjustment,
  valuationGapIntelligenceToMaterialInputs,
} from './bursaValuationGapIntelligenceService';

function isPhase22_1ValuationGapMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase22\.1/i.test(label) || /Valuation Gap Intelligence/i.test(label)) return true;
  if (id?.includes('phase22_1-valuation-gap')) return true;
  if (source === 'valuation_gap_intelligence') return true;
  return false;
}

export function enrichStockWithValuationGapIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
}): BursaStockMaterialAnalysis {
  const valuationGapIntelligence = buildValuationGapIntelligenceAnalysis({
    fairValueIntelligence: input.stock.fairValueIntelligence,
    analystTargetIntelligence: input.stock.analystTargetIntelligence,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase22_1ValuationGapMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = valuationGapIntelligenceToMaterialInputs(valuationGapIntelligence);
  const adj = valuationGapIntelligenceMaterialScoreAdjustment(valuationGapIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreValuationGapMaterialItem(valuationGapIntelligence, m);
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

  if (
    valuationGapIntelligence.availability === 'available' &&
    valuationGapIntelligence.hasExtractableData
  ) {
    fetchedFields.push('phase22_1.valuation_gap_intelligence');
  } else {
    missingFields.push('phase22_1.valuation_gap_intelligence');
  }

  return {
    ...stockWithMaterials,
    valuationGapIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaValuationGapIntelligenceAnalysis };
