import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function DegradedModeBanner() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { degradedMode, bootMode, securityWarnings, recoveryRecommendations } = useApp();

  if (!degradedMode) return null;

  const headline =
    bootMode === 'safe'
      ? '安全モード — 一部機能が制限されています'
      : securityWarnings.length > 0
        ? '保存データに警告があります'
        : '診断: 注意が必要なイベントがあります';

  const hint = recoveryRecommendations[0] ?? 'タップして起動診断を確認';

  return (
    <Pressable
      style={styles.banner}
      onPress={() => navigation.navigate('StartupDiagnostics')}
      accessibilityRole="button"
    >
      <Ionicons name="warning" size={18} color={theme.colors.warning} />
      <View style={styles.textCol}>
        <Text style={styles.title}>{headline}</Text>
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  textCol: { flex: 1 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.sm },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
