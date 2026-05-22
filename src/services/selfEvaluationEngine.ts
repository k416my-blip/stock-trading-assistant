/**
 * Self-Evaluation & Adaptive Intelligence — rule-based, local-only, deterministic.
 */
import {
  BIAS_LABELS_JA,
  REPUTATION_DOMAIN_LABELS_JA,
  SELF_EVAL_BASE_ALERT_THRESHOLD_PCT,
  SELF_EVAL_COOLDOWN_TRADES_24H,
  SELF_EVAL_CONFIDENCE_PENALTY_STEP,
  SELF_EVAL_FATIGUE_STRIKE_THRESHOLD,
  SELF_EVAL_HIGH_CONFIDENCE_PCT,
  SELF_EVAL_HALLUCINATION_THIN_MIN,
  SELF_EVAL_HUMILITY_TRUST_THRESHOLD,
  SELF_EVAL_MAX_CONFIDENCE_PENALTY,
  SELF_EVAL_MAX_JOURNAL,
  SELF_EVAL_NOTIFICATION_BUDGET_DAILY,
  SELF_EVAL_OVERCONFIDENT_MISS_STREAK,
  SELF_EVAL_REGULATORY_BANNER_JA,
  SELF_EVAL_REVENGE_WINDOW_MS,
  WEAKNESS_LABELS_JA,
} from '../constants/selfEvaluation';
import type { ConciergeMarketRegimeId } from '../types/globalMarketAnalysis';
import type {
  AccuracyTrackerSummary,
  AlternativeScenario,
  BiasDetectionItem,
  BiasKind,
  BuildSelfEvaluationInput,
  ConfidenceCalibrationSummary,
  ConfidenceHeatmapCell,
  ContradictionRecord,
  HallucinationSummary,
  LearningJournalEntry,
  MistakeReplayItem,
  NarrativeDriftItem,
  NarrativeThemeId,
  RegimeWeightAdjustment,
  ReputationDomainId,
  ReputationDomainScore,
  SelfEvaluationBundle,
  StrategyFitnessItem,
  WeaknessItem,
} from '../types/selfEvaluation';
import type { TrackedAiRecommendation } from '../types/portfolioRealityValidation';
import type { SelfEvaluationPersisted } from './selfEvaluationStorage';
import { loadSelfEvaluationState, saveSelfEvaluationState } from './selfEvaluationStorage';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function evaluated(recs: TrackedAiRecommendation[]): TrackedAiRecommendation[] {
  return recs.filter((r) => r.status === 'succeeded' || r.status === 'failed');
}

function buildAccuracyTracker(recs: TrackedAiRecommendation[]): AccuracyTrackerSummary {
  const ev = evaluated(recs);
  const wins = ev.filter((r) => r.status === 'succeeded').length;
  const overallWinRatePct = ev.length > 0 ? Math.round((wins / ev.length) * 100) : null;
  const recent = ev
    .filter((r) => r.resolvedAt)
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
    .slice(0, 12);
  const recentWins = recent.filter((r) => r.status === 'succeeded').length;
  const recentWinRatePct =
    recent.length > 0 ? Math.round((recentWins / recent.length) * 100) : null;
  const confs = ev.map((r) => r.confidencePct);
  const avgConfidencePct =
    confs.length > 0 ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : null;
  const rets = ev.map((r) => r.returnPct).filter((x): x is number => x != null);
  const avgReturnPct =
    rets.length > 0
      ? Math.round((rets.reduce((a, b) => a + b, 0) / rets.length) * 10) / 10
      : null;

  const byRegime = new Map<string, { wins: number; total: number }>();
  for (const r of ev) {
    const id = r.regimeId ?? 'unknown';
    const row = byRegime.get(id) ?? { wins: 0, total: 0 };
    row.total += 1;
    if (r.status === 'succeeded') row.wins += 1;
    byRegime.set(id, row);
  }
  const regimeWinRates = [...byRegime.entries()].map(([regimeId, v]) => ({
    regimeId,
    winRatePct: v.total > 0 ? Math.round((v.wins / v.total) * 100) : null,
    count: v.total,
  }));

  return {
    evaluatedCount: ev.length,
    overallWinRatePct,
    recentWinRatePct,
    avgConfidencePct,
    avgReturnPct,
    regimeWinRates,
  };
}

function updateCalibration(
  state: SelfEvaluationPersisted,
  recs: TrackedAiRecommendation[],
): { state: SelfEvaluationPersisted; summary: ConfidenceCalibrationSummary } {
  let working = { ...state };
  const ev = evaluated(recs);
  const recentFails = ev
    .filter(
      (r) =>
        r.status === 'failed' &&
        r.confidencePct >= SELF_EVAL_HIGH_CONFIDENCE_PCT &&
        r.resolvedAt &&
        Date.now() - new Date(r.resolvedAt).getTime() < 14 * 24 * 60 * 60 * 1000,
    )
    .slice(-5);

  let streak = working.highConfidenceMissStreak;
  if (recentFails.length > 0) {
    streak += 1;
  } else if (ev.length > 0) {
    streak = Math.max(0, streak - 1);
  }

  let penalty = working.confidencePenaltyPct;
  if (streak >= SELF_EVAL_OVERCONFIDENT_MISS_STREAK) {
    penalty = Math.min(
      SELF_EVAL_MAX_CONFIDENCE_PENALTY,
      penalty + SELF_EVAL_CONFIDENCE_PENALTY_STEP,
    );
    streak = 0;
  }

  const overconfidentCount = ev.filter(
    (r) => r.status === 'failed' && r.confidencePct >= SELF_EVAL_HIGH_CONFIDENCE_PCT,
  ).length;

  working = {
    ...working,
    highConfidenceMissStreak: streak,
    confidencePenaltyPct: penalty,
    adaptiveConfidenceOffsetPct: penalty,
  };

  const noteJa =
    penalty > 0
      ? `高confidence外れにより confidence ペナルティ −${penalty}% を適用`
      : '校正は安定 — 過信ペナルティなし';

  return {
    state: working,
    summary: {
      penaltyPct: penalty,
      highConfidenceMissStreak: streak,
      overconfidentCount,
      calibrationNoteJa: noteJa,
    },
  };
}

function detectBiases(
  recs: TrackedAiRecommendation[],
  regimeId: ConciergeMarketRegimeId | 'unknown',
): BiasDetectionItem[] {
  const items: BiasDetectionItem[] = [];
  const ev = evaluated(recs);
  const buyFails = ev.filter((r) => r.action === 'buy' && r.status === 'failed').length;
  const buyTotal = ev.filter((r) => r.action === 'buy').length;
  if (buyTotal >= 3 && buyFails / buyTotal < 0.35 && regimeId !== 'bullish') {
    items.push({
      kind: 'bullish',
      severity: 'medium',
      labelJa: BIAS_LABELS_JA.bullish,
      detailJa: `買い提案の外れが少なく見えるが、レジーム ${regimeId} では楽観バイアスの疑い`,
    });
  }

  if (regimeId === 'panic') {
    const panicBuys = recs.filter(
      (r) =>
        r.regimeId === 'panic' &&
        r.action === 'buy' &&
        Date.now() - new Date(r.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
    ).length;
    if (panicBuys >= 2) {
      items.push({
        kind: 'panic',
        severity: 'high',
        labelJa: BIAS_LABELS_JA.panic,
        detailJa: 'パニック相場で買い提案が複数 — 恐怖下の楽観的判断の疑い',
      });
    }
  }

  const sorted = [...recs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const dt = new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime();
    if (dt > SELF_EVAL_REVENGE_WINDOW_MS) continue;
    if (
      prev.symbol === cur.symbol &&
      prev.status === 'failed' &&
      (cur.action === 'buy' || cur.action === 'reduce')
    ) {
      items.push({
        kind: 'revenge',
        severity: 'high',
        labelJa: BIAS_LABELS_JA.revenge,
        detailJa: `${cur.symbol}: 直後の失敗後に再エントリー — リベンジ傾向`,
      });
      break;
    }
  }

  const trades24h = recs.filter(
    (r) =>
      Date.now() - new Date(r.createdAt).getTime() < 24 * 60 * 60 * 1000 &&
      (r.action === 'buy' || r.action === 'reduce'),
  ).length;
  if (trades24h > SELF_EVAL_COOLDOWN_TRADES_24H) {
    items.push({
      kind: 'overtrading',
      severity: trades24h > SELF_EVAL_COOLDOWN_TRADES_24H + 3 ? 'high' : 'medium',
      labelJa: BIAS_LABELS_JA.overtrading,
      detailJa: `24hで売買系提案 ${trades24h} 回 — クールダウン推奨`,
    });
  }

  return items.slice(0, 4);
}

function scoreRecommendationQuality(
  recs: TrackedAiRecommendation[],
  hallucination: HallucinationSummary,
  biases: BiasDetectionItem[],
): number {
  const ev = evaluated(recs);
  let score = 55;
  if (ev.length >= 5) {
    const wins = ev.filter((r) => r.status === 'succeeded').length;
    score += ((wins / ev.length) * 100 - 50) * 0.35;
  }
  score -= hallucination.riskScore * 0.25;
  score -= biases.filter((b) => b.severity === 'high').length * 8;
  score -= biases.filter((b) => b.severity === 'medium').length * 4;
  const thinFails = ev.filter((r) => r.thinReasonFlag && r.status === 'failed').length;
  score -= thinFails * 3;
  return clamp(score);
}

function detectHallucination(recs: TrackedAiRecommendation[]): HallucinationSummary {
  const active = recs.filter((r) => r.status === 'active');
  const thinReasonCount = recs.filter((r) => r.thinReasonFlag).length;
  const missingEvidenceCount = active.filter(
    (r) => r.whyJa.trim().length < 24 || r.baselinePrice == null,
  ).length;
  let riskScore = thinReasonCount * 12 + missingEvidenceCount * 10;
  if (thinReasonCount >= SELF_EVAL_HALLUCINATION_THIN_MIN) riskScore += 15;
  riskScore = clamp(riskScore, 0, 100);
  const noteJa =
    riskScore >= 50
      ? '根拠薄い提案が目立つ — 断定を避け、人間レビュー優先'
      : riskScore >= 25
        ? '一部で根拠不足 — 追加ファクト確認を推奨'
        : '根拠密度はおおむね許容';
  return { riskScore, thinReasonCount, missingEvidenceCount, noteJa };
}

function analyzeWeaknesses(recs: TrackedAiRecommendation[]): WeaknessItem[] {
  const ev = evaluated(recs);
  const kinds: Array<{ kind: WeaknessItem['kind']; match: (r: TrackedAiRecommendation) => boolean }> =
    [
      { kind: 'panic', match: (r) => r.regimeId === 'panic' },
      { kind: 'sideways', match: (r) => r.regimeId === 'sideways' },
      {
        kind: 'low_liquidity',
        match: (r) => r.thinReasonFlag || r.whyJa.includes('流動性'),
      },
      {
        kind: 'earnings',
        match: (r) => /決算|earnings/i.test(r.whyJa),
      },
    ];

  return kinds
    .map(({ kind, match }) => {
      const subset = ev.filter(match);
      const wins = subset.filter((r) => r.status === 'succeeded').length;
      const winRatePct =
        subset.length > 0 ? Math.round((wins / subset.length) * 100) : null;
      return {
        kind,
        labelJa: WEAKNESS_LABELS_JA[kind],
        winRatePct,
        sampleCount: subset.length,
        detailJa:
          subset.length < 2
            ? 'サンプル不足'
            : winRatePct != null && winRatePct < 45
              ? `勝率 ${winRatePct}% — この局面では慎重モード推奨`
              : `勝率 ${winRatePct ?? '—'}% — 許容範囲`,
      };
    })
    .filter((w) => w.sampleCount >= 1)
    .sort((a, b) => (a.winRatePct ?? 100) - (b.winRatePct ?? 100))
    .slice(0, 4);
}

function buildRegimeAdaptation(
  regimeId: ConciergeMarketRegimeId | 'unknown',
): RegimeWeightAdjustment[] {
  const regimes: ConciergeMarketRegimeId[] = [
    'bullish',
    'bearish',
    'panic',
    'sideways',
    'recovery',
  ];
  const base: Record<ConciergeMarketRegimeId, number> = {
    bullish: 1.1,
    bearish: 0.85,
    risk_on: 1.05,
    risk_off: 0.9,
    panic: 0.65,
    recovery: 1.0,
    sideways: 0.95,
  };
  return regimes.map((id) => {
    const mult = id === regimeId ? base[id] : base[id] * 0.92;
    return {
      regimeId: id,
      weightMultiplier: Math.round(mult * 100) / 100,
      noteJa:
        id === regimeId
          ? `現在レジーム — シグナル重み ×${mult.toFixed(2)}`
          : `非アクティブ — 参考重み ×${mult.toFixed(2)}`,
    };
  });
}

function buildStrategyFitness(
  input: BuildSelfEvaluationInput,
): StrategyFitnessItem[] {
  const regime = input.regimeId;
  const recs = evaluated(input.recommendations);
  const byAction = new Map<string, { wins: number; total: number }>();
  for (const r of recs) {
    const row = byAction.get(r.action) ?? { wins: 0, total: 0 };
    row.total += 1;
    if (r.status === 'succeeded') row.wins += 1;
    byAction.set(r.action, row);
  }

  const tactical = input.strategyBundle?.tacticalMode ?? 'balanced';
  const items: StrategyFitnessItem[] = [];

  for (const [action, v] of byAction) {
    const rate = v.total > 0 ? (v.wins / v.total) * 100 : 50;
    let fitness = clamp(rate);
    if (regime === 'panic' && action === 'buy') fitness -= 25;
    if (regime === 'bullish' && action === 'buy') fitness += 8;
    if (regime === 'bearish' && action === 'reduce') fitness += 10;
    if (tactical === 'defensive' && action === 'avoid') fitness += 6;
    items.push({
      strategyLabelJa: `${action}（${tactical}）`,
      fitnessScore: fitness,
      effectiveInRegime: fitness >= 52,
      noteJa:
        fitness >= 60
          ? '今の市場で有効性が高い'
          : fitness >= 45
            ? '条件付きで有効'
            : '今のレジームでは弱い — watch 優先',
    });
  }

  if (items.length === 0 && input.strategyBundle) {
    items.push({
      strategyLabelJa: input.strategyBundle.regimeStrategyJa.slice(0, 40),
      fitnessScore: 50,
      effectiveInRegime: regime !== 'panic',
      noteJa: '実績サンプル不足 — ルールベース推定',
    });
  }
  return items.sort((a, b) => b.fitnessScore - a.fitnessScore).slice(0, 5);
}

function dynamicAlertThreshold(volatilityPct: number, multiplier: number): number {
  const volBump = Math.min(18, Math.max(0, volatilityPct - 12) * 0.6);
  return clamp(SELF_EVAL_BASE_ALERT_THRESHOLD_PCT + volBump * multiplier, 35, 92);
}

function adaptiveConfidencePct(
  accuracy: AccuracyTrackerSummary,
  penalty: number,
): number {
  let base = 58;
  if (accuracy.recentWinRatePct != null) {
    base += (accuracy.recentWinRatePct - 50) * 0.4;
  }
  if (accuracy.overallWinRatePct != null) {
    base += (accuracy.overallWinRatePct - 50) * 0.2;
  }
  return clamp(base - penalty, 15, 88);
}

function detectContradictions(
  recs: TrackedAiRecommendation[],
  existing: ContradictionRecord[],
): ContradictionRecord[] {
  const out = [...existing];
  const bySym = new Map<string, TrackedAiRecommendation[]>();
  for (const r of recs.slice(-50)) {
    const list = bySym.get(r.symbol) ?? [];
    list.push(r);
    bySym.set(r.symbol, list);
  }
  const windowMs = 48 * 60 * 60 * 1000;
  for (const [sym, list] of bySym) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const dt = new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime();
      if (dt > windowMs) continue;
      const flip =
        (prev.action === 'buy' && cur.action === 'reduce') ||
        (prev.action === 'reduce' && cur.action === 'buy') ||
        (prev.action === 'avoid' && cur.action === 'buy');
      if (!flip) continue;
      const id = `ctr-${sym}-${cur.createdAt}`;
      if (out.some((c) => c.id === id)) continue;
      out.push({
        id,
        at: cur.createdAt,
        symbol: sym,
        priorActionJa: prev.action,
        currentActionJa: cur.action,
        detailJa: `48h以内に ${prev.action} → ${cur.action} へ転換`,
      });
    }
  }
  return out.slice(-24);
}

const NARRATIVE_KEYWORDS: Record<NarrativeThemeId, RegExp> = {
  ai: /AI|半導体|テック|chip/i,
  rates: /金利|利上げ|利下げ|rates|yield/i,
  energy: /エネルギー|原油|oil|energy/i,
  china: /中国|China|香港/i,
  recession: /景気後退|recession|リセッション|低迷/i,
};

function detectNarrativeDrift(
  factors: string[],
  bullets: string[],
  prevThemes: string[],
): { items: NarrativeDriftItem[]; themes: string[] } {
  const text = [...factors, ...bullets].join(' ');
  const active: NarrativeThemeId[] = [];
  const items: NarrativeDriftItem[] = [];
  const labels: Record<NarrativeThemeId, string> = {
    ai: 'AI / テック',
    rates: '金利',
    energy: 'エネルギー',
    china: '中国',
    recession: '景気後退',
  };
  for (const [id, re] of Object.entries(NARRATIVE_KEYWORDS) as [NarrativeThemeId, RegExp][]) {
    const on = re.test(text);
    if (on) active.push(id);
    const was = prevThemes.includes(id);
    items.push({
      themeId: id,
      labelJa: labels[id],
      active: on,
      driftNoteJa: on
        ? was
          ? '継続テーマ'
          : '新規に台頭 — ナラティブシフト'
        : was
          ? 'テーマ弱化'
          : '非アクティブ',
    });
  }
  return { items, themes: active };
}

function marketPersonality(
  fearScore: number,
  momentumScore: number,
  regimeId: ConciergeMarketRegimeId | 'unknown',
): SelfEvaluationBundle['marketPersonality'] {
  if (fearScore >= 72) {
    return { id: 'fear', labelJa: '恐怖優位', summaryJa: 'リスク回避・ボラ拡大 — 防御的トーン' };
  }
  if (momentumScore >= 68 && fearScore < 40) {
    return { id: 'euphoric', labelJa: '熱狂', summaryJa: '追い風だが過信リスク — 利確シナリオを常備' };
  }
  if (momentumScore >= 52 && fearScore < 55) {
    return { id: 'greed', labelJa: '強気', summaryJa: 'リスクオン — サイズは抑制' };
  }
  if (regimeId === 'sideways' || momentumScore < 35) {
    return { id: 'exhausted', labelJa: '消耗', summaryJa: '方向感低下 — レンジ戦略・様子見' };
  }
  return { id: 'fear', labelJa: '混合', summaryJa: '恐怖と強気が拮抗 — 断定を避ける' };
}

function computeTrustScore(
  accuracy: AccuracyTrackerSummary,
  quality: number,
  realityTrust: number | null,
  executionTrust: number | null,
  penalty: number,
): number {
  let t = 48;
  if (accuracy.overallWinRatePct != null) t += (accuracy.overallWinRatePct - 50) * 0.3;
  if (accuracy.recentWinRatePct != null) t += (accuracy.recentWinRatePct - 50) * 0.25;
  t += (quality - 50) * 0.2;
  if (realityTrust != null) t += (realityTrust - 50) * 0.15;
  if (executionTrust != null) t += (executionTrust - 50) * 0.08;
  t -= penalty * 0.6;
  return clamp(t);
}

function buildConfidenceHeatmap(recs: TrackedAiRecommendation[]): ConfidenceHeatmapCell[] {
  const buckets = [
    { label: '低 (<55%)', min: 0, max: 54 },
    { label: '中 (55-71%)', min: 55, max: 71 },
    { label: '高 (≥72%)', min: 72, max: 100 },
  ];
  const ev = evaluated(recs);
  return buckets.map((b) => {
    const subset = ev.filter((r) => r.confidencePct >= b.min && r.confidencePct <= b.max);
    const wins = subset.filter((r) => r.status === 'succeeded').length;
    const confs = subset.map((r) => r.confidencePct);
    return {
      bucketLabelJa: b.label,
      predictedAvgPct:
        confs.length > 0 ? Math.round(confs.reduce((a, c) => a + c, 0) / confs.length) : b.min,
      actualWinRatePct:
        subset.length > 0 ? Math.round((wins / subset.length) * 100) : null,
      sampleCount: subset.length,
    };
  });
}

function buildMistakeReplay(recs: TrackedAiRecommendation[]): MistakeReplayItem[] {
  return evaluated(recs)
    .filter((r) => r.status === 'failed')
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      at: r.resolvedAt ?? r.createdAt,
      symbol: r.symbol,
      action: r.action,
      confidencePct: r.confidencePct,
      returnPct: r.returnPct,
      whyWrongJa:
        r.failureNoteJa ??
        (r.returnPct != null
          ? `想定と逆 — リターン ${r.returnPct.toFixed(1)}%`
          : 'ベンチマーク/価格で未達'),
    }));
}

function inferReputationDomain(r: TrackedAiRecommendation): ReputationDomainId {
  const w = r.whyJa.toLowerCase();
  if (/決算|earnings|eps/i.test(w)) return 'earnings';
  if (/マクロ|金利|為替|指数/i.test(w)) return 'macro';
  if (/sns|センチ|ニュース|話題/i.test(w)) return 'sentiment';
  return 'technical';
}

function updateReputation(
  rep: SelfEvaluationPersisted['reputation'],
  recs: TrackedAiRecommendation[],
): SelfEvaluationPersisted['reputation'] {
  const next = { ...rep };
  for (const r of evaluated(recs).slice(-30)) {
    const d = inferReputationDomain(r);
    if (r.status === 'succeeded') next[d].hits += 1;
    else next[d].misses += 1;
  }
  return next;
}

function reputationScores(rep: SelfEvaluationPersisted['reputation']): ReputationDomainScore[] {
  return (Object.keys(rep) as ReputationDomainId[]).map((domain) => {
    const row = rep[domain];
    const total = row.hits + row.misses;
    return {
      domain,
      labelJa: REPUTATION_DOMAIN_LABELS_JA[domain],
      accuracyPct: total > 0 ? Math.round((row.hits / total) * 100) : null,
      sampleCount: total,
    };
  });
}

function appendLearningJournal(
  journal: LearningJournalEntry[],
  recs: TrackedAiRecommendation[],
  biases: BiasDetectionItem[],
  maxFailureJa: string | null,
): LearningJournalEntry[] {
  const latestFail = evaluated(recs)
    .filter((r) => r.status === 'failed')
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))[0];
  if (!latestFail && biases.length === 0) return journal;

  const headlineJa = latestFail
    ? `${latestFail.symbol} ${latestFail.action} の見送り/失敗`
    : 'バイアス検知 — 自己調整';
  const reflectionJa = latestFail
    ? `confidence ${latestFail.confidencePct}% だったが未達。${latestFail.whyJa.slice(0, 80)}`
    : biases.map((b) => b.labelJa).join('、');
  const lessonJa = biases[0]?.detailJa ?? maxFailureJa ?? '次回はサイズ縮小と watch 優先';

  const entry: LearningJournalEntry = {
    id: newId('sej'),
    at: new Date().toISOString(),
    headlineJa,
    reflectionJa,
    lessonJa,
  };
  const deduped = journal.filter((j) => j.headlineJa !== headlineJa);
  return [entry, ...deduped].slice(0, SELF_EVAL_MAX_JOURNAL);
}

function compressOldJournal(journal: LearningJournalEntry[]): {
  journal: LearningJournalEntry[];
  compressed: number;
} {
  if (journal.length <= 28) return { journal, compressed: 0 };
  const keep = journal.slice(0, 20);
  const dropped = journal.length - keep.length;
  return { journal: keep, compressed: dropped };
}

function buildPostReflection(
  recs: TrackedAiRecommendation[],
  biases: BiasDetectionItem[],
): string | null {
  const fail = buildMistakeReplay(recs)[0];
  if (!fail) return null;
  const biasNote = biases.length > 0 ? ` バイアス: ${biases[0].labelJa}。` : '';
  return `${fail.symbol} の ${fail.action} は ${fail.whyWrongJa}。${biasNote} 次はエントリー条件を厳格化。`;
}

function whatChangedJa(
  prevRegime: string | null,
  regimeId: string,
  prevThemes: string[],
  themes: string[],
): string {
  const parts: string[] = [];
  if (prevRegime && prevRegime !== regimeId) {
    parts.push(`レジーム ${prevRegime} → ${regimeId}`);
  }
  const newThemes = themes.filter((t) => !prevThemes.includes(t));
  if (newThemes.length > 0) {
    parts.push(`新テーマ: ${newThemes.join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '前回ビルドから大きなレジーム/テーマ変化なし';
}

function alternativeScenarios(
  regimeId: ConciergeMarketRegimeId | 'unknown',
  fearScore: number,
): AlternativeScenario[] {
  const base: AlternativeScenario[] = [
    {
      labelJa: 'ベース',
      narrativeJa: `現レジーム ${regimeId} が継続`,
      probabilityHintJa: '50-60%',
    },
    {
      labelJa: 'リスクオフ',
      narrativeJa: '恐怖スコア上昇で急落・ボラ拡大',
      probabilityHintJa: fearScore > 55 ? '30-40%' : '15-25%',
    },
    {
      labelJa: 'リバウンド',
      narrativeJa: '売られ過ぎからの技術的反発',
      probabilityHintJa: regimeId === 'panic' ? '25-35%' : '10-20%',
    },
  ];
  return base;
}

function riskNarrative(
  input: BuildSelfEvaluationInput,
  biases: BiasDetectionItem[],
  weaknesses: WeaknessItem[],
): string {
  const risks: string[] = [];
  if (input.regimeId === 'panic') risks.push('パニック連鎖で損切り遅延');
  if (input.marketRiskScore >= 70) risks.push('市場リスクスコア高 — 新規買いは抑制');
  if (biases.some((b) => b.kind === 'overtrading')) risks.push('過剰トレードでコスト増');
  const weak = weaknesses.find((w) => w.winRatePct != null && w.winRatePct < 45);
  if (weak) risks.push(`苦手局面: ${weak.labelJa}`);
  if (risks.length === 0) return '現時点で突出した単一リスクは限定的 — 分散と現金比率を維持';
  return `最優先リスク: ${risks[0]}${risks[1] ? `。次点: ${risks[1]}` : ''}`;
}

function explainThinking(
  input: BuildSelfEvaluationInput,
  accuracy: AccuracyTrackerSummary,
  trust: number,
  humility: boolean,
): string {
  const lines = [
    `市場は ${input.regimeId}（恐怖 ${input.fearScore} / リスク ${input.marketRiskScore}）。`,
    accuracy.evaluatedCount > 0
      ? `直近勝率 ${accuracy.recentWinRatePct ?? '—'}%、評価済み ${accuracy.evaluatedCount} 件。`
      : '実績サンプルが少ないため断定を避ける。',
    `Trust ${trust}/100 — ${humility ? '不確実性が高く謙虚モード' : '通常の説明粒度'}。`,
    'ルールベース適応のみ — モデル学習・外部送信は行わない。',
  ];
  return lines.join(' ');
}

export function buildSelfEvaluationBundle(
  state: SelfEvaluationPersisted,
  input: BuildSelfEvaluationInput,
): { bundle: SelfEvaluationBundle; state: SelfEvaluationPersisted } {
  let working = { ...state };
  const recs = input.recommendations;
  const accuracy = buildAccuracyTracker(recs);
  const calib = updateCalibration(working, recs);
  working = calib.state;
  const biases = detectBiases(recs, input.regimeId);
  const hallucination = detectHallucination(recs);
  const quality = scoreRecommendationQuality(recs, hallucination, biases);
  const weaknesses = analyzeWeaknesses(recs);
  const regimeAdaptation = buildRegimeAdaptation(input.regimeId);
  const strategyFitness = buildStrategyFitness(input);

  const vol = input.volatilityPctEstimate;
  const dynamicMult =
    vol > 25 ? 1.15 : vol > 18 ? 1.05 : vol < 10 ? 0.92 : 1;
  working.dynamicAlertMultiplier = dynamicMult;
  const dynamicAlertThresholdPct = dynamicAlertThreshold(vol, dynamicMult);

  const adaptiveConf = adaptiveConfidencePct(accuracy, working.confidencePenaltyPct);
  const realityTrust = input.realityBundle?.trustScore ?? null;
  const trustScore = computeTrustScore(
    accuracy,
    quality,
    realityTrust,
    input.executionTrustScore,
    working.confidencePenaltyPct,
  );
  const humilityMode = trustScore < SELF_EVAL_HUMILITY_TRUST_THRESHOLD || accuracy.evaluatedCount < 4;
  const humilityMessageJa = humilityMode
    ? '不確実性が高い — 「分からない」/ watch のみを優先（断定回避）'
    : null;

  working.contradictions = detectContradictions(recs, working.contradictions);
  const narrative = detectNarrativeDrift(
    input.globalFactorsJa,
    input.macroBulletsJa,
    working.lastNarrativeThemes,
  );
  working.lastNarrativeThemes = narrative.themes;

  const today = new Date().toISOString().slice(0, 10);
  if (working.notificationBudgetDateKey !== today) {
    working.notificationBudgetUsedToday = 0;
    working.notificationBudgetDateKey = today;
  }
  const budgetLeft = SELF_EVAL_NOTIFICATION_BUDGET_DAILY - working.notificationBudgetUsedToday;
  const notificationBudgetNoteJa =
    trustScore < 50 || input.regimeId === 'panic'
      ? `重要局面 — 通知枠を温存（残 ${Math.max(0, budgetLeft)}/${SELF_EVAL_NOTIFICATION_BUDGET_DAILY}）`
      : `通常 — 通知予算 残 ${Math.max(0, budgetLeft)}`;

  working.fatigueStrikeCount += 0;
  const fatigueSuppressionActive = working.fatigueStrikeCount >= SELF_EVAL_FATIGUE_STRIKE_THRESHOLD;

  working.reputation = updateReputation(working.reputation, recs);
  const compressed = compressOldJournal(working.learningJournal);
  working.learningJournal = compressed.journal;
  working.compressedLogCount += compressed.compressed;
  working.learningJournal = appendLearningJournal(
    working.learningJournal,
    recs,
    biases,
    input.realityBundle?.maxFailureJa ?? null,
  );

  const whatChanged = whatChangedJa(
    working.lastRegimeId,
    input.regimeId,
    state.lastNarrativeThemes,
    narrative.themes,
  );
  working.lastRegimeId = input.regimeId;
  working.lastBuildAt = new Date().toISOString();

  const adaptiveAdjustmentsJa: string[] = [];
  if (working.confidencePenaltyPct > 0) {
    adaptiveAdjustmentsJa.push(`confidence −${working.confidencePenaltyPct}%`);
  }
  adaptiveAdjustmentsJa.push(`アラート閾値 ${dynamicAlertThresholdPct}%`);
  if (humilityMode) adaptiveAdjustmentsJa.push('謙虚モード ON');
  if (fatigueSuppressionActive) adaptiveAdjustmentsJa.push('通知疲労 — 抑制');

  const bundle: SelfEvaluationBundle = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: SELF_EVAL_REGULATORY_BANNER_JA,
    localOnlyNoteJa: '完全ローカル評価 — 学習・自己改変・外部送信なし',
    accuracy,
    calibration: calib.summary,
    biases,
    recommendationQualityScore: quality,
    hallucination,
    weaknesses,
    regimeAdaptation,
    strategyFitness,
    dynamicAlertThresholdPct,
    adaptiveConfidencePct: adaptiveConf,
    humilityMode,
    humilityMessageJa,
    contradictions: working.contradictions.slice(-6),
    narrativeDrift: narrative.items,
    notificationBudgetNoteJa,
    fatigueSuppressionActive,
    learningJournal: working.learningJournal.slice(0, 6),
    marketPersonality: marketPersonality(
      input.fearScore,
      input.momentumScore,
      input.regimeId,
    ),
    trustScore,
    postAnalysisReflectionJa: buildPostReflection(recs, biases),
    whatChangedJa: whatChanged,
    alternativeScenarios: alternativeScenarios(input.regimeId, input.fearScore),
    riskNarrativeJa: riskNarrative(input, biases, weaknesses),
    uncertaintyNoteJa: humilityMode
      ? '断定を減らし、シナリオ幅を明示'
      : '不確実性は中程度 — 根拠付きで提示',
    reputationByDomain: reputationScores(working.reputation),
    confidenceHeatmap: buildConfidenceHeatmap(recs),
    mistakeReplay: buildMistakeReplay(recs),
    adaptiveStrategyViewJa:
      strategyFitness[0]?.noteJa ??
      input.strategyBundle?.regimeStrategyJa ??
      '戦略フィットネス — データ蓄積中',
    explainThinkingJa: explainThinking(input, accuracy, trustScore, humilityMode),
    adaptiveAdjustmentsJa,
  };

  return { bundle, state: working };
}

export async function refreshSelfEvaluationBundle(
  input: BuildSelfEvaluationInput,
): Promise<SelfEvaluationBundle> {
  const loaded = await loadSelfEvaluationState();
  const { bundle, state } = buildSelfEvaluationBundle(loaded, input);
  await saveSelfEvaluationState(state);
  return bundle;
}
