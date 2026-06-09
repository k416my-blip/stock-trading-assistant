import { StyleSheet, Text, View } from 'react-native';
import { formatCurrencyPrice } from '../../services/aiAnalystReportBuilder';
import type { AiAnalystReportBundle, AiGradeRank, HoldingAnalystReport } from '../../types/aiStockReport';
import { SHIKIHO_MISSING_JA } from '../../services/aiStockReportDataFetcher';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  report: AiAnalystReportBundle;
  compact?: boolean;
};

function GradeBadge({ grade }: { grade: AiGradeRank | null }) {
  if (!grade) {
    return <Text style={styles.gradeMissing}>{SHIKIHO_MISSING_JA}</Text>;
  }
  const color =
    grade === 'S' || grade === 'A'
      ? theme.colors.success
      : grade === 'B'
        ? theme.colors.warning
        : theme.colors.danger;
  return (
    <Text style={[styles.gradeBadge, { color, borderColor: color }]}>
      {grade}
    </Text>
  );
}

function HoldingReportBlock({ item, compact }: { item: HoldingAnalystReport; compact?: boolean }) {
  const pnl = item.pnlPct;
  const pnlColor =
    pnl == null ? theme.colors.textMuted : pnl >= 0 ? theme.colors.success : theme.colors.danger;
  const pnlSign = pnl != null && pnl >= 0 ? '+' : '';

  if (compact) {
    return (
      <SelectableText style={styles.compactHoldingLine} numberOfLines={2}>
        {item.companyName} {pnl != null ? `${pnlSign}${pnl.toFixed(1)}%` : ''}
        {item.takeProfitRemainingPct != null && item.takeProfitRemainingPct > 0
          ? ` · 利確まで${item.takeProfitRemainingPct.toFixed(1)}%`
          : ''}
      </SelectableText>
    );
  }

  return (
    <View style={styles.holdingBlock} testID={`ai-analyst-holding-${item.symbol}`}>
      <Text style={styles.holdingName}>{item.companyName}</Text>
      <View style={styles.overallRow}>
        <Text style={styles.overallLabel}>AI総合評価：</Text>
        <GradeBadge grade={item.overallRank} />
      </View>

      <SelectableText style={styles.priceLine}>
        現在価格：
        {item.currentPrice != null
          ? formatCurrencyPrice(item.currency, item.currentPrice)
          : SHIKIHO_MISSING_JA}
      </SelectableText>
      <SelectableText style={styles.priceLine}>
        平均取得単価：{formatCurrencyPrice(item.currency, item.averageBuyPrice)}
      </SelectableText>

      <SelectableText style={[styles.pnlLine, { color: pnlColor }]}>
        含み損益：{pnl != null ? `${pnlSign}${pnl.toFixed(1)}%` : '未取得'}
      </SelectableText>

      {item.takeProfitRemainingPct != null ? (
        <SelectableText style={styles.targetLine}>
          利確目標まで：残り{item.takeProfitRemainingPct.toFixed(1)}%
        </SelectableText>
      ) : null}
      {item.stopLossDistancePct != null ? (
        <SelectableText style={styles.targetLine}>
          損切目標まで：{item.stopLossDistancePct.toFixed(1)}%
        </SelectableText>
      ) : null}

      <View style={styles.subGradesRow}>
        <View style={styles.subGradeRow}>
          <Text style={styles.subGradeLabel}>配当評価：</Text>
          <GradeBadge grade={item.subGrades.dividend} />
        </View>
        <View style={styles.subGradeRow}>
          <Text style={styles.subGradeLabel}>財務評価：</Text>
          <GradeBadge grade={item.subGrades.financial} />
        </View>
        <View style={styles.subGradeRow}>
          <Text style={styles.subGradeLabel}>リスク評価：</Text>
          <GradeBadge grade={item.subGrades.risk} />
        </View>
        <View style={styles.subGradeRow}>
          <Text style={styles.subGradeLabel}>事業安定性：</Text>
          <GradeBadge grade={item.subGrades.businessStability} />
        </View>
        <View style={styles.subGradeRow}>
          <Text style={styles.subGradeLabel}>競争優位性：</Text>
          <GradeBadge grade={item.subGrades.competitive} />
        </View>
      </View>

      <Text style={styles.judgmentTitle}>AI判断：</Text>
      <Text style={styles.judgmentValue}>{item.judgmentJa}</Text>

      <Text style={styles.reasonTitle}>理由：</Text>
      {item.reasonBullets.map((b, i) => (
        <SelectableText key={`reason-${i}`} style={styles.reasonBullet}>
          ・{b}
        </SelectableText>
      ))}

      {!compact && item !== undefined ? <View style={styles.divider} /> : null}
    </View>
  );
}

export function AiAnalystReportPanel({ report, compact = false }: Props) {
  const hasHoldings = report.holdingCount > 0;

  if (compact) {
    return (
      <View style={styles.compactWrap} testID="ai-analyst-report-compact">
        <Text style={styles.compactTitle}>AIアナリストレポート</Text>
        <SelectableText style={styles.compactBody} numberOfLines={3}>
          {report.headlineJa}
        </SelectableText>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="ai-analyst-report-panel">
      <Text style={styles.title}>AIアナリストレポート</Text>

      <View style={styles.summaryHeader}>
        <SelectableText style={styles.summaryLine}>
          ポートフォリオスコア {report.portfolioScore}/100
        </SelectableText>
        <SelectableText style={styles.summaryLine}>保有 {report.holdingCount} 銘柄</SelectableText>
      </View>

      {report.loading ? (
        <SelectableText style={styles.loadingLine}>実データを取得中…</SelectableText>
      ) : null}

      {hasHoldings ? (
        report.holdingReports.map((item) => (
          <HoldingReportBlock key={item.symbol} item={item} compact={compact} />
        ))
      ) : (
        <View style={styles.candidateBlock} testID="ai-analyst-candidate-only">
          <Text style={styles.candidateTitle}>本日の強い候補</Text>
          <SelectableText style={styles.candidateBody}>
            {report.candidateSummaryJa ?? '候補データを読み込み中…'}
          </SelectableText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  compactWrap: {
    maxWidth: 240,
    marginRight: theme.spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  title: {
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  compactTitle: { fontSize: 10, fontWeight: '800', color: theme.colors.primary },
  compactBody: { fontSize: 11, color: theme.colors.text, marginTop: 2, lineHeight: 15 },
  gradeMissing: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  loadingLine: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 8 },
  summaryHeader: { marginBottom: theme.spacing.sm },
  summaryLine: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20 },
  holdingBlock: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  holdingName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  overallRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  overallLabel: { fontSize: theme.fontSize.sm, color: theme.colors.text, fontWeight: '600' },
  gradeBadge: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginLeft: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  priceLine: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 20 },
  pnlLine: { fontSize: theme.fontSize.md, fontWeight: '700', marginVertical: 4 },
  targetLine: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20 },
  subGradesRow: { marginTop: 8, gap: 6 },
  subGradeRow: { flexDirection: 'row', alignItems: 'center' },
  subGradeLabel: { fontSize: theme.fontSize.sm, color: theme.colors.text, width: 100 },
  judgmentTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 10,
  },
  judgmentValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.success,
    marginTop: 2,
  },
  reasonTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  reasonBullet: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 20 },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.md,
  },
  candidateBlock: { marginTop: theme.spacing.sm },
  candidateTitle: { fontWeight: '700', fontSize: theme.fontSize.md, color: theme.colors.text },
  candidateBody: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 },
  compactHoldingLine: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
