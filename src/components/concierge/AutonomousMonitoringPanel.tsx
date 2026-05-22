import { StyleSheet, Text, View } from 'react-native';
import { AUTONOMOUS_LABELS_JA } from '../../constants/autonomousMonitoring';
import type { AutonomousMonitoringBundle } from '../../types/autonomousMonitoring';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

const HEATMAP_COLOR: Record<string, string> = {
  danger: theme.colors.danger,
  momentum: theme.colors.primary,
  opportunity: theme.colors.success,
};

const STRESS_COLOR: Record<string, string> = {
  green: theme.colors.success,
  yellow: theme.colors.warning,
  orange: '#f97316',
  red: theme.colors.danger,
};

type Props = {
  bundle: AutonomousMonitoringBundle;
};

export function AutonomousMonitoringPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-autonomous-monitoring">
      <Text style={styles.title}>{AUTONOMOUS_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.meta}>
        {bundle.adaptiveFrequencyLabelJa} · {bundle.resourceNoteJa}
        {bundle.silentModeActive ? ` · ${AUTONOMOUS_LABELS_JA.silent}` : ''}
      </SelectableText>

      {bundle.emergencyMode ? (
        <View style={styles.emergency}>
          <Text style={styles.emergencyTitle}>{AUTONOMOUS_LABELS_JA.emergency}</Text>
          <SelectableText style={styles.emergencyBody}>{bundle.emergencyMessageJa}</SelectableText>
        </View>
      ) : null}

      {bundle.sessionBrief ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{bundle.sessionBrief.titleJa}</Text>
          {bundle.sessionBrief.bulletsJa.map((b, i) => (
            <SelectableText key={i} style={styles.bullet}>
              · {b}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.dailyBriefing ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{AUTONOMOUS_LABELS_JA.daily}</Text>
          <SelectableText style={styles.bullet}>{bundle.dailyBriefing.marketJa}</SelectableText>
          {bundle.dailyBriefing.watchJa.map((w, i) => (
            <SelectableText key={i} style={styles.bullet}>
              注目: {w}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.nightReview ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{AUTONOMOUS_LABELS_JA.night}</Text>
          <SelectableText style={styles.bullet}>{bundle.nightReview.marketChangeJa}</SelectableText>
          {bundle.nightReview.anomaliesJa.map((a, i) => (
            <SelectableText key={i} style={styles.bullet}>
              · {a}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{AUTONOMOUS_LABELS_JA.attention}</Text>
        {bundle.attention.map((a) => (
          <View key={a.id} style={styles.attentionRow}>
            <SelectableText style={styles.attentionHead}>{a.headlineJa}</SelectableText>
            <SelectableText style={styles.why}>{a.whyJa}</SelectableText>
          </View>
        ))}
        {bundle.attention.length === 0 ? (
          <SelectableText style={styles.muted}>今いちばん重要な変化は限定的</SelectableText>
        ) : null}
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{AUTONOMOUS_LABELS_JA.heatmap}</Text>
        <View style={styles.heatmapRow}>
          {bundle.heatmap.map((c) => (
            <View
              key={`${c.symbol}-${c.kind}`}
              style={[styles.heatCell, { borderColor: HEATMAP_COLOR[c.kind] }]}
            >
              <Text style={[styles.heatKind, { color: HEATMAP_COLOR[c.kind] }]}>{c.kind}</Text>
              <SelectableText style={styles.heatLabel}>{c.displayLabelJa}</SelectableText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{AUTONOMOUS_LABELS_JA.stress}</Text>
        <View style={styles.stressRow}>
          <View
            style={[
              styles.stressBar,
              {
                width: `${bundle.stressMeter.score}%`,
                backgroundColor: STRESS_COLOR[bundle.stressMeter.color],
              },
            ]}
          />
        </View>
        <SelectableText style={styles.bullet}>
          {bundle.stressMeter.labelJa} ({bundle.stressMeter.score}/100) —{' '}
          {bundle.stressMeter.factorsJa.join(' · ')}
        </SelectableText>
      </View>

      {bundle.threats.map((t) => (
        <View key={t.id} style={styles.threat}>
          <SelectableText style={styles.threatTitle}>{t.titleJa}</SelectableText>
          <SelectableText style={styles.why}>{t.detailJa}</SelectableText>
        </View>
      ))}

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{AUTONOMOUS_LABELS_JA.narrative}</Text>
        <SelectableText style={styles.narrativeTitle}>{bundle.narrative.titleJa}</SelectableText>
        {bundle.narrative.paragraphsJa.map((p, i) => (
          <SelectableText key={i} style={styles.paragraph}>
            {p}
          </SelectableText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.lg,
    marginBottom: 4,
  },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  emergency: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },
  emergencyTitle: { color: theme.colors.danger, fontWeight: '700', fontSize: theme.fontSize.sm },
  emergencyBody: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  block: { marginBottom: theme.spacing.sm },
  blockTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm, marginBottom: 4 },
  bullet: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
  attentionRow: { marginBottom: 6 },
  attentionHead: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  why: { color: theme.colors.primary, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  heatmapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatCell: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: 6,
    minWidth: 88,
  },
  heatKind: { fontSize: theme.fontSize.sm, fontWeight: '700', textTransform: 'capitalize' },
  heatLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  stressRow: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  stressBar: { height: 8, borderRadius: 4 },
  threat: { marginBottom: 4 },
  threatTitle: { color: theme.colors.warning, fontSize: theme.fontSize.sm, fontWeight: '600' },
  narrativeTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  paragraph: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, marginTop: 4 },
});
