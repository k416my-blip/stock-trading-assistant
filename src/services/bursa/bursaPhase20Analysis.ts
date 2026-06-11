/**
 * Phase20  EValuation Intelligence オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaValuationIntelligenceAnalysis } from '../../types/bursaValuationIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  buildValuationIntelligenceAnalysis,
  scoreValuationMaterialItem,
  valuationIntelligenceMaterialScoreAdjustment,
  valuationIntelligenceToMaterialInputs,
} from './bursaValuationIntelligenceService';

function isPhase20ValuationMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase20/i.test(label) || /Valuation Intelligence/i.test(label)) return true;
  if (id?.includes('phase20-valuation')) return true;
  return false;
}

export async function enrichStockWithValuationIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  sector?: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const valuationIntelligence = await buildValuationIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    sector: input.sector ?? null,
    earningsCall: input.stock.earningsCall,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase20ValuationMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = valuationIntelligenceToMaterialInputs(valuationIntelligence);
  const adj = valuationIntelligenceMaterialScoreAdjustment(valuationIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreValuationMaterialItem(valuationIntelligence, m);
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

  if (valuationIntelligence.availability === 'available' && valuationIntelligence.hasExtractableData) {
    fetchedFields.push('phase20.valuation_intelligence');
  } else {
    missingFields.push('phase20.valuation_intelligence');
  }

  return {
    ...stockWithMaterials,
    valuationIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaValuationIntelligenceAnalysis };
