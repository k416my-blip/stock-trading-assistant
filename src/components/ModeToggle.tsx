import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  APP_MODE_LIVE_ANALYSIS_LABEL,
  APP_MODE_PRACTICE_LABEL,
} from '../constants/platformClarification';
import type { AppMode } from '../types';
import { theme } from '../theme';
import { DEVICE_VERIFY_TEST_IDS } from '../constants/deviceVerifyTestIds';

type Props = {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
};

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange('practice')}
        testID={DEVICE_VERIFY_TEST_IDS.appModePractice}
        accessibilityLabel={DEVICE_VERIFY_TEST_IDS.appModePractice}
        accessible
        style={[styles.chip, mode === 'practice' && styles.practiceActive]}
      >
        <Text style={[styles.text, mode === 'practice' && styles.textActive]}>{APP_MODE_PRACTICE_LABEL}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('manual')}
        testID={DEVICE_VERIFY_TEST_IDS.appModeLiveAnalysis}
        accessibilityLabel={DEVICE_VERIFY_TEST_IDS.appModeLiveAnalysis}
        accessible
        style={[styles.chip, mode === 'manual' && styles.manualActive]}
      >
        <Text style={[styles.text, mode === 'manual' && styles.textActive]}>{APP_MODE_LIVE_ANALYSIS_LABEL}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  practiceActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  manualActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  text: { color: theme.colors.textMuted, fontWeight: '700', fontSize: theme.fontSize.sm },
  textActive: { color: '#fff' },
});
