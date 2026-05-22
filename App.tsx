import './src/wdyr';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AiConciergeOverlay } from './src/components/concierge/AiConciergeOverlay';
import { ProactiveConciergeProvider } from './src/context/ProactiveConciergeContext';
import { AiConciergeProvider } from './src/context/AiConciergeContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { PerformanceCostProvider } from './src/context/PerformanceCostContext';
import { ProductionStabilityProvider } from './src/context/ProductionStabilityContext';
import { PerformanceCostBanner } from './src/components/PerformanceCostBanner';
import { UrgencySignalProvider } from './src/context/UrgencySignalContext';
import { useNotificationMonitor } from './src/hooks/useNotificationMonitor';
import { useProactiveBackgroundMonitor } from './src/hooks/useProactiveBackgroundMonitor';
import { useEffect } from 'react';
import { runDeferredBootTasks } from './src/services/deferredBoot';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/theme';
import { areNotificationsSupported } from './src/utils/runtimeEnvironment';

function AppShell() {
  const { loading } = useApp();
  useNotificationMonitor(!loading && areNotificationsSupported());
  useProactiveBackgroundMonitor(!loading);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      void runDeferredBootTasks();
    }, 400);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <PerformanceCostBanner />
      <RootNavigator />
      <AiConciergeOverlay />
      <StatusBar style="light" />
    </>
  );
}

function AppWithBoundary() {
  const { enterSafeBootMode } = useApp();
  return (
    <AppErrorBoundary onEnterSafeMode={enterSafeBootMode}>
      <AppShell />
    </AppErrorBoundary>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <PerformanceCostProvider>
          <ProductionStabilityProvider>
            <UrgencySignalProvider>
              <ProactiveConciergeProvider>
                <AiConciergeProvider>
                  <AppWithBoundary />
                </AiConciergeProvider>
              </ProactiveConciergeProvider>
            </UrgencySignalProvider>
          </ProductionStabilityProvider>
        </PerformanceCostProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
