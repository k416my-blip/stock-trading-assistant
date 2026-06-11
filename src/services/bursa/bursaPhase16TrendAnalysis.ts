/**
 * Phase16.5  EInstitutional Trend オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaInstitutionalTrendAnalysis } from '../../types/bursaInstitutionalTrend';
import { applyHistoricalToInstitutionalTrend } from './bursaHistoricalOwnershipService';
import {
  buildInstitutionalTrendAnalysis,
  institutionalTrendMaterialScoreAdjustment,
  institutionalTrendToMaterialInputs,
} from './bursaInstitutionalTrendService';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';

export async function enrichStockWithInstitutionalTrend(input: {
  stock: BursaStockMaterialAnalysis;
  stockHtml: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const baseTrend = await buildInstitutionalTrendAnalysis({
    stockCode: input.stock.stockCode,
    stockHtml: input.stockHtml,
    fetchLiveExternal: input.fetchLiveExternal,
  });
  const institutionalTrend = applyHistoricalToInstitutionalTrend(
    baseTrend,
    input.stock.historicalOwnership,
  );

  const materialInputs = institutionalTrendToMaterialInputs(institutionalTrend);
  const adj = institutionalTrendMaterialScoreAdjustment(
    institutionalTrend,
    input.stock.fixedInstitutionalBasket,
  );
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

  if (institutionalTrend.availability === 'available' && institutionalTrend.hasExtractableData) {
    fetchedFields.push('phase16.5.institutional_trend');
  } else {
    missingFields.push('phase16.5.institutional_trend');
  }

  return {
    ...stockWithMaterials,
    institutionalTrend,
    fetchedFields,
    missingFields,
  };
}

export type { BursaInstitutionalTrendAnalysis };
