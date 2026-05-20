import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { theme } from '../theme';
import { secureError } from '../services/secureLogger';
import { incrementRecoveryAttemptCount } from '../services/safeBoot';

type Props = {
  children: ReactNode;
  onEnterSafeMode?: () => void;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || '不明なエラー' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    secureError('[AppErrorBoundary]', error.message, info.componentStack);
    void incrementRecoveryAttemptCount();
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  private handleSafeMode = (): void => {
    this.props.onEnterSafeMode?.();
    this.setState({ hasError: false, message: '' });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{this.props.fallbackTitle ?? 'アプリで問題が発生しました'}</Text>
        <Text style={styles.message}>
          データの読み込みまたは画面表示中にエラーが発生しました。再試行するか、安全モードで起動してください。
        </Text>
        {this.state.message ? (
          <Text style={styles.detail} numberOfLines={3}>
            {this.state.message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button label="再試行" onPress={this.handleRetry} />
          <Button label="安全モードで続行" onPress={this.handleSafeMode} variant="ghost" />
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
