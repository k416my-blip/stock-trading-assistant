import type { MarketRegimeResult } from '../types/marketRegime';
import type { MarketIntelligenceReport } from '../types/marketIntelligence';
import { buildMarketIntelligenceReport } from './marketIntelligenceEngine';
import {
  loadMarketIntelligenceSnapshot,
  saveMarketIntelligenceSnapshot,
} from './marketIntelligenceStorage';

export async function runMarketIntelligenceAnalysis(params: {
  regime?: MarketRegimeResult;
  persistSnapshot?: boolean;
}): Promise<MarketIntelligenceReport> {
  const prior = await loadMarketIntelligenceSnapshot();
  const { report, snapshot } = buildMarketIntelligenceReport({
    regime: params.regime,
    priorSnapshot: prior,
  });
  if (params.persistSnapshot !== false) {
    await saveMarketIntelligenceSnapshot(snapshot);
  }
  return report;
}
