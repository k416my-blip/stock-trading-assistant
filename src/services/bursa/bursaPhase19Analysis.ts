/**
 * Phase19  EMacro Intelligence オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaMacroIntelligenceAnalysis } from '../../types/bursaMacroIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  applyMacroIntelligenceToStock,
  buildGlobalMacroIntelligenceAnalysis,
  macroIntelligenceMaterialScoreAdjustment,
  macroIntelligenceToMaterialInputs,
} from './bursaMacroIntelligenceService';
import { isPhase11NewsMaterialSource } from './bursaNewsIntelligenceService';

let sharedGlobalMacro: BursaMacroIntelligenceAnalysis | null = null;

export async function getSharedGlobalMacroIntelligence(
  forceRefresh = false,
): Promise<BursaMacroIntelligenceAnalysis> {
  if (!forceRefresh && sharedGlobalMacro) return sharedGlobalMacro;
  const { loadAnalysisApiKeys } = await import('../analysisApiKeys');
  const apiKeys = await loadAnalysisApiKeys();
  sharedGlobalMacro = await buildGlobalMacroIntelligenceAnalysis({ forceRefresh, apiKeys });
  return sharedGlobalMacro;
}

export function resetSharedGlobalMacroCache(): void {
  sharedGlobalMacro = null;
}

export async function enrichStockWithMacroIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  sector?: string | null;
  globalMacro?: BursaMacroIntelligenceAnalysis | null;
  fetchLiveExternal?: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const global =
    input.globalMacro ??
    (input.fetchLiveExternal === false
      ? sharedGlobalMacro
      : await getSharedGlobalMacroIntelligence());

  if (!global) {
    return input.stock;
  }

  const macroIntelligence = applyMacroIntelligenceToStock({
    global,
    stockCode: input.stock.stockCode,
    sector: input.sector ?? null,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase11NewsMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = macroIntelligenceToMaterialInputs(macroIntelligence);
  const adj = macroIntelligenceMaterialScoreAdjustment(macroIntelligence);
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

  if (macroIntelligence.availability === 'available' && macroIntelligence.hasExtractableData) {
    fetchedFields.push('phase19.macro_intelligence');
  } else {
    missingFields.push('phase19.macro_intelligence');
  }

  return {
    ...stockWithMaterials,
    macroIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaMacroIntelligenceAnalysis };
