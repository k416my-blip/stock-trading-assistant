import { StyleSheet, Text } from 'react-native';
import { RISK_WARNING_BODY } from '../constants/disclaimers';
import { BROKER_NAME } from '../constants/rakutenTrade';
import { TermHint } from '../components/TermHint';
import { BeginnerWarningBanner } from '../components/BeginnerWarningBanner';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { theme } from '../theme';

export function RiskWarningScreen() {
  return (
    <Screen title="リスク告知" subtitle={BROKER_NAME}>
      <BeginnerWarningBanner />
      <TermHint term="risk" />
      <Card>
        <Text style={styles.body}>{RISK_WARNING_BODY}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: theme.colors.text, fontSize: theme.fontSize.md, lineHeight: 24 },
});
