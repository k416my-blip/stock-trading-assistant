import { StyleSheet, Text } from 'react-native';
import { TermHint } from './TermHint';
import { CURRENCY_SYMBOL } from '../constants/rakutenTrade';
import type { BrokerageEstimate } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = { estimate: BrokerageEstimate };

export function BrokerageFeeCard({ estimate }: Props) {
  const sym = CURRENCY_SYMBOL[estimate.currency];
  return (
    <Card>
      <TermHint term="brokerageFee" />
      <Text style={styles.fee}>
        {sym}
        {estimate.estimatedFee.toFixed(2)}
      </Text>
      <Text style={styles.note}>{estimate.note}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  fee: { color: theme.colors.warning, fontSize: theme.fontSize.xl, fontWeight: '700', marginTop: theme.spacing.sm },
  note: { color: theme.colors.textMuted, marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm, lineHeight: 20 },
});
