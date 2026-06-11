/**
 * Phase15  EInsider Trading オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaInsiderTradingAnalysis } from '../../types/bursaInsiderTrading';
import {
  buildInsiderTradingAnalysis,
  insiderMaterialScoreAdjustment,
  insiderTradingToMaterialInputs,
} from './bursaInsiderTradingService';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';

export async function enrichStockWithInsiderTrading(input: {
  stock: BursaStockMaterialAnalysis;
  stockHtml: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const insiderTrading = await buildInsiderTradingAnalysis({
    stockCode: input.stock.stockCode,
    stockHtml: input.stockHtml,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const materialInputs = insiderTradingToMaterialInputs(insiderTrading);
  const adj = insiderMaterialScoreAdjustment(insiderTrading);
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

  if (insiderTrading.availability === 'available' && insiderTrading.hasExtractableData) {
    fetchedFields.push('phase15.insider_trading');
  } else {
    missingFields.push('phase15.insider_trading');
  }

  return {
    ...stockWithMaterials,
    insiderTrading,
    fetchedFields,
    missingFields,
  };
}

export type { BursaInsiderTradingAnalysis };
