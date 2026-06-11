import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { theme } from '../theme';
import { secureError } from '../services/secureLogger';
import { incrementRecoveryAttemptCount } from '../services/safeBoot';
import { recordUiCrash } from '../services/productionStability/productionStabilityRuntime';

type Props = {
  children: ReactNode;
  onEnterSafeMode?: () => void;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  message: string;
  showLogs: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', showLogs: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || '不明なエラー', showLogs: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    secureError('[AppErrorBoundary]', error.message, info.componentStack);
    recordUiCrash(error.message);
    void incrementRecoveryAttemptCount();
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '', showLogs: false });
  };

  private handleShowLogs = (): void => {
    this.props.onEnterSafeMode?.();
    this.setState({ showLogs: true });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{this.props.fallbackTitle ?? 'データ取得エラー'}</Text>
        <Text style={styles.message}>
          データは保持されています。画面表示で問題が発生したため、復旧表示に切り替えました。
        </Text>
        {this.state.showLogs && this.state.message ? (
          <Text style={styles.detail} numberOfLines={3}>
            {this.state.message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button label="再読み込み" onPress={this.handleRetry} />
          <Button label="ログ確認" onPress={this.handleShowLogs} variant="ghost" />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  detail: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.lg,
  },
  actions: { gap: theme.spacing.sm },
});
