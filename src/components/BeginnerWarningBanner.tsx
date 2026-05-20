import { StyleSheet, Text } from 'react-native';
import { BEGINNER_TRADE_WARNING } from '../constants/disclaimers';
import { theme } from '../theme';
import { Card } from './ui/Card';

export function BeginnerWarningBanner() {
  return (
    <Card style={styles.card}>
      <Text style={styles.text}>{BEGINNER_TRADE_WARNING}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: theme.colors.warning, backgroundColor: theme.colors.surfaceElevated },
  text: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
});
