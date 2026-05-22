import { PAPER_DEFAULT_ACCOUNT_ID, REGULATORY_SAFETY_BANNER_JA } from '../../constants/paperBroker';
import type { ExecutionDashboardBundle } from '../../types/paperBroker';
import type { StrategySymbolRecommendation } from '../../types/strategyExecution';
import { assertBrokerMockOnly, getBrokerAdapter } from './brokerRegistry';
import { evaluateExitAlerts } from './exitEngine';
import {
  marketSessionLabelJa,
  resolveMarketSession,
} from './marketHoursEngine';
import {
  buildRealityGapSummaryJa,
  buildRebalanceNoteJa,
  buildSafetyChecksJa,
  buildStrategyReplayPreviewJa,
  estimateSharpeFromTimeline,
} from './portfolioIntelligencePaper';
import { getDefaultAccount, loadPaperBrokerState } from './paperBrokerStorage';
import {
  checkPanicRegimeForceDefensive,
  computeExposure,
  computeWinRate,
  currentDrawdownPct,
  equityMYR,
} from './paperRiskLayer';

export type BuildExecutionDashboardInput = {
  regimeId: string | null;
  trustScore: number | null;
  aiWinRatePct: number | null;
  priceBySymbol: Record<string, number>;
  strategyRecommendations?: StrategySymbolRecommendation[];
};

export async function buildExecutionDashboardBundle(
  input: BuildExecutionDashboardInput,
): Promise<ExecutionDashboardBundle> {
  const state = await loadPaperBrokerState();
  const broker = getBrokerAdapter(state.config.activeBrokerId);
  assertBrokerMockOnly(broker);

  const health = await broker.healthCheck();
  const balance = await broker.getBalance(PAPER_DEFAULT_ACCOUNT_ID);
  const positions = await broker.getPositions(PAPER_DEFAULT_ACCOUNT_ID);
  const orders = await broker.getOrders(PAPER_DEFAULT_ACCOUNT_ID);

  const primaryMarket = positions[0]?.market ?? 'bursa';
  const session = resolveMarketSession(primaryMarket);
  const acc = getDefaultAccount(state);
  const eq = equityMYR(state);
  const pnl = eq - acc.initialCapitalMYR;
  const retPct = acc.initialCapitalMYR > 0 ? (pnl / acc.initialCapitalMYR) * 100 : 0;
  const exposure = computeExposure(state);
  const winRate = computeWinRate(orders);
  const latencies = orders.filter((o) => o.latencyMs > 0).map((o) => o.latencyMs);
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

  const panic = checkPanicRegimeForceDefensive(input.regimeId);
  let newOrdersBlocked: string | null = null;
  if (state.config.killSwitch) newOrdersBlocked = 'キルスイッチ作動中';
  else if (panic.blockBuy) newOrdersBlocked = panic.reasonJa ?? null;
  else if (currentDrawdownPct(state) >= state.config.maxDrawdownPct) {
    newOrdersBlocked = '最大DD超過 — 新規買い停止';
  }

  const openOrders = orders.filter((o) => o.status === 'pending');
  const recentOrders = orders.slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    regulatoryBannerJa: REGULATORY_SAFETY_BANNER_JA,
    deploymentEnv: state.config.deploymentEnv,
    realTradingEnabled: false,
    brokerId: broker.id,
    brokerHealth: health,
    marketSession: session,
    marketSessionJa: marketSessionLabelJa(session),
    killSwitchActive: state.config.killSwitch,
    newOrdersBlockedJa: newOrdersBlocked,
    balance,
    openOrders,
    recentOrders,
    positions,
    totalPnLMYR: Math.round(pnl * 100) / 100,
    totalReturnPct: Math.round(retPct * 10) / 10,
    maxDrawdownPct: Math.round(currentDrawdownPct(state) * 10) / 10,
    winRatePct: winRate,
    sharpeEstimate: estimateSharpeFromTimeline(state.equityTimeline),
    avgLatencyMs: avgLatency,
    sectorExposure: exposure.sector,
    symbolExposure: exposure.symbol,
    trustScore: input.trustScore,
    journalRecent: state.journal.slice(0, 7),
    realityGapSummaryJa: buildRealityGapSummaryJa(input.aiWinRatePct, winRate),
    replayPreviewJa: buildStrategyReplayPreviewJa(state.journal),
    rebalanceNoteJa: buildRebalanceNoteJa(state),
    exitAlertsJa: evaluateExitAlerts(positions, input.priceBySymbol).map((a) => a.messageJa),
    safetyChecksJa: buildSafetyChecksJa(state),
  };
}

export async function refreshPaperBrokerFromStrategy(
  input: BuildExecutionDashboardInput,
): Promise<ExecutionDashboardBundle> {
  return buildExecutionDashboardBundle(input);
}
