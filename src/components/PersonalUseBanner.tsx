import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
import { theme } from '../theme';

export function PersonalUseBanner() {
  const { t } = useTranslation('settings');

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={22} color={theme.colors.primary} />
        <Text style={styles.label}>{t('personalUse.label')}</Text>
      </View>
      <Text style={styles.tagline}>{t('personalUse.tagline')}</Text>
      <Text style={styles.line}>· {t('personalUse.disclaimer1')}</Text>
      <Text style={styles.line}>· {t('personalUse.disclaimer2')}</Text>
      <Text style={styles.line}>· {t('personalUse.disclaimer3')}</Text>
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
