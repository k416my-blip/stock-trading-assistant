import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PriceSyncResultPanel } from '../PriceSyncResultPanel';
import { ToastBanner } from '../ui/ToastBanner';
import { MARKET_DATA_MESSAGES } from '../../constants/marketData';
import { EMPTY_HOLDINGS_PRICE_SYNC_DETAIL } from '../../services/priceSyncEmptyHoldings';
import { useApp } from '../../context/AppContext';
import { usePriceSyncState, usePriceSyncActions } from '../../context/PriceSyncContext';
import {
  formatPartialPriceRefreshBanner,
  formatPriceRefreshErrorDialogMessage,
  shouldShowPriceRefreshErrorDialog,
  shouldShowPriceRefreshPartialBanner,
  totalFailureAlertTitle,
} from '../../services/holdingPriceCore';
import {
  formatApiKeyVerifiedToast,
  formatPriceRefreshCompleteToast,
} from '../../services/priceSyncNotifications';
import { isPortfolioRefreshInFlight } from '../../services/portfolioRefreshCoordinator';
import type { RootStackParamList } from '../../navigation/types';
import type { PriceSyncFailure } from '../../types/marketData';
import { formatIsoDateTimeJa } from '../../utils/formatDateTimeJa';
import { theme } from '../../theme';
import { useRenderTrace } from '../../utils/renderDiagnostics';
import { QUOTE_PROVIDER_LABELS } from '../../constants/quoteProviders';

type Props = {
  holdingsCount: number;
  displayLastUpdatedAt?: string;
};

function PortfolioPriceSyncCardInner({
  holdingsCount,
  displayLastUpdatedAt: holdingsLastAt,
}: Props) {
  useRenderTrace('PortfolioPriceSyncCard', ['priceSync']);

  const { twelveDataApiKey } = useApp();
  const { priceSync } = usePriceSyncState();
  const { refreshPortfolioPrices } = usePriceSyncActions();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'default' | 'warning' | 'success'>('default');
  const [nowMs, setNowMs] = useState(Date.now());
  const successAnim = useRef(new Animated.Value(0)).current;
  const prevLoadingRef = useRef(false);

  const displayLastUpdatedAt = priceSync.lastSuccessAt ?? holdingsLastAt;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isEmptyHoldings = holdingsCount === 0;
  const refreshDisabled = priceSync.loading || isPortfolioRefreshInFlight();

  useEffect(() => {
    if (!displayLastUpdatedAt) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [displayLastUpdatedAt]);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    const justCompleted = wasLoading && !priceSync.loading;
    prevLoadingRef.current = priceSync.loading;
    if (!justCompleted) return;
    if ((priceSync.lastResult?.successCount ?? 0) <= 0) return;
    successAnim.setValue(0);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 220,
        delay: 950,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [priceSync.lastResult?.successCount, priceSync.loading, successAnim]);

  const showToast = useCallback(
    (message: string, tone: 'default' | 'warning' | 'success' = 'default') => {
      setToastTone(tone);
      setToastMessage(message);
    },
    [],
  );

  const clearToast = useCallback(() => setToastMessage(null), []);

  const onAutoRefresh = useCallback(async () => {
    if (!twelveDataApiKey.trim()) {
      Alert.alert('APIキー未設定', MARKET_DATA_MESSAGES.noApiKey, [
        { text: 'APIキー設定', onPress: () => navigation.navigate('ApiKeySettings') },
        { text: '了解' },
      ]);
      return;
    }
    if (isEmptyHoldings) {
      showToast(
        `${MARKET_DATA_MESSAGES.noHoldingsUpdateBlocked} — ${MARKET_DATA_MESSAGES.noHoldingsFetchSkipped}`,
        'warning',
      );
      return;
    }
    if (isPortfolioRefreshInFlight()) {
      showToast(MARKET_DATA_MESSAGES.refreshInProgress, 'default');
      return;
    }
    const result = await refreshPortfolioPrices({ silent: false, trigger: 'manual' });
    if (shouldShowPriceRefreshErrorDialog(result)) {
      Alert.alert(totalFailureAlertTitle(), formatPriceRefreshErrorDialogMessage(result));
      return;
    }
    if (result.updatedCount === 0 && result.failures.length === 0 && !result.error) {
      showToast('更新受付済みです。少し待って再試行してください。', 'default');
      return;
    }
    showToast(formatPriceRefreshCompleteToast(result, holdingsCount), 'success');
  }, [holdingsCount, isEmptyHoldings, navigation, refreshPortfolioPrices, showToast, twelveDataApiKey]);

  const onRetryFailedPrices = useCallback(
    async (targets?: PriceSyncFailure[]) => {
      const failures = targets ?? priceSync.lastResult?.failures ?? [];
      if (failures.length === 0) return;
      if (!twelveDataApiKey.trim()) {
        Alert.alert('APIキー未設定', MARKET_DATA_MESSAGES.noApiKey);
        return;
      }
      if (isPortfolioRefreshInFlight()) return;
      const result = await refreshPortfolioPrices({
        silent: false,
        trigger: 'retry',
        symbolsOnly: failures.map((f) => ({ market: f.market, symbol: f.symbol })),
      });
      if (shouldShowPriceRefreshErrorDialog(result)) {
        Alert.alert(totalFailureAlertTitle(), formatPriceRefreshErrorDialogMessage(result));
        return;
      }
      showToast(formatPriceRefreshCompleteToast(result, holdingsCount), 'success');
    },
    [
      holdingsCount,
      priceSync.lastResult?.failures,
      refreshPortfolioPrices,
      showToast,
      twelveDataApiKey,
    ],
  );

  const partialFailureBanner = useMemo(
    () =>
      priceSync.lastResult && shouldShowPriceRefreshPartialBanner(priceSync.lastResult)
        ? formatPartialPriceRefreshBanner()
        : null,
    [priceSync.lastResult],
  );

  const onRetryFailed = useMemo(
    () =>
      (priceSync.lastResult?.failures.length ?? 0) > 0
        ? () => void onRetryFailedPrices()
        : undefined,
    [onRetryFailedPrices, priceSync.lastResult?.failures.length],
  );

  const refreshButtonLabel = priceSync.loading
    ? MARKET_DATA_MESSAGES.refreshInProgress
    : '株価を自動更新';

  const progressState = useMemo(() => {
    const total = priceSync.refreshingSymbols?.length ?? 0;
    if (!priceSync.loading || total <= 0) return null;
    const current = priceSync.currentSymbol;
    const idx = current
      ? priceSync.refreshingSymbols?.findIndex((k) => k.endsWith(`:${current}`)) ?? -1
      : -1;
    const done = idx >= 0 ? idx + 1 : 1;
    const ratio = Math.max(0.08, Math.min(1, done / total));
    return { total, done, ratio };
  }, [priceSync.currentSymbol, priceSync.loading, priceSync.refreshingSymbols]);

  const lastUpdatedAgo = useMemo(() => {
    if (!displayLastUpdatedAt) return null;
    const at = Date.parse(displayLastUpdatedAt);
    if (Number.isNaN(at)) return null;
    const sec = Math.max(0, Math.floor((nowMs - at) / 1000));
    if (sec < 60) return `${sec}秒前`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分前`;
    const hour = Math.floor(min / 60);
    return `${hour}時間前`;
  }, [displayLastUpdatedAt, nowMs]);

  const failureProviderSummary = useMemo(() => {
    const failures = priceSync.lastResult?.failures ?? [];
    if (!failures.length || !priceSync.lastResult?.totalFailure) return null;
    const names = Array.from(
      new Set(
        failures
          .map((f) => (f.provider ? QUOTE_PROVIDER_LABELS[f.provider] : null))
          .filter((v): v is string => Boolean(v)),
      ),
    );
    if (names.length === 0) return '接続失敗';
    return `接続失敗（${names.join(' / ')}）`;
  }, [priceSync.lastResult]);

  const panelProps = useMemo(
    () => ({
      result: isEmptyHoldings ? undefined : priceSync.lastResult,
      lastSuccessAt: displayLastUpdatedAt,
      lastError: isEmptyHoldings ? undefined : priceSync.lastError,
      loading: priceSync.loading,
      displayStatus: isEmptyHoldings ? ('idle' as const) : priceSync.displayStatus,
      connectionPhase: isEmptyHoldings ? undefined : priceSync.connectionPhase,
      connectionDetail: isEmptyHoldings
        ? EMPTY_HOLDINGS_PRICE_SYNC_DETAIL
        : priceSync.connectionDetail,
      currentSymbol: priceSync.currentSymbol,
      activeProvider: priceSync.activeProvider,
      lastPriceProvider: priceSync.lastPriceProvider,
      quoteFetchDebug: priceSync.quoteFetchDebug,
      resolvedSymbol: priceSync.resolvedSymbol,
      onRetry: onAutoRefresh,
      onRetryFailed,
      retryFailedLoading: priceSync.loading,
    }),
    [
      displayLastUpdatedAt,
      isEmptyHoldings,
      onAutoRefresh,
      onRetryFailed,
      priceSync.activeProvider,
      priceSync.connectionDetail,
      priceSync.connectionPhase,
      priceSync.currentSymbol,
      priceSync.displayStatus,
      priceSync.lastError,
      priceSync.lastPriceProvider,
      priceSync.lastResult,
      priceSync.loading,
      priceSync.quoteFetchDebug,
      priceSync.resolvedSymbol,
    ],
  );

  return (
    <Card>
      <ToastBanner message={toastMessage} onDismiss={clearToast} tone={toastTone} />
      {isEmptyHoldings ? (
        <View style={styles.emptyHoldingsBox}>
          <Text style={styles.emptyHoldingsTitle}>{MARKET_DATA_MESSAGES.noHoldingsTitle}</Text>
          <Text style={styles.emptyHoldingsHint}>{MARKET_DATA_MESSAGES.noHoldingsHint}</Text>
          <Text style={styles.emptyHoldingsMeta}>{MARKET_DATA_MESSAGES.noFetchTargets}</Text>
        </View>
      ) : null}
      <Text style={styles.note}>{MARKET_DATA_MESSAGES.autoPriceNote}</Text>
      {priceSync.loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {priceSync.displayStatus === 'fetching'
              ? MARKET_DATA_MESSAGES.loading
              : MARKET_DATA_MESSAGES.refreshInProgress}
          </Text>
        </View>
      ) : null}
      {progressState ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progressState.ratio * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            進行中 {progressState.done}/{progressState.total}
            {priceSync.currentSymbol ? ` · ${priceSync.currentSymbol}` : ''}
          </Text>
        </View>
      ) : null}
      {displayLastUpdatedAt && !priceSync.lastResult && !isEmptyHoldings ? (
        <Text style={styles.metaText}>
          保存済み価格の最終更新: {formatIsoDateTimeJa(displayLastUpdatedAt) ?? displayLastUpdatedAt}
        </Text>
      ) : null}
      {lastUpdatedAgo && !priceSync.loading ? (
        <Text style={styles.metaText}>最終更新: {lastUpdatedAgo}</Text>
      ) : null}
      {priceSync.lastResult && !priceSync.loading ? (
        <View style={styles.finishRow}>
          <Animated.View
            style={[
              styles.successBadge,
              {
                opacity: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
                transform: [
                  {
                    scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.successBadgeText}>
              {priceSync.lastResult.totalFailure
                ? '接続失敗'
                : `${priceSync.lastResult.successCount}件更新完了`}
            </Text>
          </Animated.View>
          {failureProviderSummary ? <Text style={styles.failSummaryText}>{failureProviderSummary}</Text> : null}
        </View>
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
      <PriceSyncResultPanel {...panelProps} />
      <Button
        label={refreshButtonLabel}
        onPress={onAutoRefresh}
        disabled={refreshDisabled}
      />
      <Button
        label="APIキー設定"
        onPress={() => {
          navigation.navigate('ApiKeySettings');
          if (twelveDataApiKey.trim()) {
            showToast(formatApiKeyVerifiedToast(), 'success');
          }
        }}
        variant="ghost"
      />
    </Card>
  );
}

function propsEqual(prev: Props, next: Props): boolean {
  return (
    prev.holdingsCount === next.holdingsCount &&
    prev.displayLastUpdatedAt === next.displayLastUpdatedAt
  );
}

export const PortfolioPriceSyncCard = memo(PortfolioPriceSyncCardInner, propsEqual);

const styles = StyleSheet.create({
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  emptyHoldingsBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  emptyHoldingsTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  emptyHoldingsHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  emptyHoldingsMeta: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  loadingText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  progressWrap: { marginBottom: theme.spacing.sm, gap: 4 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  progressText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  metaText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  finishRow: { marginBottom: theme.spacing.xs, gap: 4 },
  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#16a34a22',
    borderColor: '#16a34a',
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  successBadgeText: { color: '#16a34a', fontSize: theme.fontSize.sm, fontWeight: '700' },
  failSummaryText: { color: theme.colors.warning, fontSize: theme.fontSize.sm },
  warnText: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs },
});
