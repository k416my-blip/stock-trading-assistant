/**
 * Meta Decision Engine — 大量シグナルから本当に重要なものだけを選別
 */
import {
  META_CURATED_FOCUS_MAX,
  META_DAILY_CRITICAL_MAX,
  META_DAILY_HIGH_MAX,
  META_FATIGUE_WINDOW_MS,
  META_QUEUE_DISPLAY_MAX,
  META_REGIME_PANIC_ROUTINE_DAMPEN,
  META_SIGNAL_DECAY_HALF_LIFE_HOURS,
  regimeNotifyThresholdMultiplier,
} from '../constants/metaDecision';
import type { ConciergeMarketRegimeId } from '../types/globalMarketAnalysis';
import type {
  BuildMetaDecisionInput,
  MetaContradiction,
  MetaCuratedPriority,
  MetaDecisionBundle,
  MetaDecisionKind,
  MetaDecisionQueueItem,
  MetaExecutiveSummary,
  MetaScoredEvent,
  MetaScoreDimensions,
  MetaTimeframeKind,
} from '../types/metaDecision';
import type {
  ProactiveSuggestionCandidate,
  ProactiveSuggestionPriority,
} from '../types/proactiveSuggestion';
import type { MetaDecisionPersisted } from './metaDecisionStorage';

function priorityBase(p: ProactiveSuggestionPriority): number {
  return { critical: 95, high: 75, medium: 50, low: 25 }[p];
}

function classifyKind(c: ProactiveSuggestionCandidate): MetaDecisionKind {
  if (
    c.category === 'buy_candidate' ||
    c.category === 'high_dividend_value' ||
    c.actionCategory === 'opportunity'
  ) {
    return 'opportunity';
  }
  if (
    c.category === 'sharp_move' ||
    c.category === 'stop_loss_near' ||
    c.category === 'api_failure' ||
    c.actionCategory === 'panic' ||
    c.actionCategory === 'caution'
  ) {
    return 'risk';
  }
  return 'neutral';
}

function inferTimeframe(c: ProactiveSuggestionCandidate): MetaTimeframeKind {
  if (c.category === 'dividend_ex_date' || c.category === 'trend_reversal') return 'weekly';
  if (c.category === 'rsi_signal' || c.category === 'periodic_check') return 'daily';
  return 'intraday';
}

function userStyleMultipliers(styleId: string): {
  urgency: number;
  importance: number;
  confidence: number;
} {
  switch (styleId) {
    case 'short_term':
      return { urgency: 1.2, importance: 1, confidence: 0.95 };
    case 'long_term':
      return { urgency: 0.85, importance: 1.15, confidence: 1.05 };
    case 'panic_seller':
      return { urgency: 1.15, importance: 1.1, confidence: 0.9 };
    case 'averaging_down':
      return { urgency: 0.9, importance: 1.05, confidence: 1 };
    default:
      return { urgency: 1, importance: 1, confidence: 1 };
  }
}

function scoreDimensions(
  c: ProactiveSuggestionCandidate,
  symbolWeightPct: number,
  evidence: BuildMetaDecisionInput['evidenceBySymbol'][string] | undefined,
  styleId: string,
): MetaScoreDimensions {
  const style = userStyleMultipliers(styleId);
  const importance = Math.min(
    100,
    Math.round(priorityBase(c.priority) * style.importance + symbolWeightPct * 0.35),
  );
  const urgency = Math.min(
    100,
    Math.round(
      (c.priority === 'critical' ? 90 : c.priority === 'high' ? 70 : 45) * style.urgency +
        (evidence?.intradayChangePct != null ? Math.abs(evidence.intradayChangePct) * 3 : 0),
    ),
  );
  let confidence = Math.round(55 * style.confidence);
  if (c.notificationWhyJa?.includes('複合シグナル')) confidence += 20;
  if (c.reasonsJa && c.reasonsJa.length >= 2) confidence += 12;
  if (c.source === 'autonomous_agent' || c.source === 'autonomous_emergency') confidence += 8;
  confidence = Math.min(100, confidence);

  const portfolioImpact = Math.min(100, Math.round(symbolWeightPct * 1.1 + (c.symbol ? 15 : 5)));

  return { importance, urgency, confidence, portfolioImpact };
}

function compositeScore(d: MetaScoreDimensions): number {
  return Math.round(
    d.importance * 0.32 + d.urgency * 0.28 + d.confidence * 0.22 + d.portfolioImpact * 0.18,
  );
}

function decayFactor(createdAtMs: number, nowMs: number): number {
  const ageH = (nowMs - createdAtMs) / (3600 * 1000);
  const factor = Math.pow(0.5, ageH / META_SIGNAL_DECAY_HALF_LIFE_HOURS);
  return Math.max(0.25, Math.min(1, factor));
}

function duplicateGroupKey(c: ProactiveSuggestionCandidate): string {
  const sym = (c.symbol ?? '_market').toUpperCase();
  const cat = c.category;
  if (cat === 'sharp_move' || cat === 'volume_spike' || cat === 'urgency_signal') {
    return `${sym}:move`;
  }
  if (cat === 'market_regime' || cat === 'api_failure') return 'market:system';
  return `${sym}:${cat}`;
}

function mergeDuplicateCandidates(
  candidates: ProactiveSuggestionCandidate[],
): { merged: ProactiveSuggestionCandidate[]; mergedCount: number } {
  const groups = new Map<string, ProactiveSuggestionCandidate[]>();
  for (const c of candidates) {
    const k = duplicateGroupKey(c);
    const list = groups.get(k) ?? [];
    list.push(c);
    groups.set(k, list);
  }
  const merged: ProactiveSuggestionCandidate[] = [];
  let mergedCount = 0;
  for (const [, list] of groups) {
    if (list.length === 1) {
      merged.push(list[0]);
      continue;
    }
    mergedCount += list.length - 1;
    const best = [...list].sort(
      (a, b) => priorityBase(b.priority) - priorityBase(a.priority),
    )[0];
    const titles = list.map((x) => x.titleJa).filter((t, i, arr) => arr.indexOf(t) === i);
    merged.push({
      ...best,
      titleJa: titles[0],
      bodyJa: `${best.bodyJa}（類似${list.length}件を統合）`,
      notificationWhyJa: `${best.notificationWhyJa ?? ''} · 重複統合: ${titles.slice(0, 2).join(' / ')}`,
      reasonsJa: [...new Set(list.flatMap((x) => x.reasonsJa ?? []))].slice(0, 5),
    });
  }
  return { merged, mergedCount };
}

function detectContradictions(
  evidenceBySymbol: BuildMetaDecisionInput['evidenceBySymbol'],
): MetaContradiction[] {
  const out: MetaContradiction[] = [];
  for (const [sym, ev] of Object.entries(evidenceBySymbol)) {
    const ch = ev.intradayChangePct ?? 0;
    const bear = ev.bearishPct ?? 0;
    const bull = ev.bullishPct ?? 0;
    if (ch >= 2 && bear >= 55) {
      out.push({
        symbol: sym,
        labelJa: sym,
        detailJa: `価格は+${ch.toFixed(1)}%だがセンチメントはネガティブ${bear}% — 材料の矛盾を確認`,
      });
    }
    if (ch <= -2 && bull >= 55) {
      out.push({
        symbol: sym,
        labelJa: sym,
        detailJa: `価格は${ch.toFixed(1)}%だが投稿は強気${bull}% — 楽観と実勢のギャップ`,
      });
    }
  }
  return out.slice(0, 5);
}

function buildRiskRewardJa(
  kind: MetaDecisionKind,
  d: MetaScoreDimensions,
  ev: BuildMetaDecisionInput['evidenceBySymbol'][string] | undefined,
): string | null {
  if (kind === 'neutral') return null;
  const ch = ev?.intradayChangePct ?? 0;
  if (kind === 'risk') {
    const downside = Math.min(100, d.urgency + Math.abs(Math.min(0, ch)) * 4);
    const upside = Math.max(0, 40 - downside * 0.3);
    return `リスク優先 — 想定下振れ ${downside.toFixed(0)} / 上振れ余地 ${upside.toFixed(0)}（参考）`;
  }
  const upside = Math.min(100, d.importance + Math.max(0, ch) * 3);
  const downside = Math.max(0, 35 - upside * 0.25);
  return `機会優先 — 上振れ余地 ${upside.toFixed(0)} / 下振れ ${downside.toFixed(0)}（参考）`;
}

function whyImportantJa(
  c: ProactiveSuggestionCandidate,
  d: MetaScoreDimensions,
  regimeId: ConciergeMarketRegimeId | 'unknown',
  symbolWeightPct: number,
): string {
  const parts = [
    `総合 ${compositeScore(d)}点`,
    `重要度${d.importance}`,
    `緊急度${d.urgency}`,
    `信頼${d.confidence}%`,
    symbolWeightPct >= 15 ? `保有シェア ${symbolWeightPct.toFixed(0)}%` : null,
    regimeId === 'panic' ? '市場パニックで基準厳格化' : null,
    c.notificationWhyJa,
  ].filter(Boolean);
  return parts.join(' · ');
}

function isRoutineDuringPanic(c: ProactiveSuggestionCandidate, regimeId: string): boolean {
  if (regimeId !== 'panic' && regimeId !== 'risk_off') return false;
  return (
    c.priority !== 'critical' &&
    (c.category === 'buy_candidate' ||
      c.category === 'sell_candidate' ||
      c.category === 'periodic_check' ||
      c.category === 'high_dividend_value')
  );
}

function applyFatigue(
  event: MetaScoredEvent,
  fatigueLog: MetaDecisionPersisted['fatigueLog'],
  nowMs: number,
  emergency: boolean,
): MetaScoredEvent {
  if (emergency || event.candidate.priority === 'critical') return event;
  const cat = event.candidate.category;
  const sym = event.candidate.symbol ?? null;
  const recent = fatigueLog.filter(
    (f) =>
      f.category === cat &&
      f.symbol === sym &&
      nowMs - Date.parse(f.at) < META_FATIGUE_WINDOW_MS,
  );
  if (recent.length >= 1) {
    return {
      ...event,
      suppressed: true,
      suppressReasonJa: '同種警告の連発防止（2時間以内）',
      regimeAdjustedScore: Math.round(event.regimeAdjustedScore * 0.4),
    };
  }
  return event;
}

function applyAttentionBudget(
  events: MetaScoredEvent[],
  budget: MetaDecisionPersisted['dailyBudget'],
  emergency: boolean,
): MetaScoredEvent[] {
  if (emergency) return events;
  let criticalLeft = Math.max(0, META_DAILY_CRITICAL_MAX - budget.criticalShown);
  let highLeft = Math.max(0, META_DAILY_HIGH_MAX - budget.highShown);
  return events.map((e) => {
    if (e.suppressed) return e;
    if (e.candidate.priority === 'critical') {
      if (criticalLeft <= 0) {
        return {
          ...e,
          suppressed: true,
          suppressReasonJa: '本日のcritical表示上限',
        };
      }
      criticalLeft -= 1;
      return e;
    }
    if (e.candidate.priority === 'high') {
      if (highLeft <= 0) {
        return {
          ...e,
          suppressed: true,
          suppressReasonJa: '本日のhigh表示上限',
        };
      }
      highLeft -= 1;
    }
    return e;
  });
}

function regimeMinScore(
  regimeId: ConciergeMarketRegimeId | 'unknown',
  kind: MetaDecisionKind,
  emergency: boolean,
): number {
  if (emergency) return 40;
  const mult = regimeNotifyThresholdMultiplier(regimeId);
  let base = 58 * mult;
  if (regimeId === 'bullish' && kind === 'opportunity') base -= 8;
  if ((regimeId === 'panic' || regimeId === 'risk_off') && kind === 'risk') base -= 6;
  if (regimeId === 'sideways') base += 4;
  return Math.round(base);
}

export function buildMetaDecisionBundle(
  input: BuildMetaDecisionInput,
  persisted: MetaDecisionPersisted,
): MetaDecisionBundle {
  const nowMs = input.nowMs ?? Date.now();
  const regimeId = input.regimeId ?? 'unknown';
  const emergencyOverride =
    input.emergencyMode ||
    input.marketRiskScore >= 85 ||
    regimeId === 'panic';

  const { merged: deduped, mergedCount } = mergeDuplicateCandidates(input.candidates);

  let scored: MetaScoredEvent[] = deduped.map((c, i) => {
    const sym = c.symbol?.toUpperCase() ?? '';
    const weight = sym ? (input.symbolWeightPct[sym] ?? 0) : 0;
    const ev = sym ? input.evidenceBySymbol[sym] : undefined;
    const dimensions = scoreDimensions(c, weight, ev, input.userStyleId);
    const kind = classifyKind(c);
    const base = compositeScore(dimensions);
    let regimeAdjustedScore = base;
    if (isRoutineDuringPanic(c, regimeId)) {
      regimeAdjustedScore = Math.round(base * META_REGIME_PANIC_ROUTINE_DAMPEN);
    }
    regimeAdjustedScore = Math.round(
      regimeAdjustedScore * decayFactor(nowMs, nowMs),
    );
    const tf = inferTimeframe(c);
    return {
      id: `meta-${i}-${c.dedupeKey}`,
      candidate: c,
      dimensions,
      compositeScore: base,
      kind,
      timeframe: tf,
      whyImportantJa: whyImportantJa(c, dimensions, regimeId, weight),
      riskRewardJa: buildRiskRewardJa(kind, dimensions, ev),
      decayFactor: 1,
      regimeAdjustedScore,
      duplicateGroupId: duplicateGroupKey(c),
      suppressed: false,
      suppressReasonJa: null,
    };
  });

  scored = scored
    .map((e) => applyFatigue(e, persisted.fatigueLog, nowMs, emergencyOverride))
    .map((e) => {
      const min = regimeMinScore(regimeId, e.kind, emergencyOverride);
      if (!e.suppressed && e.regimeAdjustedScore < min && e.candidate.priority !== 'critical') {
        return {
          ...e,
          suppressed: true,
          suppressReasonJa: `レジーム ${regimeId} の通知基準未満（${e.regimeAdjustedScore} < ${min}）`,
        };
      }
      return e;
    });

  scored = applyAttentionBudget(scored, persisted.dailyBudget, emergencyOverride);

  const active = scored
    .filter((e) => !e.suppressed)
    .sort((a, b) => b.regimeAdjustedScore - a.regimeAdjustedScore);

  const approvedCandidates = active.map((e) => e.candidate);

  const topPriorities: MetaCuratedPriority[] = active.slice(0, META_CURATED_FOCUS_MAX).map(
    (e, i) => ({
      rank: i + 1,
      titleJa: e.candidate.titleJa,
      whyImportantJa: e.whyImportantJa,
      symbol: e.candidate.symbol ?? null,
      kind: e.kind,
      compositeScore: e.regimeAdjustedScore,
    }),
  );

  const opportunities: MetaCuratedPriority[] = active
    .filter((e) => e.kind === 'opportunity')
    .slice(0, 5)
    .map((e, i) => ({
      rank: i + 1,
      titleJa: e.candidate.titleJa,
      whyImportantJa: e.whyImportantJa,
      symbol: e.candidate.symbol ?? null,
      kind: e.kind,
      compositeScore: e.regimeAdjustedScore,
    }));

  const decisionQueue: MetaDecisionQueueItem[] = active
    .slice(0, META_QUEUE_DISPLAY_MAX)
    .map((e, i) => ({ rank: i + 1, event: e }));

  const contradictions = detectContradictions(input.evidenceBySymbol);

  const topRisk = active.find((e) => e.kind === 'risk');
  const topOpp = active.find((e) => e.kind === 'opportunity');
  const topAny = active[0];

  const executiveSummary: MetaExecutiveSummary = {
    generatedAt: new Date(nowMs).toISOString(),
    marketJa: `レジーム ${regimeId} · 市場リスク ${input.marketRiskScore} · 恐怖 ${input.fearScore}`,
    maxRiskJa: topRisk
      ? `${topRisk.candidate.titleJa}（${topRisk.regimeAdjustedScore}点）`
      : '重大リスクは選別結果では限定的',
    maxOpportunityJa: topOpp
      ? `${topOpp.candidate.titleJa}（${topOpp.regimeAdjustedScore}点）`
      : '明確な機会シグナルは少ない',
    topSymbolJa: topAny?.candidate.symbol
      ? `${topAny.candidate.symbol} — ${topAny.candidate.titleJa}`
      : '—',
  };

  const suppressedCount = scored.filter((e) => e.suppressed).length;
  const budgetJa = emergencyOverride
    ? '緊急モード — 注意予算を一時解除'
    : `本日 critical ${persisted.dailyBudget.criticalShown}/${META_DAILY_CRITICAL_MAX} · high ${persisted.dailyBudget.highShown}/${META_DAILY_HIGH_MAX}`;

  return {
    generatedAt: new Date(nowMs).toISOString(),
    regimeId,
    emergencyOverride,
    attentionBudgetJa: budgetJa,
    executiveSummary,
    topPriorities,
    decisionQueue,
    opportunities,
    contradictions,
    approvedCandidates,
    mergedCount,
    suppressedCount,
  };
}
