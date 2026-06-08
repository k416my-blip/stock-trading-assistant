import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { SellAllMissingPriceModal } from '../components/SellAllMissingPriceModal';
import { LabeledValue, TermHint } from '../components/TermHint';
import { PracticeSummaryCard } from '../components/PracticeSummaryCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { logFocusRefresh } from '../services/productionOpsLog';
import {
  usePortfolioHoldingsListModel,
  type PortfolioHoldingActionsRef,
} from '../components/portfolio/PortfolioHoldingsList';
import { PortfolioPriceSyncCard } from '../components/portfolio/PortfolioPriceSyncCard';
import { RealAccountExposurePanel } from '../components/RealAccountExposurePanel';
import { RealAccountPendingOrdersPanel } from '../components/RealAccountPendingOrdersPanel';
import { useApp } from '../context/AppContext';
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
  SELL_ALL_CONFIRM_MESSAGE,
  SELL_ALL_CONFIRM_TITLE,
  SELL_ALL_NO_HOLDINGS,
  type SellAllPriceInput,
} from '../services/sellAllHoldings';
import type { RootStackParamList } from '../navigation/types';
import type { PortfolioPosition, SellAllLineItem } from '../types';
import { positionDisplayPrice } from '../utils/positionPrice';
import { safeNumber } from '../utils/safeNumeric';
import { theme } from '../theme';

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
  const { reloadTwelveDataApiKeyFromStorage, syncPriceSyncForEmptyHoldings, refreshPortfolioPrices } =
    usePriceSyncActions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
    Alert.alert('仮想売却', `${name}を${position.shares}株、仮想売却しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '仮想売却',
        style: 'destructive',
        onPress: () => {
          const result = practiceSellAll(position, name, currentPrice);
          if (!result.ok) Alert.alert('売却できません', result.error);
          else Alert.alert('完了', '仮想売却を記録しました。');
        },
      },
    ]);
  };

  const addSellChecklist = (position: PortfolioPosition, name: string, currentPrice: number) => {
    addManualSellFromHolding(position, name, currentPrice);
    Alert.alert('追加しました', '売却候補を手動注文リストに追加しました。', [
      { text: 'リストを見る', onPress: () => navigation.navigate('ManualOrderList') },
      { text: '了解' },
    ]);
  };

  const finishSellAll = useCallback(
    async (resolved: ResolvedSell[], skipped: SellAllLineItem[]) => {
      if (resolved.length === 0 && skipped.length === sellablePositions.length) {
        Alert.alert('売却できません', '売却対象の銘柄がありませんでした。');
        return;
      }

      if (isPractice) {
        if (resolved.length === 0) {
          Alert.alert('売却できません', '価格が入力された銘柄がありません。');
          return;
        }
        const exec = practiceSellAllHoldings(resolved);
        if (!exec.ok || !exec.result) {
          Alert.alert('売却できません', exec.error ?? '仮想売却に失敗しました。');
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
      Alert.alert('すべて売却', SELL_ALL_NO_HOLDINGS);
      return;
    }

    Alert.alert(SELL_ALL_CONFIRM_TITLE, SELL_ALL_CONFIRM_MESSAGE, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'すべて売却',
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
      Alert.alert('価格を確認してください', '0より大きい数値を入力してください。');
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
          buildSellAllLineItem(position, holding.name, 0, undefined, true, '現在株価が未取得のためスキップ'),
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

  const { renderItem, keyExtractor, extraData } = usePortfolioHoldingsListModel({
    holdings,
    portfolioById,
    isPractice,
    readOnly: killSwitches.readOnlyMode,
    actionsRef: holdingActionsRef,
  });

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
            <RealAccountExposurePanel />
            <RealAccountPendingOrdersPanel />
          </>
        )}

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
          <Button label="すべて売却" onPress={onSellAll} variant="ghost" />
        ) : null}

        {!isPractice ? (
          <>
            <Button
              label="手動で保有銘柄に追加"
              onPress={() => navigation.navigate('ManualAddHolding')}
            />
            <Button label="配当を記録" onPress={() => navigation.navigate('AddDividend')} variant="ghost" />
            <Button
              label="手動注文リスト"
              onPress={() => navigation.navigate('ManualOrderList')}
              variant="ghost"
            />
          </>
        ) : null}
      </View>
    ),
    [
      buyingPower,
      dividendsMYR,
      holdings.length,
      holdingsLastPriceAt,
      isPractice,
      marketRegime,
      navigation,
      onSellAll,
      portfolio,
      practiceStats,
      state,
      totalPortfolioValueMYR,
      unrealizedMYR,
      sellablePositions.length,
    ],
  );

  const listEmpty = useMemo(
    () => (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>現在保有銘柄はありません</Text>
        <Text style={styles.muted}>
          {isPractice
            ? '「おすすめ配分」または「仮想買付」から取引してください。'
            : '銘柄検索から追加してください。'}
        </Text>
        {!isPractice ? (
          <Button
            label="銘柄検索へ"
            onPress={() => navigation.getParent()?.navigate('Screener')}
          />
        ) : null}
      </Card>
    ),
    [isPractice, navigation],
  );

  const listFooter = useMemo(() => {
    if (isPractice || state.dividends.length === 0) return null;
    return (
      <View style={styles.listFooter}>
        <Text style={styles.section}>配当履歴</Text>
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

  return (
    <>
      <Screen
        scrollable={false}
        title="保有銘柄"
        subtitle={
          isPractice ? '練習モードの仮想ポジション' : '実運用分析 — 証券会社で約定後に記録したポジション'
        }
      >
        <FlatList
          style={styles.list}
          data={holdings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          extraData={extraData}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          scrollEnabled
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          overScrollMode="always"
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
        />
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
