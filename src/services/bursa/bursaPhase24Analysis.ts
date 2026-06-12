/**
 * Phase24 — Analyst Consensus Intelligence オーケストレータ（Step 4: 小実装）
 */
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { BursaAnalystConsensusIntelligenceAnalysis } from '../../types/bursaAnalystConsensusIntelligence';
import { buildAnalystConsensusIntelligenceAnalysis } from './bursaAnalystConsensusIntelligenceService';
import { isAuditMockStock } from './bursaAnalystConsensusIntelligenceProviders';

export async function enrichStockWithAnalystConsensusIntelligence(input: {
  stock: BursaStockMaterialAnalysis;
  useMockFixture?: boolean;
  fetchLiveExternal?: boolean;
}): Promise<BursaStockMaterialAnalysis> {
  const useMock =
    input.useMockFixture ??
    (input.fetchLiveExternal === false && isAuditMockStock(input.stock.stockCode));

  const analystConsensusIntelligence = await buildAnalystConsensusIntelligenceAnalysis({
    stockCode: input.stock.stockCode,
    analystConsensus: input.stock.analystConsensus,
    useMockFixture: useMock,
    fetchLiveExternal: false,
  });

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
    ...input.stock,
    analystConsensusIntelligence,
    fetchedFields,
    missingFields,
  };
}

export type { BursaAnalystConsensusIntelligenceAnalysis };
