/**
 * シグナル → 自発提案文案（参考情報のみ・自動売買なし）
 */
import type { PortfolioPosition } from '../types';
import type { PortfolioPriceSyncState } from '../types/marketData';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { MarketSignal, MarketSignalKind } from '../types/marketSignal';
import type { UrgencySignal } from '../types/urgencySignal';
import type {
  ProactiveStateFingerprint,
  ProactiveSuggestionCandidate,
  ProactiveSuggestionCategory,
} from '../types/proactiveSuggestion';
import { buildProactiveDedupeKey } from './proactiveSuggestionQueue';
import { evaluateConciergeDataProactiveAlerts } from './conciergeAnomalyDetector';
import { evaluateGlobalMarketProactiveAlerts } from './marketRegimeProactiveAlerts';
import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import { evaluateMarketSignals } from './signal-engine';
import { calculatePositionsPnLFromList } from './portfolio';

export type ProactiveEvaluationInput = {
  holdings: PortfolioPosition[];
  priceSync: PortfolioPriceSyncState;
  urgencySignals: UrgencySignal[];
  staleHoldingsCount: number;
  degradedMode: boolean;
  buyCandidateTickers: string[];
  sellCandidateTickers: string[];
  newsChangeCount?: number;
  marketRegime?: MarketRegimeResult | null;
  previous: ProactiveStateFingerprint | null;
  nowMs?: number;
  /** 実データ分析型 — 保有銘柄の異常フラグ（キャッシュベース） */
  conciergeEvidenceSymbols?: ConciergeSymbolEvidence[];
  globalMarketAnalysis?: GlobalMarketAnalysisBundle | null;
};

function signalKindToCategory(kind: MarketSignalKind): ProactiveSuggestionCategory {
  switch (kind) {
    case 'price_surge':
    case 'unrealized_sharp_gain':
      return 'sharp_move';
    case 'price_drop':
    case 'unrealized_sharp_loss':
      return 'sharp_move';
    case 'volume_spike':
      return 'volume_spike';
    case 'stop_loss_near':
      return 'stop_loss_near';
    case 'take_profit_near':
      return 'take_profit_near';
    case 'rsi_overbought':
    case 'rsi_oversold':
      return 'rsi_signal';
    case 'trend_reversal_bull':
    case 'trend_reversal_bear':
      return 'trend_reversal';
    case 'dividend_ex_date':
      return 'dividend_ex_date';
    case 'allocation_concentration':
      return 'allocation_skew';
    case 'market_weak':
      return 'market_regime';
    case 'high_dividend_value':
      return 'high_dividend_value';
    default:
      return 'sharp_move';
  }
}

function signalToCandidate(signal: MarketSignal): ProactiveSuggestionCandidate {
  const category = signalKindToCategory(signal.kind);
  const sym = signal.symbol;
  const label = signal.name ?? sym ?? '市場';
  const reasons = signal.reasonsJa;

  let titleJa = '市場の変化を検出しました';
  let bodyJa = signal.detailJa ?? reasons.join(' · ');
  let actionHintJa = '保有画面または銘柄分析で確認してください（参考情報）';

  switch (signal.kind) {
    case 'take_profit_near':
      titleJa = sym ? `${sym} が利確ラインに近づいています` : '利確ラインに近づいています';
      bodyJa = `${label} — ${reasons.join(' · ')}（参考・最終判断はご自身で）`;
      actionHintJa = '売却候補として情報を確認してください';
      break;
    case 'stop_loss_near':
      titleJa = sym ? `${sym} が損切りラインに近づいています` : '損切りラインに近づいています';
      bodyJa = `${label} — ${reasons.join(' · ')}（参考）`;
      actionHintJa = '損切りラインとニュースを確認してください';
      break;
    case 'allocation_concentration':
      titleJa = sym ? `${sym} に資金集中しすぎています` : '配分が偏っている可能性があります';
      bodyJa = `${label} の評価額シェアが大きいです（${reasons.join(' · ')}）`;
      break;
    case 'market_weak':
      titleJa = '今日は市場全体が弱いです';
      bodyJa = signal.detailJa ?? reasons.join(' · ');
      break;
    case 'high_dividend_value':
      titleJa = '高配当株が割安圏に入りました';
      bodyJa = sym ? `${label}（${sym}）— ${reasons.join(' · ')}` : reasons.join(' · ');
      actionHintJa = 'スクリーナーでファンダを確認してください';
      break;
    case 'price_surge':
      titleJa = sym ? `${sym} が急騰しています` : '急騰を検出しました';
      break;
    case 'price_drop':
      titleJa = sym ? `${sym} が急落しています` : '急落を検出しました';
      break;
    case 'volume_spike':
      titleJa = sym ? `${sym} の出来高が急増しています` : '出来高急増';
      break;
    case 'rsi_overbought':
      titleJa = sym ? `${sym} のRSIが過熱圏です` : 'RSI過熱';
      break;
    case 'rsi_oversold':
      titleJa = sym ? `${sym} のRSIが売られ過ぎ圏です` : 'RSI売られ過ぎ';
      break;
    case 'trend_reversal_bull':
      titleJa = sym ? `${sym} で上昇トレンド転換の可能性` : 'トレンド転換（上昇）';
      break;
    case 'trend_reversal_bear':
      titleJa = sym ? `${sym} で下降トレンド転換の可能性` : 'トレンド転換（下降）';
      break;
    case 'dividend_ex_date':
      titleJa = sym ? `${sym} の配当権利日が近づいています` : '配当権利日接近';
      break;
    case 'unrealized_sharp_gain':
      titleJa = sym ? `${sym} が急騰（含み益）` : '急騰の可能性';
      bodyJa = `${label} — ${reasons.join(' · ')}`;
      break;
    case 'unrealized_sharp_loss':
      titleJa = sym ? `${sym} が急落（含み損）` : '急落の可能性';
      bodyJa = `${label} — ${reasons.join(' · ')}`;
      break;
    default:
      break;
  }

  return {
    priority: signal.priority,
    category,
    dedupeKey: buildProactiveDedupeKey(category, signal.priority, sym),
    titleJa,
    bodyJa: `${bodyJa}（参考情報・自動売買はしません）`,
    actionHintJa,
    symbol: sym,
    market: signal.market,
    reasonsJa: reasons,
    signalKind: signal.kind,
    source: signal.source,
  };
}

function urgencyToCandidate(signal: UrgencySignal): ProactiveSuggestionCandidate {
  const level =
    signal.level === 'critical' || signal.level === 'high'
      ? 'high'
      : signal.level === 'medium'
        ? 'medium'
        : 'low';
  return {
    priority: level,
    category: 'urgency_signal',
    dedupeKey: buildProactiveDedupeKey('urgency_signal', level, signal.ticker ?? signal.id),
    titleJa: '緊急シグナルが更新されました',
    bodyJa: `${signal.actionLabel}: ${signal.reason}（参考情報・確認が必要）`,
    actionHintJa: 'ホームのキューで詳細を確認してください',
    reasonsJa: [signal.reason],
    symbol: signal.ticker,
    source: `urgency:${signal.source}`,
  };
}

export function buildProactiveFingerprint(
  input: ProactiveEvaluationInput,
): ProactiveStateFingerprint {
  const active = input.holdings.filter((p) => (p.shares ?? 0) > 0);
  const pnls = calculatePositionsPnLFromList(active);
  const total = pnls.reduce((s, p) => s + p.currentValue, 0);
  return {
    holdingsCount: active.length,
    staleCount: input.staleHoldingsCount,
    priceSyncError: input.priceSync.lastError ?? input.priceSync.lastResult?.error,
    lastSuccessAt: input.priceSync.lastSuccessAt,
    urgencyIds: input.urgencySignals.map((s) => s.id).sort(),
    portfolioValueRounded: Math.round(total),
  };
}

export function fingerprintChanged(
  prev: ProactiveStateFingerprint | null,
  next: ProactiveStateFingerprint,
): boolean {
  if (!prev) return true;
  return (
    prev.holdingsCount !== next.holdingsCount ||
    prev.staleCount !== next.staleCount ||
    prev.priceSyncError !== next.priceSyncError ||
    prev.lastSuccessAt !== next.lastSuccessAt ||
    prev.portfolioValueRounded !== next.portfolioValueRounded ||
    prev.urgencyIds.join('|') !== next.urgencyIds.join('|')
  );
}

export function evaluateProactiveAdvice(
  input: ProactiveEvaluationInput,
): ProactiveSuggestionCandidate[] {
  const out: ProactiveSuggestionCandidate[] = [];
  const active = input.holdings.filter((p) => (p.shares ?? 0) > 0);
  const nowMs = input.nowMs ?? Date.now();

  const marketSignals = evaluateMarketSignals({
    holdings: active,
    marketRegime: input.marketRegime,
    nowMs,
  });
  for (const s of marketSignals) {
    out.push(signalToCandidate(s));
  }

  const syncProblemBody =
    input.priceSync.lastError ??
    input.priceSync.lastResult?.error ??
    (input.priceSync.lastResult?.failures?.length
      ? `ライブ取得に失敗した銘柄があります（${input.priceSync.lastResult.failures.length}件）`
      : undefined);

  const hasStaleQuotes = input.staleHoldingsCount > 0;
  const hasSyncFailures =
    Boolean(input.priceSync.lastResult?.failures?.length) ||
    Boolean(syncProblemBody && input.priceSync.lastResult?.ok === false);

  if ((hasStaleQuotes || hasSyncFailures || syncProblemBody) && !input.priceSync.loading) {
    const detail =
      syncProblemBody ??
      'ライブ株価の取得に失敗している可能性があります — キャッシュを表示している可能性があります';
    out.push({
      priority: 'high',
      category: syncProblemBody ? 'api_failure' : 'stale_quotes',
      dedupeKey: buildProactiveDedupeKey('quote_health', 'high'),
      titleJa: '現在株価データに注意が必要です',
      bodyJa: `${detail}（参考情報・確認が必要　自動売買はしません）`,
      actionHintJa: '保有画面で再取得を試し、APIキーを確認してください',
      reasonsJa: [detail],
      source: 'price_sync_combined',
    });
  }

  if (input.priceSync.loading === false && input.priceSync.lastSuccessAt) {
    const ageMs = nowMs - Date.parse(input.priceSync.lastSuccessAt);
    if (ageMs > 30 * 60 * 1000 && input.staleHoldingsCount > 0) {
      out.push({
        priority: 'medium',
        category: 'price_delay',
        dedupeKey: buildProactiveDedupeKey('price_delay', 'medium'),
        titleJa: '株価更新が遅延しています',
        bodyJa: '最終ライブ取得成功から時間が経過しています。再取得をご検討ください（参考）',
        actionHintJa: '再取得ボタンで更新できます',
        reasonsJa: ['最終更新から30分以上'],
        source: 'price_delay',
      });
    }
  }

  if (input.conciergeEvidenceSymbols?.length) {
    out.push(...evaluateConciergeDataProactiveAlerts(input.conciergeEvidenceSymbols));
  }

  out.push(...evaluateGlobalMarketProactiveAlerts(input.globalMarketAnalysis));

  for (const signal of input.urgencySignals) {
    if (signal.level === 'low') continue;
    out.push(urgencyToCandidate(signal));
  }

  if (input.degradedMode) {
    out.push({
      priority: 'high',
      category: 'api_failure',
      dedupeKey: buildProactiveDedupeKey('degraded_mode', 'high'),
      titleJa: '分析モードが劣化しています',
      bodyJa: 'API制限または接続問題の可能性があります。重要判断前に接続を確認してください（参考）',
      actionHintJa: 'API接続診断を開いて確認',
      reasonsJa: ['劣化モード'],
      source: 'degraded_mode',
    });
  }

  for (const ticker of input.buyCandidateTickers.slice(0, 3)) {
    out.push({
      priority: 'medium',
      category: 'buy_candidate',
      dedupeKey: buildProactiveDedupeKey('buy_candidate', 'medium', ticker),
      titleJa: '購入候補があります',
      bodyJa: `${ticker} が購入候補として検出されました（参考）`,
      actionHintJa: '銘柄分析でリスクを確認してから判断してください',
      symbol: ticker,
      reasonsJa: ['スクリーナー候補'],
      source: 'screener',
    });
  }

  for (const ticker of input.sellCandidateTickers.slice(0, 3)) {
    out.push({
      priority: 'medium',
      category: 'sell_candidate',
      dedupeKey: buildProactiveDedupeKey('sell_candidate', 'medium', ticker),
      titleJa: '売却候補があります',
      bodyJa: `${ticker} が売却候補として検出されました（参考）`,
      actionHintJa: '保有画面で価格とリスクを確認してください',
      symbol: ticker,
      reasonsJa: ['売却候補キュー'],
      source: 'screener',
    });
  }

  if (input.newsChangeCount && input.newsChangeCount > 0) {
    out.push({
      priority: 'medium',
      category: 'news_change',
      dedupeKey: buildProactiveDedupeKey('news_change', 'medium'),
      titleJa: 'ニュースに変化があります',
      bodyJa: `関連ニュースが ${input.newsChangeCount} 件更新されました（参考情報）`,
      actionHintJa: '銘柄分析でニュースを確認してください',
      reasonsJa: [`${input.newsChangeCount}件更新`],
      source: 'news',
    });
  }

  const fp = buildProactiveFingerprint(input);
  if (input.previous && fingerprintChanged(input.previous, fp)) {
    const deltaHoldings = fp.holdingsCount - input.previous.holdingsCount;
    if (deltaHoldings !== 0) {
      out.push({
        priority: 'high',
        category: 'portfolio_change',
        dedupeKey: buildProactiveDedupeKey('portfolio_change', 'high'),
        titleJa: '保有銘柄に変化がありました',
        bodyJa: `保有件数が ${input.previous.holdingsCount} → ${fp.holdingsCount} に変化しました（参考）`,
        actionHintJa: 'ポートフォリオ画面で内容を確認してください',
        reasonsJa: [`件数 ${deltaHoldings > 0 ? '+' : ''}${deltaHoldings}`],
        source: 'portfolio_delta',
      });
    }
  }

  if (out.length === 0) {
    out.push({
      priority: 'low',
      category: 'periodic_check',
      dedupeKey: buildProactiveDedupeKey('periodic_check', 'low'),
      titleJa: '定期確認',
      bodyJa: '大きな変化は検出されていません。必要ならAIコンシェルジュに質問できます（参考）',
      actionHintJa: '質問はいつでも送信できます',
      reasonsJa: ['シグナルなし'],
      source: 'periodic',
    });
  }

  return out;
}

/** @deprecated use evaluateProactiveAdvice */
export const evaluateProactiveSuggestions = evaluateProactiveAdvice;
