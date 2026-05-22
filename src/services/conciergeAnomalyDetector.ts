import {
  CONCIERGE_NEGATIVE_BEARISH_PCT,
  CONCIERGE_NEGATIVE_POST_SURGE_PCT,
  CONCIERGE_SHARP_DROP_PCT,
  CONCIERGE_VOLUME_SURGE_RATIO,
} from '../constants/aiDataDriven';
import { ACTION_VOLUME_SURGE_RATIO } from '../constants/aiActionGuide';
import type { AiActionCategory } from '../types/conciergeActionGuide';
import type {
  ConciergeSymbolEvidence,
  ConciergeUnusualFlag,
} from '../types/conciergeEvidence';
import type { ProactiveSuggestionPriority } from '../types/proactiveSuggestion';
import type { ProactiveSuggestionCandidate } from '../types/proactiveSuggestion';
import { formatSymbolDisplay } from '../utils/formatSymbolDisplay';
import { buildProactiveDedupeKey } from './proactiveSuggestionQueue';
import { buildSymbolActionGuide } from './conciergeActionGuideBuilder';
import { crossValidateSymbolEvidence } from './conciergeRiskControlBuilder';

export function detectUnusualActivityForSymbol(input: {
  intradayChangePct: number | null;
  volumeSurgeRatio: number | null;
  xSentiment: ConciergeSymbolEvidence['xSentiment'];
}): ConciergeUnusualFlag[] {
  const flags: ConciergeUnusualFlag[] = [];

  if (input.intradayChangePct != null && input.intradayChangePct <= CONCIERGE_SHARP_DROP_PCT) {
    flags.push({
      id: 'sharp_drop_5pct',
      labelJa: `日中 ${input.intradayChangePct.toFixed(1)}% の急落（5%以上）`,
    });
  }

  const volThreshold = Math.max(CONCIERGE_VOLUME_SURGE_RATIO, ACTION_VOLUME_SURGE_RATIO);
  if (input.volumeSurgeRatio != null && input.volumeSurgeRatio >= volThreshold) {
    flags.push({
      id: 'volume_surge_3x',
      labelJa: `出来高急増（直近5日平均の約${input.volumeSurgeRatio.toFixed(1)}倍・3倍以上）`,
    });
  }

  const xs = input.xSentiment;
  if (xs) {
    if (xs.bearishPct >= CONCIERGE_NEGATIVE_BEARISH_PCT) {
      flags.push({
        id: 'negative_ratio_70',
        labelJa: `ネガティブ投稿比率 ${xs.bearishPct}%（70%以上）`,
      });
    }
    if (
      xs.postSurgeRatePct != null &&
      xs.postSurgeRatePct >= CONCIERGE_NEGATIVE_POST_SURGE_PCT &&
      xs.bearishPct >= 35
    ) {
      flags.push({
        id: 'negative_post_surge',
        labelJa: `ネガティブ投稿急増（bear ${xs.bearishPct}% · 投稿+${xs.postSurgeRatePct.toFixed(0)}%）`,
      });
    } else if (xs.bearishPct >= 50 && xs.postCount >= 5) {
      flags.push({
        id: 'negative_post_surge',
        labelJa: `ネガティブ投稿が多い（bear ${xs.bearishPct}% · 投稿${xs.postCount}件）`,
      });
    }

    if (xs.panicPct >= 25 && xs.bearishPct >= 40) {
      flags.push({
        id: 'sentiment_shift',
        labelJa: `センチメント悪化（panic ${xs.panicPct}% · bear ${xs.bearishPct}%）`,
      });
    } else if (xs.hypePct >= 35 && xs.bullishPct >= 55) {
      flags.push({
        id: 'sentiment_shift',
        labelJa: `センチメント過熱（hype ${xs.hypePct}% · bull ${xs.bullishPct}%）`,
      });
    }
  }

  return flags;
}

function mapPriorityToProactive(
  tier: import('../types/conciergeActionGuide').NotificationPriorityTier,
): ProactiveSuggestionPriority {
  if (tier === 'critical') return 'critical';
  if (tier === 'high') return 'high';
  if (tier === 'medium') return 'medium';
  return 'low';
}

function actionCategoryLabelJa(cat: AiActionCategory): string {
  const labels: Record<AiActionCategory, string> = {
    watch: '様子見',
    caution: '注意',
    panic: 'パニック警戒',
    opportunity: '機会',
    'profit-taking': '利確検討',
    'high-risk': '高リスク',
    'unusual-volume': '出来高異常',
    'rumor-alert': '噂・投稿警戒',
  };
  return labels[cat];
}

export function evaluateConciergeDataProactiveAlerts(
  symbols: ConciergeSymbolEvidence[],
): ProactiveSuggestionCandidate[] {
  const out: ProactiveSuggestionCandidate[] = [];

  for (const sym of symbols) {
    const guide = buildSymbolActionGuide(sym);
    const label = sym.displayLabelJa;
    const crossVal = crossValidateSymbolEvidence(sym);
    let priority = mapPriorityToProactive(guide.notificationPriority);
    if ((priority === 'critical' || priority === 'high') && !crossVal.strongWarningAllowed) {
      priority = 'medium';
    }
    const whyJa = `${guide.notificationWhyJa} · ${crossVal.summaryJa}`;
    const catLabel = actionCategoryLabelJa(guide.primaryCategory);

    if (guide.insufficientData) {
      continue;
    }

    for (const flag of sym.unusualActivityFlags) {
      let titleJa = `${label}: ${flag.labelJa}`;
      let category: ProactiveSuggestionCandidate['category'] = 'sharp_move';

      if (flag.id === 'sharp_drop_5pct') {
        if (sym.volumeSurgeRatio != null && sym.volumeSurgeRatio >= ACTION_VOLUME_SURGE_RATIO) {
          titleJa = `${label}が高出来高で下落しています`;
          category = 'volume_spike';
        } else {
          titleJa = `${label}が急落しています（${sym.intradayChangePct?.toFixed(1)}%）`;
        }
      } else if (flag.id === 'volume_surge_3x') {
        category = 'volume_spike';
        titleJa = `${label}の出来高が急増しています（約${sym.volumeSurgeRatio?.toFixed(1)}倍）`;
      } else if (flag.id === 'negative_post_surge' || flag.id === 'negative_ratio_70') {
        category = 'news_change';
        titleJa = `${label}でネガティブ投稿が急増しています`;
        if (
          flag.id === 'negative_post_surge' &&
          sym.intradayChangePct == null &&
          (sym.volumeSurgeRatio == null || sym.volumeSurgeRatio < ACTION_VOLUME_SURGE_RATIO)
        ) {
          continue;
        }
      } else if (flag.id === 'sentiment_shift') {
        titleJa = `${label}でセンチメントが急変しています`;
      }

      out.push({
        priority,
        category,
        dedupeKey: buildProactiveDedupeKey('data_alert', priority, `${sym.symbol}:${flag.id}`),
        titleJa,
        bodyJa: `${whyJa} · 行動: ${catLabel}（参考情報）`,
        actionHintJa: guide.recommendedActionsJa[0] ?? 'AIコンシェルジュで行動案を確認',
        symbol: sym.symbol,
        market: sym.market,
        reasonsJa: [...guide.reasonBulletsJa.slice(0, 2), flag.labelJa],
        notificationWhyJa: whyJa,
        actionCategory: guide.primaryCategory,
        source: `concierge_data:${flag.id}`,
      });
    }

    if (sym.unusualActivityFlags.length === 0 && guide.primaryCategory !== 'watch') {
      out.push({
        priority,
        category: 'sharp_move',
        dedupeKey: buildProactiveDedupeKey('data_alert', priority, `${sym.symbol}:${guide.primaryCategory}`),
        titleJa: `${label}: ${catLabel}（${guide.marketStanceLabelJa}）`,
        bodyJa: whyJa,
        actionHintJa: guide.recommendedActionsJa[0] ?? '詳細をコンシェルジュで確認',
        symbol: sym.symbol,
        market: sym.market,
        reasonsJa: guide.reasonBulletsJa,
        notificationWhyJa: whyJa,
        actionCategory: guide.primaryCategory,
        source: `concierge_action:${guide.primaryCategory}`,
      });
    }
  }

  return out;
}
