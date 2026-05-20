import { StyleSheet, Text, View } from 'react-native';
import type { BulkBuyDebugInfo } from '../services/practiceBulkBuy';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = {
  isPractice: boolean;
  debug: BulkBuyDebugInfo | null;
  lastError: string | null;
};

export function BulkBuyDebugPanel({ isPractice, debug, lastError }: Props) {
  if (!__DEV__) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>デバッグ（開発用）</Text>
      <Text style={styles.row}>モード: {isPractice ? '練習' : '手動'}</Text>
      {debug ? (
        <>
          <Text style={styles.row}>仮想資金: RM{debug.virtualCashMYR.toLocaleString('ja-JP')}</Text>
          <Text style={styles.row}>
            配分合計: RM{debug.allocationTotalMYR.toLocaleString('ja-JP')}
          </Text>
          <Text style={styles.row}>有効購入候補: {debug.validPurchaseCount}件</Text>
          <Text style={styles.row}>保存済み保有: {debug.savedHoldingsCount}件</Text>
        </>
      ) : (
        <Text style={styles.row}>プラン作成後に表示されます</Text>
      )}
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: theme.colors.border, borderStyle: 'dashed' },
  title: { color: theme.colors.textMuted, fontWeight: '700', fontSize: theme.fontSize.sm },
  row: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
});
