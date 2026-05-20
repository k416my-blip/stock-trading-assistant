import {
  BASE_LEARNING_RATE,
  DRIFT_COMPONENT_ALERT_PCT,
  DRIFT_L1_ALERT,
  ENSEMBLE_DISPERSION_ALERT,
  FEEDBACK_AUTOCORR_ALERT,
  FEEDBACK_CONSECUTIVE_ALERT,
  LONG_MEMORY_ALPHA,
  MAX_GOVERNED_LEARNING_RATE,
  MAX_WEIGHT_DELTA_PER_UPDATE,
  MIN_GOVERNED_LEARNING_RATE,
  MUTATION_CAP_PER_24H,
  OVERFIT_GAP_ALERT_PCT,
  OVERFIT_MIN_SAMPLES,
  REGIME_MEMORY_HALF_LIFE_DAYS,
  REGIME_STALE_DAYS,
  SHADOW_LIVE_DIVERGENCE_PCT,
  SHORT_MEMORY_ALPHA,
  STABILITY_BLOCK,
  STABILITY_WARN,
} from '../constants/modelStability';
import type { ScoreWeights } from './analysis/aiLearning';
import type {
  ModelStabilityAlert,
  ModelStabilityControlState,
  ModelStabilityInput,
  ModelStabilityReport,
  ModelStabilitySeverity,
} from '../types/modelStability';

const MS_DAY = 86400000;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function weightKeys(): (keyof ScoreWeights)[] {
  return ['technical', 'fundamental', 'news', 'earnings', 'sns', 'risk'];
}

function normalizeWeights(w: ScoreWeights): ScoreWeights {
  const sum = weightKeys().reduce((s, k) => s + w[k], 0) || 1;
  const out = { ...w };
  for (const k of weightKeys()) out[k] = out[k] / sum;
  return out;
}

function l1Distance(a: ScoreWeights, b: ScoreWeights): number {
  return weightKeys().reduce((s, k) => s + Math.abs(a[k] - b[k]), 0);
}

function maxComponentDriftPct(current: ScoreWeights, baseline: ScoreWeights): number {
  let max = 0;
  for (const k of weightKeys()) {
    const pct = baseline[k] > 0 ? (Math.abs(current[k] - baseline[k]) / baseline[k]) * 100 : 0;
    max = Math.max(max, pct);
  }
  return Math.round(max * 10) / 10;
}

function weightDispersion(w: ScoreWeights): number {
  const vals = weightKeys().map((k) => w[k]);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
}

function buildParameterDrift(input: ModelStabilityInput): ModelStabilityReport['parameterDrift'] {
  const current = normalizeWeights(input.aiLearning.weights);
  const baseline = normalizeWeights(input.baselineWeights);
  const l1 = Math.round(l1Distance(current, baseline) * 1000) / 1000;
  const maxPct = maxComponentDriftPct(current, baseline);
  const driftScore = Math.round(clamp(l1 * 120 + maxPct * 2, 0, 100));
  return {
    driftScore,
    l1DistanceFromBaseline: l1,
    maxComponentDriftPct: maxPct,
    noteJa:
      l1 >= DRIFT_L1_ALERT || maxPct >= DRIFT_COMPONENT_ALERT_PCT
        ? `パラメータドリフト — L1 ${l1} · 最大 ${maxPct}%`
        : `パラメータ安定 — L1 ${l1}`,
  };
}

function buildLearningRateGovernor(stability: number): ModelStabilityReport['learningRateGovernor'] {
  const factor = clamp(stability / 100, 0.15, 1);
  const governed = clamp(
    BASE_LEARNING_RATE * factor,
    MIN_GOVERNED_LEARNING_RATE,
    MAX_GOVERNED_LEARNING_RATE,
  );
  const reductionPct = Math.round((1 - governed / BASE_LEARNING_RATE) * 100);
  return {
    baseRate: BASE_LEARNING_RATE,
    governedRate: Math.round(governed * 1000) / 1000,
    reductionPct,
    noteJa:
      reductionPct > 40
        ? `学習率抑制 — ${governed.toFixed(3)}（−${reductionPct}%）`
        : `学習率 ${governed.toFixed(3)} — 平常`,
  };
}

function modeActive(state?: ModelStabilityControlState): ModelStabilityReport['controlMode'] {
  if (!state) return 'normal';
  const now = Date.now();
  if (state.controlMode === 'safe') return 'safe';
  if (state.quarantineUntil && new Date(state.quarantineUntil).getTime() > now) return 'quarantine';
  if (state.freezeUntil && new Date(state.freezeUntil).getTime() > now) return 'freeze';
  if (state.controlMode !== 'normal') return state.controlMode;
  return 'normal';
}

function buildAdaptiveFreeze(
  stability: number,
  controlMode: ModelStabilityReport['controlMode'],
  state?: ModelStabilityControlState,
): ModelStabilityReport['adaptiveFreeze'] {
  const critical = stability < STABILITY_BLOCK || controlMode === 'freeze' || controlMode === 'safe';
  const active = critical || controlMode === 'quarantine';
  return {
    active,
    reasonJa: active
      ? controlMode === 'quarantine'
        ? '学習隔離 — 適応更新を停止'
        : `適応フリーズ — 安定スコア ${stability}`
      : '適応更新許可',
    until: state?.freezeUntil ?? state?.quarantineUntil,
  };
}

function buildOverfitting(input: ModelStabilityInput): ModelStabilityReport['overfitting'] {
  const evaluated = input.aiLearning.outcomes.filter((o) => o.evaluated && o.actualReturnPct != null);
  if (evaluated.length < OVERFIT_MIN_SAMPLES) {
    return {
      score: 15,
      inSampleWinRatePct: 0,
      recentOutSampleWinRatePct: 0,
      gapPct: 0,
      noteJa: `サンプル不足（${evaluated.length}/${OVERFIT_MIN_SAMPLES}）`,
    };
  }
  const sorted = [...evaluated].sort((a, b) => b.recommendedAt.localeCompare(a.recommendedAt));
  const recent = sorted.slice(0, Math.ceil(sorted.length / 3));
  const older = sorted.slice(Math.ceil(sorted.length / 3));
  const winRate = (arr: typeof evaluated) => {
    const wins = arr.filter((o) => (o.actualReturnPct ?? 0) > 0).length;
    return arr.length > 0 ? (wins / arr.length) * 100 : 0;
  };
  const inSample = winRate(older);
  const outSample = winRate(recent);
  const gap = inSample - outSample;
  const score = Math.round(clamp(gap * 2 + (inSample > 70 ? 20 : 0), 0, 100));
  return {
    score,
    inSampleWinRatePct: Math.round(inSample),
    recentOutSampleWinRatePct: Math.round(outSample),
    gapPct: Math.round(gap),
    noteJa:
      gap >= OVERFIT_GAP_ALERT_PCT
        ? `過学習疑い — ギャップ ${gap.toFixed(0)}%`
        : `汎化ギャップ ${gap.toFixed(0)}% — 許容`,
  };
}

function buildRegimeMemoryDecay(input: ModelStabilityInput): ModelStabilityReport['regimeMemoryDecay'] {
  const state = input.controlState;
  const current = input.regime.regimeId;
  const entered = state?.regimeEnteredAt
    ? new Date(state.regimeEnteredAt).getTime()
    : Date.now() - 7 * MS_DAY;
  const days = (Date.now() - entered) / MS_DAY;
  const decayFactor = Math.exp(-days / REGIME_MEMORY_HALF_LIFE_DAYS);
  const memoryStrengthPct = Math.round(decayFactor * 100);
  const stale = days > REGIME_STALE_DAYS;
  return {
    currentRegimeId: current,
    memoryStrengthPct,
    daysSinceRegimeChange: Math.round(days * 10) / 10,
    decayFactor: Math.round(decayFactor * 1000) / 1000,
    noteJa: stale
      ? `レジーム記憶減衰 — ${days.toFixed(0)}日 · 強度 ${memoryStrengthPct}%`
      : `レジーム ${current} · 記憶 ${memoryStrengthPct}%`,
  };
}

function buildEnsembleConsistency(input: ModelStabilityInput): ModelStabilityReport['ensembleConsistency'] {
  const w = normalizeWeights(input.aiLearning.weights);
  const dispersion = weightDispersion(w);
  const rw = input.adaptiveLearning?.reinforcementWeights;
  let rSpread = 0;
  if (rw) {
    const vals = [rw.timing, rw.sliceAggression, rw.volTarget];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    rSpread = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  }
  const score = Math.round(clamp(dispersion * 200 + rSpread * 40, 0, 100));
  return {
    score,
    weightDispersion: Math.round(dispersion * 1000) / 1000,
    reinforcementSpread: Math.round(rSpread * 1000) / 1000,
    noteJa:
      dispersion >= ENSEMBLE_DISPERSION_ALERT
        ? 'アンサンブル不整合 — 重み分散が高い'
        : 'アンサンブル整合',
  };
}

function buildFeedbackLoop(input: ModelStabilityInput): ModelStabilityReport['feedbackLoop'] {
  const hist = input.controlState?.weightHistory ?? [];
  if (hist.length < 3) {
    return {
      detected: false,
      autocorrScore: 0,
      consecutiveSameSignUpdates: 0,
      noteJa: '更新履歴不足',
    };
  }
  const deltas: number[] = [];
  for (let i = 0; i < Math.min(hist.length - 1, 12); i++) {
    const a = hist[i].weights;
    const b = hist[i + 1].weights;
    deltas.push(l1Distance(a, b));
  }
  let sameSign = 0;
  let maxRun = 0;
  for (let i = 1; i < deltas.length; i++) {
    if ((deltas[i] > 0 && deltas[i - 1] > 0) || (deltas[i] === deltas[i - 1])) {
      sameSign += 1;
      maxRun = Math.max(maxRun, sameSign);
    } else sameSign = 0;
  }
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance = deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / deltas.length;
  const autocorr =
    variance > 0 ? clamp(1 - Math.sqrt(variance) / Math.max(mean, 0.001), 0, 1) : 0;
  const detected =
    autocorr >= FEEDBACK_AUTOCORR_ALERT || maxRun >= FEEDBACK_CONSECUTIVE_ALERT;
  return {
    detected,
    autocorrScore: Math.round(autocorr * 100) / 100,
    consecutiveSameSignUpdates: maxRun,
    noteJa: detected ? 'フィードバックループ疑い — 更新が自己強化' : 'フィードバック平常',
  };
}

function buildSelfConfirmationBias(input: ModelStabilityInput): ModelStabilityReport['selfConfirmationBias'] {
  const evaluated = input.aiLearning.outcomes.filter(
    (o) => o.evaluated && o.actualReturnPct != null && o.totalScore >= 65,
  );
  const losses = evaluated.filter((o) => (o.actualReturnPct ?? 0) < 0).length;
  const score = evaluated.length > 0 ? Math.round((losses / evaluated.length) * 100) : 0;
  return {
    score,
    highConfidenceLossCount: losses,
    noteJa:
      score > 45
        ? `自己確認バイアス — 高信頼の損失 ${losses}件`
        : '自己確認バイアス低',
  };
}

function buildShadowLiveDivergence(input: ModelStabilityInput): ModelStabilityReport['shadowLiveDivergence'] {
  const shadow = input.shadowReturnEwmaPct ?? input.adaptiveLearning?.shadowReturnEwmaPct ?? 0;
  const live = input.liveReturnEwmaPct ?? 0;
  const divergence = Math.abs(shadow - live);
  const alert = divergence >= SHADOW_LIVE_DIVERGENCE_PCT;
  return {
    shadowReturnEwmaPct: Math.round(shadow * 100) / 100,
    liveReturnEwmaPct: Math.round(live * 100) / 100,
    divergencePct: Math.round(divergence * 100) / 100,
    alert,
    noteJa: alert
      ? `シャドー/ライブ乖離 ${divergence.toFixed(2)}%`
      : `シャドー ${shadow.toFixed(2)}% · ライブ ${live.toFixed(2)}%`,
  };
}

function buildMutationCap(state?: ModelStabilityControlState): ModelStabilityReport['mutationRateCap'] {
  const count = state?.mutationsLast24h ?? 0;
  const capped = count >= MUTATION_CAP_PER_24H;
  return {
    mutationsLast24h: count,
    capPer24h: MUTATION_CAP_PER_24H,
    capped,
    maxDeltaPerUpdate: MAX_WEIGHT_DELTA_PER_UPDATE,
    noteJa: capped
      ? `変異率上限 — 24h ${count}/${MUTATION_CAP_PER_24H}`
      : `変異 ${count}/${MUTATION_CAP_PER_24H} — Δ上限 ${MAX_WEIGHT_DELTA_PER_UPDATE}`,
  };
}

function buildMemoryBalance(input: ModelStabilityInput): ModelStabilityReport['memoryBalance'] {
  const returns = input.aiLearning.outcomes
    .filter((o) => o.actualReturnPct != null)
    .map((o) => o.actualReturnPct!);
  const vol =
    returns.length >= 3
      ? Math.sqrt(returns.reduce((s, r) => s + r ** 2, 0) / returns.length)
      : 5;
  const blendLong = clamp(1 - vol / 30, 0.25, 0.85);
  const effectiveLong = LONG_MEMORY_ALPHA;
  const effectiveShort = SHORT_MEMORY_ALPHA;
  return {
    longMemoryAlpha: effectiveLong,
    shortMemoryAlpha: effectiveShort,
    blendRatioLong: Math.round(blendLong * 100) / 100,
    outcomeVolatility: Math.round(vol * 10) / 10,
    noteJa: `長期 ${(blendLong * 100).toFixed(0)}% / 短期 ${((1 - blendLong) * 100).toFixed(0)}% · ボラ ${vol.toFixed(1)}`,
  };
}

function collectAlerts(parts: {
  parameterDrift: ModelStabilityReport['parameterDrift'];
  overfitting: ModelStabilityReport['overfitting'];
  feedbackLoop: ModelStabilityReport['feedbackLoop'];
  shadowLive: ModelStabilityReport['shadowLiveDivergence'];
  mutation: ModelStabilityReport['mutationRateCap'];
  quarantine: ModelStabilityReport['learningQuarantine'];
  stability: number;
}): ModelStabilityAlert[] {
  const alerts: ModelStabilityAlert[] = [];
  const add = (id: string, severity: ModelStabilitySeverity, titleJa: string, detailJa: string) => {
    alerts.push({ id, severity, titleJa, detailJa });
  };
  if (parts.stability < STABILITY_BLOCK) {
    add('stability', 'critical', '安定性危機', `スコア ${parts.stability}`);
  } else if (parts.stability < STABILITY_WARN) {
    add('stability', 'watch', '安定性低下', `スコア ${parts.stability}`);
  }
  if (parts.parameterDrift.driftScore > 55) {
    add('drift', 'high', 'パラメータドリフト', parts.parameterDrift.noteJa);
  }
  if (parts.overfitting.gapPct >= OVERFIT_GAP_ALERT_PCT) {
    add('overfit', 'high', '過学習疑い', parts.overfitting.noteJa);
  }
  if (parts.feedbackLoop.detected) {
    add('feedback', 'high', 'フィードバックループ', parts.feedbackLoop.noteJa);
  }
  if (parts.shadowLive.alert) {
    add('shadow', 'watch', 'シャドー乖離', parts.shadowLive.noteJa);
  }
  if (parts.mutation.capped) {
    add('mutation', 'watch', '変異率上限', parts.mutation.noteJa);
  }
  if (parts.quarantine.active) {
    add('quarantine', 'critical', '学習隔離', parts.quarantine.reasonJa);
  }
  return alerts;
}

export function buildModelStabilityReport(input: ModelStabilityInput): ModelStabilityReport {
  const controlMode = modeActive(input.controlState);
  const parameterDrift = buildParameterDrift(input);
  const overfitting = buildOverfitting(input);
  const ensembleConsistency = buildEnsembleConsistency(input);
  const feedbackLoop = buildFeedbackLoop(input);
  const selfConfirmationBias = buildSelfConfirmationBias(input);
  const regimeMemoryDecay = buildRegimeMemoryDecay(input);
  const shadowLiveDivergence = buildShadowLiveDivergence(input);
  const mutationRateCap = buildMutationCap(input.controlState);

  const stabilityComponents = [
    { labelJa: 'ドリフト', value: 100 - parameterDrift.driftScore },
    { labelJa: '過学習', value: 100 - overfitting.score },
    { labelJa: 'アンサンブル', value: 100 - ensembleConsistency.score },
    { labelJa: 'フィードバック', value: feedbackLoop.detected ? 25 : 85 },
    { labelJa: 'シャドー整合', value: shadowLiveDivergence.alert ? 35 : 90 },
  ];
  const stabilityScoreVal = Math.round(
    stabilityComponents.reduce((s, c) => s + c.value, 0) / stabilityComponents.length,
  );
  const stabilityScore: ModelStabilityReport['stabilityScore'] = {
    score: stabilityScoreVal,
    components: stabilityComponents,
    noteJa: `安定性 ${stabilityScoreVal}/100`,
  };

  const learningRateGovernor = buildLearningRateGovernor(stabilityScoreVal);
  const adaptiveFreeze = buildAdaptiveFreeze(stabilityScoreVal, controlMode, input.controlState);

  const learningQuarantine: ModelStabilityReport['learningQuarantine'] = {
    active: controlMode === 'quarantine' || controlMode === 'safe',
    reasonJa:
      controlMode === 'quarantine'
        ? '学習隔離モード — 重み更新を一時停止'
        : controlMode === 'safe'
          ? 'セーフモード — ベースラインへ復帰推奨'
          : '学習隔離なし',
    mutationsBlocked:
      controlMode === 'quarantine' ||
      controlMode === 'safe' ||
      mutationRateCap.capped ||
      adaptiveFreeze.active,
  };

  const safeMode: ModelStabilityReport['safeMode'] = {
    active: controlMode === 'safe',
    revertedToBaseline: controlMode === 'safe',
    noteJa:
      controlMode === 'safe'
        ? 'セーフモード — 既定重みへ復帰'
        : stabilityScoreVal < STABILITY_BLOCK
          ? 'セーフモード発動候補'
          : 'セーフモード非活性',
  };

  const rollbackSnapshots = input.controlState?.snapshots ?? [];
  const memoryBalance = buildMemoryBalance(input);
  const alerts = collectAlerts({
    parameterDrift,
    overfitting,
    feedbackLoop,
    shadowLive: shadowLiveDivergence,
    mutation: mutationRateCap,
    quarantine: learningQuarantine,
    stability: stabilityScoreVal,
  });

  const learningAllowed =
    !learningQuarantine.mutationsBlocked &&
    stabilityScoreVal >= STABILITY_BLOCK &&
    controlMode === 'normal';

  let healthStatus: 'green' | 'yellow' | 'red' = 'green';
  if (!learningAllowed || stabilityScoreVal < STABILITY_BLOCK) healthStatus = 'red';
  else if (stabilityScoreVal < STABILITY_WARN || alerts.some((a) => a.severity === 'high')) {
    healthStatus = 'yellow';
  }

  const verdictJa = learningAllowed
    ? `適応安定 — スコア ${stabilityScoreVal} · 学習率 ${learningRateGovernor.governedRate}`
    : healthStatus === 'red'
      ? alerts.find((a) => a.severity === 'critical')?.titleJa ?? '自己適応を抑制'
      : '監視 — モデル安定性に注意';

  return {
    generatedAt: new Date().toISOString(),
    parameterDrift,
    learningRateGovernor,
    adaptiveFreeze,
    overfitting,
    regimeMemoryDecay,
    stabilityScore,
    ensembleConsistency,
    feedbackLoop,
    selfConfirmationBias,
    rollbackSnapshots,
    safeMode,
    shadowLiveDivergence,
    learningQuarantine,
    mutationRateCap,
    memoryBalance,
    controlMode,
    alerts,
    learningAllowed,
    healthStatus,
    verdictJa,
  };
}

export function modelStabilityLearningBlocked(report: ModelStabilityReport): boolean {
  return !report.learningAllowed && report.healthStatus === 'red';
}

export function shouldEnterQuarantine(report: ModelStabilityReport): boolean {
  return (
    report.stabilityScore.score < STABILITY_BLOCK ||
    report.feedbackLoop.detected ||
    report.overfitting.gapPct >= OVERFIT_GAP_ALERT_PCT + 10
  );
}

export function shouldCaptureSnapshot(report: ModelStabilityReport): boolean {
  return report.stabilityScore.score >= STABILITY_WARN && report.healthStatus !== 'red';
}
