import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { MANUAL_HOLDING_SUCCESS_JA } from '../../constants/holdingErrors';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../../constants/rakutenTrade';
import { formatStockPrice } from '../../services/stockSearch';
import type { ManualOrderItem } from '../../types';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

function pendingBuyCandidates(manualOrderList: ManualOrderItem[]): ManualOrderItem[] {
  return manualOrderList.filter((o) => !o.completed && o.side === 'buy');
}

export function PortfolioCandidateSection() {
  const {
    state,
    isPractice,
    confirmManualOrderAsExecuted,
    removePendingManualOrder,
    readOnlyBlockedMessage,
  } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  const candidates = useMemo(
    () => pendingBuyCandidates(state.manualOrderList),
    [state.manualOrderList],
  );

  const executePurchase = useCallback(
    async (item: ManualOrderItem) => {
      if (item.entryPrice <= 0) {
        Alert.alert('購入できません', '株価が未設定です。手動注文リストで指値を登録してください。');
        return;
      }
      const shares = item.estimatedShares > 0 ? item.estimatedShares : 1;
      setBusyId(item.id);
      try {
        const result = await confirmManualOrderAsExecuted(item.id, {
          shares,
          executedPrice: item.entryPrice,
        });
        if (!result.ok) {
          Alert.alert('購入を記録できません', result.error ?? '不明なエラー');
          return;
        }
        Alert.alert('完了', MANUAL_HOLDING_SUCCESS_JA);
      } finally {
        setBusyId(null);
      }
    },
    [confirmManualOrderAsExecuted],
  );

  const onPurchase = useCallback(
    (item: ManualOrderItem) => {
      if (readOnlyBlockedMessage) {
        Alert.alert('操作できません', readOnlyBlockedMessage);
        return;
      }
      const sym = CURRENCY_SYMBOL[item.currency];
      const priceText = formatStockPrice(item.entryPrice, sym).text;
      Alert.alert(
        '購入を記録',
        `${item.name}（${item.symbol}）\n${sharesLabel(item)} · 約定 ${priceText}\n\nRakuten Trade で約定済みの場合のみ記録してください。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '購入', onPress: () => void executePurchase(item) },
        ],
      );
    },
    [executePurchase, readOnlyBlockedMessage],
  );

  const onDelete = useCallback(
    (item: ManualOrderItem) => {
      if (readOnlyBlockedMessage) {
        Alert.alert('操作できません', readOnlyBlockedMessage);
        return;
      }
      Alert.alert('候補を削除', `${item.name}（${item.symbol}）を候補から削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            const result = removePendingManualOrder(item.id);
            if (!result.ok) {
              Alert.alert('削除できません', result.error ?? '不明なエラー');
            }
          },
        },
      ]);
    },
    [readOnlyBlockedMessage, removePendingManualOrder],
  );

  if (isPractice || candidates.length === 0) return null;

  return (
    <Card style={styles.card} accessibilityLabel="候補銘柄">
      <Text style={styles.title} accessibilityRole="header">
        候補銘柄
      </Text>
      <Text style={styles.hint}>銘柄検索から追加した買い候補です。約定後に「購入」で保有銘柄へ反映します。</Text>
      {candidates.map((item) => {
        const sym = CURRENCY_SYMBOL[item.currency];
        const price = formatStockPrice(item.entryPrice, sym);
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.meta}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.symbol} · {MARKET_LABEL[item.market]} · {sharesLabel(item)} · {price.text}
              </Text>
              {item.source === 'screener' ? (
                <Text style={styles.source}>銘柄検索から追加</Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              <Button
                label="購入"
                accessibilityLabel="候補銘柄購入"
                onPress={() => onPurchase(item)}
                disabled={busy || Boolean(readOnlyBlockedMessage)}
              />
              <Button
                label="削除"
                accessibilityLabel="候補銘柄削除"
                onPress={() => onDelete(item)}
                variant="ghost"
                disabled={busy || Boolean(readOnlyBlockedMessage)}
              />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function sharesLabel(item: ManualOrderItem): string {
  const n = item.estimatedShares > 0 ? item.estimatedShares : 1;
  return `${n}株`;
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
  row: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  meta: { gap: 2 },
  name: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  sub: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  source: { color: theme.colors.primary, fontSize: theme.fontSize.xs },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
});
