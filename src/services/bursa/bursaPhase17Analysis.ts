/**
 * Phase17  EDividend Intelligence オーケストレータ
 */
import type { BursaDisclosureBundle, BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { BursaDividendIntelligenceAnalysis } from '../../types/bursaDividendIntelligence';
import {
  buildDividendIntelligenceAnalysis,
  dividendIntelligenceMaterialScoreAdjustment,
  dividendIntelligenceToMaterialInputs,
} from './bursaDividendIntelligenceService';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';

export async function enrichStockWithDividendIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  stockHtml: string | null;
  bundle?: BursaDisclosureBundle | null;
  apiKeys?: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const dividendIntelligence = await buildDividendIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    stockHtml: input.stockHtml,
    bundle: input.bundle ?? null,
    apiKeys: input.apiKeys,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const materialInputs = dividendIntelligenceToMaterialInputs(dividendIntelligence);
  const adj = dividendIntelligenceMaterialScoreAdjustment(dividendIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreMaterialItem(m);
    if (adj === 0) return item;
    return withAdjustedMaterialScore(item, item.score + adj);
  });

  const positiveMaterials = [...(input.stock.positiveMaterials ?? [])];
  const negativeMaterials = [...(input.stock.negativeMaterials ?? [])];
  const neutralMaterials = [...(input.stock.neutralMaterials ?? [])];

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

  if (dividendIntelligence.availability === 'available' && dividendIntelligence.hasExtractableData) {
    fetchedFields.push('phase17.dividend_intelligence');
  } else {
    missingFields.push('phase17.dividend_intelligence');
  }

  return {
    ...stockWithMaterials,
    dividendIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaDividendIntelligenceAnalysis };
