/**
 * Phase22.2  EConviction Intelligence オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaConvictionIntelligenceAnalysis } from '../../types/bursaConvictionIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  buildConvictionIntelligenceAnalysis,
  convictionIntelligenceMaterialScoreAdjustment,
  convictionIntelligenceToMaterialInputs,
  scoreConvictionMaterialItem,
} from './bursaConvictionIntelligenceService';

function isPhase22_2ConvictionMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase22\.2/i.test(label) || /Conviction Intelligence/i.test(label)) return true;
  if (id?.includes('phase22_2-conviction')) return true;
  return false;
}

export function enrichStockWithConvictionIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
}): BursaStockMaterialAnalysis {
  const convictionIntelligence = buildConvictionIntelligenceAnalysis({
    fairValueIntelligence: input.stock.fairValueIntelligence,
    analystTargetIntelligence: input.stock.analystTargetIntelligence,
    valuationGapIntelligence: input.stock.valuationGapIntelligence,
    earningsRevisionIntelligence: input.stock.earningsRevisionIntelligence,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase22_2ConvictionMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = convictionIntelligenceToMaterialInputs(convictionIntelligence);
  const adj = convictionIntelligenceMaterialScoreAdjustment(convictionIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreConvictionMaterialItem(convictionIntelligence, m);
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
    convictionIntelligence.availability === 'available' &&
    convictionIntelligence.hasExtractableData
  ) {
    fetchedFields.push('phase22_2.conviction_intelligence');
  } else {
    missingFields.push('phase22_2.conviction_intelligence');
  }

  return {
    ...stockWithMaterials,
    convictionIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaConvictionIntelligenceAnalysis };
