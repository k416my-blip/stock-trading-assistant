/**
 * Phase16.7 — Fixed Institutional Basket オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaFixedInstitutionalBasketAnalysis } from '../../types/bursaFixedInstitutionalBasket';
import {
  applyFixedBasketToHistoricalOwnership,
  buildFixedInstitutionalBasketAnalysis,
} from './bursaFixedInstitutionalBasketService';

export async function enrichStockWithFixedInstitutionalBasket(input: {
  stock: BursaStockMaterialAnalysis;
  stockHtml: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const fixedInstitutionalBasket = await buildFixedInstitutionalBasketAnalysis({
    stockCode: input.stock.stockCode,
    stockHtml: input.stockHtml,
    legacyHistorical: input.stock.historicalOwnership ?? null,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const historicalOwnership = input.stock.historicalOwnership
    ? applyFixedBasketToHistoricalOwnership(input.stock.historicalOwnership, fixedInstitutionalBasket)
    : input.stock.historicalOwnership;

  const fetchedFields = [...(input.stock.fetchedFields ?? [])];
  const missingFields = [...(input.stock.missingFields ?? [])];

  if (fixedInstitutionalBasket.availability === 'available' && fixedInstitutionalBasket.hasExtractableData) {
    fetchedFields.push('phase16.7.fixed_institutional_basket');
  } else {
    missingFields.push('phase16.7.fixed_institutional_basket');
  }

  return {
    ...input.stock,
    historicalOwnership,
    fixedInstitutionalBasket,
    fetchedFields,
    missingFields,
  };
}

export type { BursaFixedInstitutionalBasketAnalysis };
