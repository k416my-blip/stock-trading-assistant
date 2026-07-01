import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import type {
  ApiConnectionPhase,
  PriceSyncDisplayStatus,
  PriceSyncFailure,
  PriceSyncResult,
} from '../types/marketData';
import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import { formatQuotePriceDisplay } from '../utils/formatQuotePrice';
import { sanitizeErrorForUi } from '../utils/sanitizeUiError';
import type { QuoteFetchDebugInfo } from '../types/quoteFetchDebug';
import type { QuoteProviderId } from '../types/quoteProvider';
import { QuoteSymbolDebugPanel } from './QuoteSymbolDebugPanel';
import { formatIsoDateTimeJa } from '../utils/formatDateTimeJa';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { theme } from '../theme';
import type { TFunction } from 'i18next';

type Props = {
  result: PriceSyncResult | undefined;
  lastSuccessAt?: string;
  lastError?: string;
  loading?: boolean;
  displayStatus?: PriceSyncDisplayStatus;
  connectionPhase?: ApiConnectionPhase;
  connectionDetail?: string;
  currentSymbol?: string;
  activeProvider?: QuoteProviderId;
  lastPriceProvider?: QuoteProviderId;
  quoteFetchDebug?: QuoteFetchDebugInfo;
  resolvedSymbol?: string;
  onRetry?: () => void;
  onRetryFailed?: () => void;
  retryFailedLoading?: boolean;
};

function providerLabel(id: QuoteProviderId | undefined): string | null {
  if (!id) return null;
  return QUOTE_PROVIDER_LABELS[id];
}

function priceSyncStatusLabel(
  t: TFunction<'portfolio'>,
  status: PriceSyncDisplayStatus,
): string {
  switch (status) {
    case 'fetching':
      return t('priceSync.loading');
    case 'partial_failure':
      return t('priceSync.partialFailure');
    case 'cached':
      return t('priceSync.showingCache');
    case 'mock':
      return t('priceSync.usingMock');
    case 'connection_failed':
      return '';
    case 'complete':
      return t('priceSync.refreshComplete');
    default:
      return '';
  }
}

function apiConnectionPhaseLabel(
  t: TFunction<'portfolio'>,
  phase: ApiConnectionPhase | undefined,
): string {
  switch (phase) {
    case 'connecting':
      return t('priceSync.apiConnecting');
    case 'symbol_exploring':
      return t('priceSync.symbolExploring');
    case 'retrying':
      return t('priceSync.apiRetrying');
    case 'success':
      return t('priceSync.apiSuccess');
    case 'timeout':
      return t('priceSync.apiTimeout');
    case 'rate_limit':
      return t('priceSync.apiRateLimit');
    case 'cached':
      return t('priceSync.showingCache');
    case 'error':
      return t('priceSync.connectionFailedShort');
    default:
      return '';
  }
}

function failureDetailLine(
  t: TFunction<'portfolio'>,
  f: PriceSyncFailure,
): string | null {
  const parts: string[] = [];
  if (f.provider) parts.push(`API: ${QUOTE_PROVIDER_LABELS[f.provider]}`);
  if (f.httpStatus != null) parts.push(`HTTP ${f.httpStatus}`);
  if (f.rateLimited) parts.push(t('priceSync.rateLimited'));
  if (f.usedCache) parts.push(t('priceSync.cached'));
  return parts.length > 0 ? parts.join(' · ') : null;
}

function apiStatusStyle(phase: ApiConnectionPhase | undefined) {
  switch (phase) {
    case 'success':
      return styles.apiSuccess;
    case 'retrying':
    case 'connecting':
    case 'symbol_exploring':
      return styles.apiRetry;
    case 'rate_limit':
      return styles.apiRateLimit;
    case 'timeout':
    case 'error':
      return styles.apiError;
    default:
      return styles.apiIdle;
  }
}

function statusBadgeStyle(status: PriceSyncDisplayStatus) {
  switch (status) {
    case 'fetching':
      return styles.badgeFetching;
    case 'partial_failure':
      return styles.badgePartial;
    case 'cached':
      return styles.badgeCached;
    case 'connection_failed':
      return styles.badgePartial;
    case 'complete':
      return styles.badgeOk;
    default:
      return styles.badgeIdle;
  }
}

export function PriceSyncResultPanel({
  result,
  lastSuccessAt,
  lastError,
  loading,
  displayStatus,
  connectionPhase,
  connectionDetail,
  currentSymbol,
  activeProvider,
  lastPriceProvider,
  quoteFetchDebug,
  resolvedSymbol,
  onRetry,
  onRetryFailed,
  retryFailedLoading,
}: Props) {
  const { t } = useTranslation('portfolio');
  const [failuresExpanded, setFailuresExpanded] = useState(false);
  const showPanel = result || lastSuccessAt || lastError || onRetry;
  if (!showPanel) return null;

  const status: PriceSyncDisplayStatus =
    displayStatus ?? (loading ? 'fetching' : result?.displayStatus ?? 'idle');
  const statusLabel = priceSyncStatusLabel(t, status);
  const apiLabel = apiConnectionPhaseLabel(t, connectionPhase);

  const lastUpdatedLabel = formatIsoDateTimeJa(lastSuccessAt);
  const successCount = result?.successCount ?? result?.updatedCount ?? 0;
  const failCount = result?.failedCount ?? result?.failures.length ?? 0;
  const isPartialSuccess = result?.partialFailure ?? (successCount > 0 && failCount > 0);
  const debugPrice = quoteFetchDebug?.price;
  const providerName = providerLabel(lastPriceProvider ?? activeProvider);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('priceSync.priceUpdateTitle')}</Text>
        {statusLabel ? (
          <Text style={[styles.badge, statusBadgeStyle(status)]}>{statusLabel}</Text>
        ) : null}
      </View>

      {lastUpdatedLabel ? (
        <Text style={styles.row}>{t('priceSync.lastUpdated', { value: lastUpdatedLabel })}</Text>
      ) : (
        <Text style={styles.rowMuted}>{t('priceSync.lastUpdatedNone')}</Text>
      )}

      {providerName ? (
        <Text style={styles.row}>{t('priceSync.priceSource', { provider: providerName })}</Text>
      ) : null}

      {apiLabel || connectionPhase === 'symbol_exploring' || connectionDetail ? (
        <View style={styles.apiStatusRow}>
          {apiLabel ? (
            <Text style={[styles.apiStatusLabel, apiStatusStyle(connectionPhase)]}>{apiLabel}</Text>
          ) : null}
          {connectionPhase === 'symbol_exploring' ? (
            <Text style={styles.exploring}>{t('priceSync.symbolExploring')}</Text>
          ) : null}
          {resolvedSymbol ? (
            <Text style={styles.formalSymbol}>
              {t('priceSync.formalSymbol', { symbol: resolvedSymbol })}
            </Text>
          ) : null}
          {currentSymbol ? (
            <Text style={styles.rowMuted}>{t('priceSync.symbol', { symbol: currentSymbol })}</Text>
          ) : null}
          {connectionDetail ? (
            <Text style={styles.rowMuted}>{sanitizeErrorForUi(connectionDetail, connectionDetail)}</Text>
          ) : null}
          {debugPrice != null ? (
            <Text style={styles.formalSymbol}>{formatQuotePriceDisplay(debugPrice)}</Text>
          ) : null}
        </View>
      ) : null}

      <QuoteSymbolDebugPanel
        debug={quoteFetchDebug}
        resolvedSymbol={resolvedSymbol}
        exploring={connectionPhase === 'symbol_exploring' && loading}
        currentSymbol={currentSymbol}
      />

      {result ? (
        <>
          {successCount > 0 ? (
            <Text style={styles.rowSuccess}>
              {isPartialSuccess
                ? t('priceSync.updateSuccessPartial', {
                    success: successCount,
                    failed: failCount,
                  })
                : t('priceSync.updateSuccess', { success: successCount })}
            </Text>
          ) : null}
          {isPartialSuccess ? (
            <>
              <Text style={styles.rowWarn}>{t('priceSync.partialFailureBanner')}</Text>
              <Text style={styles.rowWarn}>{t('priceSync.partialFailureSavedHint')}</Text>
            </>
          ) : null}
          {successCount === 0 && failCount > 0 ? (
            <Text style={styles.row}>{t('priceSync.priceNotFetched', { count: failCount })}</Text>
          ) : null}

          {failCount > 0 ? (
            <View style={styles.failBlock}>
              <Pressable
                onPress={() => setFailuresExpanded((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: failuresExpanded }}
              >
                <Text style={styles.failTitle}>
                  {t('priceSync.failedSymbols', { count: failCount })}{' '}
                  {failuresExpanded ? '▼' : '▶'}
                </Text>
              </Pressable>
              {failuresExpanded
                ? result.failures.map((f) => {
                    const detail = failureDetailLine(t, f);
                    return (
                      <View
                        key={`${f.market}-${f.symbol}-${f.positionId}`}
                        style={styles.failItem}
                      >
                        <Text style={styles.failName}>{f.name}</Text>
                        <Text style={styles.failMeta}>
                          {t('priceSync.originalSymbol', {
                            symbol: f.originalSymbol ?? f.symbol,
                            market: MARKET_LABEL[f.market],
                          })}
                        </Text>
                        {f.normalizedYahooSymbol || f.sentSymbol ? (
                          <Text style={styles.failMeta}>
                            {t('priceSync.normalizedSymbol', {
                              symbol: f.normalizedYahooSymbol ?? f.sentSymbol ?? '',
                            })}
                          </Text>
                        ) : null}
                        {f.provider ? (
                          <Text style={styles.failMeta}>
                            {t('priceSync.priceSource', {
                              provider: QUOTE_PROVIDER_LABELS[f.provider],
                            })}
                          </Text>
                        ) : null}
                        <Text style={styles.failReason}>
                          {t('priceSync.errorPrefix', {
                            message: sanitizeErrorForUi(f.reason, f.reason),
                          })}
                        </Text>
                        {f.providerAttempts?.length ? (
                          <View style={styles.providerAttempts}>
                            {f.providerAttempts.map((a) => (
                              <Text
                                key={`${f.positionId}-${a.provider}-${a.shortLabel}`}
                                style={styles.failMeta}
                              >
                                {QUOTE_PROVIDER_LABELS[a.provider]}: {a.shortLabel}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                        {f.lastSavedPrice != null && f.lastSavedPrice > 0 ? (
                          <Text style={styles.failMeta}>
                            {t('priceSync.lastSavedPrice', {
                              price: formatQuotePriceDisplay(f.lastSavedPrice),
                            })}
                          </Text>
                        ) : null}
                        {detail ? <Text style={styles.failDetail}>{detail}</Text> : null}
                      </View>
                    );
                  })
                : null}
            </View>
          ) : null}
        </>
      ) : null}

      {onRetry || onRetryFailed ? (
        <View style={styles.retryBtn}>
          {onRetry ? (
            <Button
              label={loading ? t('priceSync.fetching') : t('priceSync.retryAll')}
              onPress={onRetry}
              disabled={loading}
              variant="ghost"
            />
          ) : null}
          {onRetryFailed && failCount > 0 ? (
            <Button
              label={
                retryFailedLoading
                  ? t('priceSync.retryFailedInProgress')
                  : t('priceSync.retryFailed', { count: failCount })
              }
              onPress={onRetryFailed}
              disabled={loading || retryFailedLoading}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm, borderColor: theme.colors.border },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  badge: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  badgeFetching: { backgroundColor: theme.colors.primary + '33', color: theme.colors.primary },
  badgePartial: { backgroundColor: theme.colors.warning + '33', color: theme.colors.warning },
  badgeCached: { backgroundColor: theme.colors.textMuted + '33', color: theme.colors.textMuted },
  badgeOk: { backgroundColor: '#22c55e33', color: '#16a34a' },
  badgeIdle: { backgroundColor: theme.colors.surfaceElevated, color: theme.colors.textMuted },
  apiStatusRow: { marginTop: theme.spacing.sm, gap: 2 },
  apiStatusLabel: { fontSize: theme.fontSize.sm, fontWeight: '700' },
  apiSuccess: { color: '#16a34a' },
  apiRetry: { color: theme.colors.primary },
  apiRateLimit: { color: theme.colors.warning },
  apiError: { color: theme.colors.danger },
  apiIdle: { color: theme.colors.textMuted },
  exploring: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
  formalSymbol: { color: '#16a34a', fontSize: theme.fontSize.sm, fontWeight: '600', marginTop: 2 },
  row: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  rowSuccess: { color: '#16a34a', fontSize: theme.fontSize.sm, marginTop: 2, fontWeight: '600' },
  rowMuted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2, fontStyle: 'italic' },
  rowWarn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4 },
  failBlock: { marginTop: theme.spacing.sm, gap: theme.spacing.sm },
  failTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  failItem: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    gap: 2,
  },
  failName: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  failMeta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  failReason: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 18 },
  providerAttempts: { marginTop: 4, gap: 2 },
  failDetail: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  retryBtn: { marginTop: theme.spacing.sm },
});
