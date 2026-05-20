import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiStrategyBriefing } from '../types/aiStrategyBriefing';
import { AI_BRIEFING_DISCLAIMER, AI_UI } from '../constants/aiStrategyBriefing';
import { PERSONAL_USE_LABEL } from '../constants/personalUse';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  briefing: AiStrategyBriefing;
};

export function AiStrategyBriefingCard({ briefing }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={28} color={theme.colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{AI_UI.briefingTitle}</Text>
          <Text style={styles.subtitle}>
            {PERSONAL_USE_LABEL} · {AI_UI.briefingSubtitle}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{AI_UI.marketRegime}</Text>
        <Text style={styles.value}>{briefing.marketRegimeLabel}</Text>
      </View>

      <Text style={styles.label}>{AI_UI.topSuggestions}</Text>
      {briefing.topSuggestions.map((line) => (
        <Text key={line} style={styles.suggestion}>
          · {line}
        </Text>
      ))}

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>{AI_UI.riskMode}</Text>
          <Text style={styles.chipValue}>{briefing.riskMode}</Text>
        </View>
        <View style={[styles.chip, styles.chipWide]}>
          <Text style={styles.chipLabel}>{AI_UI.nextMacroEvent}</Text>
          <Text style={styles.chipValue}>{briefing.nextMacroEvent}</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>{AI_BRIEFING_DISCLAIMER}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerText: { flex: 1 },
  title: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  row: { marginBottom: theme.spacing.sm },
  label: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: 2 },
  value: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  suggestion: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginLeft: theme.spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  chip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    minWidth: '45%',
    flexGrow: 1,
  },
  chipWide: { minWidth: '100%' },
  chipLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  chipValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
  },
});
