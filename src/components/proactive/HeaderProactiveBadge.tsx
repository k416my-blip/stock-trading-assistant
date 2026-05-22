import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProactiveConciergeOptional } from '../../context/ProactiveConciergeContext';
import type { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

export function HeaderProactiveBadge() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const proactive = useProactiveConciergeOptional();
  const count = proactive?.unreadCount ?? 0;

  if (count <= 0) return null;

  return (
    <Pressable
      onPress={() => navigation.navigate('ProactiveSuggestions')}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`未確認AI提案 ${count}件`}
    >
      <Text style={styles.label}>AI</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  pressed: { opacity: 0.85 },
  label: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
  badge: {
    marginLeft: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
});
