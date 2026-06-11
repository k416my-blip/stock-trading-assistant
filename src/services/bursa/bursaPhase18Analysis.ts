/**
 * Phase18  ENews Intelligence オーケストレータ
 */
import type { BursaDisclosureBundle, BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { BursaNewsIntelligenceAnalysis } from '../../types/bursaNewsIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  buildNewsIntelligenceAnalysis,
  isPhase11NewsMaterialSource,
  newsIntelligenceMaterialScoreAdjustment,
  newsIntelligenceToMaterialInputs,
} from './bursaNewsIntelligenceService';

export async function enrichStockWithNewsIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  stockHtml: string | null;
  bundle?: BursaDisclosureBundle | null;
  apiKeys?: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const newsIntelligence = await buildNewsIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    companyName: input.stock.companyName,
    stockHtml: input.stockHtml,
    bundle: input.bundle ?? null,
    apiKeys: input.apiKeys,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const filterNewsDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase11NewsMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterNewsDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterNewsDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterNewsDup(input.stock.neutralMaterials ?? []);

  const materialInputs = newsIntelligenceToMaterialInputs(newsIntelligence);
  const adj = newsIntelligenceMaterialScoreAdjustment(newsIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreMaterialItem(m);
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

  if (newsIntelligence.availability === 'available' && newsIntelligence.hasExtractableData) {
    fetchedFields.push('phase18.news_intelligence');
  } else {
    missingFields.push('phase18.news_intelligence');
  }

  return {
    ...stockWithMaterials,
    newsIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaNewsIntelligenceAnalysis };
