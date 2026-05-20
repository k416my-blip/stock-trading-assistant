import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PERSONAL_USE_DISCLAIMERS,
  PERSONAL_USE_LABEL,
  PERSONAL_USE_TAGLINE,
} from '../constants/personalUse';
import { Card } from './ui/Card';
import { theme } from '../theme';

export function PersonalUseBanner() {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={22} color={theme.colors.primary} />
        <Text style={styles.label}>{PERSONAL_USE_LABEL}</Text>
      </View>
      <Text style={styles.tagline}>{PERSONAL_USE_TAGLINE}</Text>
      {PERSONAL_USE_DISCLAIMERS.map((line) => (
        <Text key={line} style={styles.line}>
          · {line}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  label: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  tagline: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  line: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
});
