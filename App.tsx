import './src/wdyr';
import { installDevConsoleLogFilter } from './src/utils/consoleLogFilter';

installDevConsoleLogFilter();
logRealApiModeOnBoot();

import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AppProvider, useApp } from './src/context/AppContext';
import { PerformanceCostProvider } from './src/context/PerformanceCostContext';
import { ProductionStabilityProvider } from './src/context/ProductionStabilityContext';
import { AiTradeQueueProvider } from './src/context/AiTradeQueueContext';
import { UrgencySignalProvider } from './src/context/UrgencySignalContext';
import { useNotificationMonitor } from './src/hooks/useNotificationMonitor';
import { lazy, Suspense, useEffect, useState } from 'react';
import { runDeferredBootTasks } from './src/services/deferredBoot';
import { theme } from './src/theme';
import { areNotificationsSupported } from './src/utils/runtimeEnvironment';
import { devLog } from './src/utils/devLog';
import { logAppMemorySnapshot } from './src/utils/appMemoryDiagnostics';
import { logRealApiModeOnBoot } from './src/constants/realApiMode';

const STARTUP_MARK_MS = Date.now();
/** データ読込完了後、重い runtime を遅延ロードするまでの待機 */
const INTERACTIVE_RUNTIME_DELAY_MS = 2_500;
let globalErrorHandlerInstalled = false;

type ErrorUtilsLike = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

const LazyInteractiveRuntime = lazy(async () => {
  const [
    { RootNavigator },
    { ProactiveConciergeProvider },
    { AiConciergeProvider },
    { BursaConciergeProvider },
    { BursaMaterialProvider },
    { PerformanceCostBanner },
    { AiConciergeOverlay },
  ] = await Promise.all([
    import('./src/navigation/RootNavigator'),
    import('./src/context/ProactiveConciergeContext'),
    import('./src/context/AiConciergeContext'),
    import('./src/context/BursaConciergeContext'),
    import('./src/context/BursaMaterialContext'),
    import('./src/components/PerformanceCostBanner'),
    import('./src/components/concierge/AiConciergeOverlay'),
  ]);

  return {
    default: function InteractiveRuntime() {
      return (
        <ProactiveConciergeProvider>
          <AiConciergeProvider>
            <BursaConciergeProvider>
              <BursaMaterialProvider>
                <PerformanceCostBanner />
                <RootNavigator />
                <AiConciergeOverlay />
                <StatusBar style="light" />
              </BursaMaterialProvider>
            </BursaConciergeProvider>
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
    devLog('[startup] home_shell_visible_ms', Date.now() - STARTUP_MARK_MS);
    logAppMemorySnapshot('startup_home_shell_visible');
  }, []);

  return (
    <View style={styles.startupShell} pointerEvents="box-none">
      <View style={styles.startupOverlay} pointerEvents="none">
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.startupOverlayTitle}>アプリを起動しています</Text>
        <Text style={styles.startupOverlayHint}>画面の準備が完了するまでお待ちください</Text>
      </View>
      <View style={styles.logoMark} pointerEvents="none">
        <Text style={styles.logoText}>RT</Text>
      </View>
      <View style={styles.skeletonBlock} pointerEvents="none">
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
      </View>
      <View style={styles.skeletonBlock} pointerEvents="none">
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLine} />
      </View>
      {showRecoveryActions ? (
        <View style={styles.recoveryActions}>
          <Text style={styles.recoveryText}>データは保持されています。起動処理が長引いています。</Text>
          <Pressable style={styles.recoveryButton} onPress={() => void refresh()}>
            <Text style={styles.recoveryButtonText}>再読み込み</Text>
          </Pressable>
          <Pressable
            style={[styles.recoveryButton, styles.recoveryButtonGhost]}
            onPress={() => setShowBootLogs((v) => !v)}
          >
            <Text style={styles.recoveryButtonText}>ログ確認</Text>
          </Pressable>
          {showBootLogs ? (
            <Text style={styles.recoveryLog} numberOfLines={12}>
              {diagnosticsReportJson()}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.startupTabSkeleton} pointerEvents="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.startupTabSkeletonItem} />
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
    // loading が長引いても操作不能 UI に固定されないよう、一定時間後は interactive を許可
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

  // 起動直後だけ skeleton を表示。slowBoot 後は本体 UI を出して操作可能にする。
  if (!interactiveReady || (loading && !slowBoot)) {
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

function installGlobalErrorHandler(): void {
  if (globalErrorHandlerInstalled) return;
  const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;
  const prev = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GLOBAL ERROR HANDLER]', {
      isFatal: Boolean(isFatal),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    prev?.(error, isFatal);
  });
  globalErrorHandlerInstalled = true;
}

export default function App() {
  installGlobalErrorHandler();
  return (
    <AppErrorBoundary fallbackTitle="起動復旧モード">
      <SafeAreaProvider>
        <AppProvider>
          <AiTradeQueueProvider>
            <PerformanceCostProvider>
              <ProductionStabilityProvider>
                <UrgencySignalProvider>
                  <AppWithBoundary />
                </UrgencySignalProvider>
              </ProductionStabilityProvider>
            </PerformanceCostProvider>
          </AiTradeQueueProvider>
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
  startupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background + 'E6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    paddingHorizontal: theme.spacing.lg,
  },
  startupOverlayTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  startupOverlayHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  skeletonBlock: {
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  skeletonLineWide: {
    height: 14,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    width: '88%',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    width: '72%',
  },
  skeletonLineShort: {
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    width: '48%',
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
  startupTabSkeleton: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  startupTabSkeletonItem: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    opacity: 0.7,
  },
});
