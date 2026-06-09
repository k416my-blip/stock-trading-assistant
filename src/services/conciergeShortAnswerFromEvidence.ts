import type { AiChatStructuredReply } from '../types/aiChat';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { ConciergeShortAnswer, ConciergeShortAnswerFact } from '../types/conciergeUx';
import { buildShortAnswerFromStructured } from './conciergeHumanizeText';
import { logConciergeShortAnswerDiag } from './conciergeEvidenceTrace';

function fmtPrice(n: number | null | undefined, currency: string): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('en-MY', { maximumFractionDigits: 2 })} ${currency}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function buildDataSourcesJa(evidence: ConciergeEvidenceBundle, sym: ConciergeEvidenceBundle['symbols'][0]): string {
  const parts: string[] = [];
  if (sym.newsSource) parts.push(`ニュース: ${sym.newsSource}`);
  const diag = evidence.analysisDiagnostics;
  if (diag) {
    const ok = diag.fetchResults.filter((r) => r.ok).map((r) => r.source);
    if (ok.length) parts.push(`取得: ${ok.join(', ')}`);
    if (diag.newsProvider) parts.push(`newsProvider=${diag.newsProvider}`);
  }
  return parts.length ? parts.join(' · ') : '—';
}

export function buildConciergeShortAnswer(
  structured: AiChatStructuredReply | undefined,
  fallbackText: string | undefined,
  evidence: ConciergeEvidenceBundle | undefined,
  messageId?: string,
): ConciergeShortAnswer {
  const base = buildShortAnswerFromStructured(structured, fallbackText);
  const sym = evidence?.symbols[0];
  const guide = evidence?.actionGuide?.symbols?.[0];
  if (!sym) {
    logConciergeShortAnswerDiag({
      hasEvidence: false,
      factsCount: 0,
      symbol: null,
      messageId,
    });
    return base;
  }

  const currency = sym.market === 'us' ? 'USD' : sym.market === 'hk' ? 'HKD' : 'MYR';
  const holding = sym.portfolioHolding;
  const shares = holding?.shares ?? 0;
  const price = sym.currentPrice;
  const marketValue =
    price != null && shares > 0 ? shares * price : null;

  const facts: ConciergeShortAnswerFact[] = [
    { labelJa: '銘柄', valueJa: sym.displayLabelJa || `${sym.companyName} (${sym.symbol})` },
    { labelJa: '現在株価', valueJa: fmtPrice(price, currency) },
    {
      labelJa: '保有株数',
      valueJa: shares > 0 ? `${shares.toLocaleString('en-MY')} 株` : '未保有',
    },
    { labelJa: '評価額', valueJa: marketValue != null ? fmtPrice(marketValue, currency) : '—' },
    {
      labelJa: '含み損益',
      valueJa: holding ? fmtPct(holding.unrealizedPnlPct) : '—',
    },
    {
      labelJa: '確信度',
      valueJa: `${guide?.confidencePct ?? evidence.riskControl?.overallConfidencePct ?? '—'}%`,
    },
    { labelJa: '取得ソース', valueJa: buildDataSourcesJa(evidence, sym) },
  ];

  const reasonsJa = guide?.insufficientData
    ? [guide.insufficientDataLabelJa ?? '判断材料不足', ...guide.reasonBulletsJa].filter(Boolean).slice(0, 4)
    : (guide?.reasonBulletsJa?.length ?? 0) > 0
      ? guide!.reasonBulletsJa.slice(0, 4)
      : base.reasonsJa;

  const confidencePct = guide?.confidencePct ?? evidence.riskControl?.overallConfidencePct ?? 0;
  const conclusionJa =
    guide?.insufficientData && guide.insufficientDataLabelJa
      ? `${sym.displayLabelJa} — ${guide.insufficientDataLabelJa}（確信度 ${confidencePct}%）`
      : base.conclusionJa.length > 24
        ? base.conclusionJa
        : `${sym.displayLabelJa} — ${guide?.marketStanceLabelJa ?? '要確認'}（確信度 ${confidencePct}%）`;

  const riskJa = guide?.riskSummaryJa || structured?.risk || '—';
  const watchJa =
    guide?.attentionPointsJa?.[0] ||
    guide?.recommendedActionsJa?.[0] ||
    structured?.followUp ||
    base.actionJa;

  const answer = {
    conclusionJa,
    factsJa: facts,
    reasonsJa,
    riskJa,
    watchJa,
    actionJa: guide?.recommendedActionsJa?.[0] || base.actionJa,
  };

  logConciergeShortAnswerDiag({
    hasEvidence: true,
    factsCount: facts.length,
    symbol: sym.symbol,
    messageId,
  });

  return answer;
}
