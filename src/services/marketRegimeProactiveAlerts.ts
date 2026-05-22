import {
  INDEX_SHARP_DROP_PCT,
  KLCI_SHARP_DROP_PCT,
  VIX_PANIC_THRESHOLD,
  VIX_SPIKE_THRESHOLD,
} from '../constants/globalMarket';
import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type { ProactiveSuggestionCandidate } from '../types/proactiveSuggestion';
import { buildProactiveDedupeKey } from './proactiveSuggestionQueue';

/** 市場全体の異常 — 自発通知候補 */
export function evaluateGlobalMarketProactiveAlerts(
  analysis: GlobalMarketAnalysisBundle | null | undefined,
): ProactiveSuggestionCandidate[] {
  if (!analysis) return [];
  const out: ProactiveSuggestionCandidate[] = [];

  const vixVal = analysis.vix?.value;
  const klci = analysis.indices.find((i) => i.id === 'klci');
  const usAvg = analysis.indices
    .filter((i) => i.region === 'us' && i.changePct != null)
    .map((i) => i.changePct!);
  const usMean = usAvg.length ? usAvg.reduce((a, b) => a + b, 0) / usAvg.length : null;

  if (analysis.regimeId === 'risk_off' || analysis.regimeId === 'panic') {
    out.push({
      priority: analysis.regimeId === 'panic' ? 'critical' : 'high',
      category: 'market_regime',
      dedupeKey: buildProactiveDedupeKey(
        'market_regime_global',
        analysis.regimeId === 'panic' ? 'critical' : 'high',
        analysis.regimeId,
      ),
      titleJa: `市場全体が${analysis.regimeLabelJa}へ転換`,
      bodyJa: analysis.regimeSummaryJa,
      actionHintJa: 'AIコンシェルジュで市場状況カードと個別銘柄を照合してください',
      reasonsJa: analysis.marketWideFactorsJa.slice(0, 4),
      notificationWhyJa: `レジーム判定: ${analysis.regimeLabelJa}（信頼度 ${analysis.regimeConfidencePct}%）— ${analysis.regimeSummaryJa}`,
      source: `global_market:${analysis.regimeId}`,
    });
  }

  if (vixVal != null && vixVal >= VIX_SPIKE_THRESHOLD) {
    const panic = vixVal >= VIX_PANIC_THRESHOLD;
    out.push({
      priority: panic ? 'critical' : 'high',
      category: 'market_regime',
      dedupeKey: buildProactiveDedupeKey('vix_spike', panic ? 'critical' : 'high'),
      titleJa: panic ? 'VIX急騰 — 市場の恐怖指数が急上昇' : 'VIX上昇 — ボラティリティ拡大',
      bodyJa: `VIX ${vixVal.toFixed(1)} pt。個別材料以上に市場全体のリスクオフが進む可能性（参考）`,
      actionHintJa: '防御的配分・ポジションサイズを見直してください',
      reasonsJa: [`VIX ${vixVal.toFixed(1)}`, ...analysis.marketWideFactorsJa.slice(0, 2)],
      notificationWhyJa: `恐怖指数VIXが${VIX_SPIKE_THRESHOLD}を超過（現在 ${vixVal.toFixed(1)}）`,
      source: 'global_market:vix',
    });
  }

  if (klci?.changePct != null && klci.changePct <= KLCI_SHARP_DROP_PCT) {
    out.push({
      priority: 'high',
      category: 'market_regime',
      dedupeKey: buildProactiveDedupeKey('klci_drop', 'high'),
      titleJa: 'KLCI大幅下落',
      bodyJa: `FTSE Bursa KLCI ${klci.changePct.toFixed(2)}%。マレーシア保有銘柄の地合い悪化に注意（参考）`,
      actionHintJa: 'Bursa保有のニュース・出来高を確認',
      reasonsJa: [`KLCI ${klci.changePct.toFixed(2)}%`, analysis.regimeSummaryJa],
      notificationWhyJa: `KLCIが${KLCI_SHARP_DROP_PCT}%以下の下落（${klci.changePct.toFixed(2)}%）`,
      source: 'global_market:klci',
    });
  }

  if (usMean != null && usMean <= INDEX_SHARP_DROP_PCT) {
    out.push({
      priority: 'medium',
      category: 'market_regime',
      dedupeKey: buildProactiveDedupeKey('us_index_weak', 'medium'),
      titleJa: '米国主要指数が軟調',
      bodyJa: `米指数平均 ${usMean.toFixed(2)}% — グローバルリスクオフの兆候（参考）`,
      actionHintJa: '米国連動銘柄のボラティリティを確認',
      reasonsJa: analysis.marketWideFactorsJa.filter((f) => f.includes('米国') || f.includes('S&P') || f.includes('Nasdaq')).slice(0, 3),
      notificationWhyJa: `米国指数平均が${INDEX_SHARP_DROP_PCT}%以下（${usMean.toFixed(2)}%）`,
      source: 'global_market:us_indices',
    });
  }

  return out;
}
