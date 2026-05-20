import { StyleSheet, Text } from 'react-native';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import type { AllocationCandidate } from '../types';
import { StockRecommendationPanel } from './StockRecommendationPanel';
import { LabeledValue, TermHint } from './TermHint';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = { candidate: AllocationCandidate; index: number };

function formatShares(candidate: AllocationCandidate): string {
  if (candidate.isFractionalShares) {
    return `${candidate.estimatedShares.toLocaleString('ja-JP', { maximumFractionDigits: 4 })}株`;
  }
  return `${candidate.estimatedShares}株`;
}

export function AllocationCandidateCard({ candidate, index }: Props) {
  const sym = CURRENCY_SYMBOL[candidate.currency];
  return (
    <Card>
      <Text style={styles.badge}>購入候補 {index + 1}</Text>
      <Text style={styles.name}>
        {candidate.name}（{candidate.symbol}）
      </Text>
      <Text style={styles.market}>
        {MARKET_LABEL[candidate.market]} · {candidate.categoryLabel}
      </Text>

      <LabeledValue term="allocationPct" value={`${candidate.allocationPct.toFixed(1)}%`} />
      <Text style={styles.amount}>推奨配分額: RM{candidate.allocationMYR.toLocaleString('ja-JP')}</Text>
      <LabeledValue term="estimatedShares" value={formatShares(candidate)} />
      {candidate.unpurchasableWarning ? (
        <Text style={styles.warn}>{candidate.unpurchasableWarning}</Text>
      ) : null}
      {candidate.allocationAdjusted ? (
        <Text style={styles.adjusted}>1株買えるよう配分額を調整しました</Text>
      ) : null}

      <LabeledValue term="entry" value={`${sym}${candidate.entryPrice.toFixed(2)}`} />
      <LabeledValue term="stopLoss" value={`${sym}${candidate.stopLoss.toFixed(2)}`} valueStyle={styles.danger} />
      <LabeledValue term="takeProfit" value={`${sym}${candidate.takeProfit.toFixed(2)}`} valueStyle={styles.success} />

      {candidate.recommendation ? (
        <StockRecommendationPanel recommendation={candidate.recommendation} compact />
      ) : (
        <>
          <Text style={styles.reasonLabel}>選定理由</Text>
          <Text style={styles.reason}>{candidate.selectionReason}</Text>
          <Text style={styles.note}>{candidate.beginnerNote}</Text>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.sm },
  name: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700', marginTop: 4 },
  market: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  amount: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md, marginTop: 4 },
  danger: { color: theme.colors.danger },
  success: { color: theme.colors.success },
  reasonLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.md, fontWeight: '600' },
  reason: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 20 },
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, lineHeight: 20, fontStyle: 'italic' },
  warn: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, fontWeight: '600' },
  adjusted: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs },
});
