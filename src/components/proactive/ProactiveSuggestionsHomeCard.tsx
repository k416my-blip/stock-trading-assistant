import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DISABLE_AI_CONCIERGE_FOR_TOUCH_TEST } from '../../constants/aiConciergeDevFlags';
import { PROACTIVE_UI } from '../../constants/proactiveConcierge';
import { useProactiveConcierge } from '../../context/ProactiveConciergeContext';
import { useAiConcierge } from '../../context/AiConciergeContext';
import type { RootStackParamList } from '../../navigation/types';
import { isUnhandledProactiveStatus } from '../../types/proactiveSuggestion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProactiveSuggestionCard } from './ProactiveSuggestionCard';
import { theme } from '../../theme';

export function ProactiveSuggestionsHomeCard() {
  if (DISABLE_AI_CONCIERGE_FOR_TOUCH_TEST) return null;
  return <ProactiveSuggestionsHomeCardContent />;
}

function ProactiveSuggestionsHomeCardContent() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    suggestions,
    unreadCount,
    resumeSummaryJa,
    showResumeBanner,
    dismissResumeBanner,
    acknowledge,
    seeLater,
    voiceResumePromptVisible,
    acceptVoiceResume,
    dismissVoiceResume,
  } = useProactiveConcierge();
  const { openPanel } = useAiConcierge();

  const pending = suggestions.filter((s) => isUnhandledProactiveStatus(s.status));
  const top = pending[0];

  if (unreadCount === 0 && !showResumeBanner) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{PROACTIVE_UI.homeCardTitle}</Text>
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        ) : null}
      </View>

      {voiceResumePromptVisible ? (
        <View style={styles.resumeBlock}>
          <Text style={styles.resumeTitle}>{PROACTIVE_UI.voiceResumePrompt}</Text>
          <Button label="読み上げる" onPress={acceptVoiceResume} />
          <Button label="スキップ" onPress={dismissVoiceResume} variant="ghost" />
        </View>
      ) : null}

      {showResumeBanner && resumeSummaryJa ? (
        <View style={styles.resumeBlock}>
          <Text style={styles.resumeTitle}>{PROACTIVE_UI.resumeBannerTitle}</Text>
          <Text style={styles.resumeBody}>{resumeSummaryJa}</Text>
          <Button label="閉じる" onPress={dismissResumeBanner} variant="ghost" />
        </View>
      ) : null}

      {top ? (
        <ProactiveSuggestionCard
          suggestion={top}
          compact
          onAcknowledge={() => void acknowledge(top.id)}
          onSeeLater={() => void seeLater(top.id)}
          onDetail={() => {
            openPanel({ focusSuggestionId: top.id });
          }}
        />
      ) : null}

      <Button
        label="一覧を見る"
        onPress={() => navigation.navigate('ProactiveSuggestions')}
        variant="ghost"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm, borderColor: theme.colors.primary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  resumeBlock: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    gap: 6,
  },
  resumeTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.sm },
  resumeBody: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
