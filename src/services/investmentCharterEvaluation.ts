/**
 * 投資憲章に基づく BUY / 保留 / 不採用 判定
 */
import {
  CHARTER_ABNORMAL_VOLATILITY_PCT,
  CHARTER_CONTINUOUS_LOSS_GROWTH_PCT,
  CHARTER_EARNINGS_GOOD_MIN_SCORE,
  CHARTER_MIN_APPROVAL_REASONS,
  CHARTER_MIN_BUY_CONFIDENCE_PCT,
  CHARTER_MIN_BUY_SCORE,
  CHARTER_MIN_OPPOSITION_REASONS,
  CHARTER_MIN_QUALITY_SIGNALS,
  CHARTER_NEWS_GOOD_MIN_SCORE,
  CHARTER_PBR_CHEAP_MAX,
  CHARTER_PER_CHEAP_MAX,
  CHARTER_QUALITY_SIGNAL_LABELS,
  CHARTER_TECHNICAL_GOOD_MIN_SCORE,
  CHARTER_VOLUME_SURGE_MIN,
  INVESTMENT_CHARTER_MISSION_JA,
  INVESTMENT_CHARTER_PRIORITIES_JA,
  INVESTMENT_CHARTER_VERSION,
  INVESTMENT_PHILOSOPHY_SUMMARY_JA,
  type CharterQualitySignalId,
} from '../constants/investmentCharter';
import type { CharterEvaluationResult, CharterQualitySignal } from '../types/investmentCharter';
import type { ConciergeSymbolActionGuide } from '../types/conciergeActionGuide';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { StockRecommendation } from '../types/recommendation';
import type { AdoptionVerdict } from '../types/investmentCharter';

const ADOPTION_LABEL: Record<AdoptionVerdict, string> = {
  adopt: '採用',
  hold: '判断保留',
  reject: '不採用',
};

const BEARISH_CATEGORIES = new Set(['panic', 'high-risk', 'rumor-alert', 'caution']);

export function scoreCharterQualitySignals(input: {
  rec: StockRecommendation;
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
}): CharterQualitySignal[] {
  const { rec, conciergeGuide, conciergeEvidence } = input;
  const fd = rec.fundamentalDetail;
  const ed = rec.earningsDetail;
  const revenueGrowth = ed.revenueGrowthPct ?? fd.revenueGrowthPct;
  const profitGrowth = ed.profitGrowthPct ?? fd.profitGrowthPct;

  const checks: Record<CharterQualitySignalId, boolean> = {
    earnings_good:
      rec.earnings.score >= CHARTER_EARNINGS_GOOD_MIN_SCORE ||
      ed.score >= CHARTER_EARNINGS_GOOD_MIN_SCORE,
    revenue_growth: revenueGrowth != null && revenueGrowth > 0,
    profit_growth: profitGrowth != null && profitGrowth > 0,
    dividend_stable: (fd.dividendYield ?? 0) > 0 && rec.fundamental.score >= 50,
    per_cheap: fd.per != null && fd.per > 0 && fd.per <= CHARTER_PER_CHEAP_MAX,
    pbr_cheap: fd.pbr != null && fd.pbr > 0 && fd.pbr <= CHARTER_PBR_CHEAP_MAX,
    news_good:
      rec.news.score >= CHARTER_NEWS_GOOD_MIN_SCORE ||
      rec.newsDetail.sentiment === 'ポジティブ',
    industry_tailwind:
      conciergeGuide?.marketStance === 'bullish' ||
      conciergeGuide?.primaryCategory === 'opportunity',
    volume_good:
      (conciergeEvidence?.volumeSurgeRatio ?? 0) >= CHARTER_VOLUME_SURGE_MIN ||
      (conciergeGuide?.evidenceScores.volume ?? 0) >= 55,
    trend_good: rec.technical.score >= CHARTER_TECHNICAL_GOOD_MIN_SCORE,
  };

  return (Object.keys(CHARTER_QUALITY_SIGNAL_LABELS) as CharterQualitySignalId[]).map((id) => ({
    id,
    labelJa: CHARTER_QUALITY_SIGNAL_LABELS[id],
    matched: checks[id],
  }));
}

function detectDataFetchIssues(input: {
  rec: StockRecommendation;
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
}): string[] {
  const issues: string[] = [];
  if (input.rec.dataSource.price === 'unavailable') {
    issues.push('価格取得失敗');
  } else if (input.conciergeEvidence && input.conciergeEvidence.currentPrice == null) {
    issues.push('価格取得失敗');
  }
  if (input.rec.dataSource.news === 'unavailable') {
    issues.push('ニュース取得失敗');
  }
  if (input.conciergeEvidence?.dataGapsJa.length) {
    issues.push('データ不足');
  }
  if (input.conciergeGuide?.insufficientData) {
    issues.push('データ不足');
  }
  if (
    input.rec.aiNote?.includes('失敗') ||
    input.rec.aiNote?.includes('unavailable') ||
    input.rec.aiNote?.includes('取得できません')
  ) {
    issues.push('OpenAI分析失敗');
  }
  return [...new Set(issues)];
}

function detectRejectReasons(input: {
  rec: StockRecommendation;
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
}): string[] {
  const reasons: string[] = [];
  const guide = input.conciergeGuide;
  const ed = input.rec.earningsDetail;
  const profitGrowth = ed.profitGrowthPct ?? input.rec.fundamentalDetail.profitGrowthPct;

  if (guide?.primaryCategory === 'high-risk') reasons.push('High Risk');
  if (guide?.primaryCategory === 'panic') reasons.push('Panic');
  if (guide?.categories.includes('rumor-alert')) reasons.push('重大悪材料（噂・投稿）');

  const negNews = input.conciergeEvidence?.latestFinancialNews.filter(
    (h) => h.sentiment === 'ネガティブ',
  );
  if (negNews && negNews.length >= 2) reasons.push('重大悪材料（ネガティブニュース）');

  if (ed.score < 40 && ed.source === 'available') reasons.push('決算悪化');
  if (profitGrowth != null && profitGrowth <= CHARTER_CONTINUOUS_LOSS_GROWTH_PCT) {
    reasons.push('継続赤字');
  }

  const vol =
    input.rec.historicalDetail.volatilityPct ??
    (input.conciergeEvidence?.intradayChangePct != null
      ? Math.abs(input.conciergeEvidence.intradayChangePct)
      : null);
  if (vol != null && vol >= CHARTER_ABNORMAL_VOLATILITY_PCT) {
    reasons.push('異常ボラティリティ');
  }

  const criticalMissing =
    input.rec.dataSource.price === 'unavailable' &&
    input.rec.dataSource.earnings === 'unavailable' &&
    input.rec.dataSource.news === 'unavailable';
  if (criticalMissing) reasons.push('データ欠損');

  return [...new Set(reasons)];
}

function detectHoldReasons(input: {
  approvalReasonsJa: string[];
  oppositionReasonsJa: string[];
  confidencePct: number;
  rec: StockRecommendation;
  dataFetchIssuesJa: string[];
}): string[] {
  const reasons: string[] = [];
  if (input.approvalReasonsJa.length < CHARTER_MIN_APPROVAL_REASONS) {
    reasons.push(`賛成理由${CHARTER_MIN_APPROVAL_REASONS}件未満`);
  }
  if (input.oppositionReasonsJa.length < CHARTER_MIN_OPPOSITION_REASONS) {
    reasons.push('反対理由なし');
  }
  if (input.confidencePct < CHARTER_MIN_BUY_CONFIDENCE_PCT) {
    reasons.push(`信頼度${CHARTER_MIN_BUY_CONFIDENCE_PCT}%未満`);
  }
  if (input.rec.totalScore < CHARTER_MIN_BUY_SCORE) {
    reasons.push(`スコア${CHARTER_MIN_BUY_SCORE}未満`);
  }
  for (const issue of input.dataFetchIssuesJa) {
    reasons.push(issue);
  }
  return reasons;
}

export function buildCharterFullRationaleJa(input: {
  symbol: string;
  name?: string;
  recommenderJa: string;
  philosophyJa: string;
  approvalReasonsJa: string[];
  oppositionReasonsJa: string[];
  confidencePct: number;
  score: number;
  malaysiaV4AlignmentPct: number;
  verdictLabelJa: string;
  qualitySignals: CharterQualitySignal[];
  holdReasonsJa: string[];
  rejectReasonsJa: string[];
  dataFetchIssuesJa: string[];
}): string {
  const lines: string[] = [
    '=== AIコンシェルジュ投資憲章 判断根拠 ===',
    `憲章バージョン: ${INVESTMENT_CHARTER_VERSION}`,
    `銘柄: ${input.name ? `${input.name}（${input.symbol}）` : input.symbol}`,
    `推薦者: ${input.recommenderJa}`,
    `使命: ${INVESTMENT_CHARTER_MISSION_JA}`,
    `投資方針: ${input.philosophyJa}`,
    '',
    '【優先順位】',
    ...INVESTMENT_CHARTER_PRIORITIES_JA.map((p) => `· ${p}`),
    '',
    '【賛成理由】',
    ...(input.approvalReasonsJa.length
      ? input.approvalReasonsJa.map((r) => `· ${r}`)
      : ['· （なし）']),
    '',
    '【反対理由】',
    ...(input.oppositionReasonsJa.length
      ? input.oppositionReasonsJa.map((r) => `· ${r}`)
      : ['· （なし）']),
    '',
    `信頼度: ${input.confidencePct}%`,
    `総合スコア: ${input.score}/100`,
    `Malaysia v4一致率: ${input.malaysiaV4AlignmentPct > 0 ? `${input.malaysiaV4AlignmentPct.toFixed(1)}%` : '対象外'}`,
    `採用可否: ${input.verdictLabelJa}`,
    '',
    '【品質シグナル】',
    ...input.qualitySignals.map((s) => `· ${s.labelJa}: ${s.matched ? '✓' : '—'}`),
  ];

  if (input.rejectReasonsJa.length) {
    lines.push('', '【不採用理由】', ...input.rejectReasonsJa.map((r) => `· ${r}`));
  }
  if (input.holdReasonsJa.length) {
    lines.push('', '【保留理由】', ...input.holdReasonsJa.map((r) => `· ${r}`));
  }
  if (input.dataFetchIssuesJa.length) {
    lines.push('', '【データ取得】', ...input.dataFetchIssuesJa.map((r) => `· ${r}`));
  }

  return lines.join('\n');
}

export function evaluateInvestmentCharter(input: {
  approvalReasonsJa: string[];
  oppositionReasonsJa: string[];
  confidencePct: number;
  rec: StockRecommendation;
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
}): CharterEvaluationResult {
  const qualitySignals = scoreCharterQualitySignals({
    rec: input.rec,
    conciergeGuide: input.conciergeGuide,
    conciergeEvidence: input.conciergeEvidence,
  });
  const matchedQualityCount = qualitySignals.filter((s) => s.matched).length;
  const dataFetchIssuesJa = detectDataFetchIssues(input);
  const rejectReasonsJa = detectRejectReasons(input);
  const holdReasonsJa = detectHoldReasons({
    approvalReasonsJa: input.approvalReasonsJa,
    oppositionReasonsJa: input.oppositionReasonsJa,
    confidencePct: input.confidencePct,
    rec: input.rec,
    dataFetchIssuesJa,
  });

  let verdict: AdoptionVerdict = 'hold';

  if (rejectReasonsJa.length > 0) {
    verdict = 'reject';
  } else if (holdReasonsJa.length > 0) {
    verdict = 'hold';
  } else if (
    input.approvalReasonsJa.length >= CHARTER_MIN_APPROVAL_REASONS &&
    input.oppositionReasonsJa.length >= CHARTER_MIN_OPPOSITION_REASONS &&
    input.confidencePct >= CHARTER_MIN_BUY_CONFIDENCE_PCT &&
    input.rec.totalScore >= CHARTER_MIN_BUY_SCORE &&
    matchedQualityCount >= CHARTER_MIN_QUALITY_SIGNALS
  ) {
    verdict = 'adopt';
  } else {
    if (matchedQualityCount < CHARTER_MIN_QUALITY_SIGNALS) {
      holdReasonsJa.push(`品質シグナル${CHARTER_MIN_QUALITY_SIGNALS}件未満（現在${matchedQualityCount}件）`);
    }
    verdict = 'hold';
  }

  const buyEligible = verdict === 'adopt';

  return {
    charterVersion: INVESTMENT_CHARTER_VERSION,
    verdict,
    verdictLabelJa: ADOPTION_LABEL[verdict],
    holdReasonsJa,
    rejectReasonsJa,
    qualitySignals,
    matchedQualityCount,
    buyEligible,
    dataFetchIssuesJa,
    fullRationaleJa: '',
  };
}
