import { StyleSheet, Text, View } from 'react-native';
import type { MarketIntelligenceReport } from '../types/marketIntelligence';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — 構造安定' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 遷移監視' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — システミック' },
};

type Props = { report: MarketIntelligenceReport };

export function MarketIntelligencePanel({ report }: Props) {
  const h = HEALTH[report.healthStatus];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>マーケット・インテリジェンス</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.verdict}>{report.verdictJa}</Text>
        <Text style={styles.badge}>{h.label}</Text>
        <Text style={styles.muted}>
          システミックリスク {report.systemicRiskScore} · 執行バイアス {report.executionTimingBias}
        </Text>
      </View>

      <Text style={styles.section}>インターマーケット・レジーム</Text>
      <Text style={styles.line}>
        {report.intermarketRegime.labelJa}（信頼 {report.intermarketRegime.confidencePct}%）
      </Text>
      <Text style={styles.muted}>{report.intermarketRegime.driversJa.join(' · ')}</Text>
      <Text style={styles.muted}>{report.regimeAlignment.noteJa}</Text>

      <Text style={styles.section}>資産クラス相関</Text>
      <Text style={styles.muted}>{report.correlationMonitor.noteJa}</Text>
      {report.correlationMonitor.pairs.map((p) => (
        <Text key={p.pairLabelJa} style={styles.line}>
          {p.pairLabelJa}: ρ {p.correlation} (Δ {p.delta}) {p.alert ? '⚠' : ''}
        </Text>
      ))}

      <Text style={styles.section}>流動性 · ボラ・サーフェス · ガンマ</Text>
      <Text style={styles.muted}>
        {report.liquidityRegime.noteJa} · HY {report.liquidityRegime.hySpreadProxy}%
      </Text>
      <Text style={styles.muted}>{report.volSurface.noteJa}</Text>
      <Text style={styles.muted}>{report.dealerGamma.noteJa}</Text>

      <Text style={styles.section}>マクロ · 決算 · ニュース</Text>
      <Text style={styles.muted}>{report.macroSurprise.noteJa}</Text>
      <Text style={styles.muted}>{report.earningsDrift.noteJa}</Text>
      <Text style={styles.muted}>{report.newsSentiment.noteJa}</Text>

      <Text style={styles.section}>セクター · フロー · ブレッドス</Text>
      <Text style={styles.muted}>{report.sectorRotation.noteJa}</Text>
      <Text style={styles.line}>
        主導: {report.sectorRotation.leaders.map((s) => SECTOR_THEME_LABEL[s]).join(', ')}
      </Text>
      <Text style={styles.muted}>{report.flowImbalance.noteJa}</Text>
      <Text style={styles.muted}>{report.marketBreadth.noteJa}</Text>

      <Text style={styles.section}>パニック / ユーフォリア</Text>
      <Text style={styles.line}>{report.panicEuphoria.noteJa}</Text>

      {report.correlationAlerts.length > 0 ? (
        <>
          <Text style={styles.section}>相関ブレイク・アラート</Text>
          {report.correlationAlerts.map((a) => (
            <View key={a.id} style={styles.alert}>
              <Text style={styles.alertTitle}>{a.titleJa}</Text>
              <Text style={styles.muted}>{a.detailJa}</Text>
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  health: { padding: theme.spacing.sm, borderRadius: theme.radius.sm, marginTop: theme.spacing.sm },
  verdict: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  badge: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  alert: { marginTop: theme.spacing.xs, paddingLeft: theme.spacing.sm },
  alertTitle: { color: theme.colors.warning, fontSize: theme.fontSize.sm },
});
