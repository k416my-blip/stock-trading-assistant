import { StyleSheet, Text, View } from 'react-native';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import type { PortfolioConstructionReport } from '../types/portfolioConstruction';
import type { ConcentrationSeverity } from '../types/portfolioConstruction';
import { CrossAssetFlowCard } from './CrossAssetFlowCard';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: PortfolioConstructionReport;
};

const SEVERITY_COLOR: Record<ConcentrationSeverity, string> = {
  ok: theme.colors.primary,
  watch: theme.colors.warning,
  high: theme.colors.warning,
  critical: theme.colors.danger,
};

const INTENSITY_BG = [
  theme.colors.surfaceElevated,
  'rgba(59, 130, 246, 0.15)',
  'rgba(59, 130, 246, 0.35)',
  'rgba(245, 158, 11, 0.45)',
  'rgba(239, 68, 68, 0.55)',
];

function HeatMapBar({ label, weightPct, intensity, severity }: {
  label: string;
  weightPct: number;
  intensity: number;
  severity: ConcentrationSeverity;
}) {
  const widthPct = Math.min(100, Math.max(0, weightPct));
  return (
    <View style={styles.heatRow}>
      <Text style={styles.heatLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.heatTrack}>
        <View
          style={[
            styles.heatFill,
            {
              width: `${widthPct}%`,
              backgroundColor: INTENSITY_BG[intensity] ?? INTENSITY_BG[0],
              borderColor: SEVERITY_COLOR[severity],
            },
          ]}
        />
      </View>
      <Text style={styles.heatPct}>{weightPct.toFixed(1)}%</Text>
    </View>
  );
}

function FactorBar({ label, exposure }: { label: string; exposure: number }) {
  const width = Math.min(50, Math.abs(exposure) / 2);
  const isPos = exposure >= 0;
  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorLabel}>{label}</Text>
      <View style={styles.factorTrack}>
        <View style={[styles.factorCenter]} />
        <View
          style={[
            styles.factorFill,
            isPos ? styles.factorFillPos : styles.factorFillNeg,
            { width: `${width}%`, [isPos ? 'left' : 'right']: '50%' },
          ]}
        />
      </View>
      <Text style={styles.factorVal}>{exposure > 0 ? '+' : ''}{exposure}</Text>
    </View>
  );
}

export function PortfolioConstructionPanel({ report }: Props) {
  if (report.positionCount === 0) {
    return (
      <Card>
        <Text style={styles.title}>ポートフォリオ構成分析</Text>
        <Text style={styles.muted}>保有銘柄がないため分析できません</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>ポートフォリオ構成分析</Text>
      <Text style={styles.subtitle}>
        危機相関・クロスアセット・ベータ管理（機関投資家型・ルールベース）
      </Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>健全性</Text>
          <Text style={[styles.kpiVal, report.healthScore < 60 && styles.kpiWarn]}>
            {report.healthScore}
          </Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>β</Text>
          <Text style={[styles.kpiVal, !report.betaWithinLimit && styles.kpiWarn]}>
            {report.portfolioBeta}
          </Text>
          <Text style={styles.kpiSub}>動的上限 {report.dynamicMaxPortfolioBeta}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>相関</Text>
          <Text style={styles.kpiVal}>{report.crisisCorrelation.regimeLabelJa}</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>HHI</Text>
          <Text style={styles.kpiVal}>{report.herfindahlIndex.toFixed(2)}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>削減推奨</Text>
          <Text style={[styles.kpiVal, report.totalExposureReductionPct > 0 && styles.kpiWarn]}>
            {report.totalExposureReductionPct}%
          </Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>βクラスター</Text>
          <Text style={styles.kpiVal}>{report.crisisCorrelation.betaClusters.length}</Text>
        </View>
      </View>

      <Text style={styles.crisisNote}>{report.crisisCorrelation.summaryJa}</Text>

      {report.macroRiskReductionPct > 0 ? (
        <Text style={styles.macroNote}>{report.macroRiskNoteJa}</Text>
      ) : null}

      {report.crossAssetGuidance.defense.active ? (
        <View style={styles.defenseBox}>
          <Text style={styles.defenseTitle}>危機防御モード</Text>
          {report.crossAssetGuidance.defense.actionsJa.map((a) => (
            <Text key={a} style={styles.defenseLine}>
              · {a}
            </Text>
          ))}
        </View>
      ) : null}

      <CrossAssetFlowCard flow={report.crossAssetGuidance.flow} compact />

      <Text style={styles.sectionTitle}>セクター・ヒートマップ</Text>
      {report.sectorHeatMap.map((row) => (
        <HeatMapBar
          key={row.label}
          label={row.label}
          weightPct={row.weightPct}
          intensity={row.intensity}
          severity={row.severity}
        />
      ))}

      {report.themeHeatMap.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>テーマ・ヒートマップ</Text>
          {report.themeHeatMap.map((row) => (
            <HeatMapBar
              key={row.label}
              label={row.label}
              weightPct={row.weightPct}
              intensity={row.intensity}
              severity={row.severity}
            />
          ))}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>ファクター・エクスポージャ</Text>
      {report.factorExposures.map((f) => (
        <FactorBar key={f.factor} label={f.labelJa} exposure={f.exposure} />
      ))}

      <Text style={styles.sectionTitle}>ストレステスト（推定）</Text>
      {report.stressTests.map((s) => (
        <View key={s.id} style={styles.stressRow}>
          <Text style={styles.stressLabel}>{s.labelJa}</Text>
          <Text style={[styles.stressVal, s.portfolioImpactPct < 0 && styles.stressNeg]}>
            {s.portfolioImpactPct}% (RM{Math.abs(s.estimatedLossMYR).toLocaleString('ja-JP')})
          </Text>
        </View>
      ))}

      {report.crisisCorrelation.betaClusters.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>隠れベータ・クラスター</Text>
          {report.crisisCorrelation.betaClusters.slice(0, 4).map((c) => (
            <Text key={c.id} style={styles.corrLine}>
              {c.id}: {c.symbols.join('・')} · β{c.avgBeta} · {c.combinedWeightPct}%
            </Text>
          ))}
        </>
      ) : null}

      {report.correlatedPairs.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>ストレス調整・高相関ペア</Text>
          {report.crisisCorrelation.stressAdjustedPairs.slice(0, 5).map((p) => (
            <Text key={`${p.symbolA}-${p.symbolB}`} style={styles.corrLine}>
              {p.symbolA} ↔ {p.symbolB}: {p.stressAdjustedCorrelation}
              {p.crossSector ? ' (異セクター)' : ''} · 下方 {p.downsideCorrelation}
            </Text>
          ))}
        </>
      ) : null}

      {report.crossAssetGuidance.flow.sectorLeadership.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>セクター主導</Text>
          <Text style={styles.corrLine}>
            {report.crossAssetGuidance.flow.sectorLeadership
              .map((s) => SECTOR_THEME_LABEL[s])
              .join(' · ')}
          </Text>
        </>
      ) : null}

      {report.warnings.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>警告 ({report.warnings.length})</Text>
          {report.warnings.map((w) => (
            <View key={w.id} style={styles.warnItem}>
              <Text style={[styles.warnTitle, { color: SEVERITY_COLOR[w.severity] }]}>
                {w.titleJa}
              </Text>
              <Text style={styles.warnDetail}>{w.detailJa}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.okNote}>重大な集中度リスクは検出されませんでした</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: theme.colors.border, marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  kpiRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  kpi: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  kpiLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  kpiVal: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  kpiWarn: { color: theme.colors.warning },
  kpiSub: { color: theme.colors.textMuted, fontSize: 10 },
  crisisNote: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  macroNote: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  defenseBox: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  defenseTitle: { color: theme.colors.danger, fontWeight: '600', fontSize: theme.fontSize.sm },
  defenseLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  heatLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, width: 72 },
  heatTrack: {
    flex: 1,
    height: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  heatFill: { height: '100%', borderRadius: 4, borderWidth: 1 },
  heatPct: { color: theme.colors.text, fontSize: theme.fontSize.sm, width: 44, textAlign: 'right' },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  factorLabel: { width: 88, color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  factorTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 4,
    position: 'relative',
  },
  factorCenter: {
    position: 'absolute',
    left: '50%',
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.border,
    marginLeft: -0.5,
  },
  factorFill: { position: 'absolute', height: '100%', borderRadius: 2 },
  factorFillPos: { backgroundColor: theme.colors.primary },
  factorFillNeg: { backgroundColor: theme.colors.warning },
  factorVal: { width: 36, textAlign: 'right', color: theme.colors.text, fontSize: theme.fontSize.sm },
  stressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: theme.spacing.sm,
  },
  stressLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, flex: 1 },
  stressVal: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  stressNeg: { color: theme.colors.danger },
  corrLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginVertical: 2 },
  warnItem: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  warnTitle: { fontWeight: '600', fontSize: theme.fontSize.sm },
  warnDetail: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2, lineHeight: 18 },
  okNote: { color: theme.colors.primary, fontSize: theme.fontSize.sm, marginTop: theme.spacing.md },
});
