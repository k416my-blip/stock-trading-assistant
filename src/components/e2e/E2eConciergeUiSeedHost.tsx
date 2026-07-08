import { Pressable, StyleSheet, View } from 'react-native';
import { useAppUxMode } from '../../context/AppUxModeContext';
import {
  persistForceAllocationRoute,
  persistForceAppUxBeginner,
  persistForceEmptyTodayProposals,
} from '../../services/e2eConciergeUiSeed';
import { e2eNavigateToAllocationPlan } from '../../navigation/e2eNavigationRef';

/** 実機 E2E — 全画面から testID で到達可能な seed プローブ（視認不可） */
export function E2eConciergeUiSeedHost() {
  const { setAppUxMode, isBeginnerMode } = useAppUxMode();

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View
        testID={isBeginnerMode ? 'app-ux-mode-active-beginner' : 'app-ux-mode-not-beginner'}
        accessibilityLabel={isBeginnerMode ? 'app-ux-mode-active-beginner' : 'app-ux-mode-not-beginner'}
        accessible
        importantForAccessibility="yes"
        style={styles.probe}
      />
      <Pressable
        testID="e2e-seed-app-ux-beginner"
        accessibilityLabel="e2e-seed-app-ux-beginner"
        accessible
        importantForAccessibility="yes"
        onPress={() => {
          void persistForceAppUxBeginner();
          void setAppUxMode('beginner');
        }}
        style={styles.probe}
      />
      <Pressable
        testID="e2e-seed-empty-today-proposals"
        accessibilityLabel="e2e-seed-empty-today-proposals"
        accessible
        importantForAccessibility="yes"
        onPress={() => {
          void persistForceEmptyTodayProposals();
        }}
        style={styles.probe}
      />
      <Pressable
        testID="concierge-e2e-force-empty-proposals"
        accessibilityLabel="concierge-e2e-force-empty-proposals"
        accessible
        importantForAccessibility="yes"
        onPress={() => {
          void persistForceEmptyTodayProposals();
        }}
        style={styles.probe}
      />
      <Pressable
        testID="e2e-seed-nav-allocation"
        accessibilityLabel="e2e-seed-nav-allocation"
        accessible
        importantForAccessibility="yes"
        onPress={() => {
          void persistForceAllocationRoute();
          e2eNavigateToAllocationPlan();
        }}
        style={styles.probe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    bottom: 180,
    right: 4,
    width: 52,
    height: 240,
    zIndex: 9999,
  },
  probe: {
    width: 48,
    height: 44,
    opacity: 0.02,
  },
});
