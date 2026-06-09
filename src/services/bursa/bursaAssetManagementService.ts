/**
 * Bursa Phase 7 — AI資産運用 UI フォーマット
 */
import type { BursaPhase7Analysis } from '../../types/bursaDisclosure';

export const ASSET_MGMT_MISSING_JA = 'データ未取得';

function fmtScore(n: number | null): string {
  return n != null && Number.isFinite(n) ? String(n) : ASSET_MGMT_MISSING_JA;
}

function fmtPrice(n: number | null): string {
  return n != null && Number.isFinite(n) ? `RM ${n.toFixed(2)}` : ASSET_MGMT_MISSING_JA;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ASSET_MGMT_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtJudgment(j: string | null): string {
  return j ?? ASSET_MGMT_MISSING_JA;
}

export type AssetMgmtHoldingRow = {
  symbol: string;
  companyNameJa: string;
  judgmentJa: string;
  scoreJa: string;
  rankJa: string;
  reasonsJa: string;
};

export type AssetMgmtAddRow = {
  symbol: string;
  companyNameJa: string;
  currentPriceJa: string;
  fairPriceJa: string;
  industryPeJa: string;
  verdictJa: string;
  reasonJa: string;
};

export type AssetMgmtTakeProfitRow = {
  symbol: string;
  companyNameJa: string;
  targetPriceJa: string;
  fairPriceJa: string;
  currentPriceJa: string;
  premiumJa: string;
  recommendJa: string;
  reasonJa: string;
};

export type AssetMgmtStopLossRow = {
  symbol: string;
  companyNameJa: string;
  warningsJa: string;
  hasWarning: boolean;
};

export type AssetMgmtReconstructionRow = {
  kind: 'swap' | 'add' | 'remove';
  labelJa: string;
  detailJa: string;
};

export type AssetMgmtReport = {
  investorTypeJa: string;
  investorTypeReasonJa: string;
  portfolioHealthScoreJa: string;
  sectorBiasJa: string;
  dividendDependencyJa: string;
  largeCapDependencyJa: string;
  growthRatioJa: string;
  holdings: AssetMgmtHoldingRow[];
  addPosition: AssetMgmtAddRow[];
  takeProfit: AssetMgmtTakeProfitRow[];
  stopLoss: AssetMgmtStopLossRow[];
  reconstruction: AssetMgmtReconstructionRow[];
  dataSourceLabel: string;
};

export function formatAssetManagementReport(phase7: BursaPhase7Analysis): AssetMgmtReport {
  const holdings: AssetMgmtHoldingRow[] = phase7.holdingsDiagnosis.map((d) => ({
    symbol: d.symbol,
    companyNameJa: d.companyName ?? ASSET_MGMT_MISSING_JA,
    judgmentJa: fmtJudgment(d.judgment),
    scoreJa: fmtScore(d.compositeScore),
    rankJa: d.rank != null ? `${d.rank}位` : ASSET_MGMT_MISSING_JA,
    reasonsJa: d.reasons.join(' · ') || ASSET_MGMT_MISSING_JA,
  }));

  const addPosition: AssetMgmtAddRow[] = phase7.addPosition.map((a) => ({
    symbol: a.symbol,
    companyNameJa: a.companyName ?? ASSET_MGMT_MISSING_JA,
    currentPriceJa: fmtPrice(a.currentPrice),
    fairPriceJa: fmtPrice(a.fairPrice),
    industryPeJa:
      a.industryMedianPe != null ? a.industryMedianPe.toFixed(1) : ASSET_MGMT_MISSING_JA,
    verdictJa: fmtJudgment(a.verdict),
    reasonJa: a.reasonJa,
  }));

  const takeProfit: AssetMgmtTakeProfitRow[] = phase7.takeProfit.map((t) => ({
    symbol: t.symbol,
    companyNameJa: t.companyName ?? ASSET_MGMT_MISSING_JA,
    targetPriceJa: fmtPrice(t.targetPrice),
    fairPriceJa: fmtPrice(t.fairPrice),
    currentPriceJa: fmtPrice(t.currentPrice),
    premiumJa: fmtPct(t.premiumPct),
    recommendJa:
      t.recommendTakeProfit == null
        ? ASSET_MGMT_MISSING_JA
        : t.recommendTakeProfit
          ? '利益確定推奨'
          : '保有継続',
    reasonJa: t.reasonJa,
  }));

  const stopLoss: AssetMgmtStopLossRow[] = phase7.stopLoss.map((s) => ({
    symbol: s.symbol,
    companyNameJa: s.companyName ?? ASSET_MGMT_MISSING_JA,
    warningsJa: s.warnings.length > 0 ? s.warnings.join('\n') : '警告なし',
    hasWarning: s.hasWarning,
  }));

  const reconstruction: AssetMgmtReconstructionRow[] = [
    ...phase7.reconstruction.swapCandidates.map((s) => ({
      kind: 'swap' as const,
      labelJa: `入替: ${s.removeSymbol} → ${s.addSymbol}`,
      detailJa: `${s.reasonJa} · スコア差 +${s.scoreDiff}`,
    })),
    ...phase7.reconstruction.addCandidates.map((a) => ({
      kind: 'add' as const,
      labelJa: `追加候補: ${a.stockCode}`,
      detailJa: a.reasonJa,
    })),
    ...phase7.reconstruction.removeCandidates.map((r) => ({
      kind: 'remove' as const,
      labelJa: `削除候補: ${r.stockCode}`,
      detailJa: r.reasonJa,
    })),
  ];

  return {
    investorTypeJa: fmtJudgment(phase7.investorType),
    investorTypeReasonJa: phase7.investorTypeReasonJa,
    portfolioHealthScoreJa:
      phase7.portfolioHealth.score != null
        ? `${phase7.portfolioHealth.score}/100`
        : ASSET_MGMT_MISSING_JA,
    sectorBiasJa: phase7.portfolioHealth.sectorBiasJa,
    dividendDependencyJa: phase7.portfolioHealth.dividendDependencyJa,
    largeCapDependencyJa: phase7.portfolioHealth.largeCapDependencyJa,
    growthRatioJa: phase7.portfolioHealth.growthRatioJa,
    holdings,
    addPosition,
    takeProfit,
    stopLoss,
    reconstruction,
    dataSourceLabel: 'LIVE · KLSE Screener · 実データのみ',
  };
}
