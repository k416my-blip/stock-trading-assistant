import { StyleSheet, Text, View } from 'react-native';
import type { ConciergeEnhancedAnalysisReport } from '../../types/conciergeEnhancedAnalysis';
import { listKey } from '../../utils/reactKeyDiagnostics';
import { theme } from '../../theme';

type Props = {
  report: ConciergeEnhancedAnalysisReport;
};

function fmtSourceScore(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '' : '+';
  return `${sign}${n}`;
}

export function ConciergeEnhancedAnalysisBlock({ report }: Props) {
  return (
    <View
      style={styles.wrap}
      testID="concierge-enhanced-analysis"
      accessibilityLabel="AI分析結果"
    >
      <Text style={styles.title}>AI分析結果</Text>

      <Text selectable style={styles.row}>
        <Text style={styles.key}>1. 銘柄名: </Text>
        {report.stockNameJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>2. 現在株価: </Text>
        {report.currentPriceJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>3. 保有株数: </Text>
        {report.sharesJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>4. 評価額: </Text>
        {report.marketValueJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>5. 含み損益: </Text>
        {report.unrealizedPnlJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>6. 総合判定: </Text>
        <Text style={styles.judgment}>{report.overallJudgmentJa}</Text>
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>7. 確信度: </Text>
        {report.confidencePct}%
      </Text>

      <Text style={styles.section}>8. 判断理由</Text>
      {report.judgmentReasonsJa.map((line, i) => (
        <Text key={listKey('reason', i, line)} selectable style={styles.bullet}>
          · {line}
        </Text>
      ))}
      <Text selectable style={styles.sourceLine}>
        <Text style={styles.key}>Bursa: </Text>
        {report.sourceSummariesJa.bursa}
      </Text>
      <Text selectable style={styles.sourceLine}>
        <Text style={styles.key}>News API: </Text>
        {report.sourceSummariesJa.news}
      </Text>
      <Text selectable style={styles.sourceLine}>
        <Text style={styles.key}>X API: </Text>
        {report.sourceSummariesJa.x}
      </Text>
      <Text selectable style={styles.sourceLine}>
        <Text style={styles.key}>Reddit: </Text>
        {report.sourceSummariesJa.reddit}
      </Text>

      <Text style={styles.section}>9. ポジティブ材料</Text>
      {report.positiveMaterialsJa.length === 0 ? (
        <Text style={styles.empty}>該当なし</Text>
      ) : (
        report.positiveMaterialsJa.map((line, i) => (
          <Text key={listKey('pos', i, line)} selectable style={styles.bullet}>
            + {line}
          </Text>
        ))
      )}

      <Text style={styles.section}>10. ネガティブ材料</Text>
      {report.negativeMaterialsJa.length === 0 ? (
        <Text style={styles.empty}>該当なし</Text>
      ) : (
        report.negativeMaterialsJa.map((line, i) => (
          <Text key={listKey('neg', i, line)} selectable style={styles.bullet}>
            − {line}
          </Text>
        ))
      )}

      <Text style={styles.section}>11. リスク</Text>
      {report.risksJa.map((line, i) => (
        <Text key={listKey('risk', i, line)} selectable style={styles.risk}>
          · {line}
        </Text>
      ))}

      <Text style={styles.section}>12. 次に確認すべきポイント</Text>
      {report.nextCheckpointsJa.map((line, i) => (
        <Text key={listKey('next', i, line)} selectable style={styles.bullet}>
          · {line}
        </Text>
      ))}

      <Text selectable style={styles.actionRow}>
        <Text style={styles.key}>13. AI推奨アクション: </Text>
        <Text style={styles.action}>{report.recommendedActionJa}</Text>
      </Text>

      <Text style={styles.section}>14. ソース別スコア</Text>
      <Text selectable style={styles.scoreRow}>
        Bursa: {fmtSourceScore(report.sourceScoresJa.bursa)}
      </Text>
      <Text selectable style={styles.scoreRow}>
        News: {fmtSourceScore(report.sourceScoresJa.news)}
      </Text>
      <Text selectable style={styles.scoreRow}>
        X: {fmtSourceScore(report.sourceScoresJa.x)}
      </Text>
      <Text selectable style={styles.scoreRow}>
        Reddit: {fmtSourceScore(report.sourceScoresJa.reddit)}
      </Text>

      <Text selectable style={styles.overallRow}>
        <Text style={styles.key}>15. 総合スコア: </Text>
        <Text style={styles.overallScore}>{report.overallScore}</Text>
        <Text style={styles.scoreUnit}> / 100</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  title: {
    fontWeight: '800',
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  section: {
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  row: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 22, marginBottom: 2 },
  key: { fontWeight: '700', color: theme.colors.text },
  judgment: { fontWeight: '800', color: theme.colors.primary },
  bullet: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 20, marginBottom: 2 },
  sourceLine: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 2,
    paddingLeft: 4,
  },
  empty: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, fontStyle: 'italic' },
  risk: { fontSize: theme.fontSize.sm, color: theme.colors.danger, lineHeight: 20, marginBottom: 2 },
  actionRow: { fontSize: theme.fontSize.sm, lineHeight: 22, marginTop: 8 },
  action: { fontWeight: '800', color: theme.colors.primary },
  scoreRow: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20 },
  overallRow: { fontSize: theme.fontSize.sm, lineHeight: 22, marginTop: 6 },
  overallScore: { fontWeight: '800', fontSize: theme.fontSize.lg, color: theme.colors.primary },
  scoreUnit: { color: theme.colors.textMuted },
});
