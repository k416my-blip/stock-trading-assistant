/**
 * Macro Intelligence & World Model — rule-based, explainable, local-only.
 */
import {
  FEAR_GREED_CAPITULATION,
  FEAR_GREED_EUPHORIA,
  MACRO_INTEL_REGULATORY_BANNER_JA,
  MACRO_WORLD_REGIME_LABEL_JA,
  VIX_LIQUIDITY_CRISIS,
  VIX_PANIC_MACRO,
} from '../constants/macroIntelligence';
import { FED_FUNDS_RATE_REFERENCE_PCT } from '../constants/globalMarket';
import type { ConciergeMarketRegimeId, GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type {
  BuildMacroIntelligenceInput,
  CentralBankNote,
  CorrelationMatrixCell,
  MacroEngineScore,
  MacroHeatmapRegion,
  MacroIntelligenceBundle,
  MacroNarrativeItem,
  MacroReplayItem,
  MacroWorldRegimeId,
  SectorRotationItem,
} from '../types/macroIntelligence';
import type { TacticalMode } from '../types/strategyExecution';
import type { MacroIntelligencePersisted } from './macroIntelligenceStorage';
import {
  appendRegimeTimeline,
  loadMacroIntelligenceState,
  saveMacroIntelligenceState,
} from './macroIntelligenceStorage';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function vixValue(g: GlobalMarketAnalysisBundle): number {
  return g.vix?.value ?? 18;
}

function us10y(g: GlobalMarketAnalysisBundle): MacroInstrumentLike {
  return g.rates.find((r) => r.id === 'us10y') ?? { value: null, changePct: null };
}

type MacroInstrumentLike = { value: number | null; changePct: number | null };

function forexChange(g: GlobalMarketAnalysisBundle, id: string): number | null {
  return g.forex.find((f) => f.id === id)?.changePct ?? null;
}

function sectorChange(g: GlobalMarketAnalysisBundle, id: string): number | null {
  return g.sectors.find((s) => s.id === id)?.changePct ?? null;
}

function indexChange(g: GlobalMarketAnalysisBundle, id: string): number | null {
  return g.indices.find((i) => i.id === id)?.changePct ?? null;
}

function classifyWorldRegime(g: GlobalMarketAnalysisBundle): {
  id: MacroWorldRegimeId;
  confidencePct: number;
  summaryJa: string;
  explainJa: string;
} {
  const vix = vixValue(g);
  const scores = g.marketScores;
  const usAvg = avg(
    g.indices.filter((i) => i.region === 'us' && i.changePct != null).map((i) => i.changePct!),
  );
  const energy = sectorChange(g, 'energy') ?? 0;
  const tech = sectorChange(g, 'tech') ?? 0;
  const liq = scores.liquidityScore;

  if (vix >= VIX_LIQUIDITY_CRISIS && liq < 40) {
    return {
      id: 'liquidity_crisis',
      confidencePct: clamp(80 + (vix - VIX_LIQUIDITY_CRISIS)),
      summaryJa: `VIX ${vix.toFixed(1)}・流動性スコア ${liq} — 流動性ショック警戒`,
      explainJa: `ルール: VIX≥${VIX_LIQUIDITY_CRISIS} かつ liquidityScore<40`,
    };
  }
  if (vix >= VIX_PANIC_MACRO || g.regimeId === 'panic') {
    return {
      id: 'panic',
      confidencePct: clamp(75 + (vix - VIX_PANIC_MACRO) * 2),
      summaryJa: `VIX ${vix.toFixed(1)}・恐怖 ${scores.fearScore} — パニック優位`,
      explainJa: `ルール: VIX≥${VIX_PANIC_MACRO} または既存レジーム=panic`,
    };
  }
  if (energy > 1.2 && us10y(g).value != null && us10y(g).value! > 4) {
    return {
      id: 'inflation',
      confidencePct: 65,
      summaryJa: `エネルギー+${energy.toFixed(1)}%・金利高水準 — インフレ圧力`,
      explainJa: 'ルール: エネルギーセクター上昇 + 米10年金利>4%',
    };
  }
  if (usAvg <= -1 && scores.momentumScore < 42) {
    return {
      id: 'recession',
      confidencePct: clamp(60 + Math.abs(usAvg) * 5),
      summaryJa: `米指数平均 ${usAvg.toFixed(2)}%・モメンタム低 — 景気後退リスク`,
      explainJa: 'ルール: 米指数平均≤-1% かつ momentum<42',
    };
  }
  if (scores.fearScore < 35 && scores.momentumScore > 62 && vix < 16) {
    return {
      id: 'euphoric',
      confidencePct: clamp(58 + scores.momentumScore * 0.3),
      summaryJa: `モメンタム ${scores.momentumScore}・VIX低 — 熱狂警戒`,
      explainJa: 'ルール: fear<35, momentum>62, VIX<16',
    };
  }
  if (g.regimeId === 'recovery' || (usAvg > -0.5 && usAvg < 0.8 && vix < 22)) {
    return {
      id: 'recovery',
      confidencePct: 55,
      summaryJa: `指数 ${usAvg.toFixed(2)}% — 底打ち・回復探索`,
      explainJa: 'ルール: 回復レジームまたは小幅プラス+低VIX',
    };
  }
  if (scores.momentumScore > 55 && scores.fearScore < 50) {
    return {
      id: 'risk_on',
      confidencePct: clamp(55 + scores.momentumScore * 0.25),
      summaryJa: `リスクオン — モメンタム ${scores.momentumScore}`,
      explainJa: 'ルール: momentum>55 かつ fear<50',
    };
  }
  return {
    id: 'risk_off',
    confidencePct: clamp(55 + scores.fearScore * 0.2),
    summaryJa: `リスクオフ — 恐怖 ${scores.fearScore}・リスク ${scores.marketRiskScore}`,
    explainJa: 'ルール: デフォルト（上記特殊条件に非該当）',
  };
}

function mapToConciergeRegime(world: MacroWorldRegimeId): ConciergeMarketRegimeId {
  switch (world) {
    case 'panic':
    case 'liquidity_crisis':
      return 'panic';
    case 'risk_off':
    case 'inflation':
    case 'recession':
      return 'risk_off';
    case 'risk_on':
    case 'euphoric':
      return 'risk_on';
    case 'recovery':
      return 'recovery';
    default:
      return 'sideways';
  }
}

function buildLiquidity(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const liq = g.marketScores.liquidityScore;
  const dxy = forexChange(g, 'dxy') ?? 0;
  const us10yCh = us10y(g).changePct ?? 0;
  const score = clamp(100 - liq + Math.max(0, dxy) * 4 + Math.max(0, us10yCh) * 3);
  return {
    score,
    labelJa: '流動性',
    detailJa: `流動性スコア ${liq} · DXY ${dxy >= 0 ? '+' : ''}${dxy.toFixed(2)}% · 金利変化 ${us10yCh.toFixed(2)}%`,
    ruleBasisJa: 'marketScores.liquidity + DXY/us10y変化（QT/QE/M2はライブ未取得のためプロキシ）',
  };
}

function buildCentralBanks(g: GlobalMarketAnalysisBundle): CentralBankNote[] {
  const vix = vixValue(g);
  const ratesUp = (us10y(g).changePct ?? 0) > 0.05;
  const hawkish = ratesUp && vix < 24;
  const dovish = !ratesUp && g.marketScores.fearScore > 55;
  return [
    {
      id: 'fomc',
      labelJa: 'FOMC（米）',
      stanceJa: hawkish ? 'タカ派寄り（金利上昇圧力）' : dovish ? '様子見〜緩和期待' : '中立',
      nextFocusJa: `参照金利 ${FED_FUNDS_RATE_REFERENCE_PCT}% · 10年 ${us10y(g).value?.toFixed(2) ?? '—'}%`,
    },
    {
      id: 'boj',
      labelJa: '日銀',
      stanceJa: (forexChange(g, 'usdjpy') ?? 0) > 0.3 ? '円安進行 — 輸出株恩恵/輸入インフレ' : '為替安定寄り',
      nextFocusJa: 'USD/JPY変化率からルール推定',
    },
    {
      id: 'ecb',
      labelJa: 'ECB',
      stanceJa: g.regimeId === 'risk_off' ? '引締め継続リスク' : '成長鈍化で政策柔軟化余地',
      nextFocusJa: '欧州指数データ不足時は米金利に連動仮定',
    },
    {
      id: 'pboc',
      labelJa: '人民銀行',
      stanceJa: /中国|China/i.test(g.macroContextBulletsJa.join(' '))
        ? '成長支援・流動性供給が話題'
        : 'データ不足 — 中立',
      nextFocusJa: 'マクロ文言キーワード検出',
    },
  ];
}

function buildYieldCurve(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const y10 = us10y(g);
  const usDown = avg(
    g.indices.filter((i) => i.region === 'us' && i.changePct != null).map((i) => i.changePct!),
  );
  const inverted = (y10.value ?? 4) > 4.2 && usDown < -0.5;
  const steepening = (y10.changePct ?? 0) > 0.08;
  let score = 40;
  if (inverted) score += 35;
  if (steepening) score += 15;
  return {
    score: clamp(score),
    labelJa: 'イールドカーブ',
    detailJa: inverted
      ? 'インバージョン疑い（長期金利高+株安）'
      : steepening
        ? 'スティープニング（金利上昇）'
        : 'フラット〜正常寄り',
    ruleBasisJa: '10年金利水準+米指数変化（2Y未取得のためプロキシ）',
  };
}

function buildInflation(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const energy = sectorChange(g, 'energy') ?? 0;
  const consumer = sectorChange(g, 'consumer') ?? 0;
  const score = clamp(45 + Math.max(0, energy) * 12 + Math.max(0, -consumer) * 5);
  return {
    score,
    labelJa: 'インフレ圧力',
    detailJa: `エネルギー ${energy.toFixed(2)}% · 消費 ${consumer.toFixed(2)}%（CPI/PPIはライブ未取得）`,
    ruleBasisJa: 'XLE/消費セクター変化率プロキシ',
  };
}

function buildCurrencyStress(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const dxy = forexChange(g, 'dxy') ?? 0;
  const jpy = forexChange(g, 'usdjpy') ?? 0;
  const myr = forexChange(g, 'usdmyr') ?? 0;
  const score = clamp(40 + Math.abs(dxy) * 8 + Math.abs(jpy) * 5 + Math.abs(myr) * 6);
  return {
    score,
    labelJa: '通貨ストレス',
    detailJa: `DXY ${dxy.toFixed(2)}% · USD/JPY ${jpy.toFixed(2)}% · USD/MYR ${myr.toFixed(2)}%`,
    ruleBasisJa: '為替変化率の絶対値合算',
  };
}

function buildCommodity(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const oil = sectorChange(g, 'energy') ?? 0;
  const semi = sectorChange(g, 'semiconductor') ?? 0;
  const regime =
    oil > 1 ? '資源高（インフレ寄与）' : oil < -1 ? '資源安（デフレ圧力）' : '中立';
  return {
    score: clamp(50 + oil * 10),
    labelJa: 'コモディティ',
    detailJa: `${regime} · 銅/金/ウランはETFプロキシ未接続 — エネルギー ${oil.toFixed(2)}% · 半導体 ${semi.toFixed(2)}%`,
    ruleBasisJa: 'エネルギーセクターETF',
  };
}

function buildVolatility(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const vix = vixValue(g);
  const realized = Math.abs(avg(g.indices.map((i) => i.changePct ?? 0)));
  const moveProxy = vix * 0.85;
  return {
    score: clamp(vix * 2.2 + realized * 5),
    labelJa: 'ボラティリティ',
    detailJa: `VIX ${vix.toFixed(1)} · 実現ボラ目安 ${realized.toFixed(2)}% · MOVEプロキシ ${moveProxy.toFixed(1)}`,
    ruleBasisJa: 'VIX + 指数変化率平均',
  };
}

function buildCreditStress(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const bank = sectorChange(g, 'banking') ?? 0;
  const vix = vixValue(g);
  const hyProxy = clamp(vix * 1.5 + Math.max(0, -bank) * 10);
  return {
    score: hyProxy,
    labelJa: 'クレジットストレス',
    detailJa: `HYスプレッドプロキシ ${hyProxy} · 銀行セクター ${bank.toFixed(2)}%（CDS未取得）`,
    ruleBasisJa: 'VIX + 銀行セクター',
  };
}

function buildGeopolitical(g: GlobalMarketAnalysisBundle): MacroEngineScore {
  const text = [...g.macroContextBulletsJa, ...g.marketWideFactorsJa].join(' ');
  const keys = [
    { re: /戦争|war|紛争/i, label: '戦争リスク' },
    { re: /制裁|sanction/i, label: '制裁' },
    { re: /台湾|Taiwan/i, label: '台湾海峡' },
    { re: /中東|Middle East|ホルムズ/i, label: '中東' },
    { re: /海運|shipping|赤海/i, label: '海運リスク' },
  ];
  const hits = keys.filter((k) => k.re.test(text)).map((k) => k.label);
  const score = clamp(hits.length * 22 + (g.marketScores.marketRiskScore > 70 ? 15 : 0));
  return {
    score,
    labelJa: '地政学',
    detailJa: hits.length > 0 ? hits.join('、') : 'キーワード未検出 — 低〜中',
    ruleBasisJa: 'マクロ文言の決定論的キーワード',
  };
}

function buildSectorRotation(g: GlobalMarketAnalysisBundle): SectorRotationItem[] {
  const map: Record<string, string> = {
    tech: 'テック',
    energy: 'エネルギー',
    banking: '銀行',
    healthcare: 'ヘルスケア',
    semiconductor: '半導体/AI',
    consumer: '消費',
    reit: 'ユーティリティ/REIT',
  };
  return [...g.sectors]
    .sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999))
    .map((s) => ({
      sectorId: s.id,
      labelJa: map[s.id] ?? s.labelJa,
      flowJa:
        (s.changePct ?? 0) > 0.5
          ? '資金流入'
          : (s.changePct ?? 0) < -0.5
            ? '資金流出'
            : '中立',
      momentumScore: s.momentumScore,
    }));
}

function buildNarratives(
  g: GlobalMarketAnalysisBundle,
  world: MacroWorldRegimeId,
): MacroNarrativeItem[] {
  const text = [...g.macroContextBulletsJa, ...g.marketWideFactorsJa].join(' ');
  const semi = sectorChange(g, 'semiconductor') ?? 0;
  const items: MacroNarrativeItem[] = [
    {
      id: 'ai_boom',
      labelJa: 'AIブーム',
      active: semi > 0.8 || /AI|半導体/i.test(text),
      strength: clamp(50 + semi * 15),
      noteJa: `半導体セクター ${semi.toFixed(2)}%`,
    },
    {
      id: 'rate_cuts',
      labelJa: '利下げ期待',
      active: (us10y(g).changePct ?? 0) < -0.05,
      strength: clamp(40 + Math.abs(Math.min(0, us10y(g).changePct ?? 0)) * 200),
      noteJa: '10年金利低下でルール検出',
    },
    {
      id: 'stagflation',
      labelJa: 'スタグフレ',
      active: world === 'inflation' && g.marketScores.momentumScore < 45,
      strength: 65,
      noteJa: 'インフレ圧力+成長鈍化',
    },
    {
      id: 'deglobalization',
      labelJa: 'デグローバル',
      active: /中国|制裁|supply chain/i.test(text),
      strength: 55,
      noteJa: '地政学・サプライチェーン文言',
    },
  ];
  return items;
}

function buildFragility(g: GlobalMarketAnalysisBundle, world: MacroWorldRegimeId): MacroEngineScore {
  const semi = sectorChange(g, 'semiconductor') ?? 0;
  const crowded = semi > 2 && g.marketScores.momentumScore > 60;
  const leverage = vixValue(g) < 18 && g.marketScores.momentumScore > 65;
  let score = 30;
  if (crowded) score += 30;
  if (leverage) score += 25;
  if (world === 'euphoric') score += 20;
  return {
    score: clamp(score),
    labelJa: '脆弱性',
    detailJa: crowded
      ? '半導体/AIの過集中（クラウデッド）'
      : leverage
        ? '低VIX+高モメンタム — レバレッジリスク'
        : '目立った集中なし',
    ruleBasisJa: 'セクター集中+ボラ+レジーム',
  };
}

function buildCorrelationMatrix(g: GlobalMarketAnalysisBundle): CorrelationMatrixCell[] {
  const cells: CorrelationMatrixCell[] = [];
  for (const c of g.correlations) {
    cells.push({
      assetA: c.pairLabelJa.split('↔')[0]?.trim() ?? c.pairLabelJa,
      assetB: c.pairLabelJa.split('↔')[1]?.trim() ?? '',
      hintJa: c.correlationHintJa,
      strength: c.strength,
    });
  }
  const nasdaq = indexChange(g, 'nasdaq') ?? 0;
  const dxy = forexChange(g, 'dxy') ?? 0;
  cells.push({
    assetA: '株式',
    assetB: '債券(プロキシ)',
    hintJa: `Nasdaq ${nasdaq.toFixed(2)}% vs 金利変化 ${us10y(g).changePct?.toFixed(2) ?? '—'}%`,
    strength: nasdaq > 0 && (us10y(g).changePct ?? 0) < 0 ? 'strong' : 'moderate',
  });
  cells.push({
    assetA: '金(プロキシ)',
    assetB: 'USD',
    hintJa: `DXY ${dxy.toFixed(2)}% — ドル高は金に逆風になりやすい`,
    strength: Math.abs(dxy) > 0.4 ? 'moderate' : 'weak',
  });
  return cells.slice(0, 8);
}

function buildRegionalHeatmap(g: GlobalMarketAnalysisBundle): MacroHeatmapRegion[] {
  const us = avg(
    g.indices.filter((i) => i.region === 'us' && i.changePct != null).map((i) => i.changePct!),
  );
  const jp = indexChange(g, 'nikkei225') ?? 0;
  const asean = indexChange(g, 'klci') ?? 0;
  const chinaProxy = /中国|China/i.test(g.macroContextBulletsJa.join(' ')) ? -0.8 : 0;
  return [
    {
      regionId: 'us',
      labelJa: '米国',
      stressScore: clamp(g.marketScores.marketRiskScore),
      changeHintJa: `${us >= 0 ? '+' : ''}${us.toFixed(2)}%`,
    },
    {
      regionId: 'china',
      labelJa: '中国',
      stressScore: clamp(50 + Math.abs(chinaProxy) * 20),
      changeHintJa: 'マクロ文言プロキシ',
    },
    {
      regionId: 'japan',
      labelJa: '日本',
      stressScore: clamp(45 + Math.abs(jp) * 8),
      changeHintJa: `${jp >= 0 ? '+' : ''}${jp.toFixed(2)}%`,
    },
    {
      regionId: 'asean',
      labelJa: 'ASEAN',
      stressScore: clamp(40 + Math.abs(asean) * 10),
      changeHintJa: `KLCI ${asean.toFixed(2)}%`,
    },
    {
      regionId: 'europe',
      labelJa: '欧州',
      stressScore: clamp(g.marketScores.marketRiskScore * 0.9),
      changeHintJa: '直接指数未取得 — 米リスク連動',
    },
  ];
}

function buildIntegration(
  world: MacroWorldRegimeId,
  g: GlobalMarketAnalysisBundle,
  macroScore: number,
  stressScore: number,
  explainJa: string,
): MacroIntelligenceBundle['integration'] {
  const mapped = mapToConciergeRegime(world);
  const forceEmergency =
    world === 'panic' || world === 'liquidity_crisis' || stressScore >= 75;
  const forceDefensive =
    forceEmergency || world === 'recession' || world === 'risk_off' || stressScore >= 62;
  let tactical: TacticalMode = 'balanced';
  if (forceDefensive) tactical = 'defensive';
  else if (world === 'risk_on' || world === 'euphoric') tactical = 'aggressive';

  const metaMult =
    world === 'panic' || world === 'liquidity_crisis'
      ? 1.25
      : world === 'risk_off'
        ? 1.1
        : world === 'euphoric'
          ? 0.92
          : 1;

  const summaryParts = [
    `世界状態: ${MACRO_WORLD_REGIME_LABEL_JA[world]}`,
    `Macro ${macroScore}/100 · ストレス ${stressScore}`,
    g.regimeSummaryJa,
  ];

  return {
    metaWeightMultiplier: metaMult,
    forceEmergencyMode: forceEmergency,
    forceDefensiveStrategy: forceDefensive,
    recommendedTacticalMode: tactical,
    mappedConciergeRegimeId: mapped,
    opportunityFilterNoteJa: forceDefensive
      ? 'マクロ逆風 — 買い候補を抑制（ルール）'
      : null,
    macroSummaryJa: summaryParts.join(' — '),
    explainRegimeJa: explainJa,
  };
}

export function buildMacroIntelligenceBundle(
  state: MacroIntelligencePersisted,
  input: BuildMacroIntelligenceInput,
): { bundle: MacroIntelligenceBundle; state: MacroIntelligencePersisted } {
  const g = input.globalMarket;
  const world = classifyWorldRegime(g);
  const liquidity = buildLiquidity(g);
  const stressScore = clamp(
    (g.marketScores.marketRiskScore +
      liquidity.score +
      buildCreditStress(g).score +
      buildVolatility(g).score) /
      4,
  );
  const macroScore = clamp(100 - stressScore * 0.65 + g.marketScores.momentumScore * 0.35);

  const fearGreed = clamp(100 - g.marketScores.fearScore);
  const euphoria = fearGreed >= FEAR_GREED_EUPHORIA || world.id === 'euphoric';
  const capitulation = fearGreed <= FEAR_GREED_CAPITULATION || world.id === 'panic';

  const narratives = buildNarratives(g, world.id);
  const rotation = buildSectorRotation(g);
  const inflow = rotation.filter((r) => r.flowJa === '資金流入').map((r) => r.labelJa);
  const outflow = rotation.filter((r) => r.flowJa === '資金流出').map((r) => r.labelJa);
  const capitalFlowMapJa = `流入: ${inflow.join('、') || '—'} → 流出: ${outflow.join('、') || '—'}`;

  const reflexivityNoteJa =
    g.marketScores.momentumScore > 60 && fearGreed > 55
      ? '価格上昇→期待上昇の反射ループが働きやすい（ルール判定）'
      : '反射ループは限定的';

  const exhausted = narratives.filter((n) => n.active && n.strength < 45);
  const narrativeExhaustionJa =
    exhausted.length > 0 ? `${exhausted.map((n) => n.labelJa).join('、')} — テーマ疲労の疑い` : null;

  const timelinePoint = {
    at: new Date().toISOString(),
    regimeId: world.id,
    macroScore,
  };
  let working = {
    ...state,
    regimeTimeline: appendRegimeTimeline(state.regimeTimeline, timelinePoint),
    lastNarrativeIds: narratives.filter((n) => n.active).map((n) => n.id),
  };

  const macroReplay: MacroReplayItem[] = working.regimeTimeline
    .slice(-5)
    .reverse()
    .map((p, i) => ({
      labelJa: i === 0 ? '直近' : `${i + 1}世代前`,
      regimeId: p.regimeId,
      summaryJa: `${MACRO_WORLD_REGIME_LABEL_JA[p.regimeId]} · Macro ${p.macroScore}`,
    }));

  const integration = buildIntegration(world.id, g, macroScore, stressScore, world.explainJa);

  const bundle: MacroIntelligenceBundle = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: MACRO_INTEL_REGULATORY_BANNER_JA,
    insufficientData: g.insufficientData,
    worldRegime: {
      id: world.id,
      labelJa: MACRO_WORLD_REGIME_LABEL_JA[world.id],
      confidencePct: world.confidencePct,
      summaryJa: world.summaryJa,
    },
    macroScore,
    stressScore,
    liquidity,
    centralBanks: buildCentralBanks(g),
    yieldCurve: buildYieldCurve(g),
    inflation: buildInflation(g),
    currencyStress: buildCurrencyStress(g),
    commodityRegime: buildCommodity(g),
    volatility: buildVolatility(g),
    creditStress: buildCreditStress(g),
    geopolitical: buildGeopolitical(g),
    sectorRotation: rotation,
    smartMoney: {
      score: clamp(50 + (rotation[0]?.momentumScore ?? 50) * 0.3),
      labelJa: 'スマートマネー',
      detailJa: `主導セクター ${rotation[0]?.labelJa ?? '—'} — インサイダー/ETFフローは未取得`,
      ruleBasisJa: 'セクター主導+リーダーシップ',
    },
    retailMania: {
      score: euphoria ? 72 : clamp(g.marketScores.momentumScore * 0.5),
      labelJa: 'リテール過熱',
      detailJa: euphoria ? '熱狂スコア — ミーム/オプション過熱警戒' : '過熱限定的',
      ruleBasisJa: 'fear/greed + euphoricレジーム',
    },
    safeHavenFlow: {
      score: clamp(g.marketScores.fearScore * 0.7),
      labelJa: 'セーフヘイブン',
      detailJa:
        g.marketScores.fearScore > 55
          ? '金・債券・USDへの逃避（恐怖高）'
          : 'リスク資産優先',
      ruleBasisJa: 'fearScore',
    },
    correlations: buildCorrelationMatrix(g),
    narratives,
    fragility: buildFragility(g, world.id),
    earningsMacro: {
      score: clamp(40 + (g.marketScores.momentumScore < 45 ? 25 : 0)),
      labelJa: '決算マクロ',
      detailJa:
        g.marketScores.momentumScore < 45
          ? '需要鈍化・ガイダンス下方圧力の疑い'
          : '決算シーズン — 個別差が拡大',
      ruleBasisJa: 'モメンタム+マクロ文言',
    },
    fearGreedScore: fearGreed,
    euphoriaAlert: euphoria,
    capitulationAlert: capitulation,
    reflexivityNoteJa,
    narrativeExhaustionJa,
    attentionThemesJa: narratives.filter((n) => n.active).map((n) => n.labelJa),
    crowdPositioningJa:
      fearGreed > 65
        ? '大衆は強気寄り — 逆張り警戒'
        : fearGreed < 35
          ? '大衆は恐怖寄り — 売られ過ぎ監視'
          : '中立〜やや強気',
    capitalFlowMapJa,
    macroRiskRadarJa: buildGeopolitical(g).score >= 40
      ? buildGeopolitical(g).detailJa
      : buildCreditStress(g).score >= 55
        ? buildCreditStress(g).detailJa
        : world.summaryJa,
    regionalHeatmap: buildRegionalHeatmap(g),
    regimeTimeline: working.regimeTimeline.slice(-8),
    macroReplay,
    integration,
  };

  return { bundle, state: working };
}

export async function refreshMacroIntelligenceBundle(
  input: BuildMacroIntelligenceInput,
): Promise<MacroIntelligenceBundle> {
  const loaded = await loadMacroIntelligenceState();
  const { bundle, state } = buildMacroIntelligenceBundle(loaded, input);
  await saveMacroIntelligenceState(state);
  return bundle;
}
