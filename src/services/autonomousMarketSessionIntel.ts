import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type { MarketSessionBrief } from '../types/autonomousMonitoring';

/** UTC+8 想定（MY/SG） */
function hourMalaysia(): number {
  const utc = new Date();
  return (utc.getUTCHours() + 8) % 24;
}

export function buildMarketSessionBrief(
  global: GlobalMarketAnalysisBundle | null,
): MarketSessionBrief | null {
  if (!global) return null;
  const h = hourMalaysia();
  const bullets = [
    global.regimeLabelJa,
    global.regimeSummaryJa.slice(0, 120),
    ...global.macroContextBulletsJa.slice(0, 2),
  ].filter(Boolean);

  if (h >= 8 && h < 11) {
    return {
      phase: 'open',
      titleJa: '寄付き — 市場オープン分析',
      bulletsJa: bullets,
    };
  }
  if (h >= 16 && h < 18) {
    return {
      phase: 'close',
      titleJa: '引け前 — クローズ分析',
      bulletsJa: bullets,
    };
  }
  if (h >= 12 && h < 14) {
    return {
      phase: 'midday',
      titleJa: '昼休み — 中間チェック',
      bulletsJa: bullets.slice(0, 3),
    };
  }
  return null;
}

export function buildDailyBriefing(
  global: GlobalMarketAnalysisBundle | null,
  watchLabels: string[],
  threats: string[],
): import('../types/autonomousMonitoring').AutonomousDailyBriefing | null {
  const h = hourMalaysia();
  if (h < 6 || h > 11) return null;
  if (!global) return null;
  return {
    generatedAt: new Date().toISOString(),
    marketJa: `${global.regimeLabelJa} — ${global.regimeSummaryJa.slice(0, 100)}`,
    watchJa: watchLabels.slice(0, 5),
    risksJa: threats.length ? threats : ['重大リスクは限定的'],
    eventsJa: global.marketWideFactorsJa.slice(0, 3),
  };
}

export function buildNightReview(
  global: GlobalMarketAnalysisBundle | null,
  anomalies: string[],
  predictionAccuracyJa: string | null,
): import('../types/autonomousMonitoring').AutonomousNightReview | null {
  const h = hourMalaysia();
  if (h < 20 || h > 23) return null;
  return {
    generatedAt: new Date().toISOString(),
    anomaliesJa: anomalies.length ? anomalies : ['大きな異常は記録少'],
    predictionAccuracyJa,
    marketChangeJa: global
      ? `${global.regimeLabelJa}（リスク ${global.marketScores.marketRiskScore}）`
      : '市場データ未取得',
  };
}
