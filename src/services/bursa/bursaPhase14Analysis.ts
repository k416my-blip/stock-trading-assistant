/**
 * Phase14 — Analyst Consensus オーケストレータ
 */
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import {
  analystConsensusToMaterialInputs,
  buildAnalystConsensusAnalysis,
} from './bursaAnalystConsensusService';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
} from './bursaMaterialSentiment';

export async function enrichStockWithAnalystConsensus(input: {
  stock: BursaStockMaterialAnalysis;
  currentPrice?: number | null;
  apiKeys: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const analystConsensus = await buildAnalystConsensusAnalysis({
    stockCode: input.stock.stockCode,
    currentPrice: input.currentPrice,
    apiKeys: input.apiKeys,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const materialInputs = analystConsensusToMaterialInputs(analystConsensus);
  const extraItems = materialInputs.map((m) => scoreMaterialItem(m));

  const positiveMaterials = [...(input.stock.positiveMaterials ?? [])];
  const negativeMaterials = [...(input.stock.negativeMaterials ?? [])];
  const neutralMaterials = [...(input.stock.neutralMaterials ?? [])];

  for (const item of extraItems) {
    if (item.sentiment === '好材料' && item.score > 0) positiveMaterials.push(item);
    else if (item.sentiment === '悪材料' && item.score < 0) negativeMaterials.push(item);
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

  if (analystConsensus.availability === 'available' && analystConsensus.hasRatingOrTarget) {
    fetchedFields.push('phase14.analyst_consensus');
  } else {
    missingFields.push('phase14.analyst_consensus');
  }

  return {
    ...stockWithMaterials,
    analystConsensus,
    fetchedFields,
    missingFields,
  };
}

export type { BursaAnalystConsensusAnalysis };
