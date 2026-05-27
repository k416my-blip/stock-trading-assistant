import { Alert, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HoldingCard } from '../components/HoldingCard';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { SellAllMissingPriceModal } from '../components/SellAllMissingPriceModal';
import { LabeledValue, TermHint } from '../components/TermHint';
import { PracticeSummaryCard } from '../components/PracticeSummaryCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import { PortfolioConstructionPanel } from '../components/PortfolioConstructionPanel';
import { PriceSyncResultPanel } from '../components/PriceSyncResultPanel';
import { useApp } from '../context/AppContext';
import { confirmDestructiveAction } from '../utils/confirmDestructive';
import { computePortfolioDrawdownPct } from '../services/crossAssetLiquidityFlowEngine';
import { InstitutionalRiskPanel } from '../components/InstitutionalRiskPanel';
import {
  buildInstitutionalRiskInputFromApp,
  buildInstitutionalRiskReport,
} from '../services/institutionalRiskControlEngine';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import { usePortfolioPriceAutoRefresh } from '../hooks/usePortfolioPriceAutoRefresh';
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
import type { PriceSyncFailure } from '../types/marketData';
import { positionDisplayPrice } from '../utils/positionPrice';
import { positionKey } from '../utils/reactKeys';
import { formatIsoDateTimeJa } from '../utils/formatDateTimeJa';
import { safeNumber } from '../utils/safeNumeric';
import {
  formatPartialPriceRefreshBanner,
  formatPriceRefreshErrorDialogMessage,
  shouldShowPriceRefreshErrorDialog,
  shouldShowPriceRefreshPartialBanner,
  totalFailureAlertTitle,
} from '../services/holdingPriceCore';
import { theme } from '../theme';

type ResolvedSell = { position: PortfolioPosition; name: string; sellPrice: number };

export function PortfolioScreen() {
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
    twelveDataApiKey,
    priceSync,
    refreshPortfolioPrices,
    reloadHoldingsFromStorage,
    portfolioRevision,
    marketRegime,
    removeHolding,
    undoLastHoldingRemoval,
    killSwitches,
  } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const portfolio = useMemo(() => {
    const raw = isPractice ? state.practice.portfolio : state.portfolio;
    return raw.filter((p) => Number.isFinite(p.shares) && p.shares > 0);
  }, [isPractice, state.practice.portfolio, state.portfolio, portfolioRevision]);

  useFocusEffect(
    useCallback(() => {
      void reloadHoldingsFromStorage();
    }, [reloadHoldingsFromStorage]),
  );

  usePortfolioPriceAutoRefresh(true);

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [priceModalHolding, setPriceModalHolding] = useState<SellAllPriceInput | null>(null);
  const [priceInput, setPriceInput] = useState('');

  const priceQueueRef = useRef<PortfolioPosition[]>([]);
  const resolvedSellsRef = useRef<ResolvedSell[]>([]);
  const skippedItemsRef = useRef<SellAllLineItem[]>([]);

  const positions = useMemo(
    () => (isPractice ? calculatePositionsPnLFromList(portfolio) : calculatePositionsPnL(state)),
    [isPractice, portfolio, state],
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

  const portfolioDrawdownPct = useMemo(() => {
    if (isPractice) {
      return computePortfolioDrawdownPct(
        state.practice.performanceHistory,
        practiceStats.portfolioValueMYR,
      );
    }
    const capital = state.settings.totalCapitalMYR;
    if (capital > 0 && totalPortfolioValueMYR < capital) {
      return ((capital - totalPortfolioValueMYR) / capital) * 100;
    }
    return 0;
  }, [
    isPractice,
    state.practice.performanceHistory,
    state.settings.totalCapitalMYR,
    practiceStats.portfolioValueMYR,
    totalPortfolioValueMYR,
  ]);

  const constructionReport = useMemo(
    () =>
      analyzePortfolioConstruction({
        portfolio,
        totalPortfolioValueMYR,
        regime: marketRegime,
        portfolioDrawdownPct,
      }),
    [portfolio, totalPortfolioValueMYR, marketRegime, portfolioDrawdownPct],
  );

  const institutionalRisk = useMemo(() => {
    if (holdings.length === 0) return null;
    const base = buildInstitutionalRiskInputFromApp({
      state,
      isPractice,
      practiceStats,
      buyingPower,
      regime: marketRegime,
      portfolioDrawdownPct,
      constructionReport,
    });
    return buildInstitutionalRiskReport(base);
  }, [
    holdings.length,
    state,
    isPractice,
    practiceStats,
    buyingPower,
    marketRegime,
    portfolioDrawdownPct,
    constructionReport,
  ]);

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

  const displayLastUpdatedAt = priceSync.lastSuccessAt ?? holdingsLastPriceAt;

  const failureByPositionId = useMemo(() => {
    const map = new Map<string, PriceSyncFailure>();
    for (const f of priceSync.lastResult?.failures ?? []) {
      map.set(f.positionId, f);
    }
    return map;
  }, [priceSync.lastResult]);

  const unrealizedMYR = useMemo(
    () => (isPractice ? practiceStats.unrealizedPnLMYR : totalUnrealizedPnLMYR(positions)),
    [isPractice, practiceStats.unrealizedPnLMYR, positions],
  );
  const dividendsMYR = useMemo(
    () => (isPractice ? 0 : totalDividendsMYR(state.dividends)),
    [isPractice, state.dividends],
  );

  const onAutoRefresh = async () => {
    if (!twelveDataApiKey.trim()) {
      Alert.alert('APIキー未設定', MARKET_DATA_MESSAGES.noApiKey, [
        { text: 'APIキー設定', onPress: () => navigation.navigate('ApiKeySettings') },
        { text: '了解' },
      ]);
      return;
    }
    const result = await refreshPortfolioPrices({ silent: false });

    if (shouldShowPriceRefreshErrorDialog(result)) {
      Alert.alert(totalFailureAlertTitle(), formatPriceRefreshErrorDialogMessage(result));
      return;
    }
  };

  const onRetryFailedPrices = async (targets?: PriceSyncFailure[]) => {
    const failures = targets ?? priceSync.lastResult?.failures ?? [];
    if (failures.length === 0) return;
    if (!twelveDataApiKey.trim()) {
      Alert.alert('APIキー未設定', MARKET_DATA_MESSAGES.noApiKey);
      return;
    }
    const result = await refreshPortfolioPrices({
      silent: false,
      symbolsOnly: failures.map((f) => ({ market: f.market, symbol: f.symbol })),
    });
    if (shouldShowPriceRefreshErrorDialog(result)) {
      Alert.alert(totalFailureAlertTitle(), formatPriceRefreshErrorDialogMessage(result));
      return;
    }
  };

  const partialFailureBanner =
    priceSync.lastResult && shouldShowPriceRefreshPartialBanner(priceSync.lastResult)
      ? formatPartialPriceRefreshBanner()
      : null;

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

  return (
    <>
    <Screen
      title="保有銘柄"
      subtitle={isPractice ? '練習モードの仮想ポジション' : '実運用分析 — 証券会社で約定後に記録したポジション'}
    >
      <Card>
        <Text style={styles.note}>{MARKET_DATA_MESSAGES.autoPriceNote}</Text>
        {priceSync.loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {priceSync.displayStatus === 'fetching'
                ? MARKET_DATA_MESSAGES.loading
                : '株価を取得中です'}
            </Text>
          </View>
        ) : null}
        {displayLastUpdatedAt && !priceSync.lastResult ? (
          <Text style={styles.metaText}>
            保存済み価格の最終更新: {formatIsoDateTimeJa(displayLastUpdatedAt) ?? displayLastUpdatedAt}
          </Text>
        ) : null}
        {partialFailureBanner
          ? partialFailureBanner.split('\n').map((line) => (
              <Text key={line} style={styles.warnText}>
                {line}
              </Text>
            ))
          : null}
        {priceSync.marketClosedHint ? (
          <Text style={styles.warnText}>{MARKET_DATA_MESSAGES.marketClosed}</Text>
        ) : null}
        <PriceSyncResultPanel
          result={priceSync.lastResult}
          lastSuccessAt={displayLastUpdatedAt}
          lastError={priceSync.lastError}
          loading={priceSync.loading}
          displayStatus={priceSync.displayStatus}
          connectionPhase={priceSync.connectionPhase}
          connectionDetail={priceSync.connectionDetail}
          currentSymbol={priceSync.currentSymbol}
          activeProvider={priceSync.activeProvider}
          lastPriceProvider={priceSync.lastPriceProvider}
          quoteFetchDebug={priceSync.quoteFetchDebug}
          resolvedSymbol={priceSync.resolvedSymbol}
          onRetry={onAutoRefresh}
          onRetryFailed={
            (priceSync.lastResult?.failures.length ?? 0) > 0
              ? () => onRetryFailedPrices()
              : undefined
          }
          retryFailedLoading={priceSync.loading}
        />
        <Button
          label="株価を自動更新"
          onPress={onAutoRefresh}
          disabled={priceSync.loading}
        />
        <Button
          label="APIキー設定"
          onPress={() => navigation.navigate('ApiKeySettings')}
          variant="ghost"
        />
      </Card>

      {isPractice ? (
        <>
          <PracticeModeBadge />
          <PracticeSummaryCard stats={practiceStats} />
        </>
      ) : (
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
      )}

      {isPractice ? (
        <Card>
          <TermHint term="sellAll" />
          <TermHint term="realizedPnL" />
        </Card>
      ) : null}

      {holdings.length > 0 ? (
        <>
          <PortfolioConstructionPanel report={constructionReport} />
          {institutionalRisk ? <InstitutionalRiskPanel report={institutionalRisk} compact /> : null}
          <Card style={styles.optimizeCard}>
            <Text style={styles.optimizeTitle}>機関ポートフォリオ最適化</Text>
            <Text style={styles.optimizeHint}>
              収縮共分散 · リスクパリティ · CVaR · Kelly · レジーム · ターンオーバー制約
            </Text>
            <Button
              label="最適化レポートを開く"
              onPress={() => navigation.navigate('PortfolioOptimization')}
              variant="ghost"
            />
            <Button
              label="ベイズ動的配分"
              onPress={() => navigation.navigate('BayesianAllocation')}
              variant="ghost"
            />
            <Button
              label="メタ配分・アンサンブル"
              onPress={() => navigation.navigate('MetaAllocation')}
              variant="ghost"
            />
            <Button
              label="ガバナンス・説明"
              onPress={() => navigation.navigate('Governance')}
              variant="ghost"
            />
            <Button
              label="可視化・モニタリング"
              onPress={() => navigation.navigate('Monitoring')}
              variant="ghost"
            />
            <Button
              label="適応執行・アルファ"
              onPress={() => navigation.navigate('AdaptiveExecution')}
              variant="ghost"
            />
            <Button
              label="マーケット・インテリジェンス"
              onPress={() => navigation.navigate('MarketIntelligence')}
              variant="ghost"
            />
            <Button
              label="ストレス・テールリスク"
              onPress={() => navigation.navigate('PortfolioStress')}
              variant="ghost"
            />
            <Button
              label="行動・オペレーターリスク"
              onPress={() => navigation.navigate('BehavioralRisk')}
              variant="ghost"
            />
            <Button
              label="モデル安定性"
              onPress={() => navigation.navigate('ModelStability')}
              variant="ghost"
            />
            <Button
              label="メタ資本配分"
              onPress={() => navigation.navigate('MetaCapital')}
              variant="ghost"
            />
          </Card>
        </>
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

      {holdings.length === 0 ? (
        <Card>
          <Text style={styles.muted}>
            {isPractice
              ? '仮想保有はありません。「おすすめ配分」または「仮想買付」から取引してください。'
              : '保有銘柄はありません。「手動で保有銘柄に追加」から約定後の買付を記録してください。'}
          </Text>
        </Card>
      ) : (
        holdings.map((h) => {
          const position = portfolio.find((x) => x.id === h.positionId)!;
          return (
            <HoldingCard
              key={positionKey(h.positionId)}
              holding={h}
              position={position}
              priceExploring={
                priceSync.loading &&
                priceSync.connectionPhase === 'symbol_exploring' &&
                priceSync.currentSymbol === h.symbol
              }
              resolvedYahooSymbol={priceSync.resolvedSymbol}
              priceFailure={failureByPositionId.get(h.positionId)}
              onRetryPrice={
                failureByPositionId.has(h.positionId)
                  ? () => {
                      const f = failureByPositionId.get(h.positionId);
                      if (f) void onRetryFailedPrices([f]);
                    }
                  : undefined
              }
              priceRetrying={priceSync.loading}
              isPractice={isPractice}
              onPracticeSell={() => sellPractice(position, h.name, positionDisplayPrice(position))}
              onManualSellChecklist={() =>
                addSellChecklist(position, h.name, positionDisplayPrice(position))
              }
              onUpdateCurrentPrice={(price) => updateHoldingCurrentPrice(h.positionId, price)}
              onUpdateSymbol={(symbol) => updateHoldingSymbol(h.positionId, symbol)}
              onUpdateMarket={(market) => updateHoldingMarket(h.positionId, market)}
              readOnly={killSwitches.readOnlyMode}
              onDeleteHolding={() =>
                confirmDestructiveAction({
                  title: '保有を削除',
                  message: `${h.symbol} を保有一覧から削除します。売買履歴は残ります。`,
                  confirmLabel: '削除',
                  onConfirm: () => {
                    void removeHolding(h.positionId).then((r) => {
                      if (!r.ok) {
                        Alert.alert('削除できません', r.error ?? '');
                        return;
                      }
                      if (r.canUndo) {
                        Alert.alert('削除しました', undefined, [
                          { text: '元に戻す', onPress: () => undoLastHoldingRemoval() },
                          { text: '了解' },
                        ]);
                      }
                    });
                  },
                })
              }
            />
          );
        })
      )}

      {!isPractice && state.dividends.length > 0 ? (
        <>
          <Text style={styles.section}>配当履歴</Text>
          {state.dividends.map((d, index) => (
            <Card key={`dividend-${d.id}-${index}`}>
              <Text style={styles.symbol}>{d.symbol}</Text>
              <Text style={styles.muted}>
                {d.amount} · {d.receivedAt}
              </Text>
            </Card>
          ))}
        </>
      ) : null}

      <SellAllMissingPriceModal
        visible={priceModalVisible}
        holding={priceModalHolding}
        priceInput={priceInput}
        onChangePrice={setPriceInput}
        onSubmit={submitMissingPrice}
        onSkip={skipMissingPrice}
        onCancel={cancelSellAll}
      />
    </Screen>
    </>
  );
}

function formatMYR(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  loadingText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  metaText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  warnText: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, lineHeight: 18 },
  profit: { color: theme.colors.success },
  loss: { color: theme.colors.danger },
  section: { color: theme.colors.text, fontWeight: '600', marginTop: theme.spacing.md },
  symbol: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.lg },
  muted: { color: theme.colors.textMuted, marginTop: 4 },
  optimizeCard: { marginTop: theme.spacing.sm },
  optimizeTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  optimizeHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
});
