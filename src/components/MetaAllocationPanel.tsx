import { StyleSheet, Text, View } from 'react-native';
import type { MetaAllocationReport } from '../types/metaAllocation';
import { ENSEMBLE_ALLOCATOR_LABEL } from '../constants/metaAllocation';
import { Card } from './ui/Card';
import { theme } from '../theme';

const DATA_SOURCE_LABEL = {
  live_api: 'Twelve Data',
  cache: 'キャッシュ',
  synthetic_fallback: '合成履歴',
};

type Props = {
  report: MetaAllocationReport;
};

export function MetaAllocationPanel({ report }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>メタ配分・アンサンブル</Text>
      <Text style={styles.subtitle}>
        {DATA_SOURCE_LABEL[report.dataSource]} · {report.tradingDays}日 · 5エンジン
      </Text>

      <View
        style={[
          styles.verdict,
          report.metaRobustness.score >= 58 && !report.failSafe.triggered
            ? styles.verdictOk
            : styles.verdictWarn,
        ]}
      >
        <Text style={styles.verdictText}>{report.verdictJa}</Text>
      </View>

      <Text style={styles.section}>最終配分</Text>
      {report.finalWeights.map((w) => (
        <Text key={w.symbol} style={styles.muted}>
          {w.symbol}: {w.weightPct}%
        </Text>
      ))}

      <Text style={styles.section}>アンサンブル・エンジン</Text>
      {report.allocators.map((a) => (
        <Text key={a.allocatorId} style={styles.muted}>
          {a.labelJa}: スコア {a.modelScore} · 信頼 {Math.round(a.confidence * 100)}%
        </Text>
      ))}

      <Text style={styles.section}>動的モデル重み</Text>
      {report.dynamicModelWeights.map((m) => (
        <Text key={m.allocatorId} style={styles.muted}>
          {m.labelJa}: {m.dynamicWeight}% (レジーム×{m.regimeBoost})
        </Text>
      ))}

      <Text style={styles.section}>レジーム選択</Text>
      <Text style={styles.line}>{report.regimeSelection.noteJa}</Text>
      {report.regimeSelection.suppressedAllocators.length > 0 ? (
        <Text style={styles.muted}>
          抑制:{' '}
          {report.regimeSelection.suppressedAllocators
            .map((id) => ENSEMBLE_ALLOCATOR_LABEL[id])
            .join(', ')}
        </Text>
      ) : null}

      <Text style={styles.section}>アロケーター不一致</Text>
      <Text style={styles.line}>{report.disagreement.noteJa}</Text>
      <Text style={styles.muted}>
        最大L1 {report.disagreement.maxPairwiseL1Pct}% · 平均 {report.disagreement.avgPairwiseL1Pct}%
      </Text>

      <Text style={styles.section}>信頼度加重ブレンド</Text>
      <Text style={styles.line}>{report.confidenceBlend.noteJa}</Text>

      <Text style={styles.section}>ベイズモデル平均（BMA）</Text>
      <Text style={styles.line}>{report.bayesianModelAveraging.noteJa}</Text>
      {report.bayesianModelAveraging.posteriorWeights.map((p) => (
        <Text key={p.allocatorId} style={styles.muted}>
          {ENSEMBLE_ALLOCATOR_LABEL[p.allocatorId]}: 事後 {p.posterior}%
        </Text>
      ))}

      <Text style={styles.section}>配分エントロピー</Text>
      <Text style={styles.line}>{report.allocationEntropy.noteJa}</Text>

      <Text style={styles.section}>モデル分散</Text>
      <Text style={styles.line}>{report.modelDiversification.noteJa}</Text>

      <Text style={styles.section}>フェイルセーフ</Text>
      <Text style={styles.line}>
        {report.failSafe.triggered ? report.failSafe.reasonJa : report.failSafe.reasonJa}
      </Text>

      <Text style={styles.section}>メタ頑健性</Text>
      <Text style={styles.line}>{report.metaRobustness.noteJa}</Text>
      <Text style={styles.muted}>
        不一致 {report.metaRobustness.disagreementComponent} · エントロピー{' '}
        {report.metaRobustness.entropyComponent} · モデル分散{' '}
        {report.metaRobustness.modelDivComponent} · BMA安定 {report.metaRobustness.bmaStabilityComponent}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 },
  verdict: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: 8 },
  verdictOk: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  verdictWarn: { backgroundColor: 'rgba(234, 179, 8, 0.15)' },
  verdictText: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  section: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
