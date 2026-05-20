import { StyleSheet, Text, View } from 'react-native';
import type { MetaCapitalReport } from '../types/metaCapital';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — 配分安定' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 監視' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — 抑制' },
};

type Props = { report: MetaCapitalReport };

export function MetaCapitalPanel({ report }: Props) {
  const h = HEALTH[report.healthStatus];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>メタ資本配分</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.verdict}>{report.verdictJa}</Text>
        <Text style={styles.badge}>{h.label}</Text>
        <Text style={styles.muted}>
          分散 {report.diversificationScore} · 配分{' '}
          {report.allocationAllowed ? '許可' : '抑制'}
        </Text>
      </View>

      {report.alerts.length > 0 ? (
        <>
          <Text style={styles.section}>アラート</Text>
          {report.alerts.map((a) => (
            <Text key={a.id} style={styles.line}>
              [{a.severity}] {a.titleJa}: {a.detailJa}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>戦略別資本配分</Text>
      {report.strategyAllocation.map((s) => (
        <Text key={s.strategyId} style={styles.line}>
          {s.labelJa}: {s.targetPct}% (RM{s.capitalMYR.toLocaleString('ja-JP')})
        </Text>
      ))}

      <Text style={styles.section}>動的重み · レジーム切替</Text>
      <Text style={styles.muted}>{report.dynamicWeighting.noteJa}</Text>
      <Text style={styles.muted}>{report.regimeSwitch.noteJa}</Text>

      <Text style={styles.section}>相関 · 集中 · ドローダウン</Text>
      <Text style={styles.muted}>{report.crossStrategyCorrelation.noteJa}</Text>
      <Text style={styles.muted}>{report.concentrationLimits.noteJa}</Text>
      {report.drawdownThrottles
        .filter((t) => t.active)
        .map((t) => (
          <Text key={t.strategyId} style={styles.muted}>
            {t.noteJa}
          </Text>
        ))}

      <Text style={styles.section}>アルファ減衰 · 帰属</Text>
      {report.alphaDecay.slice(0, 4).map((a) => (
        <Text key={a.strategyId} style={styles.muted}>
          {a.noteJa}
        </Text>
      ))}
      {report.performanceAttribution.slice(0, 4).map((p) => (
        <Text key={p.strategyId} style={styles.muted}>
          {p.labelJa}: 寄与 {p.returnContributionPct}% · 重み {p.weightPct}%
        </Text>
      ))}

      <Text style={styles.section}>不一致 · 分散 · Kelly</Text>
      <Text style={styles.muted}>{report.ensembleDisagreement.noteJa}</Text>
      <Text style={styles.muted}>{report.strategyDiversification.noteJa}</Text>
      <Text style={styles.muted}>{report.metaKellyCap.noteJa}</Text>

      <Text style={styles.section}>ターンオーバー · リサイクル · 危機</Text>
      <Text style={styles.muted}>{report.turnoverPenalty.noteJa}</Text>
      <Text style={styles.muted}>{report.capitalRecycling.noteJa}</Text>
      <Text style={styles.muted}>{report.crisisOverride.noteJa}</Text>

      <Text style={styles.section}>シャドー · ライブ乖離 · 保全</Text>
      <Text style={styles.muted}>{report.shadowSimulation.noteJa}</Text>
      <Text style={styles.muted}>{report.liveShadowDivergence.noteJa}</Text>
      <Text style={styles.muted}>{report.capitalPreservation.noteJa}</Text>

      <Text style={styles.section}>露出重複</Text>
      {report.exposureOverlaps.map((o) => (
        <Text key={`${o.strategyA}-${o.strategyB}`} style={styles.muted}>
          {o.noteJa}
        </Text>
      ))}

      <Text style={styles.section}>信頼キャリブレーション</Text>
      {report.confidenceCalibration
        .filter((c) => Math.abs(c.gapPct) > 10)
        .map((c) => (
          <Text key={c.strategyId} style={styles.muted}>
            {c.noteJa}
          </Text>
        ))}

      <Text style={styles.section}>スナップショット</Text>
      {report.snapshots.slice(0, 3).map((s) => (
        <Text key={s.id} style={styles.muted}>
          {new Date(s.capturedAt).toLocaleString('ja-JP')} — 分散 {s.stabilityScore}
        </Text>
      ))}
      {report.snapshots.length === 0 ? (
        <Text style={styles.muted}>履歴なし（安定配分時に保存）</Text>
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
});
