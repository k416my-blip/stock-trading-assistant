import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AI_PERSONALITY_SUBTITLE_JA } from '../constants/aiPersonality';
import { AI_UI } from '../constants/aiStrategyBriefing';
import { AI_CONCIERGE_UI } from '../constants/aiConcierge';
import { useAiConcierge } from '../context/AiConciergeContext';
import { useCentralIntelligence } from '../hooks/useCentralIntelligence';
import { useApp } from '../context/AppContext';
import { isDevLightweightNotice } from '../services/degradedModePresentation';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { theme } from '../theme';

function ConfidencePill({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? theme.colors.success : value >= 50 ? theme.colors.warning : theme.colors.danger;
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, { color }]}>{value}%</Text>
    </View>
  );
}

export function CentralIntelligencePanel() {
  const { degradedMode } = useApp();
  const devLightweight = isDevLightweightNotice({
    operationalDegraded: degradedMode,
  });
  const { openPanel } = useAiConcierge();
  const { worldModel, loading } = useCentralIntelligence();

  const awareness = worldModel?.systemAwareness;
  const topRecs = worldModel?.recommendations.slice(0, 3) ?? [];

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={28} color={theme.colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{AI_UI.intelligencePanelTitle}</Text>
          <Text style={styles.subtitle}>{AI_PERSONALITY_SUBTITLE_JA}</Text>
        </View>
      </View>

      {loading && !worldModel ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : worldModel ? (
        <>
          <View style={styles.regimeRow}>
            <Text style={styles.regimeLabel}>相場レジーム</Text>
            <Text style={styles.regimeValue}>{worldModel.marketRegimeLabel}</Text>
            <Text style={styles.riskBadge}>リスク: {worldModel.riskMode}</Text>
          </View>

          <Text style={styles.sectionLabel}>{AI_UI.systemHealth}</Text>
          <Text style={styles.healthLine}>
            {worldModel.operations.healthSummaryJa ??
              `ヘルス: ${worldModel.operations.healthOverall ?? '未実行'}`}
          </Text>
          {degradedMode || devLightweight || worldModel.operations.degradedReasonsJa.length > 0 ? (
            <View style={[styles.warningBox, devLightweight && !degradedMode && styles.infoBox]}>
              <Text style={styles.warningTitle}>
                {devLightweight && !degradedMode
                  ? AI_UI.devLightweightWarning
                  : AI_UI.degradedWarning}
              </Text>
              {worldModel.operations.degradedReasonsJa.map((r) => (
                <Text key={r} style={styles.warningLine}>
                  · {r}
                </Text>
              ))}
            </View>
          ) : null}

          {awareness ? (
            <View style={styles.confidenceRow}>
              <ConfidencePill label={AI_UI.systemConfidence} value={awareness.systemConfidence} />
              <ConfidencePill
                label={AI_UI.dataConfidence}
                value={awareness.dataFreshnessConfidence}
              />
              <ConfidencePill
                label={AI_UI.executionConfidence}
                value={awareness.executionConfidence}
              />
              <ConfidencePill
                label={AI_UI.recoveryConfidence}
                value={awareness.recoveryConfidence}
              />
            </View>
          ) : null}

          {awareness && awareness.degradationReasonsJa.length > 0 ? (
            <Text style={styles.degradeNote}>
              信頼度調整: {awareness.degradationReasonsJa.join(' · ')}
            </Text>
          ) : null}

          <Text style={styles.sectionLabel}>{AI_UI.topRecommendations}</Text>
          {topRecs.map((rec) => (
            <View key={rec.ticker} style={styles.recRow}>
              <Text style={styles.recTicker}>{rec.ticker}</Text>
              <Text style={styles.recMeta}>
                {rec.action} · 緊急度 {rec.urgency} · 信頼度 {rec.adjustedConfidence}%
              </Text>
              <Text style={styles.recNote}>{rec.confidenceNoteJa}</Text>
            </View>
          ))}

          <Text style={styles.queueMeta}>{worldModel.operations.queueStateJa}</Text>
        </>
      ) : null}

      <Text style={styles.conciergeHint}>{AI_CONCIERGE_UI.openFromHome}</Text>
      <Button label="AIコンシェルジュを開く" onPress={openPanel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerText: { flex: 1 },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  loader: { marginVertical: theme.spacing.md },
  regimeRow: {
    marginBottom: theme.spacing.sm,
  },
  regimeLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  regimeValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  riskBadge: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  sectionLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  healthLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  infoBox: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  warningTitle: {
    color: theme.colors.warning,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  warningLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  confidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  pill: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minWidth: '47%',
  },
  pillLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  pillValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  degradeNote: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  recRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  recTicker: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  recMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  recNote: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
    fontStyle: 'italic',
  },
  queueMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  conciergeHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
});
