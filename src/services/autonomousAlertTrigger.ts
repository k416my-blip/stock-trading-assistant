import {
  AUTONOMOUS_MIN_SIGNALS,
  AUTONOMOUS_NOTIFY_SCORE_MIN,
  AUTONOMOUS_SILENT_SCORE_MAX,
} from '../constants/autonomousMonitoring';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type {
  AutonomousAggressiveness,
  AutonomousAlertEvaluation,
  AutonomousAlertSignalKind,
} from '../types/autonomousMonitoring';
import { scoreNewsImportance } from './eventImportanceScorer';

function hasRegimeStress(global: GlobalMarketAnalysisBundle | null): boolean {
  if (!global) return false;
  return (
    global.regimeId === 'panic' ||
    global.regimeId === 'risk_off' ||
    global.marketScores.marketRiskScore >= 65
  );
}

export function evaluateAutonomousAlertForSymbol(
  sym: ConciergeSymbolEvidence,
  global: GlobalMarketAnalysisBundle | null,
  aggressiveness: AutonomousAggressiveness,
  excluded: boolean,
): AutonomousAlertEvaluation {
  const activeSignals: AutonomousAlertSignalKind[] = [];
  let score = 0;

  if (sym.intradayChangePct != null && Math.abs(sym.intradayChangePct) >= 2.5) {
    activeSignals.push('price_action');
    score += Math.min(35, Math.abs(sym.intradayChangePct) * 6);
  }
  if (sym.volumeSurgeRatio != null && sym.volumeSurgeRatio >= 2) {
    activeSignals.push('volume_spike');
    score += Math.min(28, sym.volumeSurgeRatio * 8);
  }
  const xs = sym.xSentiment;
  if (
    xs &&
    (xs.bearishPct >= 55 ||
      xs.panicPct >= 28 ||
      (xs.postSurgeRatePct != null && xs.postSurgeRatePct >= 35))
  ) {
    activeSignals.push('sentiment_shift');
    score += Math.min(25, xs.bearishPct * 0.35 + xs.panicPct * 0.2);
  }
  const newsScore = scoreNewsImportance(sym.latestFinancialNews);
  if (newsScore >= 40) {
    activeSignals.push('news_impact');
    score += newsScore * 0.35;
  }
  if (hasRegimeStress(global) && sym.unusualActivityFlags.length > 0) {
    activeSignals.push('market_regime');
    score += 15;
  }

  const compositeScore = Math.min(100, Math.round(score));
  const minSignals = AUTONOMOUS_MIN_SIGNALS[aggressiveness];
  const minScore = AUTONOMOUS_NOTIFY_SCORE_MIN[aggressiveness];
  const signalCount = activeSignals.length;

  const whyParts = [
    ...activeSignals.map((k) => {
      const labels: Record<AutonomousAlertSignalKind, string> = {
        price_action: '価格変動',
        volume_spike: '出来高急増',
        sentiment_shift: 'センチメント変化',
        news_impact: `ニュース重要度${newsScore}`,
        market_regime: '市場レジーム悪化',
      };
      return labels[k];
    }),
    sym.unusualActivityFlags[0]?.labelJa,
  ].filter(Boolean);

  const notificationWhyJa = `複合シグナル ${signalCount}件（${whyParts.join(' · ')}）— スコア ${compositeScore}`;

  const shouldNotify =
    !excluded &&
    signalCount >= minSignals &&
    compositeScore >= minScore;
  const silentOnly =
    !shouldNotify && compositeScore >= AUTONOMOUS_SILENT_SCORE_MAX && signalCount >= 1;

  return {
    symbol: sym.symbol,
    displayLabelJa: sym.displayLabelJa,
    compositeScore,
    activeSignals,
    signalCount,
    notificationWhyJa,
    shouldNotify,
    silentOnly,
    newsImportanceScore: newsScore,
  };
}
