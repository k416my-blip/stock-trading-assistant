import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AI_CONCIERGE_BEGINNER_GUIDE_BODY_JA,
  AI_CONCIERGE_BEGINNER_GUIDE_TITLE_JA,
  SETTINGS_ADVANCED_DISCLOSURE_TEST_ID,
} from '../constants/aiConciergeLayout';
import type { RootStackParamList } from '../navigation/types';
import { PlatformClarificationCard } from './PlatformClarificationCard';
import { RiskNoticeOrangeBox } from './RiskNoticeOrangeBox';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SelectableText } from './ui/SelectableText';
import { theme } from '../theme';

/** Settings → 詳細設定 — beginner guide, personal-use notice, risk disclosure */
export function SettingsAdvancedDisclosureSection() {
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.wrap}>
      <Card testID={SETTINGS_ADVANCED_DISCLOSURE_TEST_ID.beginner_guide} style={styles.beginnerCard}>
        <SelectableText style={styles.beginnerTitle}>{AI_CONCIERGE_BEGINNER_GUIDE_TITLE_JA}</SelectableText>
        <SelectableText style={styles.beginnerBody}>{AI_CONCIERGE_BEGINNER_GUIDE_BODY_JA}</SelectableText>
        <Button
          label="初心者ガイドを開く"
          onPress={() => stackNav.navigate('MainTabs', { screen: 'BeginnerGuide' })}
          variant="ghost"
        />
      </Card>
      <View testID={SETTINGS_ADVANCED_DISCLOSURE_TEST_ID.personal_use_card}>
        <PlatformClarificationCard compact personalAssist />
      </View>
      <RiskNoticeOrangeBox testID={SETTINGS_ADVANCED_DISCLOSURE_TEST_ID.risk_notice} />
      <Button
        label="リスク告知（全文）"
        onPress={() => stackNav.navigate('RiskWarning')}
        variant="ghost"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
  beginnerCard: {
    borderColor: theme.colors.border,
  },
  beginnerTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  beginnerBody: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
});
