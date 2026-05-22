import { StyleSheet, Text, View } from 'react-native';
import { MACRO_INTEL_UI_LABELS_JA } from '../../constants/macroIntelligence';
import type { MacroIntelligenceBundle } from '../../types/macroIntelligence';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: MacroIntelligenceBundle;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <SelectableText style={styles.value}>{value}</SelectableText>
    </View>
  );
}

export function WorldStatePanel({ bundle }: Props) {
  const scoreColor =
    bundle.macroScore >= 60
      ? theme.colors.success
      : bundle.macroScore >= 40
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <View style={styles.wrap} testID="concierge-world-state-panel">
      <Text style={styles.title}>{MACRO_INTEL_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      {bundle.insufficientData ? (
        <SelectableText style={styles.gap}>市場データ不足 — フォールバックルール適用</SelectableText>
      ) : null}

      {bundle.integration.forceDefensiveStrategy ? (
        <SelectableText style={styles.defensive}>マクロ逆風 — 防御モード推奨</SelectableText>
      ) : null}

      <View style={styles.scoreBox}>
        <Text style={styles.regimeLabel}>{bundle.worldRegime.labelJa}</Text>
        <Text style={[styles.macroScore, { color: scoreColor }]}>{bundle.macroScore}</Text>
        <Text style={styles.macroSub}>Macro / 100</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.integration.macroSummaryJa}</SelectableText>

      <Row label={MACRO_INTEL_UI_LABELS_JA.stress} value={`${bundle.stressScore}`} />
      <Row label={MACRO_INTEL_UI_LABELS_JA.liquidity} value={bundle.liquidity.detailJa} />
      <Row label={MACRO_INTEL_UI_LABELS_JA.inflation} value={bundle.inflation.detailJa} />
      <Row label="Fear & Greed" value={`${bundle.fearGreedScore} / 100`} />

      <SelectableText style={styles.note}>
        {MACRO_INTEL_UI_LABELS_JA.capitalFlow}: {bundle.capitalFlowMapJa}
      </SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{MACRO_INTEL_UI_LABELS_JA.narratives}</Text>
        {bundle.narratives
          .filter((n) => n.active)
          .slice(0, 4)
          .map((n) => (
            <SelectableText key={n.id} style={styles.bullet}>
              · {n.labelJa}: {n.noteJa}
            </SelectableText>
          ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{MACRO_INTEL_UI_LABELS_JA.heatmap}</Text>
        {bundle.regionalHeatmap.map((r) => (
          <SelectableText key={r.regionId} style={styles.bullet}>
            · {r.labelJa}: ストレス {r.stressScore} — {r.changeHintJa}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.radar}>
        {MACRO_INTEL_UI_LABELS_JA.riskRadar}: {bundle.macroRiskRadarJa}
      </SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{MACRO_INTEL_UI_LABELS_JA.explain}</Text>
        <SelectableText style={styles.explain}>{bundle.integration.explainRegimeJa}</SelectableText>
      </View>

      {bundle.correlations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{MACRO_INTEL_UI_LABELS_JA.correlations}</Text>
          {bundle.correlations.slice(0, 3).map((c, i) => (
            <SelectableText key={`${c.assetA}-${i}`} style={styles.bullet}>
              · {c.assetA} ↔ {c.assetB}: {c.hintJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.fragility}>
        {MACRO_INTEL_UI_LABELS_JA.fragility}: {bundle.fragility.detailJa}
      </SelectableText>
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
    marginBottom: 4,
  },
  gap: {
    fontSize: 11,
    color: theme.colors.warning,
    marginBottom: theme.spacing.sm,
  },
  defensive: {
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
    flexWrap: 'wrap',
    gap: 8,
  },
  regimeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  macroScore: {
    fontSize: 28,
    fontWeight: '800',
  },
  macroSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  summary: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
  },
  value: {
    fontSize: 11,
    color: theme.colors.text,
    flex: 1.3,
    textAlign: 'right',
  },
  note: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
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
    marginBottom: 3,
  },
  radar: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  explain: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  fragility: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
