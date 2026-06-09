/**
 * AI四季報 — 実データ組み立て（モック値禁止）
 */
import { CURRENCY_SYMBOL } from '../constants/rakutenTrade';
import type { Market, PortfolioPosition } from '../types';
import type { AiStockReport, AiStockReportBursaSection } from '../types/aiStockReport';
import type { BursaDisclosureBundle, BursaPhase3Analysis, BursaPhase4Analysis, BursaPhase5Analysis, BursaPeerMetricKey } from '../types/bursaDisclosure';
import {
  computeCompositeFromPartial,
  computeDimensionScoresFromRealData,
  computeSubGradesFromPartial,
  scoreToGrade,
} from './aiRankingEngine';
import {
  computeBursaDimensionScores,
  mergePartialScores,
} from './bursa/bursaRankingMetrics';
import { buildBursaAiPhase2Analysis, starsLabel } from './bursa/bursaAiAnalysis';
import { filterCompleteFyAnnual } from './bursa/bursaTrendAnalysis';
import { calendarYearFromFinancialLabel } from './bursa/bursaYearUtil';
import {
  fetchAiStockReportData,
  marketLabelFor,
  SHIKIHO_MISSING_JA,
  type AiStockReportRawData,
} from './aiStockReportDataFetcher';
import { rankAllStocks } from './stockSearch';

function fmtMoney(n: number, currency: string): string {
  const abs = Math.abs(n);
  let body: string;
  if (abs >= 1_000_000_000_000) body = `${(n / 1_000_000_000_000).toFixed(2)}兆`;
  else if (abs >= 1_000_000_000) body = `${(n / 1_000_000_000).toFixed(2)}十億`;
  else if (abs >= 1_000_000) body = `${(n / 1_000_000).toFixed(2)}百万`;
  else body = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const sym = CURRENCY_SYMBOL[currency as keyof typeof CURRENCY_SYMBOL] ?? currency;
  return `${sym}${body}`;
}

function fmtOrMissing(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : SHIKIHO_MISSING_JA;
}

function fmtNumOrMissing(n: number | null | undefined, formatter: (n: number) => string): string {
  return n != null && Number.isFinite(n) ? formatter(n) : SHIKIHO_MISSING_JA;
}

function buildEvaluationComment(
  name: string,
  composite: number | null,
  rank: ReturnType<typeof scoreToGrade> | null,
  partial: ReturnType<typeof computeDimensionScoresFromRealData>,
): string {
  if (composite == null || rank == null) {
    return `${name} — 評価に必要な実データが不足しています（${SHIKIHO_MISSING_JA}）。`;
  }
  const parts: string[] = [];
  if (partial.dividendAppeal != null && partial.dividendAppeal >= 70) parts.push('配当魅力が高い');
  if (partial.stability != null && partial.stability >= 72) parts.push('安定性が優れる');
  if (partial.growth != null && partial.growth >= 75) parts.push('成長性あり');
  if (partial.value != null && partial.value >= 68) parts.push('割安度に余地');
  if (parts.length === 0) parts.push('実データに基づく総合評価');
  return `${name}は総合スコア ${composite}/100（${rank}）。${parts.join('、')}。`;
}

function buildRiskItems(raw: AiStockReportRawData): string[] {
  const items: string[] = [];
  for (const h of raw.newsHeadlines.filter((n) => n.sentiment === 'negative').slice(0, 2)) {
    items.push(h.title.slice(0, 80));
  }
  if (raw.yahoo.debtToEquity != null && raw.yahoo.debtToEquity > 1.5) {
    items.push(`負債比率が高め（D/E ${raw.yahoo.debtToEquity.toFixed(2)}）`);
  }
  if (raw.market === 'hk') {
    items.push('香港・中国市場の規制・地政学リスク');
  }
  if (items.length === 0 && raw.negativeNewsCount > 0) {
    items.push(`ネガティブニュース ${raw.negativeNewsCount}件`);
  }
  if (items.length === 0) {
    return [SHIKIHO_MISSING_JA];
  }
  return items.slice(0, 3);
}

function fmtRankJa(rank: number | null, total: number): string {
  if (rank == null || total <= 0) return SHIKIHO_MISSING_JA;
  return `${rank}位 / ${total}社`;
}

function fmtPeerMetric(
  key: BursaPeerMetricKey,
  value: number | null,
  currency: string,
): string {
  if (value == null || !Number.isFinite(value)) return SHIKIHO_MISSING_JA;
  switch (key) {
    case 'marketCap':
    case 'netProfit':
      return fmtMoney(value, currency);
    case 'pe':
      return `${value.toFixed(2)}倍`;
    case 'dividendYieldPct':
    case 'roePct':
      return `${value.toFixed(2)}%`;
    case 'eps':
      return `${value.toFixed(4)} sen`;
    default:
      return String(value);
  }
}

function buildBursaPhase3Section(
  phase3: BursaPhase3Analysis | null,
  stockCode: string,
  currency: string,
): AiStockReportBursaSection['phase3'] {
  if (!phase3) return null;

  const peers = phase3.peerSnapshots.filter((s) => s.stockCode !== stockCode && s.companyName);

  const comparisonRows = phase3.comparisonMetrics.map((m) => {
    const peerLines = peers
      .map((p) => {
        const v = m.valuesByCode[p.stockCode];
        if (v == null) return null;
        return `${p.companyName}: ${fmtPeerMetric(m.metricKey, v, currency)}`;
      })
      .filter(Boolean)
      .join('\n');
    return {
      metricJa: m.labelJa,
      targetValueJa: fmtPeerMetric(m.metricKey, m.targetValue, currency),
      peerSummaryJa: peerLines || SHIKIHO_MISSING_JA,
      rankJa: fmtRankJa(m.targetRank, m.peerCount),
    };
  });

  const competitiveRows = [
    { key: 'entryBarrier' as const, labelJa: '参入障壁' },
    { key: 'brandPower' as const, labelJa: 'ブランド力' },
    { key: 'marketShare' as const, labelJa: '市場シェア' },
    { key: 'priceCompetitiveness' as const, labelJa: '価格競争力' },
    { key: 'overseasExpansion' as const, labelJa: '海外展開力' },
  ].map(({ key, labelJa }) => {
    const dim = phase3.competitiveAdvantage[key];
    return {
      labelJa,
      scoreJa: dim.score != null ? `${dim.score}/100` : SHIKIHO_MISSING_JA,
      reasonJa: dim.reasonJa,
    };
  });

  const buffettRows = phase3.buffettScore.components.map((c) => ({
    labelJa: c.labelJa,
    scoreJa: c.score != null ? `${c.score}/${c.maxScore}` : SHIKIHO_MISSING_JA,
    reasonJa: c.reasonJa,
  }));

  const n = phase3.industryCompanyCount;
  return {
    peerNamesJa: phase3.peerNames.length > 0 ? phase3.peerNames.join(' · ') : SHIKIHO_MISSING_JA,
    comparisonRows,
    industryLabelJa: phase3.sectorLabelJa,
    industryCompanyCountJa: n > 0 ? `${n}社` : SHIKIHO_MISSING_JA,
    marketCapRankJa: fmtRankJa(phase3.industryRanks.marketCap, n),
    profitRankJa: fmtRankJa(phase3.industryRanks.netProfit, n),
    dividendRankJa: fmtRankJa(phase3.industryRanks.dividendYield, n),
    roeRankJa: fmtRankJa(phase3.industryRanks.roe, n),
    overallRankJa: fmtRankJa(phase3.industryRanks.overall, n),
    competitiveRows,
    buffettTotalJa:
      phase3.buffettScore.totalScore != null
        ? `${phase3.buffettScore.totalScore}/100`
        : SHIKIHO_MISSING_JA,
    buffettRows,
    enhancedInvestmentTypeJa: phase3.enhancedInvestmentType ?? SHIKIHO_MISSING_JA,
    enhancedJudgmentReasonsJa:
      phase3.enhancedJudgmentReasons.length > 0
        ? phase3.enhancedJudgmentReasons
        : [SHIKIHO_MISSING_JA],
  };
}

function buildBursaPhase4Section(
  phase4: BursaPhase4Analysis | null,
  bundle: BursaDisclosureBundle,
  currency: string,
): AiStockReportBursaSection['phase4'] {
  if (!phase4) return null;

  const majorShareholderRows =
    phase4.majorShareholders.length > 0
      ? phase4.majorShareholders.map((s) => ({
          nameJa: s.name,
          holdingPctJa:
            s.holdingPct != null ? `${s.holdingPct.toFixed(3)}%` : SHIKIHO_MISSING_JA,
          asOfJa: s.asOfDate ?? SHIKIHO_MISSING_JA,
        }))
      : [{ nameJa: SHIKIHO_MISSING_JA, holdingPctJa: SHIKIHO_MISSING_JA, asOfJa: SHIKIHO_MISSING_JA }];

  const hasSegmentData = phase4.segmentRevenue.some((s) => s.revenuePct != null);
  const segmentRows = hasSegmentData
    ? phase4.segmentRevenue.map((s) => ({
        segmentJa: s.segmentName || SHIKIHO_MISSING_JA,
        revenueJa: fmtNumOrMissing(s.revenue, (n) => fmtMoney(n, currency)),
        ratioJa: s.revenuePct != null ? `${s.revenuePct.toFixed(1)}%` : SHIKIHO_MISSING_JA,
      }))
    : [{ segmentJa: SHIKIHO_MISSING_JA, revenueJa: SHIKIHO_MISSING_JA, ratioJa: SHIKIHO_MISSING_JA }];

  const hasGeoData = phase4.geographicRevenue.some((g) => g.revenuePct != null);
  const geographicRows = GEO_REGIONS_ORDER.map((region) => {
    const row = phase4.geographicRevenue.find((g) => g.region === region);
    if (!hasGeoData || !row) {
      return { regionJa: region, revenueJa: SHIKIHO_MISSING_JA, ratioJa: SHIKIHO_MISSING_JA };
    }
    return {
      regionJa: region,
      revenueJa: fmtNumOrMissing(row.revenue, (n) => fmtMoney(n, currency)),
      ratioJa: row.revenuePct != null ? `${row.revenuePct.toFixed(1)}%` : SHIKIHO_MISSING_JA,
    };
  });

  const annual = filterCompleteFyAnnual(bundle.quarterly.annualRecords);
  const performanceSectionRows =
    annual.length > 0
      ? annual.slice(0, 5).map((r) => {
          const year = calendarYearFromFinancialLabel(r.financialYear);
          const parts: string[] = [];
          if (r.revenue != null) parts.push(`売上 ${fmtMoney(r.revenue, currency)}`);
          if (r.netProfit != null) parts.push(`純利益 ${fmtMoney(r.netProfit, currency)}`);
          if (r.eps != null) parts.push(`EPS ${r.eps.toFixed(4)} sen`);
          return {
            labelJa: (year != null ? `${year}年` : r.financialYear) ?? SHIKIHO_MISSING_JA,
            valueJa: parts.length > 0 ? parts.join(' · ') : SHIKIHO_MISSING_JA,
          };
        })
      : [{ labelJa: SHIKIHO_MISSING_JA, valueJa: SHIKIHO_MISSING_JA }];

  const { profile, dividend } = bundle;
  const dividendSectionRows: Array<{ labelJa: string; valueJa: string }> = [
    {
      labelJa: '配当利回り',
      valueJa: fmtNumOrMissing(profile.dividendYieldPct, (n) => `${n.toFixed(2)}%`),
    },
  ];
  if (dividend.history.length > 0) {
    for (const d of dividend.history.slice(0, 6)) {
      dividendSectionRows.push({
        labelJa: d.announcedDate ?? d.financialYear ?? '配当',
        valueJa: fmtNumOrMissing(d.amountPerShare, (n) => `${n.toFixed(4)} MYR`),
      });
    }
  } else {
    dividendSectionRows.push({ labelJa: '配当履歴', valueJa: SHIKIHO_MISSING_JA });
  }

  let currentForecastJa: string;
  if (phase4.currentForecastStatus === 'available' && phase4.currentPeriodForecast.length > 0) {
    currentForecastJa = phase4.currentPeriodForecast
      .map((f) => `${f.label}: ${f.value ?? SHIKIHO_MISSING_JA}`)
      .join('\n');
  } else if (phase4.currentForecastStatus === 'none') {
    currentForecastJa = '会社予想なし';
  } else {
    currentForecastJa = SHIKIHO_MISSING_JA;
  }

  let nextForecastJa: string;
  if (phase4.nextForecastStatus === 'available' && phase4.nextPeriodForecast.length > 0) {
    nextForecastJa = phase4.nextPeriodForecast
      .map((f) => `${f.label}: ${f.value ?? SHIKIHO_MISSING_JA}`)
      .join('\n');
  } else if (phase4.nextForecastStatus === 'available') {
    nextForecastJa = SHIKIHO_MISSING_JA;
  } else if (phase4.nextForecastStatus === 'undisclosed') {
    nextForecastJa = '未開示';
  } else {
    nextForecastJa = SHIKIHO_MISSING_JA;
  }

  return {
    shareholderSourceJa: phase4.shareholderSourceNote,
    majorShareholderRows,
    segmentRows,
    geographicRows,
    performanceSectionRows,
    dividendSectionRows,
    comments: { ...phase4.comments },
    currentForecastJa,
    nextForecastJa,
  };
}

const GEO_REGIONS_ORDER = ['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Others'] as const;

function fmtDiffPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return SHIKIHO_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtEnhancedPeerValue(
  key: string,
  value: number | null,
  currency: string,
): string {
  if (value == null || !Number.isFinite(value)) return SHIKIHO_MISSING_JA;
  if (key === 'revenue' || key === 'netProfit') return fmtMoney(value, currency);
  if (key === 'eps') return `${value.toFixed(4)} sen`;
  if (key === 'roePct' || key === 'dividendYieldPct') return `${value.toFixed(2)}%`;
  return String(value);
}

function buildBursaPhase5Section(
  phase5: BursaPhase5Analysis | null,
  currency: string,
): AiStockReportBursaSection['phase5'] {
  if (!phase5) return null;

  const enhancedPeerRows = phase5.enhancedPeerComparison.map((row) => ({
    metricJa: row.labelJa,
    targetValueJa: fmtEnhancedPeerValue(row.metricKey, row.targetValue, currency),
    industryAverageJa: fmtEnhancedPeerValue(row.metricKey, row.industryAverage, currency),
    diffPctJa: fmtDiffPct(row.diffPct),
  }));

  const fv = phase5.fairValue;
  const fairValue = {
    currentPriceJa: fmtNumOrMissing(fv.currentPrice, (n) => `RM${n.toFixed(2)}`),
    fairPriceJa: fmtNumOrMissing(fv.fairPrice, (n) => `RM${n.toFixed(2)}`),
    discountPctJa: fmtDiffPct(fv.discountPct),
    methodNoteJa:
      fv.industryMedianPe != null
        ? `PER法 · EPS×業界中央PER（${fv.industryMedianPe.toFixed(2)}倍）`
        : SHIKIHO_MISSING_JA,
  };

  const dj = phase5.dividendJudgment;
  const dividendJudgment = {
    currentDividendJa: fmtNumOrMissing(dj.currentDividend, (n) => `${n.toFixed(4)} MYR`),
    fiveYearAverageJa: fmtNumOrMissing(dj.fiveYearAverage, (n) => `${n.toFixed(4)} MYR`),
    growthRateJa: fmtDiffPct(dj.growthRatePct),
    cutHistoryJa:
      dj.cutCount == null
        ? SHIKIHO_MISSING_JA
        : dj.cutCount === 0
          ? '減配なし'
          : `${dj.cutCount}回（${dj.cutYears.join(', ')}年）`,
    ratingJa: dj.rating ?? SHIKIHO_MISSING_JA,
  };

  const tj = phase5.trendJudgment;
  const trendJudgment = {
    revenueJa: tj.revenue ?? SHIKIHO_MISSING_JA,
    netProfitJa: tj.netProfit ?? SHIKIHO_MISSING_JA,
    epsJa: tj.eps ?? SHIKIHO_MISSING_JA,
  };

  return {
    enhancedPeerRows,
    fairValue,
    dividendJudgment,
    trendJudgment,
    overallJudgmentJa: phase5.overallJudgment ?? SHIKIHO_MISSING_JA,
    judgmentReasonsJa:
      phase5.judgmentReasons.length > 0 ? phase5.judgmentReasons : [SHIKIHO_MISSING_JA],
  };
}

function buildBursaSection(
  bundle: BursaDisclosureBundle | null,
  currency: string,
  fetchStatus: AiStockReport['sourceStatus']['bursaMalaysia'],
  currentPrice: number | null,
  volume: number | null,
  phase3Raw: BursaPhase3Analysis | null,
  phase4Raw: BursaPhase4Analysis | null,
  phase5Raw: BursaPhase5Analysis | null,
): AiStockReportBursaSection | null {
  if (!bundle || bundle.dataSource === 'none') return null;

  const { profile, quarterly, dividend } = bundle;
  const lq = quarterly.latestQuarter;
  const phase2Raw = buildBursaAiPhase2Analysis(bundle, currentPrice, volume);

  const fmtTrendVal = (n: number | null, money = false): string => {
    if (n == null || !Number.isFinite(n)) return SHIKIHO_MISSING_JA;
    if (money) return fmtMoney(n, currency);
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const phase2: AiStockReportBursaSection['phase2'] = {
    trendRows: phase2Raw.trend.points.map((p) => ({
      year: p.year,
      revenueJa: fmtTrendVal(p.revenue, true),
      netProfitJa: fmtTrendVal(p.netProfit, true),
      epsJa: fmtTrendVal(p.eps),
      dividendJa: fmtTrendVal(p.dividend),
      roeJa: p.roePct != null ? `${p.roePct.toFixed(1)}%` : SHIKIHO_MISSING_JA,
      dividendPayoutJa:
        p.dividendPayoutPct != null ? `${p.dividendPayoutPct.toFixed(1)}%` : SHIKIHO_MISSING_JA,
    })),
    chartLabels: phase2Raw.trend.years.map(String),
    chartRevenue: phase2Raw.trend.revenue.map((v) => v ?? 0),
    chartNetProfit: phase2Raw.trend.netProfit.map((v) => v ?? 0),
    chartEps: phase2Raw.trend.eps.map((v) => v ?? 0),
    chartDividend: phase2Raw.trend.dividend.map((v) => v ?? 0),
    revenueGrowthStarsJa: starsLabel(phase2Raw.revenueGrowthStars),
    profitGrowthStarsJa: starsLabel(phase2Raw.profitGrowthStars),
    dividendGrowthStarsJa: starsLabel(phase2Raw.dividendGrowthStars),
    financialHealthStarsJa: starsLabel(phase2Raw.financialHealthStars),
    investmentTypeJa:
      phase3Raw?.enhancedInvestmentType ?? phase2Raw.investmentType ?? SHIKIHO_MISSING_JA,
    judgmentReasonsJa:
      phase3Raw && phase3Raw.enhancedJudgmentReasons.length > 0
        ? phase3Raw.enhancedJudgmentReasons
        : phase2Raw.judgmentReasons.length > 0
          ? phase2Raw.judgmentReasons
          : [SHIKIHO_MISSING_JA],
    overallRank: phase2Raw.overallRank,
    compositeScore: phase2Raw.compositeScore,
  };

  return {
    companyOverviewJa: fmtOrMissing(profile.companyOverview),
    sectorJa: fmtOrMissing(profile.sector),
    subSectorJa: fmtOrMissing(profile.subSector),
    revenueJa: fmtNumOrMissing(lq?.revenue, (n) => fmtMoney(n, currency)),
    operatingProfitJa: SHIKIHO_MISSING_JA,
    netProfitJa: fmtNumOrMissing(lq?.netProfit, (n) => fmtMoney(n, currency)),
    epsJa: fmtNumOrMissing(lq?.eps, (n) => `${n.toFixed(4)} sen`),
    marketCapJa: fmtNumOrMissing(profile.marketCap, (n) => fmtMoney(n, currency)),
    sharesOutstandingJa: fmtNumOrMissing(profile.sharesOutstanding, (n) =>
      n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
    ),
    dividendHistory: dividend.history.slice(0, 8).map((d) => ({
      announcedDate: d.announcedDate,
      financialYear: d.financialYear,
      dividendType: d.dividendType,
      exDate: d.exDate,
      paymentDate: d.paymentDate,
      amountPerShare: d.amountPerShare,
      amountPerShareJa: fmtNumOrMissing(d.amountPerShare, (n) => `${n.toFixed(4)} MYR`),
    })),
    latestQuarter: lq
      ? {
          financialYear: lq.financialYear,
          quarter: lq.quarter,
          quarterEndDate: lq.quarterEndDate,
          announcedDate: lq.announcedDate,
          quarterEndDateJa: fmtOrMissing(lq.quarterEndDate),
          announcedDateJa: fmtOrMissing(lq.announcedDate),
        }
      : null,
    dataSourceLabel: 'KLSE Screener (Bursa 開示ミラー)',
    fetchStatus,
    phase2,
    phase3: buildBursaPhase3Section(phase3Raw, bundle.stockCode, currency),
    phase4: buildBursaPhase4Section(phase4Raw, bundle, currency),
    phase5: buildBursaPhase5Section(phase5Raw, currency),
  };
}

export function assembleAiStockReport(
  raw: AiStockReportRawData,
  holding?: PortfolioPosition | null,
): AiStockReport {
  const y = raw.yahoo;
  const name =
    holding?.companyName?.trim() ||
    raw.bursa?.profile.companyName ||
    y.companyName ||
    raw.symbol;

  const yahooPartial = computeDimensionScoresFromRealData({
    per: y.pe,
    dividendYieldPct: y.dividendYieldPct,
    marketCap: y.marketCap,
    volume: raw.volume,
    revenueGrowthPct: y.revenueGrowthPct,
    profitMarginPct: y.profitMarginPct,
  });

  const bursaPartial =
    raw.bursa != null
      ? computeBursaDimensionScores(raw.bursa, raw.currentPrice, raw.volume)
      : null;

  const partial = mergePartialScores(yahooPartial, bursaPartial);
  const { compositeScore, displayScores, availability } = computeCompositeFromPartial(partial);
  const overallRank = compositeScore != null ? scoreToGrade(compositeScore) : null;
  const subGrades = computeSubGradesFromPartial(partial);

  const sym = CURRENCY_SYMBOL[raw.currency as keyof typeof CURRENCY_SYMBOL] ?? raw.currency;
  const bp = raw.bursa?.profile;
  const bq = raw.bursa?.quarterly.latestQuarter;

  return {
    generatedAt: new Date().toISOString(),
    currency: raw.currency,
    overview: {
      companyName: fmtOrMissing(name),
      symbol: raw.symbol,
      market: raw.market,
      marketLabelJa: marketLabelFor(raw.market),
      sectorJa: fmtOrMissing(bp?.sector ?? y.sector),
      businessDescriptionJa: fmtOrMissing(bp?.companyOverview ?? y.businessDescription),
    },
    financials: {
      revenueJa: fmtNumOrMissing(bq?.revenue ?? y.revenue, (n) => fmtMoney(n, raw.currency)),
      operatingIncomeJa: fmtNumOrMissing(y.operatingIncome, (n) => fmtMoney(n, raw.currency)),
      netIncomeJa: fmtNumOrMissing(bq?.netProfit ?? y.profit, (n) => fmtMoney(n, raw.currency)),
      epsJa: fmtNumOrMissing(bq?.eps ?? y.eps, (n) => `${n.toFixed(2)} ${raw.currency}`),
      marketCapJa: fmtNumOrMissing(bp?.marketCap ?? y.marketCap, (n) => fmtMoney(n, raw.currency)),
    },
    marketData: {
      currentPriceJa: fmtNumOrMissing(raw.currentPrice, (n) => `${sym}${n.toFixed(2)}`),
      volumeJa: fmtNumOrMissing(raw.volume, (n) => n.toLocaleString('en-US')),
      marketStatusJa: fmtOrMissing(raw.marketStatusJa),
    },
    dividend: {
      yieldLabelJa: fmtNumOrMissing(bp?.dividendYieldPct ?? y.dividendYieldPct, (n) => `${n.toFixed(2)}%`),
      trendJa:
        y.revenueGrowthPct != null && y.revenueGrowthPct > 0 && y.dividendYieldPct != null
          ? `売上成長 ${y.revenueGrowthPct.toFixed(1)}% · 利回り ${y.dividendYieldPct.toFixed(1)}%`
          : y.dividendYieldPct != null
            ? `利回り ${y.dividendYieldPct.toFixed(1)}%`
            : SHIKIHO_MISSING_JA,
      safetyJa:
        y.freeCashflow != null && y.freeCashflow > 0
          ? '営業/フリーCF プラス（Yahoo Finance）'
          : y.operatingCashflow != null && y.operatingCashflow > 0
            ? '営業CF プラス（Yahoo Finance）'
            : SHIKIHO_MISSING_JA,
    },
    health: {
      equityRatioJa: SHIKIHO_MISSING_JA,
      debtRatioJa:
        y.debtToEquity != null ? `D/E ${y.debtToEquity.toFixed(2)}（Yahoo Finance）` : SHIKIHO_MISSING_JA,
      cashFlowJa:
        y.operatingCashflow != null
          ? fmtMoney(y.operatingCashflow, raw.currency)
          : SHIKIHO_MISSING_JA,
    },
    competitiveness: {
      entryBarrierJa: SHIKIHO_MISSING_JA,
      brandPowerJa: SHIKIHO_MISSING_JA,
      marketShareJa:
        y.marketCap != null
          ? `時価総額 ${fmtMoney(y.marketCap, raw.currency)}`
          : SHIKIHO_MISSING_JA,
    },
    news: {
      headlines: raw.newsHeadlines,
      positiveCount: raw.positiveNewsCount,
      negativeCount: raw.negativeNewsCount,
      latestNewsJa:
        raw.newsHeadlines.length > 0
          ? raw.newsHeadlines.map((h) => `· ${h.title}`).join('\n')
          : SHIKIHO_MISSING_JA,
    },
    risk: { items: buildRiskItems(raw) },
    evaluation: {
      ...displayScores,
      compositeScore,
      overallRank,
      availability,
      commentJa: buildEvaluationComment(name, compositeScore, overallRank, partial),
    },
    subGrades,
    dataSource: 'live',
    fetchedFields: raw.fetchedFields,
    missingFields: raw.missingFields,
    sourceStatus: raw.sourceStatus,
    apiLimitNotes: [...raw.apiLimitNotes, ...((raw.bursa?.apiNotes ?? []) as string[])],
    bursa: buildBursaSection(
      raw.bursa,
      raw.currency,
      raw.sourceStatus.bursaMalaysia,
      raw.currentPrice,
      raw.volume,
      raw.bursaPhase3,
      raw.bursaPhase4,
      raw.bursaPhase5,
    ),
  };
}

export async function buildAiStockReportAsync(input: {
  symbol: string;
  market: Market;
  holding?: PortfolioPosition | null;
  twelveDataApiKey?: string;
  newsApiKey?: string;
}): Promise<AiStockReport> {
  const raw = await fetchAiStockReportData(input);
  return assembleAiStockReport(raw, input.holding);
}

export function pickTopCandidatesFromSearch(limit = 5) {
  return rankAllStocks().slice(0, limit);
}
