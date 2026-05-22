import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BrokerageFeeCard } from '../components/BrokerageFeeCard';
import { PositionSizingCard } from '../components/PositionSizingCard';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { SellSuggestionCard } from '../components/SellSuggestionCard';
import { StockRecommendationPanel } from '../components/StockRecommendationPanel';
import { TradeSuggestionCard } from '../components/TradeSuggestionCard';
import { LabeledValue, TermHint } from '../components/TermHint';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import { useApp } from '../context/AppContext';
import { buySignalLabel, sellSignalLabel, volumeTrendLabel } from '../i18n/ja';
import type { RootStackParamList } from '../navigation/types';
import { getBrokerageEstimate } from '../services/brokerage';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { computePortfolioDrawdownPct } from '../services/crossAssetLiquidityFlowEngine';
import { toMYR } from '../services/fx';
import {
  buildInstitutionalRiskInputFromApp,
  buildInstitutionalRiskReport,
} from '../services/institutionalRiskControlEngine';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import { suggestPositionSize } from '../services/positionSizing';
import { InstitutionalRiskPanel } from '../components/InstitutionalRiskPanel';
import { safeNumber } from '../utils/safeNumeric';
import { analyzeTechnicals } from '../services/technicalAnalysis';
import { buildBuySignalAlert, buildSellSignalAlert } from '../services/alertEngine';
import { buildSellSuggestion, buildTradeSuggestion } from '../services/tradeSuggestions';
import { buildStockRecommendationAsync } from '../services/recommendationEngine';
import {
  analyzeXSentimentOnUserRequest,
  loadCachedXSentimentForStock,
} from '../services/xSentimentAnalysis';
import type { StockRecommendation } from '../types/recommendation';
import type { XSentimentSnapshot } from '../types/xSentiment';
import { XSentimentPanel } from '../components/XSentimentPanel';
import { Button } from '../components/ui/Button';
import { theme } from '../theme';

export function StockDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'StockDetail'>>();

  useFocusEffect(
    useCallback(() => {
      if (params?.symbol) {
        void import('../services/autonomousMonitoringStorage').then(({ recordRecentViewedSymbol }) =>
          recordRecentViewedSymbol(params.symbol),
        );
      }
    }, [params?.symbol]),
  );
  const {
    state,
    buyingPower,
    isPractice,
    practiceStats,
    dispatchAlert,
    analysisApiKeys,
    twelveDataApiKey,
    marketRegime,
    portfolioRevision,
  } = useApp();
  const stock = findStock(params.symbol);

  const portfolio = useMemo(() => {
    const raw = isPractice ? state.practice.portfolio : state.portfolio;
    return raw.filter((p) => Number.isFinite(p.shares) && p.shares > 0);
  }, [isPractice, state.practice.portfolio, state.portfolio, portfolioRevision]);

  const totalCapitalMYR = isPractice
    ? practiceStats.virtualCapitalMYR
    : state.settings.totalCapitalMYR;

  const portfolioDrawdownPct = useMemo(() => {
    if (isPractice) {
      return computePortfolioDrawdownPct(
        state.practice.performanceHistory,
        practiceStats.portfolioValueMYR,
      );
    }
    const capital = state.settings.totalCapitalMYR;
    const holdingsMYR = portfolio.reduce((sum, p) => {
      const price = p.currentPrice ?? p.averageBuyPrice ?? 0;
      return sum + toMYR(price * p.shares, p.currency);
    }, 0);
    const total = holdingsMYR + Math.max(0, buyingPower.buyingPowerMYR);
    if (capital > 0 && total < capital) {
      return ((capital - total) / capital) * 100;
    }
    return 0;
  }, [
    isPractice,
    state.practice.performanceHistory,
    state.settings.totalCapitalMYR,
    practiceStats.portfolioValueMYR,
    portfolio,
    buyingPower.buyingPowerMYR,
  ]);

  const existingAllocationPct = useMemo(() => {
    if (!stock || totalCapitalMYR <= 0) return 0;
    const pos = portfolio.find((p) => p.symbol === stock.symbol);
    if (!pos) return 0;
    const price = pos.currentPrice ?? pos.averageBuyPrice ?? stock.price;
    const valueMYR = toMYR(price * pos.shares, pos.currency);
    return safeNumber((valueMYR / totalCapitalMYR) * 100, 0);
  }, [stock, portfolio, totalCapitalMYR]);
  const bars = getSamplePriceHistory(params.symbol);
  const technicals = analyzeTechnicals(bars);
  const buySuggestion = stock ? buildTradeSuggestion(stock.price, technicals) : null;
  const sellSuggestion = stock ? buildSellSuggestion(stock.price, technicals) : null;
  const cashMYR = isPractice ? practiceStats.cashBalanceMYR : buyingPower.buyingPowerMYR;

  const [recommendation, setRecommendation] = useState<StockRecommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(true);
  const [xSentiment, setXSentiment] = useState<XSentimentSnapshot | null>(null);
  const [loadingX, setLoadingX] = useState(false);
  const [xError, setXError] = useState<string | null>(null);

  const sizing = useMemo(() => {
    if (!stock) return null;
    return suggestPositionSize(
      cashMYR,
      stock.price,
      stock.currency,
      'cash_upfront',
      state.settings.riskPerTradePct,
      5,
      {
        stock,
        regime: marketRegime,
        technicals,
        recommendation,
        stopLossPrice: buySuggestion?.stopLoss,
        entryPrice: buySuggestion?.entryPrice,
        totalCapitalMYR,
        existingAllocationPct,
        portfolio,
        portfolioDrawdownPct,
      },
    );
  }, [
    stock,
    cashMYR,
    marketRegime,
    technicals,
    recommendation,
    buySuggestion,
    state.settings.riskPerTradePct,
    totalCapitalMYR,
    existingAllocationPct,
    portfolio,
    portfolioDrawdownPct,
  ]);

  const feeEstimate =
    stock && sizing
      ? getBrokerageEstimate(stock.market, Math.max(1, sizing.suggestedShares), stock.price, stock.currency)
      : null;

  const constructionReport = useMemo(
    () =>
      analyzePortfolioConstruction({
        portfolio,
        totalPortfolioValueMYR: totalCapitalMYR,
        regime: marketRegime,
        portfolioDrawdownPct,
      }),
    [portfolio, totalCapitalMYR, marketRegime, portfolioDrawdownPct],
  );

  const institutionalRisk = useMemo(() => {
    if (!stock) return null;
    const base = buildInstitutionalRiskInputFromApp({
      state,
      isPractice,
      practiceStats,
      buyingPower,
      regime: marketRegime,
      portfolioDrawdownPct,
      constructionReport,
    });
    const position = portfolio.find((p) => p.symbol === stock.symbol);
    return buildInstitutionalRiskReport({
      ...base,
      symbol: stock.symbol,
      stockPrice: stock.price,
      currency: stock.currency,
      market: stock.market,
      technicals,
      recommendation,
      sizing: sizing ?? undefined,
      tradeSuggestion: buySuggestion ?? undefined,
      positionOpenedAt: position?.openedAt,
    });
  }, [
    stock,
    state,
    isPractice,
    practiceStats,
    buyingPower,
    marketRegime,
    portfolioDrawdownPct,
    constructionReport,
    portfolio,
    technicals,
    recommendation,
    sizing,
    buySuggestion,
  ]);

  useEffect(() => {
    if (!stock || stock.market !== params.market) {
      setRecommendation(null);
      setLoadingRec(false);
      return;
    }
    let cancelled = false;
    setLoadingRec(true);
    void buildStockRecommendationAsync(stock, {
      style: 'balanced',
      risk: 'standard',
      apiKeys: analysisApiKeys,
      priceDataAvailable: Boolean(twelveDataApiKey.trim()) || stock.price > 0,
    }).then((rec) => {
      if (!cancelled) {
        setRecommendation(rec);
        setLoadingRec(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stock, params.market, analysisApiKeys, twelveDataApiKey]);

  useEffect(() => {
    if (!stock) {
      setXSentiment(null);
      return;
    }
    void loadCachedXSentimentForStock(stock).then((cached) => {
      setXSentiment(cached);
    });
  }, [stock?.symbol, stock?.market]);

  useFocusEffect(
    useCallback(() => {
      if (!stock || stock.market !== params.market) return;
      const bars = getSamplePriceHistory(params.symbol);
      const tech = analyzeTechnicals(bars);
      if (tech.buySignal === 'buy') {
        void dispatchAlert(buildBuySignalAlert(stock.symbol, stock.market, stock.name));
      }
      if (tech.sellSignal === 'sell') {
        void dispatchAlert(buildSellSignalAlert(stock.symbol, stock.market, stock.name));
      }
    }, [stock, params.market, params.symbol, dispatchAlert]),
  );

  if (!stock || stock.market !== params.market) {
    return (
      <Screen title="見つかりません">
        <Text style={styles.muted}>不明な銘柄コードです</Text>
      </Screen>
    );
  }

  const sym = CURRENCY_SYMBOL[stock.currency];

  return (
    <Screen title={stock.symbol} subtitle={`${stock.name} · ${MARKET_LABEL[stock.market]}`}>
      {isPractice ? <PracticeModeBadge /> : null}
      <MarketRegimeCard regime={marketRegime} compact />
      {loadingRec ? (
        <Card>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.muted}>分析スコアを計算中…</Text>
          </View>
        </Card>
      ) : recommendation ? (
        <StockRecommendationPanel recommendation={recommendation} />
      ) : null}
      <Card>
        <Text style={styles.muted}>
          Xセンチメントはユーザー操作時のみ取得（15分キャッシュ・最大20件・バックグラウンド監視なし）
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button
            label={loadingX ? 'X投稿を分析中…' : 'Xセンチメントを取得'}
            onPress={() => {
              if (!stock) return;
              setLoadingX(true);
              setXError(null);
              void analyzeXSentimentOnUserRequest(stock, analysisApiKeys, { forceRefresh: false })
                .then((sns) => {
                  if (sns.xSentiment) {
                    setXSentiment(sns.xSentiment);
                  } else {
                    setXError(sns.summary);
                  }
                })
                .catch((e) => {
                  setXError(e instanceof Error ? e.message : '取得に失敗しました');
                })
                .finally(() => setLoadingX(false));
            }}
            disabled={loadingX}
          />
        </View>
        {xError ? <Text style={styles.xErr}>{xError}</Text> : null}
      </Card>
      {xSentiment ? <XSentimentPanel snapshot={xSentiment} /> : null}
      <Card>
        <TermHint term="stock" />
        <LabeledValue term="stockPrice" value={`${sym}${stock.price}`} />
        <MetricRow term="rsi" value={technicals.rsi14.toFixed(1)} />
        <MetricRow term="movingAverage" value={`20日 ${technicals.ma20.toFixed(2)}`} />
        <MetricRow term="buySignal" value={buySignalLabel[technicals.buySignal]} />
        <MetricRow term="sellSignal" value={sellSignalLabel[technicals.sellSignal]} />
        <MetricRow term="volume" value={volumeTrendLabel[technicals.volumeTrend]} />
      </Card>
      {sizing ? <PositionSizingCard result={sizing} /> : null}
      {institutionalRisk ? <InstitutionalRiskPanel report={institutionalRisk} /> : null}
      {feeEstimate ? <BrokerageFeeCard estimate={feeEstimate} /> : null}
      {buySuggestion ? <TradeSuggestionCard suggestion={buySuggestion} currencySymbol={sym} /> : null}
      {sellSuggestion ? <SellSuggestionCard suggestion={sellSuggestion} currencySymbol={sym} /> : null}
    </Screen>
  );
}

function MetricRow({ term, value }: { term: 'rsi' | 'movingAverage' | 'buySignal' | 'sellSignal' | 'volume'; value: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricRow}>
        <TermHint term={term} showDescription={false} style={styles.termInline} />
        <Text style={styles.metricVal}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.colors.textMuted, marginTop: 4 },
  xErr: { color: theme.colors.warning, marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  metric: { marginTop: theme.spacing.sm },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  termInline: { marginBottom: 0 },
  metricVal: { color: theme.colors.text, fontSize: theme.fontSize.md },
});
