import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui/Card';
import { useApp } from '../context/AppContext';
import { calculateBuyingPower } from '../services/buyingPower';
import { findStock } from '../data/sampleStocks';
import { buildOrderFundingFromAppState, fitPendingOrdersToCashWithFees } from '../services/realAccountOrderFunding';
import { buildPendingOrderValuationRows } from '../services/realAccountOrderValuation';
import { getPendingMalaysiaOrders } from '../services/realAccountPortfolio';
import { theme } from '../theme';

function referenceYahooPrices(symbols: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sym of symbols) {
    const px = findStock(sym)?.price;
    if (px != null && px > 0) out[sym] = px;
  }
  return out;
}

export function RealAccountPendingOrdersPanel() {
  const { state, isPractice } = useApp();

  const { rows, funding, proposal, afterFunding } = useMemo(() => {
    if (isPractice) return { rows: [], funding: null, proposal: null, afterFunding: null };
    const pending = getPendingMalaysiaOrders(state.manualOrderList).filter((o) => o.side === 'buy');
    if (pending.length === 0) return { rows: [], funding: null, proposal: null, afterFunding: null };
    const cash = calculateBuyingPower(state).buyingPowerMYR;
    const yahoo = referenceYahooPrices(pending.map((o) => o.symbol));
    const funding = buildOrderFundingFromAppState({ cashMYR: cash, manualOrderList: state.manualOrderList });
    const fitted = funding.canPlaceOrders
      ? null
      : fitPendingOrdersToCashWithFees(pending, cash);
    return {
      rows: buildPendingOrderValuationRows(pending, yahoo),
      funding,
      proposal: fitted?.proposal ?? null,
      afterFunding: fitted?.funding ?? funding,
    };
  }, [isPractice, state]);

  if (!funding || rows.length === 0) return null;

  const yahooTotal = rows.reduce((s, r) => s + (r.yahooMarketValueMYR ?? r.orderPriceMYR), 0);
  const deltaTotal = Math.round((funding.orderTotalMYR - yahooTotal) * 1000) / 1000;
  const balanceNegative = funding.balanceAfterMYR < -0.001;
  const shortfallMYR = Math.max(0, funding.grandTotalMYR - funding.cashMYR);
  const reductionHint =
    proposal && proposal.reductions.length > 0
      ? proposal.reductions
          .map((r) => `${r.labelJa}−${r.sharesRemoved}株@${r.entryPriceMYR.toFixed(2)}`)
          .join(' · ')
      : null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Rakuten注文 · 指値登録</Text>
      <Text style={styles.hint}>注文金額=entryPrice×株数 · Yahooは参考のみ</Text>

      <View style={styles.fundingBox}>
        <Text style={styles.fundingLine}>現金 {funding.cashMYR.toFixed(0)} MYR</Text>
        <Text style={styles.fundingLine}>注文金額 {funding.orderTotalMYR.toFixed(0)} MYR</Text>
        <Text style={styles.fundingLine}>予想手数料 {funding.estimatedFeesMYR.toFixed(0)} MYR</Text>
        <Text style={[styles.fundingTotal, balanceNegative && styles.negative]}>
          発注後残高 {funding.balanceAfterMYR.toFixed(0)} MYR
          {funding.canPlaceOrders ? ' · 発注可' : ' · 発注不可'}
        </Text>
        {shortfallMYR > 0.001 ? (
          <>
            <Text style={[styles.fundingLine, styles.negative]}>
              不足額 {shortfallMYR.toFixed(0)} MYR（手数料込み）
            </Text>
            {reductionHint ? (
              <Text style={styles.fundingMuted}>削減候補（指値固定）: {reductionHint}</Text>
            ) : null}
            {afterFunding ? (
              <Text style={styles.fundingLine}>
                削減後残高 {afterFunding.balanceAfterMYR.toFixed(0)} MYR
                {afterFunding.canPlaceOrders ? ' · 発注可' : ' · 仍不足'}
              </Text>
            ) : null}
          </>
        ) : null}
        <Text style={styles.fundingMuted}>
          利用可能資金（手数料控除後） {funding.deployableCashMYR.toFixed(0)} MYR
        </Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.cell, styles.colName]}>銘柄</Text>
        <Text style={[styles.cell, styles.colNum]}>注文</Text>
        <Text style={[styles.cell, styles.colNum]}>Yahoo</Text>
        <Text style={[styles.cell, styles.colNum]}>差額</Text>
      </View>
      {rows.map((r) => {
        const delta = r.orderVsYahooDeltaMYR ?? 0;
        return (
          <View key={r.orderId} style={styles.dataRow}>
            <Text style={[styles.cell, styles.colName]}>
              {r.labelJa} {r.shares}株 @{r.limitPriceMYR.toFixed(2)}
            </Text>
            <Text style={[styles.cell, styles.colNum]}>{r.orderPriceMYR.toFixed(0)}</Text>
            <Text style={[styles.cell, styles.colNumMuted]}>
              {(r.yahooMarketValueMYR ?? r.orderPriceMYR).toFixed(0)}
            </Text>
            <Text style={[styles.cell, styles.colNum, delta > 0 ? styles.over : delta < 0 ? styles.under : null]}>
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(0)}
            </Text>
          </View>
        );
      })}
      <Text style={styles.total}>
        合計 注文 {funding.orderTotalMYR.toFixed(0)} + 手数料 {funding.estimatedFeesMYR.toFixed(0)} ={' '}
        {funding.grandTotalMYR.toFixed(0)} MYR · Yahoo参考 {yahooTotal.toFixed(0)} · 差額{' '}
        {deltaTotal >= 0 ? '+' : ''}
        {deltaTotal.toFixed(0)}
      </Text>
      <Text style={styles.muted}>指値の編集は「手動注文リスト」から</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm, gap: 4 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  hint: { color: theme.colors.textMuted, fontSize: 10, marginBottom: 4 },
  fundingBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginVertical: 4,
    gap: 2,
  },
  fundingLine: { color: theme.colors.text, fontSize: theme.fontSize.xs },
  fundingTotal: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '700', marginTop: 4 },
  fundingMuted: { color: theme.colors.textMuted, fontSize: 10 },
  negative: { color: '#ef4444' },
  headerRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dataRow: { flexDirection: 'row', paddingVertical: 3 },
  cell: { color: theme.colors.text, fontSize: 10 },
  colName: { flex: 2 },
  colNum: { flex: 1, textAlign: 'right', fontWeight: '600' },
  colNumMuted: { flex: 1, textAlign: 'right', color: theme.colors.textMuted },
  total: { color: theme.colors.primary, fontSize: theme.fontSize.xs, fontWeight: '700', marginTop: 6 },
  over: { color: '#f59e0b' },
  under: { color: '#22c55e' },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 4 },
});
