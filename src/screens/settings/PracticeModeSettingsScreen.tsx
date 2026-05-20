import { StyleSheet, Text } from 'react-native';
import { ModeToggle } from '../../components/ModeToggle';
import { PracticeModeBadge } from '../../components/PracticeModeBadge';
import { TermHint } from '../../components/TermHint';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { PRACTICE_SUBTITLE } from '../../constants/practice';
import {
  LIVE_ANALYSIS_MODE_DESCRIPTION_JA,
  PRACTICE_MODE_DESCRIPTION_JA,
} from '../../constants/platformClarification';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

export function PracticeModeSettingsScreen() {
  const { state, setAppMode, isPractice } = useApp();

  return (
    <Screen title="練習モード設定" subtitle="練習シミュレーションか実運用分析か">
      <Card>
        <ModeToggle mode={state.appMode} onChange={setAppMode} />
        <TermHint term="practiceMode" />
        {isPractice ? (
          <>
            <PracticeModeBadge />
            <Text style={styles.hint}>{PRACTICE_MODE_DESCRIPTION_JA}</Text>
            <Text style={styles.hint}>{PRACTICE_SUBTITLE}</Text>
          </>
        ) : (
          <Text style={styles.hint}>{LIVE_ANALYSIS_MODE_DESCRIPTION_JA}</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.sm },
});
