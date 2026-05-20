import { StyleSheet, Text, View } from 'react-native';
import type { RealQuantValidationReport } from '../types/quantValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

const DATA_SOURCE_LABEL = {
  live_api: 'Twelve Data（ライブ）',
  cache: 'キャッシュ',
  synthetic_fallback: '合成フォールバック',
};

type Props = {
  report: RealQuantValidationReport;
};

export function RealQuantValidationPanel({ report }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>実市場データ・クオンツ検証</Text>
      <Text style={styles.subtitle}>
        {DATA_SOURCE_LABEL[report.dataSource]} · {report.symbolsLoaded}銘柄 · {report.tradingDays}日
      </Text>

      <View
        style={[
          styles.verdict,
          report.robustUnderChaos ? styles.verdictOk : styles.verdictWarn,
        ]}
      >
        <Text style={styles.verdictText}>{report.verdictJa}</Text>
      </View>

      <Text style={styles.section}>サバイバーシップ</Text>
      <Text style={styles.line}>{report.survivorship.warningJa}</Text>
      {report.survivorship.symbolsExcluded.length > 0 ? (
        <Text style={styles.muted}>
          除外: {report.survivorship.symbolsExcluded.map((e) => e.symbol).join(', ')}
        </Text>
      ) : null}

      <Text style={styles.section}>レジーム遷移不安定性</Text>
      <Text style={styles.line}>{report.regimeInstability.noteJa}</Text>
      <Text style={styles.muted}>
        遷移{report.regimeInstability.transitionCount}回 · 不安定比{' '}
        {report.regimeInstability.instabilityRatio}
      </Text>

      <Text style={styles.section}>モンテカルロ・パス摂動</Text>
      <Text style={styles.line}>{report.monteCarlo.noteJa}</Text>
      <Text style={styles.muted}>
        中央値 {report.monteCarlo.medianReturnPct}% · P5 {report.monteCarlo.p5ReturnPct}% · P95{' '}
        {report.monteCarlo.p95ReturnPct}% · 損失確率 {report.monteCarlo.probLossPct}%
      </Text>

      <Text style={styles.section}>テール・イベント</Text>
      {report.tailEvents.map((t) => (
        <Text key={t.scenario} style={styles.muted}>
          {t.scenario}: 影響 {t.portfolioImpactPct}% · DD {t.maxDrawdownPct}%
        </Text>
      ))}

      <Text style={styles.section}>執行遅延</Text>
      {report.executionDelays.map((e) => (
        <Text key={e.delayDays} style={styles.muted}>
          {e.delayDays}日遅延: 年率 {e.annualizedReturnPct}% · ドラッグ {e.dragVsImmediatePct}%
        </Text>
      ))}

      <Text style={styles.section}>ギャップ・リスク</Text>
      <Text style={styles.line}>{report.gapRisk.noteJa}</Text>
      <Text style={styles.muted}>
        平均ギャップ {report.gapRisk.avgGapPct}% · 最大 {report.gapRisk.maxGapPct}%
      </Text>

      <Text style={styles.section}>流動性真空</Text>
      <Text style={styles.line}>{report.liquidityVacuum.noteJa}</Text>
      <Text style={styles.muted}>
        追加スリッページ・ドラッグ {report.liquidityVacuum.extraSlippageDragPct}%
      </Text>

      <Text style={styles.section}>心理ストレス指標</Text>
      <Text style={styles.line}>{report.psychologicalStress.noteJa}</Text>
      {report.psychologicalStress.breakpointsHit.map((bp) => (
        <Text key={bp.thresholdPct} style={styles.muted}>
          DD {bp.thresholdPct}%: {bp.daysToHit != null ? `${bp.daysToHit}日目` : '未到達'}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  verdict: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radius.sm },
  verdictOk: { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderWidth: 1, borderColor: theme.colors.success },
  verdictWarn: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: theme.colors.warning },
  verdictText: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 18 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: 4,
  },
  line: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
