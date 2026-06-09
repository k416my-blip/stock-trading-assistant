import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui/Card';
import { TermHint } from './TermHint';
import { useApp } from '../context/AppContext';
import { findStock } from '../data/sampleStocks';
import { buildRealAccountExposureFromAppState } from '../services/realAccountExposure';
import { getPendingMalaysiaOrders } from '../services/realAccountPortfolio';
import { theme } from '../theme';

function referenceYahooMap(symbols: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sym of symbols) {
    const px = findStock(sym)?.price;
    if (px != null && px > 0) out[sym] = px;
  }
  return out;
}

export function RealAccountExposurePanel() {
  const { state, isPractice } = useApp();

  const report = useMemo(() => {
    if (isPractice) return null;
    const pending = getPendingMalaysiaOrders(state.manualOrderList);
    const yahooRef = referenceYahooMap(pending.map((o) => o.symbol));
    return buildRealAccountExposureFromAppState(state, yahooRef);
  }, [isPractice, state]);

  if (!report) return null;

  const hasPending = report.pendingOrderValueMYR > 0;
  const showPanel =
    hasPending || report.matchedStockValueMYR > 0 || report.cash.totalCashMYR > 0;
  if (!showPanel) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>実口座資産 · MY v4</Text>
      <TermHint term="portfolioHoldings" />
      <Text style={styles.section}>口座内訳</Text>
      <Text style={styles.line}>現金合計 {report.cash.totalCashMYR} MYR</Text>
      <Text style={styles.line}>
        　利用可能 {report.cash.availableCashMYR} MYR · 拘束 {report.cash.reservedCashMYR} MYR
      </Text>
      <Text style={styles.line}>保有評価額 {report.matchedStockValueMYR} MYR</Text>
      <Text style={styles.line}>
        注文中 {report.pendingOrderValueMYR} MYR（指値ベース）
        {report.pendingMarkToMarketMYR !== report.pendingOrderValueMYR
          ? ` · Yahoo参考 ${report.pendingMarkToMarketMYR} MYR`
          : ''}
      </Text>
      <Text style={styles.total}>総資産 {report.totalAssetsMYR} MYR</Text>
      {report.isDoubleCounting && (
        <Text style={styles.muted}>
          監査87式 {report.audit87EffectiveExposureMYR} MYR（二重計上 {report.doubleCountExcessMYR}{' '}
          MYR）
        </Text>
      )}
      <Text style={styles.section}>想定配分（pro forma · 約定前）</Text>
      <Text style={styles.line}>{report.assumedSummaryJa}</Text>
      <Text style={styles.section}>約定後予想配分</Text>
      <Text style={styles.line}>{report.projectedSummaryJa}</Text>
      <View style={styles.table}>
        {report.allocationRows
          .filter((r) => r.bucket === 'stock')
          .map((r) => (
            <Text key={r.symbol} style={styles.row}>
              {r.labelJa} 想定{r.assumedWeightPct}% → 約定後{r.projectedWeightPct}%（目標
              {r.targetWeightPct}%）
            </Text>
          ))}
      </View>
      <Text style={report.isOverCommitted ? styles.warn : styles.line}>{report.liquiditySummaryJa}</Text>
      <Text style={styles.muted}>追加購入可能 {report.additionalPurchasableMYR} MYR</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm, gap: 4 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  section: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 6, fontWeight: '600' },
  total: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '700', marginTop: 4 },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs },
  row: { color: theme.colors.text, fontSize: 10 },
  table: { marginTop: 4, gap: 2 },
  warn: { color: '#f59e0b', fontSize: theme.fontSize.xs, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
