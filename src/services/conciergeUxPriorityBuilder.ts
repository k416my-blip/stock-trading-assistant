/**
 * UX & Information Priority — コンシェルジュ向けサマリー・優先度・1画面判断
 */
import {
  CONCIERGE_RISK_LABELS_JA,
  NOTIFICATION_DIGEST_MIN_COUNT,
} from '../constants/conciergeUx';
import type {
  BuildConciergeUxInput,
  ConciergeAiSummaryCard,
  ConciergeContextMemoryItem,
  ConciergeFocusSymbol,
  ConciergeInfoPriority,
  ConciergeMarketRadarItem,
  ConciergeNotificationDigest,
  ConciergeOneScreenSection,
  ConciergeRiskColor,
  ConciergeUxBundle,
  ConciergeUxDisplayMode,
} from '../types/conciergeUx';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';

function riskFromScore(score: number, panic = false): ConciergeRiskColor {
  if (panic) return 'red';
  if (score >= 75) return 'red';
  if (score >= 55) return 'orange';
  if (score >= 35) return 'yellow';
  return 'green';
}

function priorityRank(p: ConciergeInfoPriority): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[p];
}

function buildSummary(input: BuildConciergeUxInput): ConciergeAiSummaryCard {
  const regime =
    input.globalMarket?.regimeLabelJa ??
    input.marketRegimeLabel ??
    '市場データを確認中';
  const situationLineJa = `市場は${regime.replace(/^市場は/, '')}`;

  const topSym = input.evidence?.symbols[0];
  let dangerLineJa = '注目銘柄の異常は限定的';
  let panic = false;
  if (topSym) {
    const flags = topSym.unusualActivityFlags.map((f) => f.labelJa).join(' · ');
    const bear = topSym.xSentiment?.bearishPct ?? 0;
    const surge = topSym.xSentiment?.postSurgeRatePct;
    if (flags) {
      dangerLineJa = `${topSym.displayLabelJa}で${flags.split('·')[0]?.trim() ?? '異常シグナル'}`;
    } else if (bear >= 60) {
      dangerLineJa = `${topSym.displayLabelJa}でネガティブ投稿が増加（${Math.round(bear)}%）`;
    } else if (surge != null && surge >= 40) {
      dangerLineJa = `${topSym.displayLabelJa}で投稿急増（+${Math.round(surge)}%）`;
    }
    panic = (topSym.xSentiment?.panicPct ?? 0) >= 35;
  }

  const guide = input.evidence?.actionGuide;
  let judgmentLineJa = '様子見 — 新規買いは慎重';
  if (guide) {
    if (guide.primaryCategory === 'panic' || guide.primaryCategory === 'caution') {
      judgmentLineJa = '新規買いは慎重 — リスク整理を優先';
    } else if (guide.primaryCategory === 'opportunity') {
      judgmentLineJa = '選別的に検討 — 利確・分散も意識';
    } else if (guide.overallStance === 'bullish') {
      judgmentLineJa = '積極的すぎない範囲で検討';
    }
  }
  if (input.degradedMode) {
    judgmentLineJa = 'データ品質に注意 — 判断は補助のみ';
  }

  const riskScore =
    (input.globalMarket?.marketScores.marketRiskScore ?? 40) +
    (panic ? 25 : 0) +
    (input.evidence?.riskControl?.overallConfidencePct != null &&
    input.evidence.riskControl.overallConfidencePct < 50
      ? 20
      : 0);
  const riskColor = riskFromScore(riskScore, panic);

  return {
    situationLineJa,
    dangerLineJa,
    judgmentLineJa,
    riskColor,
    riskLabelJa: CONCIERGE_RISK_LABELS_JA[riskColor],
  };
}

function buildRadar(
  evidence?: ConciergeEvidenceBundle | null,
  global?: GlobalMarketAnalysisBundle | null,
): ConciergeMarketRadarItem[] {
  const items: ConciergeMarketRadarItem[] = [];

  for (const sym of evidence?.symbols ?? []) {
    for (const flag of sym.unusualActivityFlags) {
      let kind: ConciergeMarketRadarItem['kind'] = 'sentiment_anomaly';
      if (flag.id === 'sharp_drop_5pct') kind = 'sharp_drop';
      else if (flag.id === 'volume_surge_3x') kind = 'volume_surge';
      items.push({
        id: `${sym.symbol}-${flag.id}`,
        kind,
        labelJa: `${sym.displayLabelJa}: ${flag.labelJa}`,
        symbol: sym.symbol,
        priority: kind === 'sharp_drop' ? 'critical' : 'high',
      });
    }
    if ((sym.xSentiment?.panicPct ?? 0) >= 30) {
      items.push({
        id: `${sym.symbol}-sentiment`,
        kind: 'sentiment_anomaly',
        labelJa: `${sym.displayLabelJa}: ネガティブ・不安投稿が多い`,
        symbol: sym.symbol,
        priority: 'high',
      });
    }
  }

  const vix = global?.vix;
  if (vix?.value != null && (vix.changePct ?? 0) >= 8) {
    items.push({
      id: 'vix-spike',
      kind: 'vix_anomaly',
      labelJa: `VIX ${vix.value.toFixed(1)}（${vix.changePct != null ? `${vix.changePct >= 0 ? '+' : ''}${vix.changePct.toFixed(1)}%` : '変動大'}）`,
      symbol: null,
      priority: 'high',
    });
  }

  return items.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 8);
}

function buildDigest(
  proactive?: BuildConciergeUxInput['proactiveTitles'],
): ConciergeNotificationDigest | null {
  if (!proactive?.length) return null;
  const recent = proactive;
  if (recent.length < NOTIFICATION_DIGEST_MIN_COUNT) return null;

  const today = new Date().toISOString().slice(0, 10);
  const bullets = recent.slice(0, 5).map((p) => p.titleJa);
  return {
    titleJa: `本日${recent.length}件の異常検知`,
    summaryJa: bullets.join(' · '),
    itemCount: recent.length,
    bulletsJa: bullets,
  };
}

function buildContextMemory(input: BuildConciergeUxInput): ConciergeContextMemoryItem[] {
  const items: ConciergeContextMemoryItem[] = [];
  for (const j of input.portfolioIntel?.journalRecent ?? []) {
    if (j.kind === 'notification' || j.kind === 'caution') {
      items.push({
        at: j.at,
        titleJa: j.titleJa,
        whyJa: j.whyJa ?? j.bodyJa.slice(0, 120),
        symbol: j.symbol,
      });
    }
  }
  for (const p of input.proactiveTitles ?? []) {
    if (p.whyJa) {
      items.push({
        at: new Date().toISOString(),
        titleJa: p.titleJa,
        whyJa: p.whyJa,
        symbol: p.symbol ?? null,
      });
    }
  }
  return items.slice(0, 6);
}

function buildFocus(evidence?: ConciergeEvidenceBundle | null): ConciergeFocusSymbol | null {
  const sym = evidence?.symbols[0];
  if (!sym) return null;
  const flag = sym.unusualActivityFlags[0]?.labelJa;
  const headlineJa = flag ?? sym.newsSummaryJa.slice(0, 80) ?? `${sym.displayLabelJa}を要確認`;
  const score =
    sym.unusualActivityFlags.length * 20 +
    (sym.intradayChangePct != null && sym.intradayChangePct < -3 ? 30 : 0);
  const riskColor = riskFromScore(score, (sym.xSentiment?.panicPct ?? 0) > 35);
  return {
    symbol: sym.symbol,
    displayLabelJa: sym.displayLabelJa,
    headlineJa,
    riskColor,
    priority: score >= 50 ? 'critical' : 'high',
  };
}

function buildOneScreen(input: BuildConciergeUxInput, summary: ConciergeAiSummaryCard): ConciergeOneScreenSection[] {
  const sections: ConciergeOneScreenSection[] = [];

  sections.push({
    id: 'market',
    titleJa: '市場状態',
    linesJa: [
      summary.situationLineJa,
      input.riskModeLabel ? `リスクモード: ${input.riskModeLabel}` : '',
      input.globalMarket?.regimeSummaryJa ?? '',
    ].filter(Boolean),
    riskColor: summary.riskColor,
    priority: 'medium',
  });

  const dangers: string[] = [];
  if (summary.dangerLineJa) dangers.push(summary.dangerLineJa);
  for (const p of input.portfolioIntel?.lossPatterns ?? []) {
    dangers.push(p.labelJa);
  }
  if (input.evidence?.riskControl?.globalStaleWarningJa) {
    dangers.push(input.evidence.riskControl.globalStaleWarningJa);
  }
  sections.push({
    id: 'danger',
    titleJa: '危険・注意',
    linesJa: dangers.length ? dangers : ['重大な危険シグナルは少ない'],
    riskColor: summary.riskColor === 'green' ? 'yellow' : summary.riskColor,
    priority: 'high',
  });

  const watch: string[] = [];
  for (const s of input.evidence?.symbols.slice(0, 3) ?? []) {
    watch.push(`${s.displayLabelJa}: ${s.intradayChangePct != null ? `${s.intradayChangePct.toFixed(1)}%` : '—'}`);
  }
  sections.push({
    id: 'watch',
    titleJa: '注目',
    linesJa: watch.length ? watch : ['注目銘柄なし'],
    riskColor: 'yellow',
    priority: 'medium',
  });

  const actions: string[] = [];
  const guide = input.evidence?.actionGuide;
  if (guide) {
    actions.push(...guide.aggregatedRecommendationsJa.slice(0, 3));
    actions.push(...guide.aggregatedAttentionJa.slice(0, 2));
  } else {
    actions.push(summary.judgmentLineJa);
  }
  sections.push({
    id: 'action',
    titleJa: '行動の目安',
    linesJa: actions,
    riskColor: 'green',
    priority: 'high',
  });

  return sections;
}

function defaultCollapseForMode(mode: ConciergeUxDisplayMode): Record<ConciergeInfoPriority, boolean> {
  if (mode === 'beginner') {
    return { critical: false, high: false, medium: true, low: true };
  }
  return { critical: false, high: false, medium: false, low: true };
}

export function buildConciergeUxBundle(input: BuildConciergeUxInput): ConciergeUxBundle {
  const summary = buildSummary(input);
  return {
    generatedAt: new Date().toISOString(),
    displayMode: input.displayMode,
    summary,
    oneScreen: buildOneScreen(input, summary),
    radar: buildRadar(input.evidence, input.globalMarket),
    digest: buildDigest(input.proactiveTitles),
    contextMemory: buildContextMemory(input),
    focusSymbol: buildFocus(input.evidence),
    defaultCollapse: defaultCollapseForMode(input.displayMode),
  };
}

export function buildStubConciergeUxBundle(
  displayMode: ConciergeUxDisplayMode = 'beginner',
): ConciergeUxBundle {
  return buildConciergeUxBundle({
    displayMode,
    marketRegimeLabel: 'レンジ',
    riskModeLabel: '標準',
    degradedMode: false,
  });
}
