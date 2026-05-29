import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DEVICE_SMOKE_TEST_CHECKLIST } from '../constants/deviceSmokeTestChecklist';
import { useApp } from '../context/AppContext';
import {
  computeSmokeTestStats,
  runAllDeviceSmokeTests,
  runDeviceSmokeTest,
  smokeResultLabelJa,
  type SmokeTestResultStatus,
  type SmokeTestRunLog,
} from '../services/deviceSmokeTestRunner';
import { theme } from '../theme';
import { Button } from './ui/Button';

function resultColor(result: SmokeTestResultStatus): string {
  if (result === 'pass') return theme.colors.success;
  if (result === 'fail') return theme.colors.danger;
  return theme.colors.warning;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

export function DeviceSmokeTestPanel() {
  const { state, degradedMode, killSwitches, twelveDataApiKey, securityWarnings } = useApp();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [latestByTest, setLatestByTest] = useState<Record<string, SmokeTestRunLog>>({});
  const [logs, setLogs] = useState<SmokeTestRunLog[]>([]);

  const ctx = useMemo(
    () => ({
      state,
      degradedMode,
      killSwitches,
      hasTwelveDataKey: Boolean(twelveDataApiKey.trim()),
      securityWarnings,
    }),
    [state, degradedMode, killSwitches, twelveDataApiKey, securityWarnings],
  );

  const stats = useMemo(() => computeSmokeTestStats(logs), [logs]);
  const hasAnyResult = Object.keys(latestByTest).length > 0;

  const appendLog = useCallback((log: SmokeTestRunLog) => {
    setLatestByTest((prev) => ({ ...prev, [log.testId]: log }));
    setLogs((prev) => [log, ...prev]);
  }, []);

  const runOne = useCallback(
    async (testId: string) => {
      setRunningId(testId);
      try {
        const log = await runDeviceSmokeTest(testId, ctx);
        appendLog(log);
      } finally {
        setRunningId(null);
      }
    },
    [appendLog, ctx],
  );

  const runAll = useCallback(async () => {
    setRunningId('all');
    try {
      await runAllDeviceSmokeTests(ctx, appendLog);
    } finally {
      setRunningId(null);
    }
  }, [appendLog, ctx]);

  const busy = runningId != null;

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>実機スモークテスト</Text>
      <Text style={styles.hint}>
        各項目を自動診断します。一部は手動確認が必要な場合 WARNING になります。
      </Text>

      <Button
        label={runningId === 'all' ? '全テスト実行中…' : '全テスト実行'}
        onPress={() => void runAll()}
        disabled={busy}
      />

      {hasAnyResult ? (
        <View style={styles.statsBox}>
          <Text style={styles.statsPrimary}>
            {stats.pass}/{stats.total} PASS
          </Text>
          <Text style={styles.statsSecondary}>成功率 {stats.passRatePct}%</Text>
          {stats.warning > 0 ? (
            <Text style={styles.statsMuted}>WARNING {stats.warning} · FAIL {stats.fail}</Text>
          ) : stats.fail > 0 ? (
            <Text style={styles.statsMuted}>FAIL {stats.fail}</Text>
          ) : null}
        </View>
      ) : null}

      {DEVICE_SMOKE_TEST_CHECKLIST.map((item) => {
        const latest = latestByTest[item.id];
        const itemBusy = runningId === item.id;
        return (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{item.titleJa}</Text>
              {latest ? (
                <Text style={[styles.badge, { color: resultColor(latest.result) }]}>
                  {smokeResultLabelJa(latest.result)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.steps}>{item.stepsJa}</Text>
            {item.noteJa ? <Text style={styles.note}>{item.noteJa}</Text> : null}
            {latest ? (
              <Text style={styles.itemMessage}>{latest.message}</Text>
            ) : null}
            <View style={styles.itemActions}>
              <Button
                label={itemBusy ? '実行中…' : '実行'}
                onPress={() => void runOne(item.id)}
                disabled={busy}
                variant="ghost"
              />
              {latest ? (
                <Text style={styles.itemMeta}>{latest.durationMs}ms</Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {logs.length > 0 ? (
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>実行ログ</Text>
          {logs.map((log, index) => (
            <View key={`${log.testId}-${log.startedAt}-${index}`} style={styles.logRow}>
              <Text style={[styles.logResult, { color: resultColor(log.result) }]}>
                {smokeResultLabelJa(log.result)}
              </Text>
              <View style={styles.logBody}>
                <Text style={styles.logName}>{log.titleJa}</Text>
                <Text style={styles.logTime}>
                  開始 {formatTime(log.startedAt)} → 終了 {formatTime(log.finishedAt)} ({log.durationMs}ms)
                </Text>
                <Text style={styles.logMessage}>{log.message}</Text>
                {log.error ? <Text style={styles.logError}>エラー: {log.error}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  statsBox: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    gap: 2,
  },
  statsPrimary: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  statsSecondary: { color: theme.colors.success, fontWeight: '600', fontSize: theme.fontSize.sm },
  statsMuted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  item: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { color: theme.colors.text, fontWeight: '600', flex: 1, marginRight: theme.spacing.sm },
  badge: { fontWeight: '700', fontSize: theme.fontSize.sm },
  steps: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  note: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 18 },
  itemMessage: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 18 },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemMeta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  logSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  logTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  logRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  logResult: { width: 72, fontWeight: '700', fontSize: theme.fontSize.sm },
  logBody: { flex: 1, gap: 2 },
  logName: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  logTime: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  logMessage: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  logError: { color: theme.colors.danger, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
