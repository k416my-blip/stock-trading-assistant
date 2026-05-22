/**
 * 市場レジーム分析エンジン — 指数・VIX・為替・金利・セクターから全体地合いを判定
 */
import {
  CONCIERGE_MARKET_REGIME_LABEL,
  FED_FUNDS_RATE_REFERENCE_PCT,
  GLOBAL_INDEX_DEFS,
  GLOBAL_SECTOR_DEFS,
  MACRO_INSTRUMENT_DEFS,
} from '../constants/globalMarket';
import { buildMarketIndicatorsSnapshot } from './marketIndicators';
import type {
  ConciergeMarketRegimeId,
  CorrelationInsight,
  GlobalIndexQuote,
  GlobalMarketAnalysisBundle,
  GlobalSectorSnapshot,
  MacroInstrumentQuote,
  MarketScoreBlock,
} from '../types/globalMarketAnalysis';
import {
  fetchGlobalMarketSnapshots,
  snapshotFor,
  type YahooInstrumentSnapshot,
} from './globalMarketQuoteService';

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function buildIndices(snapshots: Record<string, YahooInstrumentSnapshot>): GlobalIndexQuote[] {
  return GLOBAL_INDEX_DEFS.map((d) => {
    const s = snapshotFor(snapshots, d.yahooSymbol);
    return {
      id: d.id,
      labelJa: d.labelJa,
      region: d.region,
      yahooSymbol: d.yahooSymbol,
      price: s.price,
      changePct: s.changePct,
      fromLive: s.fromLive,
      staleNoteJa: s.errorJa,
    };
  });
}

function buildSectors(snapshots: Record<string, YahooInstrumentSnapshot>): GlobalSectorSnapshot[] {
  const raw = GLOBAL_SECTOR_DEFS.map((d) => {
    const s = snapshotFor(snapshots, d.etfSymbol);
    const change = s.changePct ?? 0;
    return {
      id: d.id,
      labelJa: d.labelJa,
      etfSymbol: d.etfSymbol,
      changePct: s.changePct,
      momentumScore: clamp(50 + change * 8),
    };
  });
  const sorted = [...raw].sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999));
  return sorted.map((s, i) => ({ ...s, leadershipRank: i + 1 }));
}

function buildMacroQuotes(snapshots: Record<string, YahooInstrumentSnapshot>): {
  vix: MacroInstrumentQuote | null;
  forex: MacroInstrumentQuote[];
  rates: MacroInstrumentQuote[];
} {
  const toMacro = (
    def: (typeof MACRO_INSTRUMENT_DEFS)[keyof typeof MACRO_INSTRUMENT_DEFS],
  ): MacroInstrumentQuote => {
    const s = snapshotFor(snapshots, def.yahooSymbol);
    return {
      id: def.id,
      labelJa: def.labelJa,
      yahooSymbol: def.yahooSymbol,
      value: s.price,
      changePct: s.changePct,
      unitJa: def.unitJa,
      fromLive: s.fromLive,
    };
  };

  return {
    vix: toMacro(MACRO_INSTRUMENT_DEFS.vix),
    forex: [
      toMacro(MACRO_INSTRUMENT_DEFS.usdjpy),
      toMacro(MACRO_INSTRUMENT_DEFS.usdmyr),
      toMacro(MACRO_INSTRUMENT_DEFS.dxy),
    ],
    rates: [
      toMacro(MACRO_INSTRUMENT_DEFS.us10y),
      {
        id: 'fed_rate',
        labelJa: 'Fed政策金利（参照）',
        yahooSymbol: 'FED',
        value: FED_FUNDS_RATE_REFERENCE_PCT,
        changePct: null,
        unitJa: '%',
        fromLive: false,
      },
    ],
  };
}

function classifyRegime(input: {
  avgIndexChange: number;
  vix: number | null;
  usIndexChange: number;
  klciChange: number | null;
  sectorDispersion: number;
}): { id: ConciergeMarketRegimeId; confidence: number; summaryJa: string } {
  const vix = input.vix ?? 18;
  const mom = input.avgIndexChange;

  if (vix >= 28 || (mom <= -2 && vix >= 22)) {
    return {
      id: 'panic',
      confidence: clamp(75 + (vix - 28) * 2),
      summaryJa: `VIX ${vix.toFixed(1)}・主要指数平均 ${mom.toFixed(2)}% — 恐怖売り・急変動リスクが高い局面`,
    };
  }
  if (vix >= 22 || mom <= -1.2) {
    return {
      id: 'risk_off',
      confidence: clamp(65 + Math.abs(mom) * 4),
      summaryJa: `リスクオフ — 指数平均 ${mom.toFixed(2)}%・VIX ${vix.toFixed(1)}。個別材料以上に市場全体の売りが効きやすい`,
    };
  }
  if (input.klciChange != null && input.klciChange <= -2) {
    return {
      id: 'risk_off',
      confidence: 70,
      summaryJa: `KLCI ${input.klciChange.toFixed(2)}% の大幅下落 — マレーシア市場の地合い悪化に注意`,
    };
  }
  if (Math.abs(mom) < 0.35 && input.sectorDispersion < 1.2) {
    return {
      id: 'sideways',
      confidence: 58,
      summaryJa: `指数は横ばい圏（平均 ${mom.toFixed(2)}%）— セクター選別が重要`,
    };
  }
  if (mom >= 0.9 && vix < 18) {
    return {
      id: 'risk_on',
      confidence: clamp(60 + mom * 5),
      summaryJa: `リスクオン — 指数上昇・VIX低め。リスク資産への資金流入が続きやすい`,
    };
  }
  if (mom >= 0.6) {
    return {
      id: 'bullish',
      confidence: clamp(55 + mom * 4),
      summaryJa: `強気地合い — 主要指数がプラス圏（平均 ${mom.toFixed(2)}%）`,
    };
  }
  if (mom <= -0.8) {
    return {
      id: 'bearish',
      confidence: clamp(55 + Math.abs(mom) * 4),
      summaryJa: `弱気地合い — 主要指数がマイナス（平均 ${mom.toFixed(2)}%）`,
    };
  }
  if (mom > -0.5 && mom < 0.6 && vix < 20) {
    return {
      id: 'recovery',
      confidence: 52,
      summaryJa: `回復局面 — 急落後の持ち直し・底打ち探索の可能性（平均 ${mom.toFixed(2)}%）`,
    };
  }
  return {
    id: 'sideways',
    confidence: 50,
    summaryJa: `方向感は限定的（指数平均 ${mom.toFixed(2)}%）`,
  };
}

function computeMarketScores(input: {
  avgIndexChange: number;
  vix: number | null;
  liveCount: number;
  totalCount: number;
  sampleLiquidity: number;
}): MarketScoreBlock {
  const vix = input.vix ?? 18;
  const fearScore = clamp((vix / 40) * 100);
  const momentumScore = clamp(50 + input.avgIndexChange * 12);
  const marketRiskScore = clamp(
    fearScore * 0.45 + (100 - momentumScore) * 0.35 + (100 - input.sampleLiquidity) * 0.2,
  );
  const coverage = input.totalCount > 0 ? input.liveCount / input.totalCount : 0;
  const liquidityScore = clamp(input.sampleLiquidity * 0.6 + coverage * 40);
  return { marketRiskScore, fearScore, momentumScore, liquidityScore };
}

function buildCorrelations(
  indices: GlobalIndexQuote[],
  sectors: GlobalSectorSnapshot[],
  rates: MacroInstrumentQuote[],
): CorrelationInsight[] {
  const nasdaq = indices.find((i) => i.id === 'nasdaq');
  const sp = indices.find((i) => i.id === 'sp500');
  const semi = sectors.find((s) => s.id === 'semiconductor');
  const bank = sectors.find((s) => s.id === 'banking');
  const us10y = rates.find((r) => r.id === 'us10y');
  const out: CorrelationInsight[] = [];

  if (nasdaq?.changePct != null && semi?.changePct != null) {
    const sameDir =
      (nasdaq.changePct >= 0 && semi.changePct >= 0) ||
      (nasdaq.changePct < 0 && semi.changePct < 0);
    out.push({
      pairLabelJa: '半導体 ↔ Nasdaq',
      correlationHintJa: sameDir
        ? `半導体ETF ${semi.changePct.toFixed(2)}% · Nasdaq ${nasdaq.changePct.toFixed(2)}% — 連動しやすい`
        : `半導体 ${semi.changePct.toFixed(2)}% vs Nasdaq ${nasdaq.changePct.toFixed(2)}% — 乖離（個別要因の可能性）`,
      strength: Math.abs((nasdaq.changePct ?? 0) - (semi.changePct ?? 0)) < 0.8 ? 'strong' : 'moderate',
    });
  }

  if (bank?.changePct != null && us10y?.changePct != null) {
    out.push({
      pairLabelJa: '銀行株 ↔ 金利',
      correlationHintJa: `銀行セクター ${bank.changePct.toFixed(2)}% · 米10年 ${us10y.value?.toFixed(2) ?? '—'}%（${us10y.changePct != null ? `前日比 ${us10y.changePct.toFixed(2)}%` : '変化率不明'}）`,
      strength: 'moderate',
    });
  }

  if (sp?.changePct != null) {
    out.push({
      pairLabelJa: '大型株 ↔ S&P500',
      correlationHintJa: `S&P500 ${sp.changePct.toFixed(2)}% — 米国大型株のベンチマーク`,
      strength: 'strong',
    });
  }

  return out;
}

function buildMarketWideFactors(
  regimeId: ConciergeMarketRegimeId,
  indices: GlobalIndexQuote[],
  vix: MacroInstrumentQuote | null,
  forex: MacroInstrumentQuote[],
  sectors: GlobalSectorSnapshot[],
): string[] {
  const factors: string[] = [];
  factors.push(`市場レジーム: ${CONCIERGE_MARKET_REGIME_LABEL[regimeId]}`);

  const usAvg = avg(
    indices.filter((i) => i.region === 'us' && i.changePct != null).map((i) => i.changePct!),
  );
  if (indices.some((i) => i.changePct != null)) {
    factors.push(`米国主要指数の平均変化: ${usAvg.toFixed(2)}%`);
  }
  const klci = indices.find((i) => i.id === 'klci');
  if (klci?.changePct != null) {
    factors.push(`KLCI: ${klci.changePct.toFixed(2)}%`);
  }
  if (vix?.value != null) {
    factors.push(`VIX: ${vix.value.toFixed(2)}（恐怖指数）`);
  }
  const dxy = forex.find((f) => f.id === 'dxy');
  if (dxy?.changePct != null) {
    factors.push(`ドル指数: 前日比 ${dxy.changePct.toFixed(2)}%`);
  }
  const leader = sectors[0];
  const laggard = sectors[sectors.length - 1];
  if (leader?.changePct != null) {
    factors.push(`セクター主導: ${leader.labelJa}（${leader.changePct.toFixed(2)}%）`);
  }
  if (laggard && laggard.id !== leader?.id && laggard.changePct != null) {
    factors.push(`セクター弱い: ${laggard.labelJa}（${laggard.changePct.toFixed(2)}%）`);
  }
  return factors;
}

function proxyFallbackFromSample(): {
  avgIndexChange: number;
  vix: number;
  sampleLiquidity: number;
} {
  const ind = buildMarketIndicatorsSnapshot();
  return {
    avgIndexChange: ind.indexMomentumPct,
    vix: ind.volatilityProxyPct,
    sampleLiquidity: ind.liquidityProxy,
  };
}

/** テスト・フォールバック用の最小バンドル */
export function buildStubGlobalMarketAnalysis(): GlobalMarketAnalysisBundle {
  return {
    generatedAt: new Date().toISOString(),
    regimeId: 'sideways',
    regimeLabelJa: CONCIERGE_MARKET_REGIME_LABEL.sideways,
    regimeSummaryJa: '市場データ未取得 — 判断材料不足',
    regimeConfidencePct: 0,
    indices: [],
    sectors: [],
    vix: null,
    forex: [],
    rates: [],
    correlations: [],
    marketScores: {
      marketRiskScore: 50,
      fearScore: 50,
      momentumScore: 50,
      liquidityScore: 50,
    },
    marketWideFactorsJa: ['市場データ不足'],
    individualVsMarketNoteJa: '個別要因と市場全体要因を分けて説明してください。',
    macroContextBulletsJa: [],
    dataGapsJa: ['ライブ市場データ未取得'],
    insufficientData: true,
    sourceNoteJa: 'スタブ（テスト/オフライン）',
  };
}

/** 市場全体分析バンドル（コンシェルジュ・UI・AI） */
export async function buildGlobalMarketAnalysis(
  options?: { forceRefresh?: boolean },
): Promise<GlobalMarketAnalysisBundle> {
  let snapshots: Record<string, YahooInstrumentSnapshot> = {};
  try {
    snapshots = await fetchGlobalMarketSnapshots(options?.forceRefresh ?? false);
  } catch {
    snapshots = {};
  }

  const indices = buildIndices(snapshots);
  const sectors = buildSectors(snapshots);
  const { vix, forex, rates } = buildMacroQuotes(snapshots);

  const liveQuotes = [...indices, ...sectors.map((s) => snapshotFor(snapshots, s.etfSymbol))];
  const liveCount = liveQuotes.filter((q) => q.fromLive && q.changePct != null).length;
  const totalCount = liveQuotes.length;

  const indexChanges = indices.map((i) => i.changePct).filter((c): c is number => c != null);
  const usChanges = indices
    .filter((i) => i.region === 'us')
    .map((i) => i.changePct)
    .filter((c): c is number => c != null);
  const avgIndexChange = indexChanges.length > 0 ? avg(indexChanges) : 0;
  const usIndexChange = usChanges.length > 0 ? avg(usChanges) : avgIndexChange;
  const klci = indices.find((i) => i.id === 'klci');
  const sectorChanges = sectors.map((s) => s.changePct ?? 0);
  const sectorDispersion =
    sectorChanges.length > 1
      ? Math.max(...sectorChanges) - Math.min(...sectorChanges)
      : 0;

  let vixVal = vix?.value ?? null;
  let sampleFallback = false;
  if (vixVal == null || indexChanges.length < 2) {
    const proxy = proxyFallbackFromSample();
    if (vixVal == null) vixVal = proxy.vix;
    sampleFallback = indexChanges.length < 2;
    if (indexChanges.length < 2) {
      indices.forEach((idx) => {
        if (idx.changePct == null) idx.changePct = proxy.avgIndexChange;
      });
    }
  }

  const regime = classifyRegime({
    avgIndexChange: indexChanges.length > 0 ? avgIndexChange : proxyFallbackFromSample().avgIndexChange,
    vix: vixVal,
    usIndexChange,
    klciChange: klci?.changePct ?? null,
    sectorDispersion,
  });

  const proxy = proxyFallbackFromSample();
  const marketScores = computeMarketScores({
    avgIndexChange: indexChanges.length > 0 ? avgIndexChange : proxy.avgIndexChange,
    vix: vixVal,
    liveCount,
    totalCount,
    sampleLiquidity: proxy.sampleLiquidity,
  });

  const correlations = buildCorrelations(indices, sectors, rates);
  const marketWideFactorsJa = buildMarketWideFactors(regime.id, indices, vix, forex, sectors);
  const insufficientData = liveCount < 4;
  const dataGapsJa: string[] = [];
  if (insufficientData) dataGapsJa.push('主要指数のライブ取得が不足');
  if (sampleFallback) dataGapsJa.push('一部はサンプル代理指標で補完');
  if (!vix?.fromLive) dataGapsJa.push('VIXライブ未取得');

  const individualVsMarketNoteJa =
    regime.id === 'risk_off' || regime.id === 'panic' || regime.id === 'bearish'
      ? '個別の好材料があっても、市場全体の売りに押される可能性があります。個別要因と市場全体要因を分けて説明してください。'
      : '個別銘柄の動きと市場全体の地合いを分けて説明してください。';

  return {
    generatedAt: new Date().toISOString(),
    regimeId: regime.id,
    regimeLabelJa: CONCIERGE_MARKET_REGIME_LABEL[regime.id],
    regimeSummaryJa: regime.summaryJa,
    regimeConfidencePct: regime.confidence,
    indices,
    sectors,
    vix,
    forex,
    rates,
    correlations,
    marketScores,
    marketWideFactorsJa,
    individualVsMarketNoteJa,
    macroContextBulletsJa: marketWideFactorsJa,
    dataGapsJa,
    insufficientData,
    sourceNoteJa: insufficientData
      ? 'Yahoo Finance + サンプル代理のハイブリッド（判断材料不足の場合は推測禁止）'
      : 'Yahoo Finance ライブデータ（ルールベース・AI予測なし）',
  };
}
