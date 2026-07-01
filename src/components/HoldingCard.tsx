import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SYMBOL_EXPLORING_MESSAGE } from '../constants/yahooFinance';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import type { HoldingDetail, Market, PortfolioPosition } from '../types';
import type { PriceSyncFailure } from '../types/marketData';
import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import { formatQuotePriceDisplay } from '../utils/formatQuotePrice';
import {
  formatDisplayCurrentPriceLabel,
  formatHoldingPriceMeta,
  resolveDisplayCurrentPrice,
  resolveHoldingPrice,
} from '../services/holdingPriceCore';
import { LabeledValue, TermHintIcon } from './TermHint';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { formatFixed } from '../utils/safeNumeric';
import { priceFailureStatusLabel } from '../utils/marketDataI18n';
import { theme } from '../theme';

type Props = {
  holding: HoldingDetail;
  position: PortfolioPosition;
  isPractice: boolean;
  onPracticeSell: () => void;
  onManualSellChecklist: () => void;
  onUpdateCurrentPrice: (price: number) => { ok: boolean; error?: string };
  onUpdateSymbol: (symbol: string) => { ok: boolean; error?: string };
  onUpdateMarket: (market: Market) => { ok: boolean; error?: string };
  onDeleteHolding?: () => void;
  readOnly?: boolean;
  priceExploring?: boolean;
  resolvedYahooSymbol?: string;
  priceFailure?: PriceSyncFailure;
  onRetryPrice?: () => void;
  priceRetrying?: boolean;
};

const MARKET_OPTIONS: Market[] = ['bursa', 'us', 'hk'];

function formatLocal(amount: number, sym: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${sym}${n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMYR(amount: number): string {
  return `RM${amount.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function HoldingCard({
  holding,
  position,
  isPractice,
  onPracticeSell,
  onManualSellChecklist,
  onUpdateCurrentPrice,
  onUpdateSymbol,
  onUpdateMarket,
  onDeleteHolding,
  readOnly,
  priceExploring,
  resolvedYahooSymbol,
  priceFailure,
  onRetryPrice,
  priceRetrying,
}: Props) {
  const { t } = useTranslation('portfolio');
  const { t: tg } = useTranslation('glossary');
  const sym = CURRENCY_SYMBOL[holding.currency];
  const pnlColor = holding.unrealizedProfitLoss >= 0 ? styles.profit : styles.loss;
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState(false);
  const [failureExpanded, setFailureExpanded] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [symbolInput, setSymbolInput] = useState('');

  const resolved = resolveHoldingPrice(position);
  const priceMeta = formatHoldingPriceMeta(position, resolved);
  const displayCurrentPrice = resolveDisplayCurrentPrice(holding, position);
  const sourceLabel =
    holding.priceStatusLabel ?? priceMeta.priceStatusLabel ?? resolved.priceStatusLabel ?? '';
  const lastUpdatedDisplay = holding.lastUpdatedDisplay ?? priceMeta.lastUpdatedLabel;
  const quoteProviderLabel = holding.lastQuoteProviderLabel ?? priceMeta.quoteProviderLabel;
  const yahooSymbolLabel = holding.normalizedYahooSymbol ?? priceMeta.normalizedYahooSymbol;
  const showStaleBadge = resolved.showStaleBadge && !priceExploring;
  const priceFailureStatus = priceFailureStatusLabel(t, priceFailure);

  const startEditPrice = () => {
    setPriceInput(String(displayCurrentPrice));
    setEditingPrice(true);
  };

  const savePrice = () => {
    const next = Number(priceInput.replace(/,/g, ''));
    const result = onUpdateCurrentPrice(next);
    if (!result.ok) {
      Alert.alert(t('holding.updateBlockedTitle'), result.error ?? t('holding.confirmPrice'));
      return;
    }
    setEditingPrice(false);
  };

  const startEditSymbol = () => {
    setSymbolInput(holding.symbol);
    setEditingSymbol(true);
  };

  const saveSymbol = () => {
    const result = onUpdateSymbol(symbolInput);
    if (!result.ok) {
      Alert.alert(t('holding.updateBlockedTitle'), result.error ?? t('holding.confirmSymbol'));
      return;
    }
    setEditingSymbol(false);
  };

  const pickMarket = () => {
    Alert.alert(t('priceSync.fixMarketButton'), t('holding.selectMarketTitle'), [
      ...MARKET_OPTIONS.map((m) => ({
        text: MARKET_LABEL[m],
        onPress: () => {
          const result = onUpdateMarket(m);
          if (!result.ok) {
            Alert.alert(t('holding.updateBlockedTitle'), result.error ?? t('holding.confirmMarket'));
          }
        },
      })),
      { text: t('holding.cancel'), style: 'cancel' as const },
    ]);
  };

  const currentPriceDisplayText = priceExploring
    ? SYMBOL_EXPLORING_MESSAGE
    : formatDisplayCurrentPriceLabel(displayCurrentPrice, sym, sourceLabel);

  return (
    <Card>
      <Text style={styles.name}>{holding.name}</Text>
      <Text style={styles.marketMeta}>
        {holding.symbol} · {MARKET_LABEL[holding.market]}
      </Text>

      <LabeledValue term="sharesHeld" value={t('holding.sharesUnit', { count: holding.shares })} />
      <LabeledValue
        term="holdingAllocationPct"
        value={`${formatFixed(holding.allocationPct, 1, '0.0')}%`}
      />

      <LabeledValue
        term="purchaseAmount"
        value={`${formatLocal(holding.purchaseAmount, sym)}（${formatMYR(holding.purchaseAmountMYR)}）`}
      />
      <LabeledValue
        term="currentValuation"
        value={`${formatLocal(holding.currentValue, sym)}（${formatMYR(holding.currentValueMYR)}）`}
      />

      <Text style={styles.subheading}>{t('holding.pricePerShare')}</Text>
      <LabeledValue term="avgBuyPrice" value={formatLocal(holding.averageBuyPrice, sym)} />
      <View style={styles.currentPriceSection}>
        <View style={styles.currentPriceMain}>
          <View style={styles.currentPriceLabelRow}>
            <Text style={styles.currentPriceLabel}>{tg('currentStockPrice.label')}</Text>
            <TermHintIcon term="currentStockPrice" />
          </View>
          <Text style={styles.currentPriceValue} accessibilityLabel={t('holding.currentPriceLabel')}>
            {currentPriceDisplayText}
          </Text>
          <Text style={styles.currentPriceDesc}>{tg('currentStockPrice.description')}</Text>
        </View>
        {showStaleBadge ? (
          <View style={styles.staleBadge}>
            <Text style={styles.staleBadgeText}>{t('priceSync.priceLabelStaleBadge')}</Text>
          </View>
        ) : null}
      </View>
      {priceExploring ? (
        <Text style={styles.priceExploring}>
          {resolvedYahooSymbol
            ? t('holding.formalSymbol', { symbol: resolvedYahooSymbol })
            : SYMBOL_EXPLORING_MESSAGE}
        </Text>
      ) : null}
      {resolved.priceFromCache && displayCurrentPrice > 0 ? (
        <Text style={styles.priceHint}>
          {t('priceSync.cached')} — {t('priceSync.priceLabelCachedSuffix')}
        </Text>
      ) : null}
      {resolved.priceStaleWarning && displayCurrentPrice > 0 ? (
        <Text style={styles.priceHint}>
          {resolved.priceStaleByAge
            ? t('holding.stalePriceHint')
            : t('holding.savedPriceFallbackHint')}
        </Text>
      ) : null}

      {displayCurrentPrice > 0 ? (
        <View style={styles.priceMetaBlock}>
          {quoteProviderLabel ? (
            <Text style={styles.priceMetaText}>
              {t('holding.priceSourceLabel')}: {quoteProviderLabel}
            </Text>
          ) : null}
          {lastUpdatedDisplay ? (
            <Text style={styles.priceMetaText}>
              {t('holding.lastUpdatedLabel')}: {lastUpdatedDisplay}
            </Text>
          ) : null}
          {sourceLabel ? (
            <Text style={styles.priceMetaText}>
              {t('holding.priceTypeLabel')}: {sourceLabel}
            </Text>
          ) : null}
          {yahooSymbolLabel ? (
            <Text style={styles.priceMetaMuted}>Yahoo symbol: {yahooSymbolLabel}</Text>
          ) : null}
        </View>
      ) : null}

      {priceFailure ? (
        <View style={styles.failureBox}>
          {priceFailureStatus ? (
            <Text style={styles.failureStatus}>{priceFailureStatus}</Text>
          ) : null}
          <Pressable
            onPress={() => setFailureExpanded((v) => !v)}
            accessibilityRole="button"
          >
            <Text style={styles.failureTitle}>
              {t('holding.failureDetailsTitle')} {failureExpanded ? '▼' : '▶'}
            </Text>
          </Pressable>
          {failureExpanded ? (
            <View style={styles.failureBody}>
              <Text style={styles.failureMeta}>
                {t('priceSync.originalSymbol', {
                  symbol: priceFailure.originalSymbol ?? priceFailure.symbol,
                  market: holding.market,
                })}
              </Text>
              {priceFailure.normalizedYahooSymbol ? (
                <Text style={styles.failureMeta}>
                  {t('priceSync.normalizedSymbol', { symbol: priceFailure.normalizedYahooSymbol })}
                </Text>
              ) : priceFailure.sentSymbol ? (
                <Text style={styles.failureMeta}>
                  {t('priceSync.normalizedSymbol', { symbol: priceFailure.sentSymbol })}
                </Text>
              ) : null}
              {priceFailure.provider ? (
                <Text style={styles.failureMeta}>
                  {t('holding.priceSourceLabel')}: {QUOTE_PROVIDER_LABELS[priceFailure.provider]}
                </Text>
              ) : null}
              <Text style={styles.failureReason}>
                {priceFailureStatus ?? priceFailure.reason}
              </Text>
              <Text style={styles.failureMeta}>{priceFailure.reason}</Text>
              {priceFailure.providerAttempts?.length ? (
                <View style={styles.providerAttempts}>
                  {priceFailure.providerAttempts.map((a) => (
                    <Text key={`${a.provider}-${a.shortLabel}`} style={styles.failureMeta}>
                      {QUOTE_PROVIDER_LABELS[a.provider]}: {a.shortLabel}
                    </Text>
                  ))}
                </View>
              ) : null}
              {priceFailure.lastSavedPrice != null && priceFailure.lastSavedPrice > 0 ? (
                <Text style={styles.failureMeta}>
                  {t('priceSync.lastSavedPrice', {
                    price: formatQuotePriceDisplay(priceFailure.lastSavedPrice),
                  })}
                </Text>
              ) : holding.lastSavedPrice != null && holding.lastSavedPrice > 0 ? (
                <Text style={styles.failureMeta}>
                  {t('priceSync.lastSavedPrice', {
                    price: formatQuotePriceDisplay(holding.lastSavedPrice),
                  })}
                </Text>
              ) : null}
              {onRetryPrice ? (
                <Button
                  label={priceRetrying ? t('holding.retrying') : t('holding.retryOne')}
                  onPress={onRetryPrice}
                  disabled={priceRetrying}
                  variant="ghost"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <LabeledValue term="stopLossUnitPrice" value={formatLocal(holding.stopLossUnitPrice, sym)} />
      <LabeledValue term="takeProfitUnitPrice" value={formatLocal(holding.takeProfitUnitPrice, sym)} />

      <LabeledValue
        term="suggestedStopLossTotal"
        value={`${formatLocal(holding.suggestedStopLossTotal, sym)}（${formatMYR(holding.suggestedStopLossTotalMYR)}）`}
        valueStyle={styles.loss}
      />
      <LabeledValue
        term="suggestedTakeProfitTotal"
        value={`${formatLocal(holding.suggestedTakeProfitTotal, sym)}（${formatMYR(holding.suggestedTakeProfitTotalMYR)}）`}
        valueStyle={styles.profit}
      />

      {holding.isNearStopLoss ? (
        <Text style={styles.alertLoss}>{t('holding.nearStopLoss')}</Text>
      ) : null}
      {holding.isNearTakeProfit ? (
        <Text style={styles.alertProfit}>{t('holding.nearTakeProfit')}</Text>
      ) : null}

      {editingPrice ? (
        <View style={styles.editBox}>
          <Text style={styles.editLabel}>{t('holding.currentPriceLabel')}</Text>
          <TextInput
            style={styles.input}
            value={priceInput}
            onChangeText={setPriceInput}
            keyboardType="decimal-pad"
            placeholder={t('holding.pricePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.editActions}>
            <Button label={t('holding.save')} onPress={savePrice} />
            <Button label={t('holding.cancel')} onPress={() => setEditingPrice(false)} variant="ghost" />
          </View>
        </View>
      ) : (
        <Button label={t('priceSync.manualPriceButton')} onPress={startEditPrice} variant="ghost" />
      )}

      {editingSymbol ? (
        <View style={styles.editBox}>
          <Text style={styles.editLabel}>{t('holding.symbolCodeLabel')}</Text>
          <TextInput
            style={styles.input}
            value={symbolInput}
            onChangeText={setSymbolInput}
            autoCapitalize="characters"
            placeholder={t('holding.symbolPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.editActions}>
            <Button label={t('holding.save')} onPress={saveSymbol} />
            <Button label={t('holding.cancel')} onPress={() => setEditingSymbol(false)} variant="ghost" />
          </View>
        </View>
      ) : (
        <Button label={t('priceSync.fixSymbolButton')} onPress={startEditSymbol} variant="ghost" />
      )}

      <Button label={t('priceSync.fixMarketButton')} onPress={pickMarket} variant="ghost" />

      <LabeledValue
        term="unrealizedPnL"
        value={`${holding.unrealizedProfitLoss >= 0 ? '+' : ''}${formatLocal(holding.unrealizedProfitLoss, sym)}（${formatFixed(holding.unrealizedProfitLossPercent, 1, '0.0')}%）`}
        valueStyle={pnlColor}
      />

      <View style={styles.actions}>
        {isPractice ? (
          <Button label={t('holding.practiceSell')} onPress={onPracticeSell} variant="ghost" disabled={readOnly} />
        ) : (
          <Button label={t('holding.addSellCandidate')} onPress={onManualSellChecklist} variant="ghost" disabled={readOnly} />
        )}
        {onDeleteHolding ? (
          <Button label={t('holding.deleteHolding')} onPress={onDeleteHolding} variant="ghost" disabled={readOnly} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  marketMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  symbol: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  subheading: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  profit: { color: theme.colors.success },
  loss: { color: theme.colors.danger },
  alertLoss: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  alertProfit: { color: theme.colors.success, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  currentPriceSection: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  currentPriceMain: { flex: 1, minWidth: 200 },
  currentPriceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currentPriceLabel: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  currentPriceValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginTop: 4,
    fontWeight: '600',
  },
  currentPriceDesc: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2, lineHeight: 18 },
  staleBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  staleBadgeText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceHint: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 18 },
  priceMetaBlock: { marginTop: theme.spacing.sm, gap: 2 },
  priceMetaText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  priceMetaMuted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  priceExploring: { color: theme.colors.primary, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 18, fontWeight: '600' },
  failureBox: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.xs,
  },
  failureStatus: { color: theme.colors.warning, fontWeight: '700', fontSize: theme.fontSize.sm },
  failureTitle: { color: theme.colors.warning, fontWeight: '600', fontSize: theme.fontSize.sm },
  failureBody: { gap: 4, marginTop: 4 },
  failureMeta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  failureReason: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 18 },
  providerAttempts: { marginTop: 4, gap: 2 },
  editBox: { marginTop: theme.spacing.sm, gap: theme.spacing.sm },
  editLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  editActions: { gap: theme.spacing.sm },
  actions: { marginTop: theme.spacing.sm },
});
