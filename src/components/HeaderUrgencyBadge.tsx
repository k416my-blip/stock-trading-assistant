import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colorForUrgencyLevel } from '../constants/urgencyColors';
import { useUrgencySignals } from '../context/UrgencySignalContext';
import { buildHeaderSignalDisplay } from '../services/urgencySignalDisplay';
import { HEADER_NO_ACTIVE_SIGNAL_JA } from '../types/urgencySignal';
import type { MainTabParamList } from '../navigation/types';
import { theme } from '../theme';

export function HeaderUrgencyBadge() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { activeSignal, focusSignal, nowMs } = useUrgencySignals();
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!activeSignal || activeSignal.level !== 'critical') {
      pulseOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.35, duration: 550, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activeSignal, pulseOpacity]);

  if (!activeSignal) {
    return (
      <View style={styles.emptyWrap} accessibilityRole="text">
        <Text style={styles.emptyText} numberOfLines={1}>
          {HEADER_NO_ACTIVE_SIGNAL_JA}
        </Text>
      </View>
    );
  }

  const color = colorForUrgencyLevel(activeSignal.level);
  const display = buildHeaderSignalDisplay(activeSignal, nowMs);
  const a11y = `${display.levelLabel} ${display.titleLine} ${display.actionLine} ${display.remainingLine}`;

  return (
    <Pressable
      onPress={() => {
        navigation.navigate('Home');
        setTimeout(() => focusSignal(activeSignal), 120);
      }}
      style={({ pressed }) => [styles.wrap, { borderLeftColor: color }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`重要シグナル: ${a11y}`}
    >
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: pulseOpacity }]} />
      <View style={styles.textCol}>
        <Text style={[styles.levelLine, { color }]} numberOfLines={1}>
          {display.levelLabel}
        </Text>
        <Text style={styles.titleLine} numberOfLines={1}>
          {display.titleLine}
        </Text>
        <Text style={styles.actionLine} numberOfLines={1}>
          {display.actionLine}
        </Text>
        {display.remainingLine ? (
          <Text style={[styles.remainingLine, { color }]} numberOfLines={1}>
            {display.remainingLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 220,
    marginRight: theme.spacing.xs,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 4,
    borderLeftWidth: 3,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  emptyWrap: {
    maxWidth: 160,
    marginRight: theme.spacing.xs,
    paddingVertical: 2,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  pressed: { opacity: 0.88 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textCol: { flex: 1, minWidth: 0 },
  levelLine: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  titleLine: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  actionLine: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  remainingLine: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
