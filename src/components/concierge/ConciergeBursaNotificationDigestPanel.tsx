import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBursaConcierge } from '../../context/BursaConciergeContext';
import { useAppUxMode } from '../../context/AppUxModeContext';
import type { MainTabParamList } from '../../navigation/types';
import { Card } from '../ui/Card';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

export function ConciergeBursaNotificationDigestPanel() {
  const { report, loading } = useBursaConcierge();
  const { isBeginnerMode } = useAppUxMode();
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const latestThree = useMemo(
    () => (report?.notifications ?? []).slice(0, 3),
    [report?.notifications],
  );

  if (loading && !report) return null;
  if (!report && latestThree.length === 0) return null;

  const unread = report?.unreadCount ?? 0;

  return (
    <Card style={styles.card} testID="concierge-bursa-notification-digest">
      <Text style={styles.title}>通知ダイジェスト</Text>
      <Text style={styles.unread} testID="concierge-bursa-unread-count">
        未読 {unread} 件
      </Text>
      {latestThree.length === 0 ? (
        <Text style={styles.empty}>新しい通知はありません</Text>
      ) : (
        latestThree.map((n) => (
          <View key={n.id} style={styles.row} testID={`concierge-bursa-digest-${n.id}`}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {n.titleJa}
            </Text>
            <SelectableText style={styles.rowSummary} numberOfLines={2}>
              {n.messageJa}
            </SelectableText>
          </View>
        ))
      )}
      {!isBeginnerMode ? (
        <Pressable
          style={styles.linkWrap}
          onPress={() => tabNav.navigate('AiNotifications')}
          accessibilityRole="button"
        >
          <Text style={styles.link}>すべての通知を見る</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  unread: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  empty: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  rowTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  rowSummary: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
    lineHeight: 18,
  },
  linkWrap: { marginTop: theme.spacing.sm },
  link: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.sm },
});
