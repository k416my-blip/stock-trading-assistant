import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from './ui/Card';
import { useBursaConcierge } from '../context/BursaConciergeContext';
import type { MainTabParamList } from '../navigation/types';
import { CONCIERGE_NOTIFY_MISSING_JA } from '../services/bursa/bursaConciergeNotificationService';
import { theme } from '../theme';

export function BursaConciergeHomeCard() {
  const { report, loading } = useBursaConcierge();
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  if (loading && !report) return null;

  const top = report?.topNotification;
  if (!top && !report?.todayActionJa) return null;

  return (
    <Card>
      <Text style={styles.heading}>AIコンシェルジュ — 最重要通知</Text>
      {top ? (
        <>
          <Text style={styles.stars}>{top.importanceJa}</Text>
          <Text style={styles.title}>{top.titleJa}</Text>
          <Text style={styles.message}>{top.messageJa}</Text>
        </>
      ) : (
        <Text style={styles.message}>{CONCIERGE_NOTIFY_MISSING_JA}</Text>
      )}
      {report?.todayActionJa ? (
        <Text style={styles.today}>{report.todayActionJa}</Text>
      ) : null}
      <Pressable
        style={styles.link}
        onPress={() => tabNav.navigate('AiNotifications')}
      >
        <Text style={styles.linkText}>
          AI通知を見る{report?.unreadCount ? `（${report.unreadCount}件未読）` : ''}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: '800',
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: 6,
  },
  stars: { fontSize: 16, color: theme.colors.warning, marginBottom: 4 },
  title: { fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  message: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20 },
  today: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  link: { marginTop: theme.spacing.sm },
  linkText: { color: theme.colors.primary, fontWeight: '700' },
});
