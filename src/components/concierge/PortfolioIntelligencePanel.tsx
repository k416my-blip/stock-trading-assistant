import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioIntelligenceBundle } from '../../types/portfolioIntelligence';
import { AI_ANALYSIS_MODE_LABELS_JA } from '../../constants/aiDataDriven';
import { SelectableText } from '../ui/SelectableText';
import { listKey } from '../../utils/reactKeyDiagnostics';
import { theme } from '../../theme';

type Props = {
  intel: PortfolioIntelligenceBundle;
};

export function PortfolioIntelligencePanel({ intel }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Portfolio Intelligence</Text>
      <SelectableText style={styles.purpose}>{intel.purposeNoteJa}</SelectableText>

      <Text style={styles.section}>行動傾向</Text>
      <Text style={styles.chip}>
        {intel.behavior.styleLabelJa} · 推奨モード{' '}
        {AI_ANALYSIS_MODE_LABELS_JA[intel.suggestedAnalysisMode]}
      </Text>
      {intel.behavior.styleHintsJa.map((h, index) => (
        <SelectableText key={listKey('hint', index, h)} style={styles.line}>
          · {h}
        </SelectableText>
      ))}

      <Text style={styles.section}>予測精度</Text>
      <Text style={styles.line}>
        短期 {intel.accuracy.shortTermAccuracyPct ?? '—'}% / 中期{' '}
        {intel.accuracy.mediumTermAccuracyPct ?? '—'}% / 異常検知{' '}
        {intel.accuracy.anomalyDetectionAccuracyPct ?? '—'}%（評価
        {intel.accuracy.evaluatedCount}・保留{intel.accuracy.pendingCount}）
      </Text>

      {intel.weeklyReview ? (
        <>
          <Text style={styles.section}>{intel.weeklyReview.weekLabelJa}レビュー</Text>
          {intel.weeklyReview.summaryBulletsJa.map((b, index) => (
            <SelectableText key={listKey('review', index, b)} style={styles.line}>
              · {b}
            </SelectableText>
          ))}
        </>
      ) : null}

      {intel.similarCasesJa.length > 0 ? (
        <>
          <Text style={styles.section}>過去類似ケース</Text>
          {intel.similarCasesJa.map((c, index) => (
            <SelectableText key={listKey('similar', index, c)} style={styles.line}>
              {c}
            </SelectableText>
          ))}
        </>
      ) : null}

      {intel.lossPatterns.length > 0 ? (
        <>
          <Text style={styles.section}>損失パターン</Text>
          {intel.lossPatterns.map((p) => (
            <SelectableText key={p.id} style={styles.warn}>
              {p.labelJa}: {p.detailJa}
            </SelectableText>
          ))}
        </>
      ) : null}

      {intel.successPatterns.length > 0 ? (
        <>
          <Text style={styles.section}>成功パターン</Text>
          {intel.successPatterns.map((p) => (
            <SelectableText key={p.id} style={styles.line}>
              {p.labelJa}: {p.detailJa}
            </SelectableText>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>ポートフォリオ偏り</Text>
      <SelectableText style={styles.line}>
        セクター: {intel.portfolioRisk.sectorBiasJa.join(' · ')}
      </SelectableText>
      <SelectableText style={styles.line}>
        通貨: {intel.portfolioRisk.currencyBiasJa.join(' · ') || '—'}
      </SelectableText>
      <SelectableText style={styles.line}>
        集中度スコア {intel.portfolioRisk.concentrationScore}
      </SelectableText>

      <SelectableText style={styles.muted}>{intel.notificationIntelSummaryJa}</SelectableText>
      <SelectableText style={styles.muted}>{intel.privacyNoteJa}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  purpose: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  section: {
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    marginBottom: 2,
    fontSize: theme.fontSize.sm,
  },
  chip: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    marginBottom: 2,
  },
  line: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  warn: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  muted: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
