import { StyleSheet, Text, View } from 'react-native';
import { REALITY_UI_LABELS_JA } from '../../constants/portfolioRealityValidation';
import type { RealityValidationBundle } from '../../types/portfolioRealityValidation';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: RealityValidationBundle;
};

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <SelectableText style={styles.metricValue}>{value}</SelectableText>
    </View>
  );
}

export function AiPerformanceCenterPanel({ bundle }: Props) {
  const d = bundle.dashboard;
  const trustColor =
    bundle.trustScore >= 65
      ? theme.colors.success
      : bundle.trustScore >= 45
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <View style={styles.wrap} testID="concierge-ai-performance-center">
      <Text style={styles.title}>{REALITY_UI_LABELS_JA.panelTitle}</Text>
      {bundle.capitalPreservationMode ? (
        <SelectableText style={styles.preservation}>
          {REALITY_UI_LABELS_JA.preservation} — 精度低下のため提案は保守的に表示
        </SelectableText>
      ) : null}

      <View style={styles.trustBox}>
        <Text style={styles.trustLabel}>{REALITY_UI_LABELS_JA.trust}</Text>
        <Text style={[styles.trustScore, { color: trustColor }]}>{bundle.trustScore}</Text>
        <Text style={styles.trustSub}>/ 100</Text>
      </View>

      <View style={styles.grid}>
        <MetricRow
          label={REALITY_UI_LABELS_JA.winRate}
          value={d.winRatePct != null ? `${d.winRatePct}% (${d.evaluatedCount}件)` : '—'}
        />
        <MetricRow
          label={REALITY_UI_LABELS_JA.recent}
          value={
            bundle.recentWinRatePct != null ? `${bundle.recentWinRatePct}%` : 'データ不足'
          }
        />
        <MetricRow
          label={REALITY_UI_LABELS_JA.virtualPnl}
          value={`${bundle.virtualPnLMYR >= 0 ? '+' : ''}${bundle.virtualPnLMYR.toLocaleString()} MYR (${bundle.virtualReturnPct >= 0 ? '+' : ''}${bundle.virtualReturnPct}%)`}
        />
        <MetricRow
          label="平均リターン"
          value={d.avgReturnPct != null ? `${d.avgReturnPct >= 0 ? '+' : ''}${d.avgReturnPct}%` : '—'}
        />
        <MetricRow
          label="最大DD"
          value={d.maxDrawdownPct != null ? `${d.maxDrawdownPct}%` : '—'}
        />
        <MetricRow
          label="検証待ち"
          value={`${d.pendingCount} 件`}
        />
      </View>

      <SelectableText style={styles.horizonLine}>
        時間軸精度 — 1日 {d.accuracy1d ?? '—'}% · 1週 {d.accuracy1w ?? '—'}% · 1月{' '}
        {d.accuracy1m ?? '—'}%
      </SelectableText>

      {bundle.strongestStrategyJa ? (
        <SelectableText style={styles.noteLine}>
          {REALITY_UI_LABELS_JA.strongest}: {bundle.strongestStrategyJa}
        </SelectableText>
      ) : null}
      {bundle.dangerousStrategyJa ? (
        <SelectableText style={styles.dangerLine}>
          {REALITY_UI_LABELS_JA.dangerous}: {bundle.dangerousStrategyJa}
        </SelectableText>
      ) : null}
      {bundle.maxFailureJa ? (
        <SelectableText style={styles.dangerLine}>
          {REALITY_UI_LABELS_JA.maxFail}: {bundle.maxFailureJa}
        </SelectableText>
      ) : null}

      {bundle.overtradingNoteJa ? (
        <SelectableText style={styles.warnLine}>{bundle.overtradingNoteJa}</SelectableText>
      ) : null}
      {bundle.consistencyWarningsJa.map((w) => (
        <SelectableText key={w} style={styles.warnLine}>
          {w}
        </SelectableText>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ストレス / Monte Carlo</Text>
        <SelectableText style={styles.body}>
          暴落 {bundle.stress.crashScenarioPct}% 想定損失 ≈{' '}
          {bundle.stress.estimatedLossMYR.toLocaleString()} MYR (
          {bundle.stress.estimatedLossPct}%)
        </SelectableText>
        <SelectableText style={styles.body}>{bundle.stress.sectorCollapseNoteJa}</SelectableText>
        <SelectableText style={styles.body}>{bundle.monteCarlo.summaryJa}</SelectableText>
      </View>

      {bundle.regimeAccuracy.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>レジーム別精度</Text>
          {bundle.regimeAccuracy.map((r) => (
            <SelectableText key={r.regimeId} style={styles.body}>
              {r.regimeId}: {r.winRatePct ?? '—'}% (n={r.count})
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.failurePatterns.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>失敗パターン</Text>
          {bundle.failurePatterns.map((f) => (
            <SelectableText key={f.id} style={styles.body}>
              {f.labelJa} ×{f.count} — {f.detailJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.humanReviewQueue.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>参考程度（低信頼）</Text>
          {bundle.humanReviewQueue.map((r) => (
            <SelectableText key={r.id} style={styles.body}>
              {r.symbol} {r.action} ({r.calibratedConfidencePct}%) — 人間確認推奨
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.journalRecent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>パフォーマンス日誌</Text>
          {bundle.journalRecent.map((j) => (
            <SelectableText key={j.dateKey} style={styles.body}>
              {j.dateKey}: {j.summaryJa}
              {j.missReasonJa ? ` — 外れ: ${j.missReasonJa}` : ''}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.footer}>
        ベンチマーク比較: {bundle.benchmarkLabelsJa.join(' · ')}（地合い指数の当日変動を参考）
        {bundle.calibrationOffsetPct > 0
          ? ` · confidence補正 -${bundle.calibrationOffsetPct}%`
          : ''}
      </SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  preservation: {
    fontSize: 13,
    color: theme.colors.warning,
    marginBottom: theme.spacing.sm,
  },
  trustBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  trustLabel: { fontSize: 14, color: theme.colors.textMuted },
  trustScore: { fontSize: 32, fontWeight: '800' },
  trustSub: { fontSize: 14, color: theme.colors.textMuted },
  grid: { gap: theme.spacing.xs },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: { fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  metricValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, flex: 1, textAlign: 'right' },
  horizonLine: { fontSize: 12, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  noteLine: { fontSize: 13, color: theme.colors.success, marginTop: 4 },
  dangerLine: { fontSize: 13, color: theme.colors.danger, marginTop: 4 },
  warnLine: { fontSize: 12, color: theme.colors.warning, marginTop: 4 },
  section: { marginTop: theme.spacing.md },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  body: { fontSize: 13, color: theme.colors.text, marginBottom: 2 },
  footer: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
});
