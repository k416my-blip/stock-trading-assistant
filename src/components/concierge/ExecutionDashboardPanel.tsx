import { StyleSheet, Text, View } from 'react-native';
import { EXECUTION_UI_LABELS_JA } from '../../constants/paperBroker';
import type { ExecutionDashboardBundle } from '../../types/paperBroker';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: ExecutionDashboardBundle;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <SelectableText style={styles.value}>{value}</SelectableText>
    </View>
  );
}

export function ExecutionDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-execution-dashboard">
      <Text style={styles.title}>{EXECUTION_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.regulatory}>{bundle.regulatoryBannerJa}</SelectableText>
      <SelectableText style={styles.paperBadge}>{EXECUTION_UI_LABELS_JA.paperOnly}</SelectableText>

      {bundle.killSwitchActive || bundle.newOrdersBlockedJa ? (
        <SelectableText style={styles.blocked}>
          {bundle.newOrdersBlockedJa ?? EXECUTION_UI_LABELS_JA.killSwitch}
        </SelectableText>
      ) : null}

      <Row label="環境" value={`${bundle.deploymentEnv} · ${bundle.brokerHealth.messageJa}`} />
      <Row label="市場" value={bundle.marketSessionJa} />
      <Row
        label={EXECUTION_UI_LABELS_JA.pnl}
        value={`${bundle.totalPnLMYR >= 0 ? '+' : ''}${bundle.totalPnLMYR.toLocaleString()} MYR (${bundle.totalReturnPct >= 0 ? '+' : ''}${bundle.totalReturnPct}%)`}
      />
      <Row label={EXECUTION_UI_LABELS_JA.drawdown} value={`${bundle.maxDrawdownPct}%`} />
      <Row
        label={EXECUTION_UI_LABELS_JA.winRate}
        value={bundle.winRatePct != null ? `${bundle.winRatePct}%` : '—'}
      />
      <Row
        label={EXECUTION_UI_LABELS_JA.sharpe}
        value={bundle.sharpeEstimate != null ? String(bundle.sharpeEstimate) : '—'}
      />
      <Row label={EXECUTION_UI_LABELS_JA.latency} value={`${bundle.avgLatencyMs} ms`} />
      <Row
        label={EXECUTION_UI_LABELS_JA.trust}
        value={bundle.trustScore != null ? String(bundle.trustScore) : '—'}
      />
      <Row
        label="現金"
        value={`${bundle.balance.cashMYR.toLocaleString()} MYR`}
      />

      {bundle.capitalAllocationSummary ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buying Power（Capital Allocation）</Text>
          <Row
            label="Available"
            value={`${bundle.capitalAllocationSummary.availableBuyingPowerMYR.toLocaleString()} MYR`}
          />
          <Row
            label="Reserved"
            value={`${bundle.capitalAllocationSummary.reservedCashMYR.toLocaleString()} MYR`}
          />
          <Row
            label="Usable"
            value={`${bundle.capitalAllocationSummary.usableCashMYR.toLocaleString()} MYR`}
          />
          <Row
            label="提案配分"
            value={`${bundle.capitalAllocationSummary.proposedAllocationMYR.toLocaleString()} MYR`}
          />
          <Row
            label="残現金"
            value={`${bundle.capitalAllocationSummary.remainingCashMYR.toLocaleString()} MYR`}
          />
          {bundle.capitalSizingLineJa ? (
            <SelectableText style={styles.note}>{bundle.capitalSizingLineJa}</SelectableText>
          ) : null}
        </View>
      ) : null}

      {bundle.rebalanceNoteJa ? (
        <SelectableText style={styles.note}>リバランス: {bundle.rebalanceNoteJa}</SelectableText>
      ) : null}
      {bundle.realityGapSummaryJa ? (
        <SelectableText style={styles.note}>Reality Gap: {bundle.realityGapSummaryJa}</SelectableText>
      ) : null}
      {bundle.replayPreviewJa ? (
        <SelectableText style={styles.note}>Replay: {bundle.replayPreviewJa}</SelectableText>
      ) : null}

      {bundle.symbolExposure.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{EXECUTION_UI_LABELS_JA.exposure}</Text>
          {bundle.symbolExposure.slice(0, 4).map((e) => (
            <SelectableText key={e.symbol} style={styles.line}>
              {e.symbol} {e.pct}%
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.exitAlertsJa.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exit</Text>
          {bundle.exitAlertsJa.map((a) => (
            <SelectableText key={a} style={styles.warn}>
              {a}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.recentOrders.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{EXECUTION_UI_LABELS_JA.orders}</Text>
          {bundle.recentOrders.slice(0, 5).map((o) => (
            <SelectableText key={o.id} style={styles.line}>
              {o.symbol} {o.side} {o.status} · {o.filledQuantity}@{o.avgFillPrice ?? '—'}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.journalRecent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trade Journal</Text>
          {bundle.journalRecent.map((j) => (
            <SelectableText key={j.id} style={styles.line}>
              {j.at.slice(0, 16)} {j.symbol}: {j.outcomeJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.footer}>
        {bundle.safetyChecksJa.join(' · ')}
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
    marginBottom: theme.spacing.xs,
  },
  regulatory: {
    fontSize: 12,
    color: theme.colors.warning,
    marginBottom: 4,
    lineHeight: 18,
  },
  paperBadge: {
    fontSize: 12,
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  blocked: { fontSize: 13, color: theme.colors.danger, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: { fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  value: { fontSize: 13, color: theme.colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  note: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  line: { fontSize: 12, color: theme.colors.text, marginBottom: 2 },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: 2 },
  footer: { fontSize: 10, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
