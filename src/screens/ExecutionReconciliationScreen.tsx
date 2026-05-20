import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { ExecutionReconciliationPanel } from '../components/ExecutionReconciliationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { reconcileExecutionJournal } from '../services/executionReconciliationService';
import type { ExecutionReconciliationReport } from '../types/execution';
import { theme } from '../theme';

export function ExecutionReconciliationScreen() {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ExecutionReconciliationReport | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reconcileExecutionJournal(state);
      setReport(r);
    } finally {
      setLoading(false);
    }
  }, [state]);

  return (
    <Screen title="執行照合" subtitle="ジャーナルと保有の不一致を検出">
      <Card>
        <Text style={styles.note}>
          約定が成功したと判断できるのはジャーナルが confirmed / reconciled になった後のみです。不明な submitted
          状態は手動で確認してください。
        </Text>
        <Button label={loading ? '照合中…' : '照合を実行'} onPress={() => void run()} disabled={loading} />
      </Card>
      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
        </Card>
      ) : null}
      {report ? <ExecutionReconciliationPanel report={report} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: theme.spacing.sm },
});
