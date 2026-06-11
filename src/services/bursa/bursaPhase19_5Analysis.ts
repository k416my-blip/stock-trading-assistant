/**
 * Phase19.5  ESector Rotation Intelligence オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaMacroIntelligenceAnalysis } from '../../types/bursaMacroIntelligence';
import type { BursaSectorRotationAnalysis } from '../../types/bursaSectorRotation';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  scoreMaterialItem,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import { getSharedGlobalMacroIntelligence } from './bursaPhase19Analysis';
import {
  applySectorRotationToStock,
  buildGlobalSectorRotationAnalysis,
  sectorRotationMaterialScoreAdjustment,
  sectorRotationToMaterialInputs,
} from './bursaSectorRotationEngine';
import { isPhase11NewsMaterialSource } from './bursaNewsIntelligenceService';

type GlobalSectorRotation = ReturnType<typeof buildGlobalSectorRotationAnalysis>;
let sharedGlobalRotation: GlobalSectorRotation | null = null;

function isPhase19MacroMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase19\.5/i.test(label) || /Sector Rotation/i.test(label)) return false;
  if (/Macro Intelligence \(Phase19\)/i.test(label)) return true;
  if (id?.includes('macro-intelligence')) return true;
  return isPhase11NewsMaterialSource(source, sourceLabelJa, id);
}

export async function getSharedGlobalSectorRotation(
  macro?: BursaMacroIntelligenceAnalysis | null,
): Promise<GlobalSectorRotation> {
  const globalMacro = macro ?? (await getSharedGlobalMacroIntelligence());
  if (sharedGlobalRotation && sharedGlobalRotation.hasExtractableData) {
    return sharedGlobalRotation;
  }
  sharedGlobalRotation = buildGlobalSectorRotationAnalysis({
    dashboard: globalMacro.dashboard,
    macroScore: globalMacro.macroScore,
    hasExtractableData: globalMacro.hasExtractableData,
  });
  return sharedGlobalRotation;
}

export function resetSharedSectorRotationCache(): void {
  sharedGlobalRotation = null;
}

function mergeMacroWithRotation(
  macro: BursaMacroIntelligenceAnalysis,
  rotation: BursaSectorRotationAnalysis,
): BursaMacroIntelligenceAnalysis {
  return {
    ...macro,
    sectorRotationScore: rotation.sectorRotationScore,
    macroIntelligenceScore: rotation.macroIntelligenceScore,
    materialScoreAdjustment: rotation.materialScoreAdjustment,
    evaluationJa: rotation.evaluationJa,
    displayJa: {
      ...macro.displayJa,
      sectorRotationScore: rotation.displayJa.sectorRotationScore,
      macroIntelligenceScore: rotation.displayJa.macroIntelligenceScore,
      top3Sectors: rotation.displayJa.top3Sectors,
      bottom3Sectors: rotation.displayJa.bottom3Sectors,
      sectorRank: rotation.displayJa.sectorRank,
      rotationSummary: rotation.displayJa.rankingSummary,
    },
  };
}

export async function enrichStockWithSectorRotationIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  sector?: string | null;
  globalMacro?: BursaMacroIntelligenceAnalysis | null;
  fetchLiveExternal?: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const macro = input.stock.macroIntelligence;
  if (!macro) {
    return input.stock;
  }

  const globalRotation = await getSharedGlobalSectorRotation(
    input.globalMacro ?? macro,
  );

  const sectorRotation = applySectorRotationToStock({
    global: globalRotation,
    macroScore: macro.macroScore,
    stockCode: input.stock.stockCode,
    sector: input.sector ?? null,
  });

  const macroIntelligence = mergeMacroWithRotation(macro, sectorRotation);

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase19MacroMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = sectorRotationToMaterialInputs(sectorRotation);
  const adj = sectorRotationMaterialScoreAdjustment(sectorRotation);
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

  if (sectorRotation.availability === 'available' && sectorRotation.hasExtractableData) {
    fetchedFields.push('phase19_5.sector_rotation');
  } else {
    missingFields.push('phase19_5.sector_rotation');
  }

  return {
    ...stockWithMaterials,
    macroIntelligence,
    sectorRotation,
    fetchedFields,
    missingFields,
  };
}

export type { BursaSectorRotationAnalysis };
