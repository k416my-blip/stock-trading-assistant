import { StyleSheet, Text } from 'react-native';
import { NO_AUTO_TRADE_DISCLAIMER } from '../constants/disclaimers';
import { theme } from '../theme';
import { Card } from './ui/Card';

export function DisclaimerBanner() {
  return (
    <Card style={styles.card}>
      <Text style={styles.text}>{NO_AUTO_TRADE_DISCLAIMER}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: theme.colors.warning, backgroundColor: theme.colors.surfaceElevated },
  text: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
});
