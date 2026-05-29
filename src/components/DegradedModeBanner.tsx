import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { buildDegradedBannerContent } from '../services/degradedModePresentation';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function DegradedModeBanner() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    degradedMode,
    bootMode,
    securityWarnings,
    recoveryRecommendations,
    killSwitches,
  } = useApp();

  const content = useMemo(
    () =>
      buildDegradedBannerContent({
        bootMode,
        securityWarnings,
        recoveryRecommendations,
        readOnlyMode: killSwitches.readOnlyMode,
        operationalDegraded: degradedMode,
      }),
    [
      bootMode,
      degradedMode,
      killSwitches.readOnlyMode,
      recoveryRecommendations,
      securityWarnings,
    ],
  );

  if (!content.visible) return null;

  const isInfo = content.tone === 'info';
  const borderColor = isInfo ? theme.colors.primary : theme.colors.warning;
  const backgroundColor = isInfo ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const iconName = isInfo ? 'construct-outline' : 'warning';

  const body = (
    <>
      <Ionicons name={iconName} size={18} color={borderColor} />
      <View style={styles.textCol}>
        <Text style={styles.title}>{content.headline}</Text>
        <Text style={styles.hint} numberOfLines={3}>
          {content.hint}
        </Text>
        {content.reasons.map((reason) => (
          <Text key={reason} style={styles.reasonLine} numberOfLines={2}>
            · {reason}
          </Text>
        ))}
      </View>
      {content.showDiagnosticsLink ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  if (!content.showDiagnosticsLink) {
    return (
      <View style={[styles.banner, { borderColor, backgroundColor }]} accessibilityRole="text">
        {body}
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.banner, { borderColor, backgroundColor }]}
      onPress={() => navigation.navigate('StartupDiagnostics')}
      accessibilityRole="button"
      accessibilityLabel={`${content.headline}. ${content.hint}`}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  textCol: { flex: 1 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.sm },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2, lineHeight: 18 },
  reasonLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
    lineHeight: 18,
  },
});
