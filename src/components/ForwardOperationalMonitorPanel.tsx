import { StyleSheet, Text, View } from 'react-native';
import type { ForwardOperationalSnapshot } from '../types/forwardValidation';
import { PerformanceChart } from './PerformanceChart';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  snapshot: ForwardOperationalSnapshot;
  loading?: boolean;
};

export function ForwardOperationalMonitorPanel({ snapshot, loading }: Props) {
  const s = snapshot;
  const statusColor = s.yahooFailureCount > 0 ? theme.colors.danger : s.isUpToDate ? theme.colors.success : theme.colors.warning;
  const statusJa = s.yahooFailureCount > 0 ? '取得エラー' : s.isUpToDate ? '最新' : '更新待ち';

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>実運用監視</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusJa}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>5秒チェック · 確定ルール · 監視専用</Text>
      {loading ? <Text style={styles.muted}>更新中…</Text> : null}

      <View style={styles.kpiRow}>
        <MiniKpi label="開始資産" value={`$${s.equityStartUsd.toLocaleString('en-US')}`} />
        <MiniKpi label="現在資産" value={`$${s.equityCurrentUsd.toLocaleString('en-US')}`} />
        <MiniKpi
          label="累積R"
          value={s.cumulativeReturnPct != null ? `${fmtSigned(s.cumulativeReturnPct)}%` : '—'}
        />
      </View>

      <Text style={styles.section}>資産推移</Text>
      <PerformanceChart
        data={s.equityCurve.map((p) => ({
          date: p.date,
          portfolioValueMYR: p.equityUsd,
        }))}
      />

      <Text style={styles.section}>次回判定予定</Text>
      <Text style={styles.line}>{fmtIso(s.nextJudgmentAt)}</Text>
      <Text style={styles.muted}>{s.nextJudgmentNoteJa}</Text>

      <Text style={styles.section}>Yahoo取得状態</Text>
      <Text style={styles.line}>
        成功 {s.yahooSuccessCount} · 失敗 {s.yahooFailureCount}
        {s.yahooTotalCount > 0 ? ` / ${s.yahooTotalCount}` : ''}
      </Text>

      <Text style={styles.section}>
        判定日 {s.judgmentDate ?? '—'} の結果
      </Text>
      <View style={styles.kpiRow}>
        <MiniKpi label="新規シグナル" value={String(s.newSignalCount)} />
        <MiniKpi label="クローズ" value={String(s.closeCount)} />
        <MiniKpi label="保有" value={String(s.holdingCount)} />
      </View>

      <Text style={styles.section}>現在有効シグナル ({s.activeSignals.length})</Text>
      {s.activeSignals.length === 0 ? (
        <Text style={styles.muted}>なし</Text>
      ) : (
        <>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colEtf]}>ETF</Text>
            <Text style={[styles.th, styles.colDate]}>入日</Text>
            <Text style={[styles.th, styles.colDays]}>日数</Text>
            <Text style={[styles.th, styles.colPrice]}>入/現</Text>
            <Text style={[styles.th, styles.colPnl]}>含み%</Text>
          </View>
          {s.activeSignals.map((row) => (
            <View key={`${row.symbol}-${row.signalDate}-${row.status}`} style={styles.tableRow}>
              <Text style={[styles.td, styles.colEtf]}>{row.symbol}</Text>
              <Text style={[styles.td, styles.colDate]}>{row.entryDate ?? '—'}</Text>
              <Text style={[styles.td, styles.colDays]}>{row.barsHeld}</Text>
              <Text style={[styles.td, styles.colPrice]} numberOfLines={1}>
                {row.entryPrice != null ? row.entryPrice.toFixed(1) : '—'}/
                {row.currentPrice != null ? row.currentPrice.toFixed(1) : '—'}
              </Text>
              <Text
                style={[
                  styles.td,
                  styles.colPnl,
                  row.unrealizedPct != null && row.unrealizedPct >= 0 ? styles.pos : styles.neg,
                ]}
              >
                {row.unrealizedPct != null ? `${fmtSigned(row.unrealizedPct)}%` : '—'}
              </Text>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniKpi}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniVal}>{value}</Text>
    </View>
  );
}

function fmtSigned(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}`;
}

function fmtIso(iso: string | null): string {
  if (!iso) return '—';
  return iso.slice(0, 19).replace('T', ' ') + ' UTC';
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { color: '#fff', fontSize: theme.fontSize.xs, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  kpiRow: { flexDirection: 'row', gap: theme.spacing.sm },
  miniKpi: { flex: 1 },
  miniLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  miniVal: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4, lineHeight: 18 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 4 },
  th: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '600' },
  td: { color: theme.colors.text, fontSize: theme.fontSize.xs },
  colEtf: { width: 44 },
  colDate: { flex: 1 },
  colDays: { width: 28, textAlign: 'right' },
  colPrice: { width: 72, textAlign: 'right' },
  colPnl: { width: 48, textAlign: 'right', fontWeight: '600' },
  pos: { color: theme.colors.success },
  neg: { color: theme.colors.danger },
});
