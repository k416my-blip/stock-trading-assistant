/**
 * Phase13 — Earnings Call オーケストレータ
 */
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { BursaDisclosureBundle, BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaEarningsCallAnalysis } from '../../types/bursaEarningsCall';
import {
  buildEarningsCallAnalysis,
  earningsCallToMaterialInputs,
} from './bursaEarningsCallService';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
} from './bursaMaterialSentiment';

export async function enrichStockWithEarningsCall(input: {
  stock: BursaStockMaterialAnalysis;
  bundle: BursaDisclosureBundle;
  stockHtml: string | null;
  apiKeys: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const earningsCall = await buildEarningsCallAnalysis({
    stockCode: input.stock.stockCode,
    companyName: input.stock.companyName,
    bundle: input.bundle,
    stockHtml: input.stockHtml,
    apiKeys: input.apiKeys,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const materialInputs = earningsCallToMaterialInputs(earningsCall);
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

  if (earningsCall.availability === 'available') {
    fetchedFields.push('phase13.earnings_call');
  } else {
    missingFields.push('phase13.earnings_call');
  }

  return {
    ...stockWithMaterials,
    earningsCall,
    fetchedFields,
    missingFields,
  };
}

export type { BursaEarningsCallAnalysis };
