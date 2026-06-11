/**
 * Phase16.6 — Historical Ownership オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaHistoricalOwnershipAnalysis } from '../../types/bursaHistoricalOwnership';
import { buildHistoricalOwnershipAnalysis } from './bursaHistoricalOwnershipService';

export async function enrichStockWithHistoricalOwnership(input: {
  stock: BursaStockMaterialAnalysis;
  stockHtml: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const historicalOwnership = await buildHistoricalOwnershipAnalysis({
    stockCode: input.stock.stockCode,
    stockHtml: input.stockHtml,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const fetchedFields = [...(input.stock.fetchedFields ?? [])];
  const missingFields = [...(input.stock.missingFields ?? [])];

  if (historicalOwnership.availability === 'available' && historicalOwnership.hasExtractableData) {
    fetchedFields.push('phase16.6.historical_ownership');
  } else {
    missingFields.push('phase16.6.historical_ownership');
  }

  return {
    ...input.stock,
    historicalOwnership,
    fetchedFields,
    missingFields,
  };
}

export type { BursaHistoricalOwnershipAnalysis };
