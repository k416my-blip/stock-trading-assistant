import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { SelectableText } from '../components/ui/SelectableText';
import { useBursaConcierge } from '../context/BursaConciergeContext';
import { useBursaMaterial } from '../context/BursaMaterialContext';
import type { RootStackParamList } from '../navigation/types';
import { CONCIERGE_NOTIFY_MISSING_JA } from '../services/bursa/bursaConciergeNotificationService';
import { materialQualityForStockCode } from '../services/bursa/bursaMaterialAnalysisService';
import type { MaterialAnalysisReport } from '../services/bursa/bursaMaterialAnalysisService';
import { theme } from '../theme';

function NotificationQualityBlock({
  stockCode,
  materialReport,
}: {
  stockCode: string;
  materialReport: MaterialAnalysisReport | null;
}) {
  const quality = materialQualityForStockCode(materialReport, stockCode);
  if (!quality) return null;
  return (
    <View style={styles.qualityBlock}>
      <Text style={styles.qualityLine}>
        材料品質 {quality.stars} {quality.labelJa}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function AiNotificationsScreen() {
  const { report, loading, error, markRead, markAllRead, setSoundEnabled, refresh } =
    useBursaConcierge();
  const { report: materialReport } = useBursaMaterial();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (loading && !report) {
    return (
      <Screen>
        <Text style={styles.loading}>AI通知を生成中…</Text>
      </Screen>
    );
  }

  if (error || !report) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? CONCIERGE_NOTIFY_MISSING_JA}</Text>
      </Screen>
    );
  }

  const holdings = report.notifications.filter((n) => n.isHolding);
  const others = report.notifications.filter((n) => !n.isHolding);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} testID="ai-notifications-screen">
        <Text style={styles.pageTitle}>AI通知</Text>
        <Text style={styles.liveTag}>{report.dataSourceLabel}</Text>

        <View style={styles.soundRow}>
          <Text style={styles.soundLabel}>通知音</Text>
          <Switch
            value={report.soundEnabled}
            onValueChange={(v) => void setSoundEnabled(v)}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <Section title="【今日やるべきこと】">
          <Text style={styles.todayAction}>{report.todayActionJa}</Text>
          {report.todayReasonsJa.map((r, i) => (
            <Text key={`reason-${i}`} style={styles.reason}>
              理由: {r}
            </Text>
          ))}
        </Section>

        <Section title={`【保有銘柄通知】${holdings.length}件`}>
          {holdings.length === 0 ? (
            <Text style={styles.empty}>保有銘柄の通知なし</Text>
          ) : (
            holdings.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.card, !n.isRead && styles.unread]}
                onPress={() => {
                  void markRead(n.id);
                  if (n.stockCodeJa !== CONCIERGE_NOTIFY_MISSING_JA) {
                    navigation.navigate('StockReport', {
                      symbol: n.stockCodeJa,
                      market: 'bursa',
                    });
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.importance}>{n.importanceJa}</Text>
                  <Text style={styles.category}>{n.categoryJa}</Text>
                </View>
                <Text style={styles.title}>{n.titleJa}</Text>
                <Text style={styles.message}>{n.messageJa}</Text>
                {n.stockCodeJa !== CONCIERGE_NOTIFY_MISSING_JA ? (
                  <NotificationQualityBlock
                    stockCode={n.stockCodeJa}
                    materialReport={materialReport}
                  />
                ) : null}
                <Text style={styles.meta}>{n.createdAtJa}</Text>
              </Pressable>
            ))
          )}
        </Section>

        <Section title={`【その他の通知】${others.length}件`}>
          {others.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.card, !n.isRead && styles.unread]}
              onPress={() => void markRead(n.id)}
            >
              <Text style={styles.importance}>{n.importanceJa}</Text>
              <Text style={styles.title}>{n.titleJa}</Text>
              <Text style={styles.message}>{n.messageJa}</Text>
              {n.stockCodeJa !== CONCIERGE_NOTIFY_MISSING_JA ? (
                <NotificationQualityBlock
                  stockCode={n.stockCodeJa}
                  materialReport={materialReport}
                />
              ) : null}
            </Pressable>
          ))}
        </Section>

        <Section title="【通知履歴】">
          <Pressable onPress={() => void markAllRead()}>
            <Text style={styles.markAll}>すべて既読にする（{report.unreadCount}件未読）</Text>
          </Pressable>
          {report.notifications.slice(0, 40).map((n) => (
            <View key={`hist-${n.id}`} style={styles.histRow}>
              <SelectableText style={styles.histText}>
                {n.createdAtJa} · {n.stockCodeJa} · {n.triggerKindJa} ·{' '}
                {n.isRead ? '既読' : '未読'}
              </SelectableText>
            </View>
          ))}
        </Section>

        <Pressable style={styles.refreshBtn} onPress={() => void refresh()}>
          <Text style={styles.refreshText}>再計算（Phase6–9）</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 },
  loading: { padding: theme.spacing.lg, color: theme.colors.textMuted },
  pageTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  liveTag: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  soundLabel: { color: theme.colors.text, fontWeight: '600' },
  section: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  todayAction: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  reason: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 4 },
  card: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  unread: { borderColor: theme.colors.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  importance: { fontSize: 14, color: theme.colors.warning, fontWeight: '700' },
  category: { fontSize: 12, color: theme.colors.textMuted },
  title: { fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  message: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20 },
  meta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  empty: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  histRow: { marginBottom: 6 },
  histText: { fontSize: 11, color: theme.colors.textMuted },
  markAll: { color: theme.colors.primary, fontWeight: '700', marginBottom: theme.spacing.sm },
  refreshBtn: {
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  refreshText: { color: theme.colors.primary, fontWeight: '700' },
  qualityBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  qualityLine: { fontSize: theme.fontSize.sm, color: theme.colors.warning, fontWeight: '600' },
  qualitySource: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginLeft: 8 },
  error: { color: theme.colors.danger, padding: theme.spacing.md },
});

export default AiNotificationsScreen;
