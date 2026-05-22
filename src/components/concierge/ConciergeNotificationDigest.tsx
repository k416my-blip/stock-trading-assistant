import { StyleSheet, Text, View } from 'react-native';
import type { ConciergeNotificationDigest as DigestModel } from '../../types/conciergeUx';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  digest: DigestModel;
};

export function ConciergeNotificationDigest({ digest }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-ux-notification-digest">
      <Text style={styles.title}>{digest.titleJa}</Text>
      <SelectableText style={styles.summary}>{digest.summaryJa}</SelectableText>
      {digest.bulletsJa.map((b, i) => (
        <SelectableText key={i} style={styles.bullet}>
          · {b}
        </SelectableText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  title: { color: theme.colors.warning, fontWeight: '700', fontSize: theme.fontSize.sm },
  summary: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 20 },
  bullet: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2, lineHeight: 18 },
});
