/**
 * Phase23  EEarnings Revision Intelligence オーケストレータ
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaEarningsRevisionIntelligenceAnalysis } from '../../types/bursaEarningsRevisionIntelligence';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';
import {
  buildEarningsRevisionIntelligenceAnalysis,
  earningsRevisionIntelligenceMaterialScoreAdjustment,
  earningsRevisionIntelligenceToMaterialInputs,
  scoreEarningsRevisionMaterialItem,
} from './bursaEarningsRevisionIntelligenceService';

function isPhase23EarningsRevisionMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (/Phase23/i.test(label) || /Earnings Revision Intelligence/i.test(label)) return true;
  if (id?.includes('phase23-earnings-revision')) return true;
  return false;
}

export async function enrichStockWithEarningsRevisionIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  fetchLiveExternal: boolean;
  apiKeys?: {
    finnhubApiKey?: string;
    alphaVantageApiKey?: string;
    fmpApiKey?: string;
  };
}): Promise<BursaStockMaterialAnalysis> {
  const earningsRevisionIntelligence = await buildEarningsRevisionIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    analystConsensus: input.stock.analystConsensus,
    financialReport: input.stock.earningsCall?.financialReportAnalysis,
    fetchLiveExternal: input.fetchLiveExternal,
    apiKeys: input.apiKeys,
  });

  const filterDup = <T extends { source: string; sourceLabelJa?: string; id?: string }>(items: T[]) =>
    items.filter((m) => !isPhase23EarningsRevisionMaterialSource(m.source, m.sourceLabelJa, m.id));

  const positiveMaterials = filterDup(input.stock.positiveMaterials ?? []);
  const negativeMaterials = filterDup(input.stock.negativeMaterials ?? []);
  const neutralMaterials = filterDup(input.stock.neutralMaterials ?? []);

  const materialInputs = earningsRevisionIntelligenceToMaterialInputs(earningsRevisionIntelligence);
  const adj = earningsRevisionIntelligenceMaterialScoreAdjustment(earningsRevisionIntelligence);
  const extraItems = materialInputs.map((m) => {
    const item = scoreEarningsRevisionMaterialItem(earningsRevisionIntelligence, m);
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
    earningsRevisionIntelligence.availability === 'available' &&
    earningsRevisionIntelligence.hasExtractableData
  ) {
    fetchedFields.push('phase23.earnings_revision_intelligence');
    if (earningsRevisionIntelligence.hasRevisionSeriesData) {
      fetchedFields.push('phase23.earnings_revision_series');
    } else {
      missingFields.push('phase23.earnings_revision_series');
    }
    if (earningsRevisionIntelligence.revenueRevision30d != null) {
      fetchedFields.push('phase23.revenue_revision_series');
    } else {
      missingFields.push('phase23.revenue_revision_series');
    }
  } else {
    missingFields.push('phase23.earnings_revision_intelligence');
    missingFields.push('phase23.earnings_revision_series');
    missingFields.push('phase23.revenue_revision_series');
  }

  return {
    ...stockWithMaterials,
    earningsRevisionIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaEarningsRevisionIntelligenceAnalysis };
