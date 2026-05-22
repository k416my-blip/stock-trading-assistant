import { StyleSheet, Text, View } from 'react-native';
import { CONCIERGE_RISK_COLOR_HEX } from '../../constants/conciergeUx';
import type { ConciergeFocusSymbol } from '../../types/conciergeUx';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  focus: ConciergeFocusSymbol;
};

export function ConciergeFocusSymbolCard({ focus }: Props) {
  const accent = CONCIERGE_RISK_COLOR_HEX[focus.riskColor];
  return (
    <View style={[styles.card, { borderColor: accent }]} testID="concierge-ux-focus-symbol">
      <Text style={[styles.badge, { color: accent }]}>フォーカス銘柄</Text>
      <SelectableText style={styles.title}>{focus.displayLabelJa}</SelectableText>
      <SelectableText style={styles.headline}>{focus.headlineJa}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  badge: { fontSize: theme.fontSize.sm, fontWeight: '700', marginBottom: 4 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  headline: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 20 },
});
