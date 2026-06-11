/**
 * Bursa Phase 4 — 四季報コメント（AI要約禁止・実データから固定文面）
 */
import type { BursaDisclosureBundle, BursaPhase3Analysis, BursaShikihoComments } from '../../types/bursaDisclosure';
import { filterCompleteFyAnnual } from './bursaTrendAnalysis';
import { calendarYearFromFinancialLabel } from './bursaYearUtil';

const MISSING = 'データ未取得';

function pctChange(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return MISSING;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtRm(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return MISSING;
  if (Math.abs(n) >= 1_000_000_000) return `RM ${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(2)}M`;
  return `RM ${n.toLocaleString('en-US')}`;
}

export function buildBursaShikihoComments(input: {
  bundle: BursaDisclosureBundle;
  phase3: BursaPhase3Analysis | null;
  negativeNewsCount: number;
}): BursaShikihoComments {
  const annual = filterCompleteFyAnnual(input.bundle.quarterly.annualRecords);
  const latest = annual[0] ?? null;
  const prior = annual[1] ?? null;
  const latestYear = latest ? calendarYearFromFinancialLabel(latest.financialYear) : null;

  let performanceJa = MISSING;
  if (latest != null) {
    const revChg = pctChange(latest.revenue, prior?.revenue ?? null);
    const profitChg = pctChange(latest.netProfit, prior?.netProfit ?? null);
    const parts: string[] = [];
    if (latestYear != null) parts.push(`${latestYear}年`);
    if (latest.revenue != null) parts.push(`売上 ${fmtRm(latest.revenue)}`);
    if (latest.netProfit != null) parts.push(`純利益 ${fmtRm(latest.netProfit)}`);
    if (revChg != null || profitChg != null) {
      parts.push(`前年比 売上${fmtPct(revChg)} / 利益${fmtPct(profitChg)}`);
    }
    if (parts.length > 1) performanceJa = parts.join(' · ').slice(0, 160);
  }

  let strengthsJa = MISSING;
  const strengthParts: string[] = [];
  if (input.phase3?.industryRanks.marketCap === 1) strengthParts.push('同業時価総額1位');
  if (input.phase3?.competitiveAdvantage.brandPower.score != null &&
      input.phase3.competitiveAdvantage.brandPower.score >= 80) {
    strengthParts.push(input.phase3.competitiveAdvantage.brandPower.reasonJa);
  }
  if (input.bundle.profile.dividendYieldPct != null && input.bundle.profile.dividendYieldPct >= 4.5) {
    strengthParts.push(`配当利回り ${input.bundle.profile.dividendYieldPct.toFixed(2)}%`);
  }
  if (strengthParts.length > 0) strengthsJa = strengthParts.slice(0, 2).join('。');

  let risksJa = MISSING;
  if (input.negativeNewsCount > 0) {
    risksJa = `直近ネガティブニュース ${input.negativeNewsCount}件（News API 実データ）`;
  } else if (input.bundle.profile.sector) {
    risksJa = `${input.bundle.profile.sector}セクター — 市場・規制環境の変化に留意（開示セクター情報）`;
  }

  let dividendJa = MISSING;
  const dy = input.bundle.profile.dividendYieldPct;
  const divCount = (input.bundle.dividend.history ?? []).length;
  if (dy != null) {
    dividendJa = `配当利回り ${dy.toFixed(2)}% · KLSE配当履歴 ${divCount}件`;
  } else if (divCount > 0) {
    dividendJa = `KLSE配当履歴 ${divCount}件`;
  }

  let summaryJa = MISSING;
  const summaryParts: string[] = [];
  if (input.phase3?.enhancedInvestmentType) {
    summaryParts.push(`投資タイプ: ${input.phase3.enhancedInvestmentType}`);
  }
  if (input.phase3?.buffettScore.totalScore != null) {
    summaryParts.push(`バフェットスコア ${input.phase3.buffettScore.totalScore}/100`);
  }
  if (input.phase3?.industryRanks.overall != null && input.phase3.industryCompanyCount > 0) {
    summaryParts.push(
      `業界総合 ${input.phase3.industryRanks.overall}位 / ${input.phase3.industryCompanyCount}社`,
    );
  }
  if (summaryParts.length > 0) summaryJa = summaryParts.slice(0, 2).join(' · ');

  return { performanceJa, strengthsJa, risksJa, dividendJa, summaryJa };
}
