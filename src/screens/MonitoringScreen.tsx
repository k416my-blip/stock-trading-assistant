import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MonitoringCharts } from '../components/monitoring/MonitoringCharts';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import { loadGovernanceAuditLog } from '../services/governanceAuditService';
import { buildMonitoringSnapshot } from '../services/monitoringSnapshotService';
import { loadShadowPortfolio } from '../services/shadowPortfolioStorage';
import { refreshShadowTradingDashboard } from '../services/shadowTradingOrchestratorService';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { MonitoringSnapshot } from '../types/monitoring';
import type { PortfolioGovernanceReport } from '../types/governance';
import type { MetaAllocationReport } from '../types/metaAllocation';
import type { ShadowPortfolioState } from '../types/shadowTrading';
import { theme } from '../theme';

export function MonitoringScreen() {
  const {
    state,
    isPractice,
    practiceStats,
    buyingPower,
    marketRegime,
    twelveDataApiKey,
    portfolioRevision,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [shadowState, setShadowState] = useState<ShadowPortfolioState | null>(null);
  const [auditLog, setAuditLog] = useState<Awaited<ReturnType<typeof loadGovernanceAuditLog>>>([]);
  const [governanceReport, setGovernanceReport] = useState<PortfolioGovernanceReport | null>(null);
  const [metaReport, setMetaReport] = useState<MetaAllocationReport | null>(null);
  const loadingRef = useRef(false);

  const portfolio = useMemo(() => {
    const raw = isPractice ? state.practice.portfolio : state.portfolio;
    return raw.filter((p) => p.shares > 0);
  }, [isPractice, state.practice.portfolio, state.portfolio, portfolioRevision]);

  const performanceHistory = useMemo(
    () => (isPractice ? state.practice.performanceHistory : state.performanceHistory),
    [isPractice, state.practice.performanceHistory, state.performanceHistory],
  );

  const totalValue = useMemo(() => {
    if (isPractice) return practiceStats.portfolioValueMYR;
    return portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;
  }, [isPractice, practiceStats.portfolioValueMYR, state, buyingPower.buyingPowerMYR]);

  const constructionReport = useMemo(() => {
    if (portfolio.length === 0) return null;
    return analyzePortfolioConstruction({
      portfolio,
      totalPortfolioValueMYR: totalValue,
      regime: marketRegime,
    });
  }, [portfolio, totalValue, marketRegime]);

  const loadLight = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const [shadow, audit] = await Promise.all([loadShadowPortfolio(), loadGovernanceAuditLog()]);
      setShadowState(shadow);
      setAuditLog(audit);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const loadFull = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const [shadow, audit, dash] = await Promise.all([
        loadShadowPortfolio(),
        loadGovernanceAuditLog(),
        portfolio.length > 0
          ? refreshShadowTradingDashboard({
              apiKey: twelveDataApiKey,
              regime: marketRegime,
              runGovernance: true,
              portfolio,
              totalPortfolioValueMYR: totalValue,
            }).catch(() => null)
          : Promise.resolve(null),
      ]);
      setShadowState(shadow);
      setAuditLog(audit);
      if (dash?.governance) {
        setGovernanceReport(dash.governance);
        setMetaReport(dash.governance.meta);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [twelveDataApiKey, marketRegime, portfolio, totalValue]);

  useFocusEffect(
    useCallback(() => {
      void loadLight();
    }, [loadLight]),
  );

  const snapshot: MonitoringSnapshot | null = useMemo(() => {
    if (!shadowState && performanceHistory.length < 2 && auditLog.length === 0) {
      return null;
    }
    return buildMonitoringSnapshot({
      performanceHistory,
      shadowState,
      auditLog,
      regime: marketRegime,
      constructionReport,
      governanceReport,
      metaReport,
    });
  }, [
    performanceHistory,
    shadowState,
    auditLog,
    marketRegime,
    constructionReport,
    governanceReport,
    metaReport,
  ]);

  return (
    <Screen title="可視化・モニタリング" subtitle="チャート · タイムライン · ヘルス">
      <Card>
        <Text style={styles.note}>
          軽量チャートのみ使用。フォーカス時にシャドー/監査を読み込み、重いガバナンスは「フル更新」時のみ実行します。
        </Text>
        <Button label="データ再読込" onPress={() => void loadLight()} variant="ghost" disabled={loading} />
        <Button
          label={loading ? '更新中…' : 'フル更新（ガバナンス+メタ）'}
          onPress={() => void loadFull()}
          disabled={loading}
        />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
        </Card>
      ) : null}

      {snapshot ? <MonitoringCharts snapshot={snapshot} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
});
