/**
 * Phase24 — Analyst Consensus Intelligence オーケストレータ（Step 3: 骨格のみ）
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaAnalystConsensusIntelligenceAnalysis } from '../../types/bursaAnalystConsensusIntelligence';
import { buildAnalystConsensusIntelligenceAnalysis } from './bursaAnalystConsensusIntelligenceService';

export async function enrichStockWithAnalystConsensusIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  useMockFixture?: boolean;
  fetchLiveExternal?: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const analystConsensusIntelligence = await buildAnalystConsensusIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    analystConsensus: input.stock.analystConsensus,
    useMockFixture: input.useMockFixture,
    fetchLiveExternal: false,
  });

  const fetchedFields = [...(input.stock.fetchedFields ?? [])];
  const missingFields = [...(input.stock.missingFields ?? [])];

  if (
    analystConsensusIntelligence.availability === 'available' &&
    analystConsensusIntelligence.hasExtractableData
  ) {
    fetchedFields.push('phase24.analyst_consensus_intelligence');
  } else {
    missingFields.push('phase24.analyst_consensus_intelligence');
  }

  return {
    ...input.stock,
    analystConsensusIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaAnalystConsensusIntelligenceAnalysis };
