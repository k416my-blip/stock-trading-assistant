import { GOVERNANCE_REASON_LABEL } from '../constants/governance';
import { MARKET_REGIME_LABEL } from '../constants/marketRegime';
import { ENSEMBLE_ALLOCATOR_LABEL } from '../constants/metaAllocation';
import { MAX_CHART_POINTS } from '../constants/monitoring';
import type { PerformancePoint } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioConstructionReport } from '../types/portfolioConstruction';
import type { PortfolioGovernanceReport } from '../types/governance';
import type { MetaAllocationReport } from '../types/metaAllocation';
import type {
  AllocationTransitionFrame,
  GovernanceTimelineEvent,
  HealthMetric,
  HealthLevel,
  MetaConfidenceRow,
  MonitoringSnapshot,
  OmsReplayEvent,
  RegimeTimelineSegment,
  RiskContributionRow,
} from '../types/monitoring';
import type { ShadowFill, ShadowOrder, ShadowPortfolioState } from '../types/shadowTrading';
import type { GovernanceAuditEntry } from '../types/governance';
import { equityToUnderwater, downsample } from '../utils/chartUtils';
import { computeProbabilisticRegimeMixture } from './probabilisticRegimeService';

function healthFromScore(score: number, green: number, yellow: number): HealthLevel {
  if (score >= green) return 'green';
  if (score >= yellow) return 'yellow';
  return 'red';
}

function buildRegimeTimeline(
  audit: GovernanceAuditEntry[],
  currentRegime: MarketRegimeResult,
): RegimeTimelineSegment[] {
  const segments: RegimeTimelineSegment[] = [];
  const byDate = [...audit]
    .reverse()
    .filter((e, i, arr) => i === 0 || e.regimeId !== arr[i - 1]?.regimeId)
    .slice(-8);

  for (const e of byDate) {
    segments.push({
      regimeId: e.regimeId,
      labelJa: MARKET_REGIME_LABEL[e.regimeId] ?? e.regimeId,
      startDate: e.timestamp.slice(0, 10),
      weightPct: Math.round(100 / Math.max(1, byDate.length)),
    });
  }
  if (segments.length === 0) {
    segments.push({
      regimeId: currentRegime.regimeId,
      labelJa: currentRegime.labelJa,
      startDate: new Date().toISOString().slice(0, 10),
      weightPct: 100,
    });
  }
  return segments;
}

function buildOmsReplay(orders: ShadowOrder[], fills: ShadowFill[]): OmsReplayEvent[] {
  const events: OmsReplayEvent[] = [];
  for (const o of orders.slice(-12)) {
    events.push({
      id: o.id,
      timestamp: o.createdAt,
      kind: 'order',
      labelJa: `${o.symbol} ${o.side === 'buy' ? '買' : '売'} ${o.shares}株`,
      status: o.status,
    });
  }
  for (const f of fills.slice(-12)) {
    events.push({
      id: f.id,
      timestamp: f.filledAt,
      kind: 'fill',
      labelJa: `${f.symbol} ${f.shares}株 @ ${f.fillPrice} (${f.slippageBps}bps)`,
    });
  }
  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-20);
}

function buildRiskContributions(governance: PortfolioGovernanceReport | null): RiskContributionRow[] {
  if (!governance?.explanation.perSymbol.length) return [];
  const totals = new Map<string, number>();
  for (const sym of governance.explanation.perSymbol) {
    for (const f of sym.factors) {
      totals.set(f.labelJa, (totals.get(f.labelJa) ?? 0) + Math.abs(f.contributionPct));
    }
  }
  return [...totals.entries()]
    .map(([label, contributionPct]) => ({
      label,
      contributionPct: Math.round(contributionPct * 10) / 10,
    }))
    .sort((a, b) => b.contributionPct - a.contributionPct)
    .slice(0, 9);
}

function buildGovernanceEvents(audit: GovernanceAuditEntry[]): GovernanceTimelineEvent[] {
  return audit.slice(0, 12).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    titleJa: e.reasonCodes.map((c) => GOVERNANCE_REASON_LABEL[c] ?? c).join(' · ') || 'ガバナンス実行',
    healthStatus: e.healthStatus,
    reasonCodes: e.reasonCodes,
  }));
}

function buildHealthMetrics(params: {
  governance: PortfolioGovernanceReport | null;
  meta: MetaAllocationReport | null;
  shadowDrawdownPct: number;
}): HealthMetric[] {
  const g = params.governance;
  const m = params.meta;
  return [
    {
      id: 'execution',
      labelJa: '執行品質',
      value: g?.dashboard.confidenceScore ?? 70,
      max: 100,
      level: healthFromScore(g?.dashboard.confidenceScore ?? 70, 60, 45),
    },
    {
      id: 'disagreement',
      labelJa: 'モデル不一致',
      value: 100 - (m?.disagreement.score ?? 30),
      max: 100,
      level: healthFromScore(100 - (m?.disagreement.score ?? 30), 50, 35),
    },
    {
      id: 'meta_robust',
      labelJa: 'メタ頑健性',
      value: m?.metaRobustness.score ?? 50,
      max: 100,
      level: healthFromScore(m?.metaRobustness.score ?? 50, 58, 45),
    },
    {
      id: 'drawdown',
      labelJa: 'ドローダウン余裕',
      value: Math.max(0, 100 - params.shadowDrawdownPct * 4),
      max: 100,
      level: healthFromScore(100 - params.shadowDrawdownPct * 4, 55, 40),
    },
    {
      id: 'fill',
      labelJa: '約定信頼性',
      value: m?.confidenceBlend.effectiveConfidence ?? 65,
      max: 100,
      level: healthFromScore(m?.confidenceBlend.effectiveConfidence ?? 65, 60, 45),
    },
  ];
}

function buildMetaConfidence(meta: MetaAllocationReport | null): MetaConfidenceRow[] {
  if (!meta) return [];
  return meta.bayesianModelAveraging.posteriorWeights.map((p) => {
    const alloc = meta.allocators.find((a) => a.allocatorId === p.allocatorId);
    return {
      label: ENSEMBLE_ALLOCATOR_LABEL[p.allocatorId],
      posteriorPct: p.posterior,
      confidence: Math.round((alloc?.confidence ?? 0.5) * 100),
    };
  });
}

function buildAllocationFrames(
  governance: PortfolioGovernanceReport | null,
  meta: MetaAllocationReport | null,
): AllocationTransitionFrame[] {
  const current =
    governance?.explanation.perSymbol.map((s) => ({
      symbol: s.symbol,
      weightPct: s.finalWeightPct,
    })) ?? [];
  const target =
    meta?.finalWeights.map((w) => ({ symbol: w.symbol, weightPct: w.weightPct })) ?? current;
  if (current.length === 0 && target.length === 0) return [];
  return [
    { label: '現在', weights: current },
    { label: 'メタ目標', weights: target },
  ];
}

/** 純関数 — 重いスキャンなしでスナップショット組み立て */
export function buildMonitoringSnapshot(params: {
  performanceHistory: PerformancePoint[];
  shadowState: ShadowPortfolioState | null;
  auditLog: GovernanceAuditEntry[];
  regime: MarketRegimeResult;
  constructionReport: PortfolioConstructionReport | null;
  governanceReport: PortfolioGovernanceReport | null;
  metaReport: MetaAllocationReport | null;
}): MonitoringSnapshot {
  const equityCurve = downsample(
    params.shadowState?.equityCurve?.length
      ? params.shadowState.equityCurve
      : params.performanceHistory,
    MAX_CHART_POINTS,
  );
  const underwater = downsample(equityToUnderwater(equityCurve), MAX_CHART_POINTS);
  const regimeMixture = params.governanceReport
    ? params.governanceReport.regimeMixture
    : computeProbabilisticRegimeMixture({
        regimeId: params.regime.regimeId,
        regimeScores: params.regime.regimeScores,
        regimeConfidence: params.regime.confidenceScore,
        volatilityProxyPct: params.regime.indicators.volatilityProxyPct,
        breadthPct: params.regime.indicators.breadthPctAboveMa50,
      });

  const shadowDd =
    params.shadowState && params.shadowState.initialCapitalMYR > 0
      ? (() => {
          const v = equityCurve[equityCurve.length - 1]?.portfolioValueMYR ?? 0;
          const peak = Math.max(...equityCurve.map((e) => e.portfolioValueMYR), v);
          return peak > 0 ? ((peak - v) / peak) * 100 : 0;
        })()
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    equityCurve,
    underwater,
    regimeTimeline: buildRegimeTimeline(params.auditLog, params.regime),
    regimeMixture,
    allocationFrames: buildAllocationFrames(params.governanceReport, params.metaReport),
    omsEvents: buildOmsReplay(
      params.shadowState?.orders ?? [],
      params.shadowState?.fills ?? [],
    ),
    riskContributions: buildRiskContributions(params.governanceReport),
    factorExposures: params.constructionReport?.factorExposures ?? [],
    governanceEvents: buildGovernanceEvents(params.auditLog),
    healthMetrics: buildHealthMetrics({
      governance: params.governanceReport,
      meta: params.metaReport,
      shadowDrawdownPct: shadowDd,
    }),
    metaConfidence: buildMetaConfidence(params.metaReport),
    metaReport: params.metaReport,
  };
}
