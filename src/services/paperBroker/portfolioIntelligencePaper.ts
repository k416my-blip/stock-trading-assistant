import type { PaperBrokerPersisted } from '../../types/paperBroker';
import { getDefaultAccount } from './paperBrokerStorage';
import { computeExposure, currentDrawdownPct, equityMYR } from './paperRiskLayer';

export function buildRebalanceNoteJa(state: PaperBrokerPersisted, targetCashPct = 15): string {
  const acc = getDefaultAccount(state);
  const eq = equityMYR(state);
  if (eq <= 0) return '現金比率 — データ不足';
  const cashPct = (acc.cashMYR / eq) * 100;
  const diff = targetCashPct - cashPct;
  if (Math.abs(diff) < 3) return `現金 ${cashPct.toFixed(0)}% — 目標 ${targetCashPct}% 付近`;
  return diff > 0
    ? `現金増 ${diff.toFixed(0)}% 目安（現在 ${cashPct.toFixed(0)}%）`
    : `株式増 ${Math.abs(diff).toFixed(0)}% 目安（現金 ${cashPct.toFixed(0)}%）`;
}

export function buildRealityGapSummaryJa(
  aiWinRate: number | null,
  paperWinRate: number | null,
): string | null {
  if (aiWinRate == null && paperWinRate == null) return null;
  return `AI予測勝率 ${aiWinRate ?? '—'}% vs 紙上約定勝率 ${paperWinRate ?? '—'}%`;
}

export function buildStrategyReplayPreviewJa(journal: PaperBrokerPersisted['journal']): string | null {
  const recent = journal.slice(0, 3);
  if (recent.length === 0) return null;
  return recent.map((j) => `${j.at.slice(0, 10)} ${j.symbol} ${j.actionJa}`).join(' · ');
}

export function estimateSharpeFromTimeline(
  timeline: PaperBrokerPersisted['equityTimeline'],
): number | null {
  if (timeline.length < 5) return null;
  const rets: number[] = [];
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1].equityMYR;
    const cur = timeline[i].equityMYR;
    if (prev > 0) rets.push((cur - prev) / prev);
  }
  if (rets.length < 3) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance =
    rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  const std = Math.sqrt(variance);
  if (std < 1e-9) return null;
  return Math.round((mean / std) * Math.sqrt(252) * 10) / 10;
}

export function buildSafetyChecksJa(state: PaperBrokerPersisted): string[] {
  const checks: string[] = ['realTradingEnabled=false', 'broker=mock', 'simulation-first'];
  if (state.config.killSwitch) checks.push('kill-switch=ON');
  const exp = computeExposure(state);
  if (exp.symbol[0]) checks.push(`top symbol ${exp.symbol[0].symbol} ${exp.symbol[0].pct}%`);
  checks.push(`DD ${currentDrawdownPct(state).toFixed(1)}%`);
  return checks;
}
