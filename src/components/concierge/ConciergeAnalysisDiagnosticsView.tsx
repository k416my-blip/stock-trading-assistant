import { StyleSheet, Text, View } from 'react-native';
import type { ConciergeAnalysisDiagnostics } from '../../types/conciergeEvidence';
import { listKey } from '../../utils/reactKeyDiagnostics';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

function okNg(ok: boolean): string {
  return ok ? 'OK' : 'NG';
}

function signedPts(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

type Props = {
  diagnostics: ConciergeAnalysisDiagnostics;
};

export function ConciergeAnalysisDiagnosticsView({ diagnostics }: Props) {
  const b = diagnostics.confidenceBreakdown;

  return (
    <View style={styles.wrap} testID="concierge-analysis-diagnostics">
      <Text style={styles.heading}>■取得状況</Text>
      <SelectableText style={styles.line}>
        Twelve Data: {okNg(diagnostics.twelveOk)}
        {diagnostics.twelveError ? ` — ${diagnostics.twelveError}` : ''}
      </SelectableText>
      <SelectableText style={styles.line}>Yahoo Finance: {okNg(diagnostics.yahooOk)}</SelectableText>
      <SelectableText style={styles.line}>
        ニュース ({diagnostics.newsProvider === 'rss' ? 'RSS' : 'NewsAPI'}): {okNg(diagnostics.newsOk)}
        {diagnostics.newsError ? ` — ${diagnostics.newsError}` : ''}
      </SelectableText>
      <SelectableText style={styles.line}>
        X API: {okNg(diagnostics.xOk)}
        {diagnostics.xError ? ` — ${diagnostics.xError}` : ''}
      </SelectableText>
      <SelectableText style={styles.muted}>{diagnostics.symbolResolutionJa}</SelectableText>

      <Text style={styles.heading}>■取得件数</Text>
      <SelectableText style={styles.line}>ニュース {diagnostics.newsCount}件</SelectableText>
      <SelectableText style={styles.line}>X投稿 {diagnostics.xCount}件</SelectableText>

      <Text style={styles.heading}>■確信度内訳</Text>
      <SelectableText style={styles.line}>市場データ {signedPts(b.marketDataPts)}点</SelectableText>
      <SelectableText style={styles.line}>ニュース {signedPts(b.newsPts)}点</SelectableText>
      <SelectableText style={styles.line}>X {signedPts(b.xPts)}点</SelectableText>
      <SelectableText style={styles.line}>
        データ不足 -{b.dataGapPenalty}点
      </SelectableText>
      <SelectableText style={styles.confidence}>
        確信度 {b.confidenceScore}%（成功 {diagnostics.dataFetchSuccessCount} / 失敗{' '}
        {diagnostics.dataFetchFailCount} · ソース {diagnostics.usedSourceCount}）
      </SelectableText>
      <SelectableText style={styles.muted}>{diagnostics.confidenceBasisJa}</SelectableText>

      {typeof __DEV__ !== 'undefined' && __DEV__
        ? diagnostics.fetchResults.map((row, index) => (
            <Text
              key={listKey('fetch-detail', index, row.source)}
              style={[styles.muted, { color: row.ok ? theme.colors.success : theme.colors.danger }]}
            >
              {row.source}: {row.detailJa}
            </Text>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  heading: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  line: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  confidence: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 6,
    lineHeight: 18,
  },
  muted: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
});
