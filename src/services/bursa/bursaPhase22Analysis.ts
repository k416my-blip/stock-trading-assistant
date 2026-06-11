/**
 * Phase22  EAnalyst Target Intelligence オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaAnalystTargetIntelligenceAnalysis } from '../../types/bursaAnalystTargetIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  analystTargetIntelligenceMaterialScoreAdjustment,
  analystTargetIntelligenceToMaterialInputs,
  buildAnalystTargetIntelligenceAnalysis,
  scoreAnalystTargetMaterialItem,
} from './bursaAnalystTargetIntelligenceService';

function isPhase22AnalystTargetMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase22/i.test(label) || /Analyst Target Intelligence/i.test(label)) return true;
  if (id?.includes('phase22-analyst-target')) return true;
  if (source === 'analyst_target_intelligence') return true;
  return false;
}

export async function enrichStockWithAnalystTargetIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  fetchLiveExternal: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const analystTargetIntelligence = await buildAnalystTargetIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    analystConsensus: input.stock.analystConsensus,
    fairValueIntelligence: input.stock.fairValueIntelligence,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase22AnalystTargetMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = analystTargetIntelligenceToMaterialInputs(analystTargetIntelligence);
  const adj = analystTargetIntelligenceMaterialScoreAdjustment(analystTargetIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreAnalystTargetMaterialItem(analystTargetIntelligence, m);
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

  if (
    analystTargetIntelligence.availability === 'available' &&
    analystTargetIntelligence.hasExtractableData
  ) {
    fetchedFields.push('phase22.analyst_target_intelligence');
  } else {
    missingFields.push('phase22.analyst_target_intelligence');
  }

  return {
    ...stockWithMaterials,
    analystTargetIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaAnalystTargetIntelligenceAnalysis };
