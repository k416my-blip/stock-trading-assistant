import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { theme } from '../theme';
import {
  isHermesUndefinedObjectError,
  logBursaAnalysisError,
  type BursaAnalysisScreenId,
} from '../services/bursa/bursaAnalysisDiagnostics';

type Props = {
  children: ReactNode;
  screen: BursaAnalysisScreenId;
  fallbackJa?: string;
};

type State = {
  hasError: boolean;
};

export class BursaDataErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logBursaAnalysisError(this.props.screen, error, {
      componentStack: info.componentStack,
      boundary: 'BursaDataErrorBoundary',
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const label =
      this.props.fallbackJa ??
      'データ取得エラー。Bursa 開示データの読み込みに失敗しました。';

    return (
      <View style={styles.container}>
        <Text style={styles.title}>データ取得エラー</Text>
        <Text style={styles.message}>{label}</Text>
        <Button label="再読み込み" onPress={this.handleRetry} />
      </View>
    );
  }
}

export function wrapBursaScreen(
  screen: BursaAnalysisScreenId,
  Component: React.ComponentType,
  fallbackJa?: string,
): React.ComponentType {
  return function BursaScreenWithBoundary() {
    return (
      <BursaDataErrorBoundary screen={screen} fallbackJa={fallbackJa}>
        <Component />
      </BursaDataErrorBoundary>
    );
  };
}

/** @internal test helper */
export function _isHermesUndefinedForTest(msg: string): boolean {
  return isHermesUndefinedObjectError(msg);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
});
