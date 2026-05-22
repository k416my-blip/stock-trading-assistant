import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { logError } from '../../services/productionLogger';
import { theme } from '../../theme';

type Props = {
  children: ReactNode;
  onRetry?: () => void;
};

type State = {
  hasError: boolean;
  message: string | null;
};

export class AiConciergeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('[ai-concierge-boundary]', error.message, info.componentStack);
  }

  private retry = (): void => {
    this.setState({ hasError: false, message: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>AIコンシェルジュでエラーが発生しました</Text>
          <Text style={styles.body}>
            アプリ本体は利用できます。チャットを再試行するか、しばらく待ってから開き直してください。
          </Text>
          {this.state.message ? (
            <Text style={styles.detail}>{this.state.message}</Text>
          ) : null}
          <Pressable onPress={this.retry} style={styles.btn}>
            <Text style={styles.btnText}>再試行</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  body: {
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  detail: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
