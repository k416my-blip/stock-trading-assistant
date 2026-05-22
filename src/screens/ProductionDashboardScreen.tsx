import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { SelectableText } from '../components/ui/SelectableText';
import { PRODUCTION_UI_LABELS_JA } from '../constants/productionStability';
import { useProductionStability } from '../context/ProductionStabilityContext';
import { theme } from '../theme';

export function ProductionDashboardScreen() {
  const { bundle, refreshBundle } = useProductionStability();
  const [loading, setLoading] = useState(false);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await refreshBundle();
    } finally {
      setLoading(false);
    }
  }, [refreshBundle]);

  const snap = bundle?.snapshot;
  const readiness = bundle?.readiness ?? [];

  return (
    <Screen
      title={PRODUCTION_UI_LABELS_JA.dashboardTitle}
      subtitle="API · memory · queue · AI load · render（開発監視）"
    >
      <Pressable onPress={() => void onRefresh()} style={styles.refreshBtn}>
        <Text style={styles.refreshText}>{loading ? '更新中…' : '指標を更新'}</Text>
      </Pressable>

      {!snap ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card>
            <Text style={styles.sectionTitle}>{PRODUCTION_UI_LABELS_JA.emergency}</Text>
            <SelectableText style={styles.line}>
              レベル {snap.emergencyLevel}
              {snap.emergencyReasonJa ? ` — ${snap.emergencyReasonJa}` : ''}
            </SelectableText>
            <SelectableText style={styles.line}>
              バックグラウンドAI停止: {snap.backgroundAiPaused ? 'はい' : 'いいえ'}
            </SelectableText>
            <SelectableText style={styles.muted}>{bundle?.longSessionNoteJa}</SelectableText>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>{PRODUCTION_UI_LABELS_JA.profiler}</Text>
            <SelectableText style={styles.line}>
              描画 {snap.profiler.avgRenderMs ?? '—'} ms (最後 {snap.profiler.lastRenderMs ?? '—'})
            </SelectableText>
            <SelectableText style={styles.line}>
              API {snap.profiler.avgApiLatencyMs ?? '—'} ms · heap{' '}
              {snap.profiler.estimatedHeapMB ?? '—'} MB
            </SelectableText>
            <SelectableText style={styles.line}>{snap.tokenBudgetJa}</SelectableText>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>{PRODUCTION_UI_LABELS_JA.circuits}</Text>
            {snap.circuits.length === 0 ? (
              <SelectableText style={styles.muted}>全APIクローズ</SelectableText>
            ) : (
              snap.circuits.map((c) => (
                <SelectableText key={c.provider} style={styles.line}>
                  {c.provider}: {c.state} (失敗 {c.consecutiveFailures})
                </SelectableText>
              ))
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>{PRODUCTION_UI_LABELS_JA.queues}</Text>
            <SelectableText style={styles.line}>
              自発キュー {snap.proactiveQueueSize} · トリム {snap.proactiveQueueTrimmed}
            </SelectableText>
            <SelectableText style={styles.line}>
              通知フラッドブロック {snap.notificationFloodBlocked} · 古い応答ブロック{' '}
              {snap.staleAsyncResponsesBlocked}
            </SelectableText>
            <SelectableText style={styles.line}>
              描画予算ブロック {snap.renderBudgetBlocked} · interval {snap.registeredIntervals} ·
              listener {snap.registeredListeners}
            </SelectableText>
          </Card>

          {snap.effectLoopWarnings.length > 0 ? (
            <Card>
              <Text style={styles.sectionTitle}>Effect loop 警告</Text>
              {snap.effectLoopWarnings.map((w) => (
                <SelectableText key={w} style={styles.warn}>
                  {w}
                </SelectableText>
              ))}
            </Card>
          ) : null}

          {snap.stateAuditFindings.length > 0 ? (
            <Card>
              <Text style={styles.sectionTitle}>State audit</Text>
              {snap.stateAuditFindings.map((f) => (
                <SelectableText key={f.id} style={styles.line}>
                  [{f.severity}] {f.labelJa}: {f.detailJa}
                </SelectableText>
              ))}
            </Card>
          ) : null}

          <Card>
            <Text style={styles.sectionTitle}>{PRODUCTION_UI_LABELS_JA.readiness}</Text>
            {readiness.map((r) => (
              <View key={r.id} style={styles.checkRow}>
                <Text style={[styles.checkMark, r.passed ? styles.pass : styles.fail]}>
                  {r.passed ? '✓' : '✗'}
                </Text>
                <View style={styles.checkBody}>
                  <Text style={styles.checkLabel}>{r.labelJa}</Text>
                  <SelectableText style={styles.muted}>{r.detailJa}</SelectableText>
                </View>
              </View>
            ))}
          </Card>

          {bundle?.dependencyHintsJa.length ? (
            <Card>
              <Text style={styles.sectionTitle}>依存監査ヒント</Text>
              {bundle.dependencyHintsJa.map((h) => (
                <SelectableText key={h} style={styles.muted}>
                  · {h}
                </SelectableText>
              ))}
            </Card>
          ) : null}

          {snap.costDashboard ? (
            <Card>
              <Text style={styles.sectionTitle}>APIコスト（24h）</Text>
              <SelectableText style={styles.muted}>{snap.costDashboard.summaryJa}</SelectableText>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  refreshBtn: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  refreshText: { color: theme.colors.primary, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  line: { fontSize: 13, color: theme.colors.text, marginBottom: 4 },
  muted: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 4 },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: 4 },
  checkRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  checkMark: { fontSize: 16, fontWeight: '700', width: 20 },
  pass: { color: theme.colors.success },
  fail: { color: theme.colors.danger },
  checkBody: { flex: 1 },
  checkLabel: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
});
