import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PORTFOLIO_RISK_UI_LABELS_JA } from '../../constants/portfolioRiskExposure';
import type { PortfolioRiskExposureBundle } from '../../types/portfolioRiskExposure';
import { updateHumanRiskOverride } from '../../services/portfolioRiskExposureStorage';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: PortfolioRiskExposureBundle;
  onOverrideSaved?: () => void;
};

function heatColor(severity: PortfolioRiskExposureBundle['heatmap'][0]['severity']) {
  if (severity === 'critical') return theme.colors.danger;
  if (severity === 'high') return theme.colors.warning;
  if (severity === 'watch') return theme.colors.textMuted;
  return theme.colors.success;
}

function qualityColor(score: number) {
  if (score >= 72) return theme.colors.success;
  if (score >= 45) return theme.colors.warning;
  return theme.colors.danger;
}

export function PortfolioRiskExposurePanel({ bundle, onOverrideSaved }: Props) {
  const qColor = qualityColor(bundle.portfolioQualityScore);

  const setMaxExposure = (pct: number | null) => {
    void updateHumanRiskOverride({ maxExposurePct: pct }).then(() => onOverrideSaved?.());
  };

  const setSectorCap = (pct: number | null) => {
    void updateHumanRiskOverride({ sectorCapPct: pct }).then(() => onOverrideSaved?.());
  };

  return (
    <View style={styles.wrap} testID="concierge-portfolio-risk-panel">
      <Text style={styles.title}>{PORTFOLIO_RISK_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      {bundle.riskEscalationActive && bundle.riskEscalationBannerJa ? (
        <View style={styles.escalation}>
          <Text style={styles.escalationLabel}>{PORTFOLIO_RISK_UI_LABELS_JA.escalation}</Text>
          <SelectableText style={styles.escalationText}>{bundle.riskEscalationBannerJa}</SelectableText>
        </View>
      ) : null}

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{PORTFOLIO_RISK_UI_LABELS_JA.quality}</Text>
        <Text style={[styles.scoreValue, { color: qColor }]}>
          {bundle.portfolioQualityScore}/100 ({bundle.qualityLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.aiPortfolioSummaryJa}</SelectableText>

      {bundle.betaWarningJa ? (
        <SelectableText style={styles.warn}>{bundle.betaWarningJa}</SelectableText>
      ) : null}
      <SelectableText style={styles.row}>
        {PORTFOLIO_RISK_UI_LABELS_JA.beta}: {bundle.betaExposure.toFixed(2)} · 最大ポジション{' '}
        {bundle.dynamicMaxPositionCapPct}%
      </SelectableText>
      <SelectableText style={styles.row}>
        {PORTFOLIO_RISK_UI_LABELS_JA.cash}: {bundle.recommendedCashRatioPct}% —{' '}
        {bundle.cashReserveNoteJa}
      </SelectableText>
      <SelectableText style={styles.note}>{bundle.sectorGuardJa}</SelectableText>
      <SelectableText style={styles.note}>{bundle.liquidityExposureJa}</SelectableText>
      <SelectableText style={styles.note}>{bundle.volatilityTargetingNoteJa}</SelectableText>
      <SelectableText style={styles.note}>{bundle.convictionWeightingNoteJa}</SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{PORTFOLIO_RISK_UI_LABELS_JA.heatmap}</Text>
        <View style={styles.chipRow}>
          {bundle.heatmap.slice(0, 8).map((cell) => (
            <View
              key={cell.labelJa}
              style={[styles.chip, { borderColor: heatColor(cell.severity) }]}
            >
              <Text style={[styles.chipText, { color: heatColor(cell.severity) }]}>
                {cell.labelJa} {cell.weightPct.toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{PORTFOLIO_RISK_UI_LABELS_JA.hidden}</Text>
        {bundle.hiddenExposures.slice(0, 4).map((h) => (
          <SelectableText key={h.themeId} style={styles.bullet}>
            · {h.labelJa}: {h.effectiveWeightPct}% — {h.detailJa}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{PORTFOLIO_RISK_UI_LABELS_JA.stress}</Text>
        {bundle.stressTests
          .slice()
          .sort((a, b) => a.portfolioImpactPct - b.portfolioImpactPct)
          .slice(0, 5)
          .map((s) => (
            <SelectableText key={s.id} style={styles.bullet}>
              · {s.labelJa}: {s.portfolioImpactPct}% (約 {Math.abs(s.estimatedLossMYR)} MYR)
            </SelectableText>
          ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{PORTFOLIO_RISK_UI_LABELS_JA.tail}</Text>
        {bundle.tailRisk.map((t) => (
          <SelectableText key={t.id} style={styles.bullet}>
            · {t.labelJa}: −{t.lossPct}% (約 {t.lossMYR} MYR)
          </SelectableText>
        ))}
      </View>

      {bundle.weakTheses.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>弱い根拠の保有</Text>
          {bundle.weakTheses.slice(0, 4).map((w) => (
            <SelectableText key={w.symbol} style={styles.bullet}>
              · {w.symbol}: {w.reasonJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{PORTFOLIO_RISK_UI_LABELS_JA.override}</Text>
        <SelectableText style={styles.note}>
          最大エクスポーザ: {bundle.humanOverride.maxExposurePct ?? '自動'}% · セクター上限:{' '}
          {bundle.humanOverride.sectorCapPct ?? 40}%
        </SelectableText>
        <View style={styles.chipRow}>
          {([12, 15, 18, null] as const).map((pct) => (
            <Pressable
              key={String(pct)}
              onPress={() => setMaxExposure(pct)}
              style={({ pressed }) => [styles.overrideChip, pressed && styles.chipPressed]}
            >
              <Text style={styles.overrideChipText}>
                {pct == null ? '自動' : `${pct}%`}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.chipRow}>
          {([30, 40, 50] as const).map((pct) => (
            <Pressable
              key={pct}
              onPress={() => setSectorCap(pct)}
              style={({ pressed }) => [styles.overrideChip, pressed && styles.chipPressed]}
            >
              <Text style={styles.overrideChipText}>セクター {pct}%</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {bundle.portfolioReplay.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Replay</Text>
          {bundle.portfolioReplay.slice(-5).map((p) => (
            <SelectableText key={p.at} style={styles.bullet}>
              · {p.at.slice(0, 16)} — 品質 {p.qualityScore} · 現金 {p.cashRatioPct}%
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.note}>{bundle.explainRuleBasisJa}</SelectableText>
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
  escalation: {
    backgroundColor: theme.colors.danger + '22',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  escalationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  escalationText: {
    fontSize: 13,
    color: theme.colors.danger,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  scoreLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summary: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 4,
  },
  warn: {
    fontSize: 12,
    color: theme.colors.danger,
    marginBottom: theme.spacing.xs,
  },
  note: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  section: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 11,
    color: theme.colors.text,
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  overrideChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chipPressed: { opacity: 0.7 },
  overrideChipText: {
    fontSize: 11,
    color: theme.colors.text,
  },
});
