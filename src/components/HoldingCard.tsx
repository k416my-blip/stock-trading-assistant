import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import type { HoldingDetail, Market } from '../types';
import { LabeledValue } from './TermHint';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { formatFixed, safeNumber } from '../utils/safeNumeric';
import { theme } from '../theme';

type Props = {
  holding: HoldingDetail;
  isPractice: boolean;
  onPracticeSell: () => void;
  onManualSellChecklist: () => void;
  onUpdateCurrentPrice: (price: number) => { ok: boolean; error?: string };
  onUpdateSymbol: (symbol: string) => { ok: boolean; error?: string };
  onUpdateMarket: (market: Market) => { ok: boolean; error?: string };
  onDeleteHolding?: () => void;
  readOnly?: boolean;
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
  isPractice,
  onPracticeSell,
  onManualSellChecklist,
  onUpdateCurrentPrice,
  onUpdateSymbol,
  onUpdateMarket,
  onDeleteHolding,
  readOnly,
}: Props) {
  const sym = CURRENCY_SYMBOL[holding.currency];
  const pnlColor = holding.unrealizedProfitLoss >= 0 ? styles.profit : styles.loss;
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [symbolInput, setSymbolInput] = useState('');

  const priceSuffix = holding.priceStatusLabel ? `（${holding.priceStatusLabel}）` : '';

  const startEditPrice = () => {
    setPriceInput(String(holding.currentPrice));
    setEditingPrice(true);
  };

  const savePrice = () => {
    const next = Number(priceInput.replace(/,/g, ''));
    const result = onUpdateCurrentPrice(next);
    if (!result.ok) {
      Alert.alert('更新できません', result.error ?? '価格を確認してください。');
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
      Alert.alert('更新できません', result.error ?? '銘柄コードを確認してください。');
      return;
    }
    setEditingSymbol(false);
  };

  const pickMarket = () => {
    Alert.alert(
      MARKET_DATA_MESSAGES.fixMarketButton,
      '市場を選択してください',
      [
        ...MARKET_OPTIONS.map((m) => ({
          text: MARKET_LABEL[m],
          onPress: () => {
            const result = onUpdateMarket(m);
            if (!result.ok) {
              Alert.alert('更新できません', result.error ?? '市場を確認してください。');
            }
          },
        })),
        { text: 'キャンセル', style: 'cancel' },
      ],
    );
  };

  return (
    <Card>
      <Text style={styles.symbol}>
        {holding.symbol} · {MARKET_LABEL[holding.market]}
      </Text>
      <Text style={styles.name}>{holding.name}</Text>

      <LabeledValue term="sharesHeld" value={`${holding.shares}株`} />
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

      <Text style={styles.subheading}>1株あたりの価格</Text>
      <LabeledValue term="avgBuyPrice" value={formatLocal(holding.averageBuyPrice, sym)} />
      <View style={styles.priceRow}>
        <LabeledValue
          term="currentStockPrice"
          value={
            holding.priceAvailable
              ? `${formatLocal(holding.currentPrice, sym)}${priceSuffix}`
              : MARKET_DATA_MESSAGES.priceUnavailable
          }
        />
        {holding.isStale && holding.priceAvailable ? (
          <View style={styles.staleBadge}>
            <Text style={styles.staleBadgeText}>{MARKET_DATA_MESSAGES.priceLabelStaleBadge}</Text>
          </View>
        ) : null}
      </View>
      {!holding.priceAvailable ? (
        <Text style={styles.priceHint}>{MARKET_DATA_MESSAGES.priceUnavailableHint}</Text>
      ) : null}
      {holding.priceFromCache ? (
        <Text style={styles.priceHint}>
          {MARKET_DATA_MESSAGES.priceLabelCached} — API障害時の最終取得価格を表示しています。
        </Text>
      ) : null}
      {holding.priceStaleWarning ? (
        <Text style={styles.priceHint}>
          {holding.priceStaleByAge
            ? '価格の取得から時間が経過しています。更新するか手動で確認してください。'
            : `最新の自動取得に失敗しました。${MARKET_DATA_MESSAGES.priceUnavailableHint}`}
        </Text>
      ) : null}
      <LabeledValue term="stopLossUnitPrice" value={formatLocal(holding.stopLossUnitPrice, sym)} />
      <LabeledValue term="takeProfitUnitPrice" value={formatLocal(holding.takeProfitUnitPrice, sym)} />

      {editingPrice ? (
        <View style={styles.editBox}>
          <Text style={styles.editLabel}>現在株価</Text>
          <TextInput
            style={styles.input}
            value={priceInput}
            onChangeText={setPriceInput}
            keyboardType="decimal-pad"
            placeholder="例: 12.50"
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.editActions}>
            <Button label="保存" onPress={savePrice} />
            <Button label="キャンセル" onPress={() => setEditingPrice(false)} variant="ghost" />
          </View>
        </View>
      ) : (
        <Button label={MARKET_DATA_MESSAGES.manualPriceButton} onPress={startEditPrice} variant="ghost" />
      )}

      {editingSymbol ? (
        <View style={styles.editBox}>
          <Text style={styles.editLabel}>銘柄コード（例: 1155, AAPL, 0700）</Text>
          <TextInput
            style={styles.input}
            value={symbolInput}
            onChangeText={setSymbolInput}
            autoCapitalize="characters"
            placeholder="ティッカー"
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.editActions}>
            <Button label="保存" onPress={saveSymbol} />
            <Button label="キャンセル" onPress={() => setEditingSymbol(false)} variant="ghost" />
          </View>
        </View>
      ) : (
        <Button label={MARKET_DATA_MESSAGES.fixSymbolButton} onPress={startEditSymbol} variant="ghost" />
      )}

      <Button label={MARKET_DATA_MESSAGES.fixMarketButton} onPress={pickMarket} variant="ghost" />

      {holding.isNearStopLoss ? (
        <Text style={styles.alertLoss}>損切りラインに近づいています（参考）</Text>
      ) : null}
      {holding.isNearTakeProfit ? (
        <Text style={styles.alertProfit}>利確ラインに近づいています（参考）</Text>
      ) : null}

      <Text style={styles.subheading}>推奨の合計金額（参考）</Text>
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

      <LabeledValue
        term="unrealizedPnL"
        value={`${holding.unrealizedProfitLoss >= 0 ? '+' : ''}${formatLocal(holding.unrealizedProfitLoss, sym)}（${formatFixed(holding.unrealizedProfitLossPercent, 1, '0.0')}%）`}
        valueStyle={pnlColor}
      />

      <View style={styles.actions}>
        {isPractice ? (
          <Button label="仮想売却" onPress={onPracticeSell} variant="ghost" disabled={readOnly} />
        ) : (
          <Button label="売却候補に追加" onPress={onManualSellChecklist} variant="ghost" disabled={readOnly} />
        )}
        {onDeleteHolding ? (
          <Button label="保有を削除" onPress={onDeleteHolding} variant="ghost" disabled={readOnly} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  symbol: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  name: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2, marginBottom: theme.spacing.sm },
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
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm },
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
