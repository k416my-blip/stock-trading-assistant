import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { logError } from '../../services/productionLogger';
import { theme } from '../../theme';

type Props = {
  panelName: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string | null;
};

/** 単一ダッシュボードの失敗で AI コンシェルジュ全体を落とさない */
export class ConciergePanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError(
      `[concierge-panel:${this.props.panelName}]`,
      error.message,
      info.componentStack,
    );
  }

  private retry = (): void => {
    this.setState({ hasError: false, message: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap} testID={`concierge-panel-error-${this.props.panelName}`}>
          <Text style={styles.title}>{this.props.panelName} を表示できません</Text>
          <Text style={styles.body}>
            他のコンシェルジュ機能は利用できます。再試行するか、Metro を再起動してください。
          </Text>
          {this.state.message ? (
            <Text style={styles.detail} numberOfLines={4}>
              {this.state.message}
            </Text>
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

export function ConciergePanelSlot({
  panelName,
  children,
}: {
  panelName: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <ConciergePanelErrorBoundary panelName={panelName}>
      {children}
    </ConciergePanelErrorBoundary>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  title: {
    fontWeight: '600',
    color: theme.colors.warning,
    marginBottom: 4,
  },
  body: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  btn: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
  },
  btnText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});
