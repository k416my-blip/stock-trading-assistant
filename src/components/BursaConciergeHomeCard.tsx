import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from './ui/Card';
import { useBursaConcierge } from '../context/BursaConciergeContext';
import type { MainTabParamList } from '../navigation/types';
import {
  formatMissingDataLabel,
  formatNotificationMessageDisplay,
  formatNotificationTitleDisplay,
  formatTodayActionDisplay,
} from '../utils/bursaNotificationDisplay';
import { theme } from '../theme';

export function BursaConciergeHomeCard() {
  const { t } = useTranslation('concierge');
  const { t: tAlerts } = useTranslation('alerts');
  const { report, loading } = useBursaConcierge();
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  if (loading && !report) return null;

  const top = report?.topNotification;
  if (!top && !report?.todayActionJa) return null;

  return (
    <Card>
      <Text style={styles.heading}>{t('homeCardHeading')}</Text>
      {top ? (
        <>
          <Text style={styles.stars}>{top.importanceJa}</Text>
          <Text style={styles.title}>
            {formatNotificationTitleDisplay(
              {
                titleJa: top.titleJa,
                triggerKindJa: top.triggerKindJa,
                stockCodeJa: top.stockCodeJa,
              },
              tAlerts,
            )}
          </Text>
          <Text style={styles.message}>
            {formatNotificationMessageDisplay(top.messageJa, tAlerts, top.stockCodeJa)}
          </Text>
        </>
      ) : (
        <Text style={styles.message}>{formatMissingDataLabel(tAlerts)}</Text>
      )}
      {report?.todayActionJa ? (
        <Text style={styles.today}>
          {formatTodayActionDisplay(report.todayActionJa, tAlerts)}
        </Text>
      ) : null}
      <Pressable
        style={styles.link}
        onPress={() => tabNav.navigate('AiNotifications')}
      >
        <Text style={styles.linkText}>
          {t('homeCardViewAlerts')}
          {report?.unreadCount
            ? ` ${t('homeCardUnreadCount', { count: report.unreadCount })}`
            : ''}
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
