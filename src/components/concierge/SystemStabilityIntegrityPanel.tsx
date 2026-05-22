import { StyleSheet, Text, View } from 'react-native';
import { INTEGRITY_UI_LABELS_JA } from '../../constants/systemStabilityIntegrity';
import type { SystemStabilityIntegrityBundle } from '../../types/systemStabilityIntegrity';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: SystemStabilityIntegrityBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

function statusColor(status: 'ok' | 'watch' | 'critical') {
  if (status === 'ok') return theme.colors.success;
  if (status === 'watch') return theme.colors.warning;
  return theme.colors.danger;
}

export function SystemStabilityIntegrityPanel({ bundle }: Props) {
  const color = healthColor(bundle.systemHealthScore);
  const critical = bundle.featureStatuses.filter((f) => f.statusJa !== 'ok');

  return (
    <View style={styles.wrap} testID="concierge-system-stability-panel">
      <Text style={styles.title}>{INTEGRITY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      {bundle.emergencyReadOnlyActive ? (
        <SelectableText style={styles.escalation}>
          緊急 Read-only — 刷新・強いAI判断を抑制しています
        </SelectableText>
      ) : null}

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{INTEGRITY_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.systemHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.integritySummaryJa}</SelectableText>
      <SelectableText style={styles.note}>{bundle.freezePreventionJa}</SelectableText>
      <SelectableText style={styles.note}>{bundle.racePreventionJa}</SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{INTEGRITY_UI_LABELS_JA.layers}</Text>
        {bundle.layerRows.map((row) => (
          <SelectableText key={row.layerId} style={styles.bullet}>
            · {row.labelJa}: {row.enabled ? (row.loaded ? 'OK' : '未ロード') : 'オフ'}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{INTEGRITY_UI_LABELS_JA.features}</Text>
        {(critical.length > 0 ? critical : bundle.featureStatuses.slice(0, 6)).map((f) => (
          <SelectableText key={f.id} style={[styles.bullet, { color: statusColor(f.statusJa) }]}>
            · {f.labelJa}: {f.detailJa}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{INTEGRITY_UI_LABELS_JA.flow}</Text>
        {bundle.stateFlowJa.map((line) => (
          <SelectableText key={line} style={styles.bullet}>
            · {line}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{INTEGRITY_UI_LABELS_JA.persist}</Text>
        {bundle.persistenceFlowJa.map((line) => (
          <SelectableText key={line} style={styles.bullet}>
            · {line}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{INTEGRITY_UI_LABELS_JA.deps}</Text>
        {bundle.dependencyGraph.slice(0, 6).map((edge) => (
          <SelectableText key={`${edge.from}-${edge.to}`} style={styles.bullet}>
            · {edge.from} → {edge.to}: {edge.noteJa}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>{bundle.explainRuleBasisJa}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  safety: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  escalation: {
    fontSize: 13,
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  scoreLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  summary: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  section: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bullet: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  footer: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
