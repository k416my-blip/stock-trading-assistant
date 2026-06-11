/**
 * Phase16  EInstitutional Ownership オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaInstitutionalOwnershipAnalysis } from '../../types/bursaInstitutionalOwnership';
import {
  buildInstitutionalOwnershipAnalysis,
  institutionalMaterialScoreAdjustment,
  institutionalOwnershipToMaterialInputs,
} from './bursaInstitutionalOwnershipService';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';

export async function enrichStockWithInstitutionalOwnership(input: {
  stock: BursaStockMaterialAnalysis;
  stockHtml: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const institutionalOwnership = await buildInstitutionalOwnershipAnalysis({
    stockCode: input.stock.stockCode,
    stockHtml: input.stockHtml,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const materialInputs = institutionalOwnershipToMaterialInputs(institutionalOwnership);
  const adj = institutionalMaterialScoreAdjustment(institutionalOwnership);
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

  if (institutionalOwnership.availability === 'available' && institutionalOwnership.hasExtractableData) {
    fetchedFields.push('phase16.institutional_ownership');
  } else {
    missingFields.push('phase16.institutional_ownership');
  }

  return {
    ...stockWithMaterials,
    institutionalOwnership,
    fetchedFields,
    missingFields,
  };
}

export type { BursaInstitutionalOwnershipAnalysis };
