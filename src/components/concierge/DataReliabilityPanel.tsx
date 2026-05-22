import { StyleSheet, Text, View } from 'react-native';
import { DATA_RELIABILITY_UI_LABELS_JA } from '../../constants/dataReliability';
import type { DataReliabilityBundle } from '../../types/dataReliability';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: DataReliabilityBundle;
};

function tierColor(tier: DataReliabilityBundle['reliabilityTier']) {
  if (tier === 'high') return theme.colors.success;
  if (tier === 'medium') return theme.colors.warning;
  return theme.colors.danger;
}

export function DataReliabilityPanel({ bundle }: Props) {
  const color = tierColor(bundle.reliabilityTier);

  return (
    <View style={styles.wrap} testID="concierge-data-reliability-panel">
      <Text style={styles.title}>{DATA_RELIABILITY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.bannerBox}>
        <Text style={styles.bannerLabel}>{DATA_RELIABILITY_UI_LABELS_JA.banner}</Text>
        <Text style={[styles.bannerValue, { color }]}>{bundle.reliabilityBannerJa}</Text>
      </View>

      {!bundle.aiInputGateOpen ? (
        <SelectableText style={styles.gateClosed}>
          {bundle.aiGateNoteJa}
          {bundle.safeFallbackJa ? ` — ${bundle.safeFallbackJa}` : ''}
        </SelectableText>
      ) : null}

      <SelectableText style={styles.row}>
        {DATA_RELIABILITY_UI_LABELS_JA.globalScore}: {bundle.globalDataQualityScore}/100
      </SelectableText>
      <SelectableText style={styles.row}>
        {DATA_RELIABILITY_UI_LABELS_JA.gate}:{' '}
        {bundle.aiInputGateOpen ? '開放' : '閉鎖（判断保留）'}
      </SelectableText>

      {bundle.symbols.slice(0, 4).map((s) => (
        <View key={s.symbol} style={styles.symBlock}>
          <SelectableText style={styles.symTitle}>
            {s.symbol} — {s.dataQualityScore}/100 ({s.tier})
          </SelectableText>
          {s.issues.slice(0, 3).map((i) => (
            <SelectableText key={i.code} style={styles.issue}>
              · {i.labelJa}: {i.detailJa}
            </SelectableText>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{DATA_RELIABILITY_UI_LABELS_JA.lineage}</Text>
        {bundle.lineageSummaryJa.map((line) => (
          <SelectableText key={line} style={styles.bullet}>
            · {line}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{DATA_RELIABILITY_UI_LABELS_JA.apiHealth}</Text>
        {bundle.apiHealth.slice(0, 4).map((a) => (
          <SelectableText key={a.providerId} style={styles.bullet}>
            · {a.labelJa}: 成功率~{a.successRatePct}% · {a.statusJa}
          </SelectableText>
        ))}
      </View>

      {!bundle.storageIntegrityOk ? (
        <SelectableText style={styles.warn}>
          ストレージ破損検知: {bundle.storageCorruptionKeys.join(', ') || '要復旧'}
        </SelectableText>
      ) : null}
      {bundle.duplicateGuardNoteJa ? (
        <SelectableText style={styles.note}>{bundle.duplicateGuardNoteJa}</SelectableText>
      ) : null}
      <SelectableText style={styles.note}>{bundle.timezoneNoteJa}</SelectableText>
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
    marginBottom: theme.spacing.xs,
  },
  safety: {
    fontSize: 11,
    color: theme.colors.warning,
    marginBottom: theme.spacing.sm,
  },
  bannerBox: {
    marginBottom: theme.spacing.sm,
  },
  bannerLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  bannerValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  gateClosed: {
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  row: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 4,
  },
  symBlock: {
    marginTop: 6,
  },
  symTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  issue: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  section: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  warn: {
    fontSize: 11,
    color: theme.colors.danger,
    marginTop: 4,
  },
  note: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
