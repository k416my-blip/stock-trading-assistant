/**
 * Bursa Phase 6 — UI 向けフォーマット
 */
import type { BursaPhase6Analysis } from '../../types/bursaDisclosure';
import {
  BURSA_INVESTMENT_STYLE_LABELS,
  type BursaInvestmentStyleId,
} from './bursaStockUniverse';

export const SHIKIHO_MISSING_JA = 'データ未取得';

function fmtScore(n: number | null): string {
  return n != null && Number.isFinite(n) ? String(n) : SHIKIHO_MISSING_JA;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return SHIKIHO_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtMoney(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return SHIKIHO_MISSING_JA;
  if (Math.abs(n) >= 1_000_000_000) return `RM ${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(2)}M`;
  return `RM ${n.toLocaleString('en-US')}`;
}

export type BursaDiscoveryRankRow = {
  rank: number;
  stockCode: string;
  companyNameJa: string;
  sectorJa: string;
  compositeScoreJa: string;
  growthJa: string;
  profitabilityJa: string;
  stabilityJa: string;
  valueJa: string;
  dividendAppealJa: string;
  competitiveJa: string;
  dividendYieldJa: string;
};

export type BursaDiscoveryPortfolioRow = {
  budgetLabelJa: string;
  stockCode: string;
  companyNameJa: string;
  allocationJa: string;
  allocationPctJa: string;
  sharesJa: string;
};

export type BursaDiscoveryHoldingRow = {
  symbol: string;
  companyNameJa: string;
  scoreJa: string;
  rankJa: string;
  vsTopAvgJa: string;
};

export type BursaDiscoveryReplacementRow = {
  heldSymbol: string;
  heldCompanyNameJa: string;
  heldScoreJa: string;
  candidateCode: string;
  candidateNameJa: string;
  candidateScoreJa: string;
  candidateRankJa: string;
  scoreDiffJa: string;
};

export type BursaDiscoveryReport = {
  universeSizeJa: string;
  scoredCountJa: string;
  top100: BursaDiscoveryRankRow[];
  styleTabs: Array<{ id: BursaInvestmentStyleId; labelJa: string; rows: BursaDiscoveryRankRow[] }>;
  portfolioRows: BursaDiscoveryPortfolioRow[];
  holdingRows: BursaDiscoveryHoldingRow[];
  replacementRows: BursaDiscoveryReplacementRow[];
  dataSourceLabel: string;
};

function mapRankRow(e: BursaPhase6Analysis['rankedTop100'][0]): BursaDiscoveryRankRow {
  return {
    rank: e.rank,
    stockCode: e.stockCode,
    companyNameJa: e.companyName ?? SHIKIHO_MISSING_JA,
    sectorJa: e.sector ?? SHIKIHO_MISSING_JA,
    compositeScoreJa: fmtScore(e.compositeScore),
    growthJa: fmtScore(e.growth),
    profitabilityJa: fmtScore(e.profitability),
    stabilityJa: fmtScore(e.stability),
    valueJa: fmtScore(e.value),
    dividendAppealJa: fmtScore(e.dividendAppeal),
    competitiveJa: fmtScore(e.competitiveAdvantage),
    dividendYieldJa:
      e.dividendYieldPct != null ? `${e.dividendYieldPct.toFixed(2)}%` : SHIKIHO_MISSING_JA,
  };
}

export function formatBursaDiscoveryReport(phase6: BursaPhase6Analysis): BursaDiscoveryReport {
  const styleTabs = (
    Object.keys(BURSA_INVESTMENT_STYLE_LABELS) as BursaInvestmentStyleId[]
  ).map((id) => ({
    id,
    labelJa: BURSA_INVESTMENT_STYLE_LABELS[id],
    rows: phase6.styleRankings[id].map(mapRankRow),
  }));

  const portfolioRows: BursaDiscoveryPortfolioRow[] = [];
  for (const ps of phase6.portfolioSuggestions) {
    for (const row of ps.rows) {
      portfolioRows.push({
        budgetLabelJa: fmtMoney(ps.budgetMYR),
        stockCode: row.stockCode,
        companyNameJa: row.companyName ?? SHIKIHO_MISSING_JA,
        allocationJa: fmtMoney(row.allocationMYR),
        allocationPctJa: `${row.allocationPct}%`,
        sharesJa:
          row.sharesApprox != null
            ? `${row.sharesApprox}株（100株単位）`
            : SHIKIHO_MISSING_JA,
      });
    }
  }

  const holdingRows = phase6.holdingComparisons.map((h) => ({
    symbol: h.symbol,
    companyNameJa: h.companyName ?? SHIKIHO_MISSING_JA,
    scoreJa: fmtScore(h.holdingScore),
    rankJa: h.holdingRank != null ? `${h.holdingRank}位` : SHIKIHO_MISSING_JA,
    vsTopAvgJa: fmtPct(h.vsTopAvgPct),
  }));

  const replacementRows: BursaDiscoveryReplacementRow[] = [];
  for (const s of phase6.replacementSuggestions) {
    for (const c of s.candidates) {
      replacementRows.push({
        heldSymbol: s.heldSymbol,
        heldCompanyNameJa: s.heldCompanyName ?? SHIKIHO_MISSING_JA,
        heldScoreJa: fmtScore(s.heldScore),
        candidateCode: c.stockCode,
        candidateNameJa: c.companyName ?? SHIKIHO_MISSING_JA,
        candidateScoreJa: String(c.score),
        candidateRankJa: `${c.rank}位`,
        scoreDiffJa: `+${c.scoreDiff}`,
      });
    }
  }

  return {
    universeSizeJa: `${phase6.universeSize}銘柄`,
    scoredCountJa: `${phase6.scoredCount}銘柄スコア算出`,
    top100: phase6.rankedTop100.map(mapRankRow),
    styleTabs,
    portfolioRows,
    holdingRows,
    replacementRows,
    dataSourceLabel: 'KLSE Screener（Bursa 開示ミラー）',
  };
}
