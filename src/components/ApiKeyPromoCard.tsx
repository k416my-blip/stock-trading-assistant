import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { API_KEY_SETTINGS } from '../constants/apiSettings';
import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

type Props = {
  onOpenApiSettings: () => void;
  compact?: boolean;
};

export function ApiKeyPromoCard({ onOpenApiSettings, compact = false }: Props) {
  const openTwelveData = () => {
    void Linking.openURL(API_KEY_SETTINGS.twelveDataUrl);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="settings" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>APIキー設定</Text>
          <Text style={styles.hint}>{API_KEY_SETTINGS.needKeyHint}</Text>
        </View>
      </View>

      {!compact ? (
        <>
          <Text style={styles.steps}>{API_KEY_SETTINGS.beginnerSteps}</Text>
          <Text style={styles.note}>{MARKET_DATA_MESSAGES.autoPriceNote}</Text>
        </>
      ) : null}

      <Button label={API_KEY_SETTINGS.openSettingsButton} onPress={onOpenApiSettings} />
      <Button label={API_KEY_SETTINGS.getKeyButton} onPress={openTwelveData} variant="ghost" />
    </Card>
  );
}

type SettingsMenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

export function SettingsMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  testID,
  accessibilityLabel,
}: SettingsMenuRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.menuBody}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: theme.colors.primary, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  hint: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 18 },
  steps: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: theme.spacing.md,
  },
  note: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  menuRowPressed: { opacity: 0.85 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: { flex: 1 },
  menuTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  menuSubtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
