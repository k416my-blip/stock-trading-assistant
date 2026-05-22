import { StyleSheet, View } from 'react-native';
import type { ConciergeShortAnswer } from '../../types/conciergeUx';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  answer: ConciergeShortAnswer;
};

export function ConciergeShortAnswerBlock({ answer }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-ux-short-answer">
      <SelectableText style={styles.conclusion}>
        <SelectableText style={styles.key}>結論: </SelectableText>
        {answer.conclusionJa}
      </SelectableText>
      {answer.reasonsJa.map((r, i) => (
        <SelectableText key={i} style={styles.reason}>
          {i + 1}. {r}
        </SelectableText>
      ))}
      <SelectableText style={styles.action}>
        <SelectableText style={styles.key}>推奨: </SelectableText>
        {answer.actionJa}
      </SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  key: { fontWeight: '700', color: theme.colors.text },
  conclusion: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 22, marginBottom: 6 },
  reason: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: 2 },
  action: { color: theme.colors.primary, fontSize: theme.fontSize.sm, lineHeight: 20, marginTop: 4 },
});
