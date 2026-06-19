/**
 * Phase23.1 — Earnings Revision × Insider/Institutional Cross Signal オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaEarningsRevisionCrossSignalAnalysis } from '../../types/bursaEarningsRevisionCrossSignal';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  buildEarningsRevisionCrossSignalAnalysis,
  earningsRevisionCrossSignalMaterialScoreAdjustment,
  earningsRevisionCrossSignalToMaterialInputs,
  scoreEarningsRevisionCrossSignalMaterialItem,
} from './bursaEarningsRevisionCrossSignalService';

function isPhase23_1CrossSignalMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase23\.1/i.test(label) || /Earnings Revision Cross Signal/i.test(label)) return true;
  if (id?.includes('phase23_1-earnings-revision-cross-signal')) return true;
  return false;
}

export function enrichStockWithEarningsRevisionCrossSignal(input: {
  stock: BursaStockMaterialAnalysis;
}): BursaStockMaterialAnalysis {
  const earningsRevisionCrossSignal = buildEarningsRevisionCrossSignalAnalysis({
    earningsRevisionIntelligence: input.stock.earningsRevisionIntelligence,
    insiderTrading: input.stock.insiderTrading,
    institutionalOwnership: input.stock.institutionalOwnership,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase23_1CrossSignalMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = earningsRevisionCrossSignalToMaterialInputs(earningsRevisionCrossSignal);
  const adj = earningsRevisionCrossSignalMaterialScoreAdjustment(earningsRevisionCrossSignal);
  const extraItems = materialInputs.map((m) => {
    const item = scoreEarningsRevisionCrossSignalMaterialItem(earningsRevisionCrossSignal, m);
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
    earningsRevisionCrossSignal.availability === 'available' &&
    earningsRevisionCrossSignal.hasExtractableData
  ) {
    fetchedFields.push('phase23_1.earnings_revision_cross_signal');
  } else {
    missingFields.push('phase23_1.earnings_revision_cross_signal');
  }

  return {
    ...stockWithMaterials,
    earningsRevisionCrossSignal,
    fetchedFields,
    missingFields,
  };
}

export type { BursaEarningsRevisionCrossSignalAnalysis };
