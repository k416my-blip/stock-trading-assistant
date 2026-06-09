import { StyleSheet, Text, View } from 'react-native';
import type { ForwardSignalGapAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSignalGapAuditReport | null;
  loading?: boolean;
};

export function ForwardSignalGapAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>シグナルギャップ監査</Text>
        <Text style={styles.muted}>Yahoo最新バー取得・診断中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>シグナルギャップ監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得のため診断できません</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>シグナルギャップ監査</Text>
      <Text style={styles.subtitle}>
        {report.sinceDate} ～ {report.yahooLatestDate} · 最終シグナル {report.lastSignalDate ?? '—'}
      </Text>
      <Text style={styles.line}>
        期間内シグナル {report.signalsSinceCount}件 · 営業日 {report.tradingDaysSince} · 条件適合日{' '}
        {report.daysWithAnyPass} · 全不適合日 {report.daysWithZeroPass}
      </Text>

      <Text style={styles.section}>最新バー診断（Yahoo取得後）</Text>
      {report.latestBarDiagnosis.map((d) => (
        <View key={d.symbol} style={styles.etfBlock}>
          <Text style={styles.etfTitle}>
            {d.symbol} · {d.barDate} · {d.passes ? '✓ 適合' : '✗ 不適合'}
          </Text>
          <Text style={styles.muted}>
            ADX {d.adx14 ?? '—'} · MACD {d.macdHistPct ?? '—'}% · 52w {d.dist52wPct ?? '—'}%
          </Text>
          <Text style={styles.muted}>
            SPY {d.spyRegime} ({d.spyRet63Pct ?? '—'}%) · バケット {d.bucket}
          </Text>
          {!d.passes ? (
            <Text style={styles.reasonPrimary}>{d.primaryDisqualificationJa}</Text>
          ) : null}
          {d.disqualificationReasonsJa.length > 1 ? (
            d.disqualificationReasonsJa.slice(1).map((r) => (
              <Text key={r} style={styles.reasonSub}>
                ・{r}
              </Text>
            ))
          ) : null}
        </View>
      ))}

      <Text style={styles.section}>期間内 主な失格理由（営業日数）</Text>
      {(Object.keys(report.reasonCountsSince) as Array<keyof typeof report.reasonCountsSince>).map(
        (sym) => {
          const top = Object.entries(report.reasonCountsSince[sym])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);
          return (
            <Text key={sym} style={styles.line}>
              {sym}: {top.map(([r, n]) => `${r}(${n}日)`).join(' · ') || '—'}
            </Text>
          );
        },
      )}

      <Text style={styles.section}>現在有効シグナル0件の理由</Text>
      <Text style={styles.reportBody}>{report.activeSignalZeroReportJa}</Text>

      <Text style={styles.section}>人間可読レポート</Text>
      <Text style={styles.reportBody}>{report.humanSummaryJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  etfBlock: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
  },
  etfTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  reasonPrimary: { color: theme.colors.warning, fontSize: theme.fontSize.xs, marginTop: 4, fontWeight: '600' },
  reasonSub: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 16 },
  reportBody: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
