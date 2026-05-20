import {
  ALLOCATION_BLOCK_SCORE,
  ALPHA_DECAY_SHARPE_DROP,
  CRISIS_DEFENSIVE_BOOST_PCT,
  CRISIS_REGIMES,
  DIVERSIFICATION_PASS,
  DRAWDOWN_THROTTLE_PCT,
  KELLY_CAP_FRACTION,
  LIVE_SHADOW_DIVERGENCE_PCT,
  MAX_STRATEGY_CONCENTRATION_PCT,
  MIN_CASH_CRISIS_PCT,
  MIN_CASH_NORMAL_PCT,
  REGIME_STRATEGY_PRIOR,
  STRATEGY_LABEL,
  STRATEGY_STRUCTURAL_CORR,
  THROTTLE_FACTOR_MIN,
  TURNOVER_PENALTY_L1,
} from '../constants/metaCapital';
import type {
  MetaCapitalAlert,
  MetaCapitalInput,
  MetaCapitalReport,
  MetaCapitalSeverity,
  StrategyCapitalSlice,
  StrategyId,
  StrategyMetrics,
} from '../types/metaCapital';

const ALL_STRATEGIES: StrategyId[] = [
  'core_equity',
  'adaptive_alpha',
  'shadow_research',
  'bayesian_blend',
  'defensive_cash',
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getMetric(metrics: StrategyMetrics[], id: StrategyId): StrategyMetrics {
  return (
    metrics.find((m) => m.strategyId === id) ?? {
      strategyId: id,
      returnEwmaPct: 0,
      drawdownPct: 0,
      sharpeProxy: 0.5,
      turnoverPct30d: 0,
    }
  );
}

function structuralCorr(a: StrategyId, b: StrategyId): number {
  if (a === b) return 1;
  return (
    STRATEGY_STRUCTURAL_CORR[a]?.[b] ??
    STRATEGY_STRUCTURAL_CORR[b]?.[a] ??
    0.25
  );
}

function computeRawScores(input: MetaCapitalInput): Map<StrategyId, number> {
  const priors = REGIME_STRATEGY_PRIOR[input.regime.regimeId] ?? {};
  const scores = new Map<StrategyId, number>();

  for (const id of ALL_STRATEGIES) {
    const m = getMetric(input.strategyMetrics, id);
    const boost = priors[id] ?? 1;
    const retScore = clamp(50 + m.returnEwmaPct * 8, 0, 100);
    const sharpeScore = clamp(m.sharpeProxy * 40, 0, 100);
    const ddPenalty = clamp(m.drawdownPct * 3, 0, 40);
    const turnoverPenalty = clamp(m.turnoverPct30d * 0.5, 0, 20);
    let base =
      id === 'defensive_cash'
        ? 40 + (input.cashBalanceMYR / Math.max(input.totalCapitalMYR, 1)) * 30
        : retScore * 0.35 + sharpeScore * 0.45 - ddPenalty - turnoverPenalty;
    if (input.metaRobustnessScore != null && id !== 'defensive_cash') {
      base *= 0.7 + (input.metaRobustnessScore / 100) * 0.3;
    }
    scores.set(id, Math.max(5, base * boost));
  }
  return scores;
}

function normalizeToPct(scores: Map<StrategyId, number>): Map<StrategyId, number> {
  const sum = [...scores.values()].reduce((a, b) => a + b, 0);
  const out = new Map<StrategyId, number>();
  for (const [id, s] of scores) {
    out.set(id, (s / Math.max(sum, 1e-6)) * 100);
  }
  return out;
}

function applyConcentrationCap(pcts: Map<StrategyId, number>): Map<StrategyId, number> {
  const out = new Map(pcts);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, pct] of out) {
      if (pct > MAX_STRATEGY_CONCENTRATION_PCT) {
        const excess = pct - MAX_STRATEGY_CONCENTRATION_PCT;
        out.set(id, MAX_STRATEGY_CONCENTRATION_PCT);
        const others = [...out.entries()].filter(([k]) => k !== id);
        const otherSum = others.reduce((s, [, v]) => s + v, 0);
        if (otherSum > 0) {
          for (const [oid, ov] of others) {
            out.set(oid, ov + (excess * ov) / otherSum);
          }
        }
        changed = true;
      }
    }
  }
  const sum = [...out.values()].reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const [id, v] of out) out.set(id, (v / sum) * 100);
  }
  return out;
}

function applyDrawdownThrottles(
  pcts: Map<StrategyId, number>,
  metrics: StrategyMetrics[],
): { pcts: Map<StrategyId, number>; throttles: MetaCapitalReport['drawdownThrottles'] } {
  const out = new Map(pcts);
  const throttles: MetaCapitalReport['drawdownThrottles'] = [];
  for (const m of metrics) {
    if (m.strategyId === 'defensive_cash') continue;
    const active = m.drawdownPct >= DRAWDOWN_THROTTLE_PCT;
    const factor = active
      ? clamp(1 - (m.drawdownPct - DRAWDOWN_THROTTLE_PCT) / 30, THROTTLE_FACTOR_MIN, 1)
      : 1;
    if (active) {
      const cur = out.get(m.strategyId) ?? 0;
      const trimmed = cur * factor;
      const freed = cur - trimmed;
      out.set(m.strategyId, trimmed);
      out.set('defensive_cash', (out.get('defensive_cash') ?? 0) + freed);
    }
    throttles.push({
      strategyId: m.strategyId,
      drawdownPct: Math.round(m.drawdownPct * 10) / 10,
      throttleFactor: Math.round(factor * 100) / 100,
      active,
      noteJa: active
        ? `${STRATEGY_LABEL[m.strategyId]} DD ${m.drawdownPct.toFixed(1)}% — 係数 ${factor.toFixed(2)}`
        : `${STRATEGY_LABEL[m.strategyId]} — スロットルなし`,
    });
  }
  const sum = [...out.values()].reduce((a, b) => a + b, 0);
  if (sum > 0) for (const [id, v] of out) out.set(id, (v / sum) * 100);
  return { pcts: out, throttles };
}

function applyCrisisOverride(
  pcts: Map<StrategyId, number>,
  regimeId: MetaCapitalInput['regime']['regimeId'],
): { pcts: Map<StrategyId, number>; crisis: MetaCapitalReport['crisisOverride'] } {
  const active = CRISIS_REGIMES.includes(regimeId);
  if (!active) {
    return {
      pcts,
      crisis: {
        active: false,
        defensiveBoostPct: 0,
        equityTrimPct: 0,
        noteJa: '危機オーバーライドなし',
      },
    };
  }
  const out = new Map(pcts);
  const equityIds: StrategyId[] = ['core_equity', 'adaptive_alpha', 'shadow_research', 'bayesian_blend'];
  let trimTotal = 0;
  for (const id of equityIds) {
    const cur = out.get(id) ?? 0;
    const trim = (cur * CRISIS_DEFENSIVE_BOOST_PCT) / 100;
    out.set(id, cur - trim);
    trimTotal += trim;
  }
  out.set('defensive_cash', (out.get('defensive_cash') ?? 0) + trimTotal);
  const sum = [...out.values()].reduce((a, b) => a + b, 0);
  if (sum > 0) for (const [id, v] of out) out.set(id, (v / sum) * 100);
  return {
    pcts: out,
    crisis: {
      active: true,
      defensiveBoostPct: CRISIS_DEFENSIVE_BOOST_PCT,
      equityTrimPct: Math.round(trimTotal * 10) / 10,
      noteJa: `危機配分 — 防衛キャッシュ +${CRISIS_DEFENSIVE_BOOST_PCT}%相当`,
    },
  };
}

function toSlices(
  pcts: Map<StrategyId, number>,
  totalMYR: number,
  dynamicWeights: MetaCapitalReport['dynamicWeighting']['weights'],
): StrategyCapitalSlice[] {
  return ALL_STRATEGIES.map((id) => {
    const pct = Math.round((pcts.get(id) ?? 0) * 10) / 10;
    const dw = dynamicWeights.find((w) => w.strategyId === id);
    const m = dw?.weightPct ?? pct;
    return {
      strategyId: id,
      labelJa: STRATEGY_LABEL[id],
      targetPct: pct,
      capitalMYR: Math.round((totalMYR * pct) / 100),
      dynamicWeight: dw?.weightPct ?? pct,
      confidence: clamp(m / 100, 0.2, 1),
    };
  });
}

function buildCrossCorrelation(): MetaCapitalReport['crossStrategyCorrelation'] {
  const pairs: MetaCapitalReport['crossStrategyCorrelation']['matrix'] = [];
  let maxCorr = 0;
  for (let i = 0; i < ALL_STRATEGIES.length; i++) {
    for (let j = i + 1; j < ALL_STRATEGIES.length; j++) {
      const a = ALL_STRATEGIES[i];
      const b = ALL_STRATEGIES[j];
      const c = structuralCorr(a, b);
      maxCorr = Math.max(maxCorr, Math.abs(c));
      pairs.push({ a, b, correlation: Math.round(c * 100) / 100 });
    }
  }
  return {
    matrix: pairs,
    maxCorrelation: Math.round(maxCorr * 100) / 100,
    noteJa:
      maxCorr > 0.65
        ? `戦略相関高 — 最大 ${maxCorr.toFixed(2)}`
        : `戦略相関 — 最大 ${maxCorr.toFixed(2)}`,
  };
}

function buildAlphaDecay(metrics: StrategyMetrics[]): MetaCapitalReport['alphaDecay'] {
  return metrics
    .filter((m) => m.strategyId !== 'defensive_cash')
    .map((m) => {
      const drop = m.sharpeProxy < ALPHA_DECAY_SHARPE_DROP;
      const decayScore = Math.round(clamp((0.5 - m.sharpeProxy) * 120, 0, 100));
      return {
        strategyId: m.strategyId,
        decayScore,
        rollingSharpe: Math.round(m.sharpeProxy * 100) / 100,
        priorSharpe: Math.round((m.sharpeProxy + 0.15) * 100) / 100,
        noteJa: drop
          ? `${STRATEGY_LABEL[m.strategyId]} — アルファ減衰 ${decayScore}`
          : `${STRATEGY_LABEL[m.strategyId]} — アルファ安定`,
      };
    });
}

function buildAttribution(
  slices: StrategyCapitalSlice[],
  metrics: StrategyMetrics[],
): MetaCapitalReport['performanceAttribution'] {
  return slices
    .filter((s) => s.strategyId !== 'defensive_cash')
    .map((s) => {
      const m = getMetric(metrics, s.strategyId);
      return {
        strategyId: s.strategyId,
        labelJa: s.labelJa,
        returnContributionPct: Math.round(m.returnEwmaPct * s.targetPct * 10) / 1000,
        weightPct: s.targetPct,
      };
    });
}

function herfindahl(pcts: number[]): number {
  return pcts.reduce((s, p) => s + (p / 100) ** 2, 0);
}

function buildShadowSim(
  livePcts: Map<StrategyId, number>,
  totalMYR: number,
  disagreement?: number,
): MetaCapitalReport['shadowSimulation'] {
  const shadow = new Map(livePcts);
  const shift = (disagreement ?? 20) / 500;
  for (const id of ALL_STRATEGIES) {
    if (id === 'defensive_cash') {
      shadow.set(id, (shadow.get(id) ?? 0) * (1 + shift));
    } else if (id === 'shadow_research') {
      shadow.set(id, (shadow.get(id) ?? 0) * (1 + shift * 2));
    } else {
      shadow.set(id, (shadow.get(id) ?? 0) * (1 - shift * 0.5));
    }
  }
  const sum = [...shadow.values()].reduce((a, b) => a + b, 0);
  if (sum > 0) for (const [id, v] of shadow) shadow.set(id, (v / sum) * 100);

  const slices = ALL_STRATEGIES.map((id) => ({
    strategyId: id,
    labelJa: STRATEGY_LABEL[id],
    targetPct: Math.round((shadow.get(id) ?? 0) * 10) / 10,
    capitalMYR: Math.round((totalMYR * (shadow.get(id) ?? 0)) / 100),
    dynamicWeight: shadow.get(id) ?? 0,
    confidence: 0.75,
  }));

  return {
    slices,
    totalMYR,
    noteJa: 'シャドー・アロケーター — 乖離・減衰を織り込んだ配分',
  };
}

function buildExposureOverlaps(): MetaCapitalReport['exposureOverlaps'] {
  const pairs: [StrategyId, StrategyId][] = [
    ['core_equity', 'bayesian_blend'],
    ['core_equity', 'adaptive_alpha'],
    ['adaptive_alpha', 'shadow_research'],
  ];
  return pairs.map(([a, b]) => {
    const overlap = Math.abs(structuralCorr(a, b)) * 85;
    return {
      strategyA: a,
      strategyB: b,
      overlapPct: Math.round(overlap),
      noteJa: `${STRATEGY_LABEL[a]} × ${STRATEGY_LABEL[b]} — 露出重複 ~${overlap.toFixed(0)}%`,
    };
  });
}

function collectAlerts(parts: {
  concentration: MetaCapitalReport['concentrationLimits'];
  disagreement: MetaCapitalReport['ensembleDisagreement'];
  diversification: number;
  preservation: MetaCapitalReport['capitalPreservation'];
  crisis: MetaCapitalReport['crisisOverride'];
}): MetaCapitalAlert[] {
  const alerts: MetaCapitalAlert[] = [];
  const add = (id: string, severity: MetaCapitalSeverity, titleJa: string, detailJa: string) => {
    alerts.push({ id, severity, titleJa, detailJa });
  };
  if (parts.concentration.breached) {
    add('concentration', 'high', '集中上限', parts.concentration.noteJa);
  }
  if (parts.disagreement.score > 55) {
    add('disagree', 'watch', 'アンサンブル不一致', parts.disagreement.noteJa);
  }
  if (parts.diversification < DIVERSIFICATION_PASS) {
    add('diversify', 'watch', '分散不足', `分散スコア ${parts.diversification}`);
  }
  if (parts.preservation.preservationActive) {
    add('preserve', 'critical', '資本保全', parts.preservation.noteJa);
  }
  if (parts.crisis.active) {
    add('crisis', 'watch', '危機配分', parts.crisis.noteJa);
  }
  return alerts;
}

export function buildMetaCapitalReport(input: MetaCapitalInput): MetaCapitalReport {
  const total = Math.max(input.totalCapitalMYR, 1);
  const rawScores = computeRawScores(input);
  let pcts = normalizeToPct(rawScores);

  const dynamicWeighting: MetaCapitalReport['dynamicWeighting'] = {
    weights: ALL_STRATEGIES.map((id) => ({
      strategyId: id,
      labelJa: STRATEGY_LABEL[id],
      weightPct: Math.round((pcts.get(id) ?? 0) * 10) / 10,
      regimeBoost: REGIME_STRATEGY_PRIOR[input.regime.regimeId]?.[id] ?? 1,
    })),
    noteJa: `動的重み — レジーム ${input.regime.labelJa}`,
  };

  pcts = applyConcentrationCap(pcts);
  const throttleResult = applyDrawdownThrottles(pcts, input.strategyMetrics);
  pcts = throttleResult.pcts;
  const crisisResult = applyCrisisOverride(pcts, input.regime.regimeId);
  pcts = crisisResult.pcts;

  const cashPct = (input.cashBalanceMYR / total) * 100;
  const minCash = CRISIS_REGIMES.includes(input.regime.regimeId)
    ? MIN_CASH_CRISIS_PCT
    : MIN_CASH_NORMAL_PCT;
  if (cashPct < minCash) {
    const need = minCash - cashPct;
    const equityIds: StrategyId[] = ['core_equity', 'adaptive_alpha', 'bayesian_blend'];
    let freed = 0;
    for (const id of equityIds) {
      const cur = pcts.get(id) ?? 0;
      const cut = Math.min(cur, need - freed);
      pcts.set(id, cur - cut);
      freed += cut;
      if (freed >= need) break;
    }
    pcts.set('defensive_cash', (pcts.get('defensive_cash') ?? 0) + freed);
    const sum = [...pcts.values()].reduce((a, b) => a + b, 0);
    if (sum > 0) for (const [id, v] of pcts) pcts.set(id, (v / sum) * 100);
  }

  const slices = toSlices(pcts, total, dynamicWeighting.weights);
  const shadowSimulation = buildShadowSim(pcts, total, input.disagreementScore);

  const liveVsShadowL1 = ALL_STRATEGIES.reduce(
    (s, id) =>
      s +
      Math.abs((pcts.get(id) ?? 0) - (shadowSimulation.slices.find((x) => x.strategyId === id)?.targetPct ?? 0)),
    0,
  );
  const ensembleDisagreement: MetaCapitalReport['ensembleDisagreement'] = {
    score: Math.round(
      clamp(liveVsShadowL1 * 1.5 + (input.disagreementScore ?? 0) * 0.4, 0, 100),
    ),
    liveVsShadowL1Pct: Math.round(liveVsShadowL1 * 10) / 10,
    noteJa:
      liveVsShadowL1 >= LIVE_SHADOW_DIVERGENCE_PCT
        ? `ライブ/シャドー乖離 L1 ${liveVsShadowL1.toFixed(1)}%`
        : `アンサンブル整合 L1 ${liveVsShadowL1.toFixed(1)}%`,
  };

  const pctArr = slices.map((s) => s.targetPct);
  const hhi = herfindahl(pctArr);
  const effN = hhi > 0 ? 1 / hhi : ALL_STRATEGIES.length;
  const diversificationScore = Math.round(clamp(effN * 22 + (1 - hhi) * 40, 0, 100));
  const strategyDiversification: MetaCapitalReport['strategyDiversification'] = {
    score: diversificationScore,
    effectiveStrategies: Math.round(effN * 10) / 10,
    herfindahl: Math.round(hhi * 1000) / 1000,
    noteJa: `戦略分散 ${diversificationScore} — 実効 ${effN.toFixed(1)} 戦略`,
  };

  const top = [...slices].sort((a, b) => b.targetPct - a.targetPct)[0];
  const concentrationLimits: MetaCapitalReport['concentrationLimits'] = {
    maxStrategyPct: MAX_STRATEGY_CONCENTRATION_PCT,
    breached: (top?.targetPct ?? 0) >= MAX_STRATEGY_CONCENTRATION_PCT - 0.5,
    topStrategyId: top?.strategyId ?? 'core_equity',
    topStrategyPct: top?.targetPct ?? 0,
    noteJa: `最大戦略 ${top?.labelJa} ${top?.targetPct}% / 上限 ${MAX_STRATEGY_CONCENTRATION_PCT}%`,
  };

  const sorted = [...dynamicWeighting.weights].sort((a, b) => b.weightPct - a.weightPct);
  const regimeSwitch: MetaCapitalReport['regimeSwitch'] = {
    regimeId: input.regime.regimeId,
    primaryStrategy: sorted[0]?.strategyId ?? 'core_equity',
    secondaryStrategy: sorted[1]?.strategyId ?? 'defensive_cash',
    suppressed: sorted.slice(-2).map((s) => s.strategyId),
    noteJa: `主: ${sorted[0]?.labelJa} · 副: ${sorted[1]?.labelJa}`,
  };

  const avgSharpe =
    input.strategyMetrics
      .filter((m) => m.strategyId !== 'defensive_cash')
      .reduce((s, m) => s + m.sharpeProxy, 0) / 4;
  const metaKellyCap: MetaCapitalReport['metaKellyCap'] = {
    rawKellyFraction: Math.round(avgSharpe * KELLY_CAP_FRACTION * 100) / 100,
    cappedFraction: Math.round(clamp(avgSharpe * KELLY_CAP_FRACTION, 0.05, KELLY_CAP_FRACTION) * 100) / 100,
    capLimit: KELLY_CAP_FRACTION,
    noteJa: `メタKelly — 上限 ${(KELLY_CAP_FRACTION * 100).toFixed(0)}% · 実効 ${(clamp(avgSharpe * KELLY_CAP_FRACTION, 0.05, KELLY_CAP_FRACTION) * 100).toFixed(0)}%`,
  };

  const last = input.controlState?.lastSlices ?? [];
  const turnoverL1 = last.length
    ? slices.reduce(
        (s, sl) =>
          s + Math.abs(sl.targetPct - (last.find((l) => l.strategyId === sl.strategyId)?.targetPct ?? 0)),
        0,
      )
    : 0;
  const turnoverPenalty: MetaCapitalReport['turnoverPenalty'] = {
    turnoverL1Pct: Math.round(turnoverL1 * 10) / 10,
    penaltyScore: Math.round(clamp(turnoverL1 * 3, 0, 100)),
    noteJa:
      turnoverL1 > TURNOVER_PENALTY_L1
        ? `ターンオーバー罰 — L1 ${turnoverL1.toFixed(1)}%`
        : `ターンオーバー ${turnoverL1.toFixed(1)}% — 平常`,
  };

  const worst = input.strategyMetrics
    .filter((m) => m.strategyId !== 'defensive_cash')
    .sort((a, b) => a.returnEwmaPct - b.returnEwmaPct)[0];
  const capitalRecycling: MetaCapitalReport['capitalRecycling'] = {
    active: worst != null && worst.returnEwmaPct < -1,
    fromStrategy: worst?.strategyId ?? 'adaptive_alpha',
    toStrategy: 'defensive_cash',
    recycledPct: worst != null && worst.returnEwmaPct < -1 ? 5 : 0,
    noteJa:
      worst != null && worst.returnEwmaPct < -1
        ? `${STRATEGY_LABEL[worst.strategyId]} → キャッシュへリサイクル`
        : 'リサイクル不要',
  };

  const confidenceCalibration: MetaCapitalReport['confidenceCalibration'] = slices.map((s) => {
    const m = getMetric(input.strategyMetrics, s.strategyId);
    const cal = clamp(m.sharpeProxy, 0.2, 1);
    const gap = s.targetPct - cal * 100;
    return {
      strategyId: s.strategyId,
      allocatedPct: s.targetPct,
      calibratedConfidence: Math.round(cal * 100),
      gapPct: Math.round(gap * 10) / 10,
      noteJa:
        Math.abs(gap) > 15
          ? `${s.labelJa} — 配分/信頼ギャップ ${gap > 0 ? '+' : ''}${gap.toFixed(1)}%`
          : `${s.labelJa} — キャリブレーションOK`,
    };
  });

  const capitalPreservation: MetaCapitalReport['capitalPreservation'] = {
    priorityScore: Math.round(clamp(100 - cashPct + minCash, 0, 100)),
    minCashTargetPct: minCash,
    currentCashPct: Math.round(cashPct * 10) / 10,
    preservationActive: cashPct < minCash - 2,
    noteJa:
      cashPct < minCash
        ? `資本保全 — 現金 ${cashPct.toFixed(1)}% < 目標 ${minCash}%`
        : `現金 ${cashPct.toFixed(1)}% — 保全目標クリア`,
  };

  const alerts = collectAlerts({
    concentration: concentrationLimits,
    disagreement: ensembleDisagreement,
    diversification: diversificationScore,
    preservation: capitalPreservation,
    crisis: crisisResult.crisis,
  });

  const allocationAllowed =
    diversificationScore >= ALLOCATION_BLOCK_SCORE &&
    !capitalPreservation.preservationActive &&
    ensembleDisagreement.score < 75;

  let healthStatus: 'green' | 'yellow' | 'red' = 'green';
  if (!allocationAllowed) healthStatus = 'red';
  else if (diversificationScore < DIVERSIFICATION_PASS || alerts.some((a) => a.severity === 'high')) {
    healthStatus = 'yellow';
  }

  const verdictJa = allocationAllowed
    ? `メタ資本配分 — 分散 ${diversificationScore} · ${regimeSwitch.primaryStrategy}主導`
    : healthStatus === 'red'
      ? alerts.find((a) => a.severity === 'critical')?.titleJa ?? '配分抑制'
      : '監視 — 戦略集中/乖離に注意';

  return {
    generatedAt: new Date().toISOString(),
    strategyAllocation: slices,
    dynamicWeighting,
    crossStrategyCorrelation: buildCrossCorrelation(),
    concentrationLimits,
    drawdownThrottles: throttleResult.throttles,
    regimeSwitch,
    alphaDecay: buildAlphaDecay(input.strategyMetrics),
    performanceAttribution: buildAttribution(slices, input.strategyMetrics),
    ensembleDisagreement,
    strategyDiversification,
    metaKellyCap,
    turnoverPenalty,
    capitalRecycling,
    crisisOverride: crisisResult.crisis,
    shadowSimulation,
    snapshots: input.controlState?.snapshots ?? [],
    exposureOverlaps: buildExposureOverlaps(),
    liveShadowDivergence: {
      divergencePct: ensembleDisagreement.liveVsShadowL1Pct,
      alert: ensembleDisagreement.liveVsShadowL1Pct >= LIVE_SHADOW_DIVERGENCE_PCT,
      noteJa: ensembleDisagreement.noteJa,
    },
    confidenceCalibration,
    capitalPreservation,
    alerts,
    diversificationScore,
    allocationAllowed,
    healthStatus,
    verdictJa,
  };
}

export function metaCapitalAllocationBlocked(report: MetaCapitalReport): boolean {
  return !report.allocationAllowed && report.healthStatus === 'red';
}
