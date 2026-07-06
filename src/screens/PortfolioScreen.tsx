import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BeginnerPortfolioHoldingCard } from '../components/beginner/BeginnerPortfolioHoldingCard';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { SellAllMissingPriceModal } from '../components/SellAllMissingPriceModal';
import { LabeledValue, TermHint } from '../components/TermHint';
import { PracticeSummaryCard } from '../components/PracticeSummaryCard';
import { Button } from '../components/ui/Button';
import { DEVICE_VERIFY_TEST_IDS } from '../constants/deviceVerifyTestIds';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { logFocusRefresh } from '../services/productionOpsLog';
import {
  type PortfolioHoldingActionsRef,
} from '../components/portfolio/PortfolioHoldingsList';
import { PortfolioPriceSyncCard } from '../components/portfolio/PortfolioPriceSyncCard';
import { PortfolioCandidateSection } from '../components/portfolio/PortfolioCandidateSection';
import { PortfolioHoldingsCardsSection } from '../components/portfolio/PortfolioHoldingsCardsSection';
import { RealAccountExposurePanel } from '../components/RealAccountExposurePanel';
import { RealAccountPendingOrdersPanel } from '../components/RealAccountPendingOrdersPanel';
import { useApp } from '../context/AppContext';
import { useAppUxMode } from '../context/AppUxModeContext';
import { useBursaMaterialOptional } from '../context/BursaMaterialContext';
import { useProactiveConciergeOptional } from '../context/ProactiveConciergeContext';
import { usePriceSyncActions } from '../context/PriceSyncContext';
import { useRenderTrace } from '../utils/renderDiagnostics';

import { usePortfolioPriceAutoRefresh } from '../hooks/usePortfolioPriceAutoRefresh';

const LazyPortfolioAnalytics = lazy(
  () => import('../components/portfolio/PortfolioAnalyticsSection'),
);
import {
  buildHoldingDetails,
  calculatePositionsPnL,
  calculatePositionsPnLFromList,
  portfolioMarketValueMYR,
  totalDividendsMYR,
  totalUnrealizedPnLMYR,
} from '../services/portfolio';
import {
  buildSellAllLineItem,
  buildSellAllManualAlert,
  buildSellAllPracticeAlert,
  filterSellablePositions,
  isPositionPriceAvailable,
  positionDisplayName,
  type SellAllPriceInput,
} from '../services/sellAllHoldings';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { parseMaterialQualityStarCount } from '../constants/beginnerAiTrustLevelJa';
import { resolvePortfolioAiEvaluation } from '../services/portfolioAiEvaluationFromStrategyBundle';
import type { PortfolioPosition, SellAllLineItem } from '../types';
import { positionDisplayPrice } from '../utils/positionPrice';
import { safeNumber } from '../utils/safeNumeric';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

type ResolvedSell = { position: PortfolioPosition; name: string; sellPrice: number };

export function PortfolioScreen() {
  useRenderTrace('PortfolioScreen', ['portfolio', 'state']);

  const {
    state,
    isPractice,
    practiceStats,
    buyingPower,
    practiceSellAll,
    practiceSellAllHoldings,
    addManualSellAllChecklist,
    addManualSellFromHolding,
    updateHoldingCurrentPrice,
    updateHoldingSymbol,
    updateHoldingMarket,
    dispatchAlert,
    reloadHoldingsFromStorage,
    portfolioRevision,
    marketRegime,
    removeHolding,
    undoLastHoldingRemoval,
    killSwitches,
  } = useApp();
  const { isBeginnerMode } = useAppUxMode();
  const { t } = useTranslation('portfolio');
  const materialCtx = useBursaMaterialOptional();
  const proactive = useProactiveConciergeOptional();
  const { reloadTwelveDataApiKeyFromStorage, syncPriceSyncForEmptyHoldings, refreshPortfolioPrices } =
    usePriceSyncActions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();

  const portfolioEval = useMemo(() => {
    const bundle = proactive?.strategyBundle;
    if (!bundle) return null;
    return resolvePortfolioAiEvaluation(bundle);
  }, [proactive?.strategyBundle]);

  const portfolio = useMemo(() => {
    const raw = isPractice ? state.practice.portfolio : state.portfolio;
    return raw.filter((p) => Number.isFinite(p.shares) && p.shares > 0);
  }, [isPractice, state.practice.portfolio, state.portfolio, portfolioRevision]);

  useFocusEffect(
    useCallback(() => {
      logFocusRefresh({ screen: 'Portfolio', fetchPrices: false });
      void reloadHoldingsFromStorage();
      void reloadTwelveDataApiKeyFromStorage();
      syncPriceSyncForEmptyHoldings();
    }, [reloadHoldingsFromStorage, reloadTwelveDataApiKeyFromStorage, syncPriceSyncForEmptyHoldings]),
  );

  usePortfolioPriceAutoRefresh(true);

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [priceModalHolding, setPriceModalHolding] = useState<SellAllPriceInput | null>(null);
  const [priceInput, setPriceInput] = useState('');

  const priceQueueRef = useRef<PortfolioPosition[]>([]);
  const resolvedSellsRef = useRef<ResolvedSell[]>([]);
  const skippedItemsRef = useRef<SellAllLineItem[]>([]);
  const holdingActionsRef = useRef<PortfolioHoldingActionsRef>({
    sellPractice: () => {},
    addSellChecklist: () => {},
    updateHoldingCurrentPrice: () => ({ ok: false }),
    updateHoldingSymbol: () => ({ ok: false }),
    updateHoldingMarket: () => ({ ok: false }),
    removeHolding: async () => ({ ok: false }),
    undoLastHoldingRemoval: () => {},
    onRetryFailedPrices: () => {},
  });

  const portfolioById = useMemo(() => {
    const map = new Map<string, PortfolioPosition>();
    for (const p of portfolio) map.set(p.id, p);
    return map;
  }, [portfolio]);

  const positions = useMemo(
    () => (isPractice ? calculatePositionsPnLFromList(portfolio) : calculatePositionsPnL(state)),
    [isPractice, portfolio, state.portfolio, state.practice.portfolio],
  );

  const totalPortfolioValueMYR = useMemo(() => {
    if (isPractice) return practiceStats.portfolioValueMYR;
    const holdingsMYR = portfolioMarketValueMYR(state);
    const cashMYR = Math.max(0, buyingPower.buyingPowerMYR);
    return holdingsMYR + cashMYR;
  }, [isPractice, practiceStats.portfolioValueMYR, state, buyingPower.buyingPowerMYR]);

  const holdings = useMemo(
    () => buildHoldingDetails(portfolio, totalPortfolioValueMYR),
    [portfolio, totalPortfolioValueMYR],
  );

  const sellablePositions = useMemo(() => filterSellablePositions(portfolio), [portfolio]);

  const holdingsLastPriceAt = useMemo(() => {
    let latest: string | undefined;
    for (const p of portfolio) {
      const ts = p.lastSuccessfulFetchAt ?? p.lastApiPriceAt ?? p.currentPriceUpdatedAt;
      if (!ts) continue;
      if (!latest || Date.parse(ts) > Date.parse(latest)) latest = ts;
    }
    return latest;
  }, [portfolio]);

  const unrealizedMYR = useMemo(
    () => (isPractice ? practiceStats.unrealizedPnLMYR : totalUnrealizedPnLMYR(positions)),
    [isPractice, practiceStats.unrealizedPnLMYR, positions],
  );
  const dividendsMYR = useMemo(
    () => (isPractice ? 0 : totalDividendsMYR(state.dividends)),
    [isPractice, state.dividends],
  );

  const sellPractice = (position: PortfolioPosition, name: string, currentPrice: number) => {
    Alert.alert(t('sell.practiceSellTitle'), t('sell.practiceSellMessage', { name, shares: position.shares }), [
      { text: t('sell.cancel'), style: 'cancel' },
      {
        text: t('sell.practiceSellAction'),
        style: 'destructive',
        onPress: () => {
          const result = practiceSellAll(position, name, currentPrice);
          if (!result.ok) Alert.alert(t('sell.cannotSellTitle'), result.error);
          else Alert.alert(t('sell.doneTitle'), t('sell.doneMessage'));
        },
      },
    ]);
  };

  const addSellChecklist = (position: PortfolioPosition, name: string, currentPrice: number) => {
    addManualSellFromHolding(position, name, currentPrice);
    Alert.alert(t('sell.addedToListTitle'), t('sell.addedToListMessage'), [
      { text: t('sell.viewList'), onPress: () => navigation.navigate('ManualOrderList') },
      { text: t('sell.ok') },
    ]);
  };

  const finishSellAll = useCallback(
    async (resolved: ResolvedSell[], skipped: SellAllLineItem[]) => {
      if (resolved.length === 0 && skipped.length === sellablePositions.length) {
        Alert.alert(t('sell.cannotSellTitle'), t('sell.noTargets'));
        return;
      }

      if (isPractice) {
        if (resolved.length === 0) {
          Alert.alert(t('sell.cannotSellTitle'), t('sell.noPricedTargets'));
          return;
        }
        const exec = practiceSellAllHoldings(resolved);
        if (!exec.ok || !exec.result) {
          Alert.alert(t('sell.cannotSellTitle'), exec.error ?? t('sell.sellFailed'));
          return;
        }
        const result = {
          ...exec.result,
          items: [...exec.result.items, ...skipped],
          skippedCount: exec.result.skippedCount + skipped.length,
        };
        void dispatchAlert(buildSellAllPracticeAlert());
        navigation.navigate('SellAllResult', { result });
        return;
      }

      const manualEntries = resolved.map((r) => ({
        position: r.position,
        name: r.name,
        currentPrice: r.sellPrice,
      }));
      const result = addManualSellAllChecklist(manualEntries, skipped);
      void dispatchAlert(buildSellAllManualAlert());
      navigation.navigate('SellAllResult', { result });
    },
    [
      addManualSellAllChecklist,
      dispatchAlert,
      isPractice,
      navigation,
      practiceSellAllHoldings,
      sellablePositions.length,
      t,
    ],
  );

  const processNextPrice = useCallback(() => {
    const next = priceQueueRef.current.shift();
    if (!next) {
      setPriceModalVisible(false);
      setPriceModalHolding(null);
      void finishSellAll(resolvedSellsRef.current, skippedItemsRef.current);
      return;
    }
    setPriceModalHolding({
      positionId: next.id,
      symbol: next.symbol,
      name: positionDisplayName(next),
      market: next.market,
      currency: next.currency,
      shares: next.shares,
    });
    setPriceInput('');
    setPriceModalVisible(true);
  }, [finishSellAll]);

  const startSellAllPriceFlow = useCallback(
    (sellable: PortfolioPosition[]) => {
      resolvedSellsRef.current = [];
      skippedItemsRef.current = [];
      priceQueueRef.current = [];

      for (const position of sellable) {
        const name = positionDisplayName(position);
        if (isPositionPriceAvailable(position)) {
          resolvedSellsRef.current.push({
            position,
            name,
            sellPrice: positionDisplayPrice(position),
          });
        } else {
          priceQueueRef.current.push(position);
        }
      }

      if (priceQueueRef.current.length > 0) {
        processNextPrice();
      } else {
        void finishSellAll(resolvedSellsRef.current, skippedItemsRef.current);
      }
    },
    [finishSellAll, processNextPrice],
  );

  const onSellAll = () => {
    if (sellablePositions.length === 0) {
      Alert.alert(t('sell.sellAllTitle'), t('sell.noHoldings'));
      return;
    }

    Alert.alert(t('sell.sellAllConfirmTitle'), t('sell.sellAllConfirmMessage'), [
      { text: t('sell.cancel'), style: 'cancel' },
      {
        text: t('sell.sellAllAction'),
        style: 'destructive',
        onPress: () => startSellAllPriceFlow(sellablePositions),
      },
    ]);
  };

  const submitMissingPrice = () => {
    const holding = priceModalHolding;
    if (!holding) return;
    const price = Number(priceInput.replace(/,/g, ''));
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert(t('sell.invalidPriceTitle'), t('sell.invalidPriceMessage'));
      return;
    }

    const position = sellablePositions.find((p) => p.id === holding.positionId);
    if (position) {
      resolvedSellsRef.current.push({
        position,
        name: holding.name,
        sellPrice: price,
      });
    }
    processNextPrice();
  };

  const skipMissingPrice = () => {
    const holding = priceModalHolding;
    if (holding) {
      const position = sellablePositions.find((p) => p.id === holding.positionId);
      if (position) {
        skippedItemsRef.current.push(
          buildSellAllLineItem(position, holding.name, 0, undefined, true, t('sell.skippedNoPrice')),
        );
      }
    }
    processNextPrice();
  };

  const cancelSellAll = () => {
    priceQueueRef.current = [];
    resolvedSellsRef.current = [];
    skippedItemsRef.current = [];
    setPriceModalVisible(false);
    setPriceModalHolding(null);
  };

  holdingActionsRef.current = {
    sellPractice,
    addSellChecklist,
    updateHoldingCurrentPrice,
    updateHoldingSymbol,
    updateHoldingMarket,
    removeHolding,
    undoLastHoldingRemoval,
    onRetryFailedPrices: (targets) => {
      void refreshPortfolioPrices({
        silent: false,
        trigger: 'retry',
        symbolsOnly: (targets ?? []).map((f) => ({ market: f.market, symbol: f.symbol })),
      });
    },
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <PortfolioPriceSyncCard
          holdingsCount={portfolio.length}
          displayLastUpdatedAt={holdingsLastPriceAt}
        />

        {isPractice ? (
          <>
            <PracticeModeBadge />
            <PracticeSummaryCard stats={practiceStats} />
          </>
        ) : (
          <>
            <Card>
              <TermHint term="portfolioHoldings" />
              <TermHint term="sellAll" />
              <LabeledValue term="holdingsValue" value={`RM${formatMYR(totalPortfolioValueMYR)}`} />
              <LabeledValue
                term="unrealizedPnL"
                value={`${unrealizedMYR >= 0 ? '+' : ''}RM${safeNumber(unrealizedMYR, 0).toFixed(2)}`}
                valueStyle={unrealizedMYR >= 0 ? styles.profit : styles.loss}
              />
              <LabeledValue term="dividend" value={`RM${formatMYR(dividendsMYR)}`} />
            </Card>
          </>
        )}

        <PortfolioHoldingsCardsSection
          holdings={holdings}
          portfolio={portfolio}
          portfolioById={portfolioById}
          portfolioStateLength={
            isPractice ? state.practice.portfolio.length : state.portfolio.length
          }
          isPractice={isPractice}
          readOnly={killSwitches.readOnlyMode}
          actionsRef={holdingActionsRef}
          onNavigateScreener={() => navigation.getParent()?.navigate('Screener')}
        />

        {!isPractice ? (
          <>
            <RealAccountExposurePanel />
            <RealAccountPendingOrdersPanel />
            <PortfolioCandidateSection />
          </>
        ) : null}

        {isPractice ? (
          <Card>
            <TermHint term="sellAll" />
            <TermHint term="realizedPnL" />
          </Card>
        ) : null}

        {holdings.length > 0 ? (
          <Suspense fallback={null}>
            <LazyPortfolioAnalytics
              portfolio={portfolio}
              holdingsCount={holdings.length}
              totalPortfolioValueMYR={totalPortfolioValueMYR}
              isPractice={isPractice}
              state={state}
              practiceStats={practiceStats}
              buyingPower={buyingPower}
              marketRegime={marketRegime}
            />
          </Suspense>
        ) : null}

        {sellablePositions.length > 0 ? (
          <Button label={t('sell.sellAllAction')} onPress={onSellAll} variant="ghost" />
        ) : null}

        {!isPractice ? (
          <>
            <Button
              label={t('sell.manualAddHolding')}
              onPress={() => navigation.navigate('ManualAddHolding')}
            />
            <Button label={t('sell.recordDividend')} onPress={() => navigation.navigate('AddDividend')} variant="ghost" />
            <Button
              label={t('sell.manualOrderList')}
              onPress={() => navigation.navigate('ManualOrderList')}
              variant="ghost"
              testID={DEVICE_VERIFY_TEST_IDS.portfolioManualOrderList}
            />
          </>
        ) : null}
      </View>
    ),
    [
      buyingPower,
      dividendsMYR,
      holdings.length,
      portfolioById,
      killSwitches.readOnlyMode,
      holdingActionsRef,
      state.portfolio.length,
      holdingsLastPriceAt,
      isPractice,
      marketRegime,
      navigation,
      onSellAll,
      portfolio,
      practiceStats,
      state.manualOrderList.length,
      state.practice.portfolio.length,
      holdings,
      totalPortfolioValueMYR,
      unrealizedMYR,
      sellablePositions.length,
      t,
    ],
  );

  const listFooter = useMemo(() => {
    if (isPractice || state.dividends.length === 0) return null;
    return (
      <View style={styles.listFooter}>
        <Text style={styles.section}>{t('dividendHistory')}</Text>
        {state.dividends.map((d, index) => (
          <Card key={`dividend-${d.id}-${index}`}>
            <Text style={styles.symbol}>{d.symbol}</Text>
            <Text style={styles.muted}>
              {d.amount} · {d.receivedAt}
            </Text>
          </Card>
        ))}
      </View>
    );
  }, [isPractice, state.dividends]);

  if (isBeginnerMode) {
    return (
      <Screen
        scrollable={false}
        title={t('title')}
        subtitle={t('subtitle.beginner', { count: holdings.length })}
      >
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isPractice ? <PracticeModeBadge /> : null}
          {holdings.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('empty.title')}</Text>
              <Button
                label={t('empty.addButton')}
                onPress={() => navigation.navigate('ManualAddHolding')}
              />
            </Card>
          ) : (
            holdings.map((h) => {
              const sym = h.symbol.toUpperCase();
              const evalRow = portfolioEval?.rankedHoldings.find(
                (e) => e.symbol.toUpperCase() === sym,
              );
              const materialRow = materialCtx?.report?.stocks.find(
                (s) => s.stockCode.toUpperCase() === sym,
              );
              const pnlPrefix = h.unrealizedProfitLoss >= 0 ? '+' : '';
              return (
                <BeginnerPortfolioHoldingCard
                  key={h.positionId}
                  symbol={sym}
                  nameJa={h.name}
                  isHeld
                  fusedAction={evalRow?.action ?? 'hold'}
                  finalScore={evalRow?.finalScore ?? 50}
                  confidencePct={evalRow?.confidence}
                  dataQualityStars={parseMaterialQualityStarCount(materialRow?.dataQuality?.stars)}
                  priceLabel={
                    h.priceAvailable
                      ? `RM ${h.displayPrice.toFixed(2)}`
                      : undefined
                  }
                  pnlLabel={
                    h.priceAvailable
                      ? `${pnlPrefix}RM ${Math.abs(h.unrealizedProfitLoss).toFixed(0)}`
                      : undefined
                  }
                  onPressWhy={() => tabNav?.navigate('MaterialAnalysis')}
                  onPressAskAi={() => tabNav?.navigate('ConciergeConsult')}
                />
              );
            })
          )}
          <Button
            label={t('empty.addButton')}
            onPress={() => navigation.navigate('ManualAddHolding')}
            variant="ghost"
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <>
      <Screen
        scrollable={false}
        title={t('title')}
        subtitle={isPractice ? t('subtitle.practice') : t('subtitle.live')}
      >
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          {listFooter}
        </ScrollView>
      </Screen>

      <SellAllMissingPriceModal
        visible={priceModalVisible}
        holding={priceModalHolding}
        priceInput={priceInput}
        onChangePrice={setPriceInput}
        onSubmit={submitMissingPrice}
        onSkip={skipMissingPrice}
        onCancel={cancelSellAll}
      />
    </>
  );
}

export default PortfolioScreen;

function formatMYR(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingBottom: 140, flexGrow: 1 },
  listHeader: { gap: theme.spacing.md, paddingBottom: theme.spacing.sm },
  listFooter: { gap: theme.spacing.md, paddingTop: theme.spacing.md },
  emptyCard: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  emptyTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  profit: { color: theme.colors.success },
  loss: { color: theme.colors.danger },
  section: { color: theme.colors.text, fontWeight: '600', marginTop: theme.spacing.md },
  symbol: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.lg },
  muted: { color: theme.colors.textMuted, marginTop: 4, lineHeight: 20 },
});
