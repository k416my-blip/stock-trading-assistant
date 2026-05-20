import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { BeginnerWarningBanner } from '../components/BeginnerWarningBanner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import {
  ALERT_TYPE_LABEL,
  CUSTOM_SOUND_NOTE,
  NOTIFICATION_BEGINNER_NOTE,
  NOTIFICATION_DISCLAIMER,
  NOTIFICATION_SOUND_LABEL,
} from '../constants/notifications';
import { useApp } from '../context/AppContext';
import type { NotificationSound } from '../types';
import { recordListKey } from '../utils/reactKeys';
import { theme } from '../theme';

const SOUND_OPTIONS: NotificationSound[] = ['default', 'bell', 'chime', 'warning', 'silent'];

type ToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      />
    </View>
  );
}

export function NotificationSettingsScreen() {
  const {
    state,
    updateNotificationSettings,
    sendTestNotification,
    clearNotificationHistory,
    requestNotificationsPermission,
  } = useApp();
  const settings = state.notificationSettings;
  const [testing, setTesting] = useState(false);

  const onTest = async () => {
    setTesting(true);
    const ok = await requestNotificationsPermission();
    if (!ok) {
      Alert.alert('通知が無効です', '端末の設定で通知を許可してください。');
      setTesting(false);
      return;
    }
    await sendTestNotification();
    setTesting(false);
  };

  return (
    <Screen title="通知設定" subtitle="アラーム・通知音・バイブレーション">
      <BeginnerWarningBanner />
      <Card>
        <Text style={styles.note}>{NOTIFICATION_BEGINNER_NOTE}</Text>
        <Text style={styles.disclaimer}>{NOTIFICATION_DISCLAIMER}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>通知の種類</Text>
        <ToggleRow
          label="買付候補の通知"
          value={settings.notifyBuyCandidate}
          onValueChange={(v) => updateNotificationSettings({ notifyBuyCandidate: v })}
        />
        <ToggleRow
          label="売却候補の通知"
          value={settings.notifySellCandidate}
          onValueChange={(v) => updateNotificationSettings({ notifySellCandidate: v })}
        />
        <ToggleRow
          label="損切り推奨の通知"
          value={settings.notifyStopLoss}
          onValueChange={(v) => updateNotificationSettings({ notifyStopLoss: v })}
        />
        <ToggleRow
          label="利確推奨の通知"
          value={settings.notifyTakeProfit}
          onValueChange={(v) => updateNotificationSettings({ notifyTakeProfit: v })}
        />
        <ToggleRow
          label="市場開始前の通知"
          value={settings.notifyMarketOpenBefore}
          onValueChange={(v) => updateNotificationSettings({ notifyMarketOpenBefore: v })}
        />
        <ToggleRow
          label="市場終了前の通知"
          value={settings.notifyMarketCloseBefore}
          onValueChange={(v) => updateNotificationSettings({ notifyMarketCloseBefore: v })}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>通知音</Text>
        <Text style={styles.subLabel}>アラーム</Text>
        <View style={styles.chipRow}>
          {SOUND_OPTIONS.map((sound) => (
            <Pressable
              key={sound}
              onPress={() => updateNotificationSettings({ sound })}
              style={[styles.chip, settings.sound === sound && styles.chipActive]}
            >
              <Text style={[styles.chipText, settings.sound === sound && styles.chipTextActive]}>
                {NOTIFICATION_SOUND_LABEL[sound]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{CUSTOM_SOUND_NOTE}</Text>
      </Card>

      <Card>
        <ToggleRow
          label="バイブレーション"
          value={settings.vibrationEnabled}
          onValueChange={(v) => updateNotificationSettings({ vibrationEnabled: v })}
        />
      </Card>

      <Button label={testing ? '送信中…' : 'テスト通知'} onPress={onTest} disabled={testing} />

      <Card>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>通知履歴</Text>
          {state.notificationHistory.length > 0 ? (
            <Pressable onPress={clearNotificationHistory}>
              <Text style={styles.clearLink}>クリア</Text>
            </Pressable>
          ) : null}
        </View>
        {state.notificationHistory.length === 0 ? (
          <Text style={styles.muted}>まだ通知履歴はありません</Text>
        ) : (
          state.notificationHistory.slice(0, 20).map((item, index) => (
            <View key={recordListKey(item.id, index)} style={styles.historyItem}>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.historyMeta}>
                {ALERT_TYPE_LABEL[item.alertType]} · {new Date(item.sentAt).toLocaleString('ja-JP')}
              </Text>
              <Text style={styles.historyBody}>{item.body}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  disclaimer: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  sectionTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md, marginBottom: theme.spacing.sm },
  subLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  toggleLabel: { color: theme.colors.text, flex: 1, paddingRight: theme.spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: theme.fontSize.sm },
  chipTextActive: { color: '#fff' },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, lineHeight: 18 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearLink: { color: theme.colors.primary, fontSize: theme.fontSize.sm },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  historyItem: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  historyTitle: { color: theme.colors.text, fontWeight: '600' },
  historyMeta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  historyBody: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 18 },
});
