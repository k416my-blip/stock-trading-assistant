import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChartShell } from '../charts/ChartShell';
import { MemoLineChart } from '../charts/MemoLineChart';
import { SimpleBarChart } from '../charts/SimpleBarChart';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import {
  ALLOCATION_ANIM_INTERVAL_MS,
  ALLOCATION_ANIM_STEPS,
} from '../../constants/monitoring';
import type { MonitoringSnapshot } from '../../types/monitoring';
import { lerpWeights } from '../../utils/chartUtils';

const REGIME_COLORS: Record<string, string> = {
  risk_on: '#22c55e',
  risk_off: '#ef4444',
  high_volatility: '#f59e0b',
  inflation_fear: '#a855f7',
  recession_fear: '#dc2626',
  liquidity_bull: '#3b82f6',
  tightening_bear: '#6366f1',
  recovery_phase: '#14b8a6',
};

const HEALTH_COLOR = {
  green: theme.colors.success,
  yellow: theme.colors.warning,
  red: theme.colors.danger,
};

type Props = { snapshot: MonitoringSnapshot };

function EquityUnderwaterSection({ snapshot }: Props) {
  const labels = useMemo(
    () => snapshot.equityCurve.map((p) => p.date),
    [snapshot.equityCurve],
  );
  const equityValues = useMemo(
    () => snapshot.equityCurve.map((p) => p.portfolioValueMYR),
    [snapshot.equityCurve],
  );
  const ddValues = useMemo(
    () => snapshot.underwater.map((p) => p.drawdownPct),
    [snapshot.underwater],
  );

  return (
    <Card>
      <ChartShell
        title="エクイティ・カーブ"
        subtitle="シャドー / 成績履歴"
        empty={equityValues.length < 2}
      >
        <MemoLineChart labels={labels} values={equityValues} height={200} />
      </ChartShell>
      <ChartShell title="水中曲線（ドローダウン）" empty={ddValues.length < 2}>
        <MemoLineChart
          labels={labels}
          values={ddValues}
          height={160}
          color={theme.colors.danger}
        />
      </ChartShell>
    </Card>
  );
}

function RegimeTimelineSection({ snapshot }: Props) {
  const mixture = snapshot.regimeMixture;
  const mixtureBars = useMemo(() => {
    if (!mixture) return [];
    return [
      { label: 'Risk-on', value: mixture.riskOnPct },
      { label: 'Risk-off', value: mixture.riskOffPct },
      { label: '高ボラ', value: mixture.highVolPct },
      { label: 'インフレ', value: mixture.inflationPct },
      { label: '危機', value: mixture.crisisPct },
      { label: '遷移', value: mixture.transitionPct },
    ];
  }, [mixture]);

  return (
    <Card>
      <ChartShell title="レジーム・タイムライン" subtitle={mixture?.noteJa}>
        <View style={styles.timeline}>
          {snapshot.regimeTimeline.map((seg) => (
            <View
              key={`${seg.regimeId}-${seg.startDate}`}
              style={[
                styles.seg,
                {
                  flex: seg.weightPct,
                  backgroundColor: REGIME_COLORS[seg.regimeId] ?? theme.colors.primary,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.muted}>
          {snapshot.regimeTimeline.map((s) => s.labelJa).join(' → ')}
        </Text>
      </ChartShell>
      {mixtureBars.length > 0 ? (
        <ChartShell title="確率混合（現在）">
          <SimpleBarChart data={mixtureBars} barColor={theme.colors.chartLine} horizontal />
        </ChartShell>
      ) : null}
    </Card>
  );
}

function AllocationAnimationSection({ snapshot }: Props) {
  const frames = snapshot.allocationFrames;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => {
      setStep((s) => (s + 1) % (ALLOCATION_ANIM_STEPS + 1));
    }, ALLOCATION_ANIM_INTERVAL_MS);
    return () => clearInterval(id);
  }, [frames.length]);

  const animatedWeights = useMemo(() => {
    if (frames.length < 2) return frames[0]?.weights ?? [];
    const t = step / ALLOCATION_ANIM_STEPS;
    return lerpWeights(frames[0].weights, frames[1].weights, t);
  }, [frames, step]);

  const barData = useMemo(
    () => animatedWeights.map((w) => ({ label: w.symbol, value: w.weightPct })),
    [animatedWeights],
  );

  return (
    <Card>
      <ChartShell
        title="配分遷移"
        subtitle="現在 → メタ目標（補間アニメーション）"
        empty={barData.length === 0}
      >
        <SimpleBarChart data={barData} barColor={theme.colors.success} horizontal />
        <Text style={styles.muted}>
          ステップ {step}/{ALLOCATION_ANIM_STEPS}
        </Text>
      </ChartShell>
    </Card>
  );
}

function OmsReplaySection({ snapshot }: Props) {
  return (
    <Card>
      <ChartShell title="OMS執行リプレイ" empty={snapshot.omsEvents.length === 0}>
        <View style={styles.replay}>
          {snapshot.omsEvents.map((e) => (
            <View key={e.id} style={styles.replayRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: e.kind === 'fill' ? theme.colors.success : theme.colors.primary },
                ]}
              />
              <View style={styles.replayBody}>
                <Text style={styles.replayTime}>
                  {new Date(e.timestamp).toLocaleString('ja-JP')}
                </Text>
                <Text style={styles.replayLabel}>{e.labelJa}</Text>
                {e.status ? <Text style={styles.muted}>{e.status}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </ChartShell>
    </Card>
  );
}

function RiskFactorSection({ snapshot }: Props) {
  const riskData = useMemo(
    () => snapshot.riskContributions.map((r) => ({ label: r.label, value: r.contributionPct })),
    [snapshot.riskContributions],
  );
  const factorData = useMemo(
    () =>
      snapshot.factorExposures.map((f) => ({
        label: f.labelJa.slice(0, 6),
        value: Math.abs(f.exposure),
      })),
    [snapshot.factorExposures],
  );

  return (
    <Card>
      <ChartShell title="リスク寄与" empty={riskData.length === 0}>
        <SimpleBarChart data={riskData} barColor={theme.colors.warning} horizontal />
      </ChartShell>
      <ChartShell title="ファクター・エクスポージャー" empty={factorData.length === 0}>
        <SimpleBarChart data={factorData} barColor={theme.colors.chartLine} horizontal />
      </ChartShell>
    </Card>
  );
}

function GovernanceTimelineSection({ snapshot }: Props) {
  return (
    <Card>
      <ChartShell title="ガバナンス・イベント" empty={snapshot.governanceEvents.length === 0}>
        {snapshot.governanceEvents.map((e) => (
          <View key={e.id} style={styles.govRow}>
            <View style={[styles.healthDot, { backgroundColor: HEALTH_COLOR[e.healthStatus] }]} />
            <View style={styles.replayBody}>
              <Text style={styles.replayTime}>
                {new Date(e.timestamp).toLocaleString('ja-JP')}
              </Text>
              <Text style={styles.replayLabel}>{e.titleJa}</Text>
            </View>
          </View>
        ))}
      </ChartShell>
    </Card>
  );
}

function HealthMonitorSection({ snapshot }: Props) {
  return (
    <Card>
      <ChartShell title="リアルタイム・ヘルス">
        {snapshot.healthMetrics.map((m) => (
          <View key={m.id} style={styles.healthRow}>
            <Text style={styles.healthLabel}>{m.labelJa}</Text>
            <View style={styles.healthBarBg}>
              <View
                style={[
                  styles.healthBarFill,
                  {
                    width: `${Math.min(100, (m.value / m.max) * 100)}%`,
                    backgroundColor: HEALTH_COLOR[m.level],
                  },
                ]}
              />
            </View>
            <Text style={styles.healthVal}>{Math.round(m.value)}</Text>
          </View>
        ))}
      </ChartShell>
    </Card>
  );
}

function MetaConfidenceSection({ snapshot }: Props) {
  const bars = useMemo(
    () => snapshot.metaConfidence.map((m) => ({ label: m.label, value: m.posteriorPct })),
    [snapshot.metaConfidence],
  );

  return (
    <Card>
      <ChartShell
        title="メタ配分信頼度"
        subtitle={
          snapshot.metaReport
            ? `不一致 ${snapshot.metaReport.disagreement.score} · 頑健性 ${snapshot.metaReport.metaRobustness.score}`
            : 'メタ配分を実行すると表示'
        }
        empty={bars.length === 0}
      >
        <SimpleBarChart data={bars} barColor={theme.colors.primary} horizontal />
        {snapshot.metaConfidence.map((m) => (
          <Text key={m.label} style={styles.muted}>
            {m.label}: 事後 {m.posteriorPct}% · 信頼 {m.confidence}%
          </Text>
        ))}
      </ChartShell>
    </Card>
  );
}

function MonitoringChartsInner({ snapshot }: Props) {
  return (
    <View>
      <HealthMonitorSection snapshot={snapshot} />
      <EquityUnderwaterSection snapshot={snapshot} />
      <RegimeTimelineSection snapshot={snapshot} />
      <MetaConfidenceSection snapshot={snapshot} />
      <AllocationAnimationSection snapshot={snapshot} />
      <RiskFactorSection snapshot={snapshot} />
      <OmsReplaySection snapshot={snapshot} />
      <GovernanceTimelineSection snapshot={snapshot} />
    </View>
  );
}

export const MonitoringCharts = memo(MonitoringChartsInner);

const styles = StyleSheet.create({
  timeline: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: theme.spacing.sm },
  seg: { minWidth: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  replay: { marginTop: theme.spacing.sm },
  replayRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: theme.spacing.sm },
  replayBody: { flex: 1 },
  replayTime: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  replayLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  govRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  healthDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: theme.spacing.sm },
  healthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, gap: 8 },
  healthLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm, width: 100 },
  healthBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthBarFill: { height: '100%', borderRadius: 4 },
  healthVal: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, width: 32, textAlign: 'right' },
});
