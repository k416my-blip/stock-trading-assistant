/**
 * Phase24 — Analyst Consensus Intelligence オーケストレータ
 */
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaAnalystConsensusIntelligenceAnalysis } from '../../types/bursaAnalystConsensusIntelligence';
import {
  analystConsensusIntelligenceMaterialScoreAdjustment,
  buildAnalystConsensusIntelligenceAnalysis,
} from './bursaAnalystConsensusIntelligenceService';
import {
  aggregateMaterialScore,
  buildMaterialSummaryLines,
  withAdjustedMaterialScore,
} from './bursaMaterialSentiment';

export async function enrichStockWithAnalystConsensusIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  apiKeys?: AnalysisApiKeys;
  useMockFixture?: boolean;
  fetchLiveExternal?: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const fetchLive = input.fetchLiveExternal ?? false;
  const useMock = input.useMockFixture ?? false;

  const analystConsensusIntelligence = await buildAnalystConsensusIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    analystConsensus: input.stock.analystConsensus,
    apiKeys: input.apiKeys,
    useMockFixture: useMock,
    fetchLiveExternal: fetchLive,
  });

  const adj = analystConsensusIntelligenceMaterialScoreAdjustment(analystConsensusIntelligence);
  const positiveMaterials = [...(input.stock.positiveMaterials ?? [])];
  const negativeMaterials = [...(input.stock.negativeMaterials ?? [])];
  const neutralMaterials = [...(input.stock.neutralMaterials ?? [])];

  if (analystConsensusIntelligence.availability === 'available' && adj !== 0) {
    const item = withAdjustedMaterialScore(
      {
        id: `phase24-analyst-consensus-${input.stock.stockCode}`,
        title: 'Analyst Consensus Intelligence',
        summary: analystConsensusIntelligence.evaluationJa.slice(0, 120),
        sentiment: adj > 0 ? '好材料' : '悪材料',
        score: adj,
        source: 'analyst_consensus_intelligence',
        sourceLabelJa: 'Phase24 Analyst Consensus Intelligence',
      },
      adj,
    );
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
    analystConsensusIntelligence,
  };
  stockWithMaterials.summaryLines = buildMaterialSummaryLines(stockWithMaterials);

  const fetchedFields = [...(input.stock.fetchedFields ?? [])];
  const missingFields = [...(input.stock.missingFields ?? [])];
  const fieldKey = 'phase24.analyst_consensus_intelligence';

  const idxFetched = fetchedFields.indexOf(fieldKey);
  const idxMissing = missingFields.indexOf(fieldKey);
  if (idxFetched >= 0) fetchedFields.splice(idxFetched, 1);
  if (idxMissing >= 0) missingFields.splice(idxMissing, 1);

  if (
    analystConsensusIntelligence.availability === 'available' &&
    analystConsensusIntelligence.hasExtractableData
  ) {
    fetchedFields.push(fieldKey);
  } else {
    missingFields.push(fieldKey);
  }

  return {
    ...stockWithMaterials,
    fetchedFields,
    missingFields,
  };
}

export type { BursaAnalystConsensusIntelligenceAnalysis };
