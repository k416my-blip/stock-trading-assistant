import { StyleSheet, Text, View } from 'react-native';
import type { ShadowOrder, ShadowFill } from '../types/shadowTrading';
import { Card } from './ui/Card';
import { theme } from '../theme';

const STATUS_LABEL: Record<string, string> = {
  pending: '保留',
  partially_filled: '部分約定',
  filled: '約定済',
  canceled: '取消',
  expired: '期限切れ',
  rejected: '拒否',
};

type Props = {
  orders: ShadowOrder[];
  fills: ShadowFill[];
};

export function ShadowOmsPanel({ orders, fills }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>ペーパー OMS</Text>
      <Text style={styles.section}>未完了注文</Text>
      {orders.length === 0 ? (
        <Text style={styles.muted}>保留中の注文はありません</Text>
      ) : (
        orders.map((o) => (
          <View key={o.id} style={styles.row}>
            <Text style={styles.rowTitle}>
              {o.symbol} {o.side === 'buy' ? '買' : '売'} {o.shares}株 —{' '}
              {STATUS_LABEL[o.status] ?? o.status}
            </Text>
            <Text style={styles.muted}>
              約定 {o.filledShares}/{o.shares} · 想定 {o.expectedPrice}
            </Text>
            {o.rejectReasonJa ? <Text style={styles.warn}>{o.rejectReasonJa}</Text> : null}
            {o.confirmations.slice(-2).map((c) => (
              <Text key={c.id} style={styles.conf}>
                {c.messageJa}
              </Text>
            ))}
          </View>
        ))
      )}
      <Text style={styles.section}>直近約定</Text>
      {fills.length === 0 ? (
        <Text style={styles.muted}>約定履歴なし</Text>
      ) : (
        fills.map((f) => (
          <Text key={f.id} style={styles.muted}>
            {f.symbol} {f.shares}株 @ {f.fillPrice} · スリッページ {f.slippageBps}bps
          </Text>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  section: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  row: { marginTop: 8 },
  rowTitle: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '500' },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 2 },
  conf: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontStyle: 'italic' },
});
