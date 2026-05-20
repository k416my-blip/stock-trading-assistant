import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { buildCentralIntelligenceWorldModel } from '../services/centralIntelligenceContext';
import {
  countDiagnosticsBySeverity,
  exportDiagnosticsReport,
} from '../services/structuredDiagnostics';
import type { CentralIntelligenceWorldModel } from '../types/centralIntelligence';

export function useCentralIntelligence(): {
  worldModel: CentralIntelligenceWorldModel | null;
  loading: boolean;
  refresh: () => void;
} {
  const {
    state,
    marketRegime,
    healthReport,
    degradedMode,
    bootMode,
    securityWarnings,
    recoveryRecommendations,
    killSwitches,
    priceSync,
  } = useApp();

  const [worldModel, setWorldModel] = useState<CentralIntelligenceWorldModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const diagReport = exportDiagnosticsReport(50);
    void buildCentralIntelligenceWorldModel({
      state,
      appMode: state.appMode,
      marketRegime,
      healthReport,
      degradedMode,
      bootMode,
      securityWarnings,
      recoveryRecommendations,
      killSwitches,
      priceSync,
      diagnosticsSummary: diagReport.summary,
      diagnosticsSeverity: countDiagnosticsBySeverity(),
    }).then((model) => {
      if (!cancelled) {
        setWorldModel(model);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    state,
    marketRegime,
    healthReport,
    degradedMode,
    bootMode,
    securityWarnings,
    recoveryRecommendations,
    killSwitches,
    priceSync,
    tick,
  ]);

  return {
    worldModel,
    loading,
    refresh: () => setTick((t) => t + 1),
  };
}
