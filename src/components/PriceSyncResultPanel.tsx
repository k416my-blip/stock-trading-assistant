import { StyleSheet, Text, View } from 'react-native';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import type { PriceSyncResult } from '../types/marketData';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  result: PriceSyncResult | undefined;
};

export function PriceSyncResultPanel({ result }: Props) {
  if (!result) return null;

  const unavailable = result.failures.length;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>更新結果</Text>
      <Text style={styles.row}>更新成功: {result.updatedCount}件</Text>
      <Text style={styles.row}>価格未取得: {unavailable}件</Text>

      {result.failures.length > 0 ? (
        <View style={styles.failBlock}>
          <Text style={styles.failTitle}>失敗銘柄:</Text>
          {result.failures.map((f) => (
            <View key={`${f.market}-${f.symbol}-${f.positionId}`} style={styles.failItem}>
              <Text style={styles.failName}>{f.name}</Text>
              <Text style={styles.failMeta}>
                ティッカー: {f.symbol} · 市場: {MARKET_LABEL[f.market]}
              </Text>
              <Text style={styles.failReason}>理由: {f.reason}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm, borderColor: theme.colors.border },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md, marginBottom: theme.spacing.xs },
  row: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
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
});
