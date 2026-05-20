import { StyleSheet, Text } from 'react-native';
import { LabeledValue } from './TermHint';
import type { BuyingPowerResult } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = { result: BuyingPowerResult };

export function BuyingPowerCard({ result }: Props) {
  return (
    <Card>
      <LabeledValue term="buyingPower" value={`RM${result.buyingPowerMYR.toLocaleString('ja-JP')}`} />
      <Text style={styles.row}>投資資金: RM{result.totalCapitalMYR.toLocaleString('ja-JP')}</Text>
      <Text style={styles.row}>投資済み: RM{result.investedMYR.toLocaleString('ja-JP')}</Text>
      <Text style={styles.note}>{result.note}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { color: theme.colors.textMuted, marginTop: 4, fontSize: theme.fontSize.sm },
  note: { color: theme.colors.textMuted, marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm, lineHeight: 20 },
});
