import './src/wdyr';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AppProvider, useApp } from './src/context/AppContext';
import { PerformanceCostProvider } from './src/context/PerformanceCostContext';
import { ProductionStabilityProvider } from './src/context/ProductionStabilityContext';
import { UrgencySignalProvider } from './src/context/UrgencySignalContext';
import { useNotificationMonitor } from './src/hooks/useNotificationMonitor';
import { lazy, Suspense, useEffect, useState } from 'react';
import { runDeferredBootTasks } from './src/services/deferredBoot';
import { theme } from './src/theme';
import { areNotificationsSupported } from './src/utils/runtimeEnvironment';

const STARTUP_MARK_MS = Date.now();
const INTERACTIVE_RUNTIME_DELAY_MS = 10000;

const LazyInteractiveRuntime = lazy(async () => {
  const [
    { RootNavigator },
    { ProactiveConciergeProvider },
    { AiConciergeProvider },
    { AiConciergeOverlay },
    { PerformanceCostBanner },
  ] = await Promise.all([
    import('./src/navigation/RootNavigator'),
    import('./src/context/ProactiveConciergeContext'),
    import('./src/context/AiConciergeContext'),
    import('./src/components/concierge/AiConciergeOverlay'),
    import('./src/components/PerformanceCostBanner'),
  ]);

  return {
    default: function InteractiveRuntime() {
      return (
        <ProactiveConciergeProvider>
          <AiConciergeProvider>
            <PerformanceCostBanner />
            <RootNavigator />
            <AiConciergeOverlay />
            <StatusBar style="light" />
          </AiConciergeProvider>
        </ProactiveConciergeProvider>
      );
    },
  };
});

function StartupHomeShell({ showRecoveryActions = false }: { showRecoveryActions?: boolean }) {
  const { refresh, diagnosticsReportJson } = useApp();
  const [showBootLogs, setShowBootLogs] = useState(false);

  useEffect(() => {
    console.log('[startup] home_shell_visible_ms', Date.now() - STARTUP_MARK_MS);
  }, []);

  return (
    <View style={styles.startupShell}>
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>RT</Text>
      </View>
      <Text style={styles.startupTitle}>保有銘柄</Text>
      {showRecoveryActions ? (
        <>
          <Text style={styles.recoveryText}>データは保持されています。起動処理が長引いています。</Text>
          <View style={styles.recoveryActions}>
            <Pressable style={styles.recoveryButton} onPress={() => void refresh()}>
              <Text style={styles.recoveryButtonText}>再読み込み</Text>
            </Pressable>
            <Pressable
              style={[styles.recoveryButton, styles.recoveryButtonGhost]}
              onPress={() => setShowBootLogs((v) => !v)}
            >
              <Text style={styles.recoveryButtonText}>ログ確認</Text>
            </Pressable>
          </View>
          {showBootLogs ? (
            <Text style={styles.recoveryLog} numberOfLines={12}>
              {diagnosticsReportJson()}
            </Text>
          ) : null}
        </>
      ) : null}
      <View style={styles.startupTabs}>
        {['ホーム', 'おすすめ配分', '銘柄検索', '保有銘柄', '売買履歴', '初心者ガイド'].map((label) => (
          <Text key={label} style={[styles.startupTab, label === '保有銘柄' && styles.startupTabActive]}>
            {label}
          </Text>
        ))}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

function AppShell() {
  const { loading } = useApp();
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [slowBoot, setSlowBoot] = useState(false);
  useNotificationMonitor(interactiveReady && !loading && areNotificationsSupported());

  useEffect(() => {
    const t = setTimeout(() => setInteractiveReady(true), INTERACTIVE_RUNTIME_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlowBoot(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      void runDeferredBootTasks();
    }, 400);
    return () => clearTimeout(t);
  }, [loading]);

  if (!interactiveReady || loading) {
    return <StartupHomeShell showRecoveryActions={slowBoot} />;
  }

  return (
    <Suspense fallback={<StartupHomeShell />}>
      <LazyInteractiveRuntime />
    </Suspense>
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
    <AppErrorBoundary fallbackTitle="起動復旧モード">
      <SafeAreaProvider>
        <AppProvider>
          <PerformanceCostProvider>
            <ProductionStabilityProvider>
              <UrgencySignalProvider>
                <AppWithBoundary />
              </UrgencySignalProvider>
            </ProductionStabilityProvider>
          </PerformanceCostProvider>
        </AppProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  startupShell: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingBottom: 96,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  logoText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  startupTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.title,
    fontWeight: '800',
  },
  recoveryText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  recoveryActions: {
    gap: theme.spacing.sm,
  },
  recoveryButton: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },
  recoveryButtonGhost: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  recoveryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  recoveryLog: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
    marginTop: theme.spacing.md,
  },
  startupTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  startupTab: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  startupTabActive: {
    color: theme.colors.primary,
  },
});
