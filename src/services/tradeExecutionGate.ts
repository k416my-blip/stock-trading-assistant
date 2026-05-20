import { FX_TO_MYR } from '../constants/rakutenTrade';
import { behavioralTradingBlocked } from './behavioralRiskEngine';
import { metaCapitalAllocationBlocked } from './metaCapitalEngine';
import { modelStabilityLearningBlocked } from './modelStabilityEngine';
import { stressExecutionBlocked } from './portfolioStressEngine';
import type { InstitutionalRiskInput, TradeGateResult, TradeIntent } from '../types/institutionalRisk';
import { toMYR } from './fx';
import { buildInstitutionalRiskReport } from './institutionalRiskControlEngine';

/** 執行前ゲート（機関投資家型リスク統制） */
export function validateTradeIntent(
  intent: TradeIntent,
  context: InstitutionalRiskInput,
): TradeGateResult {
  const report = buildInstitutionalRiskReport({
    ...context,
    symbol: intent.symbol,
    market: intent.market,
    currency: intent.currency,
    stockPrice: intent.price,
  });

  const violations: TradeGateResult['violations'] = [];
  const warnings: string[] = [];
  let adjustedShares = intent.shares;

  const tradeValueMYR =
    toMYR(intent.shares * intent.price, intent.currency) +
    (intent.brokerageFee ?? 0) * FX_TO_MYR[intent.currency];

  if (intent.side === 'buy') {
    if (report.turnover.blockNewBuys) {
      violations.push({
        id: 'turnover',
        severity: 'high',
        messageJa: report.turnover.noteJa,
      });
    }

    if (report.exposureThrottle.blocked) {
      violations.push({
        id: 'exposure',
        severity: 'critical',
        messageJa: report.exposureThrottle.noteJa,
      });
    }

    if (tradeValueMYR > report.cashManagement.deployableMYR) {
      violations.push({
        id: 'cash',
        severity: 'high',
        messageJa: `運用可能現金 RM${report.cashManagement.deployableMYR} を超過`,
      });
    }

    if (report.signalDecay?.stale) {
      violations.push({
        id: 'signal-decay',
        severity: 'high',
        messageJa: report.signalDecay.labelJa,
      });
    }

    if (context.metaCapital && metaCapitalAllocationBlocked(context.metaCapital)) {
      violations.push({
        id: 'meta-capital',
        severity: 'high',
        messageJa: context.metaCapital.verdictJa,
      });
    } else if (context.metaCapital?.capitalPreservation.preservationActive) {
      warnings.push(context.metaCapital.capitalPreservation.noteJa);
    } else if (context.metaCapital?.crisisOverride.active) {
      warnings.push(context.metaCapital.crisisOverride.noteJa);
    }

    if (context.modelStability && modelStabilityLearningBlocked(context.modelStability)) {
      violations.push({
        id: 'model-stability',
        severity: 'high',
        messageJa: context.modelStability.verdictJa,
      });
    } else if (context.modelStability?.learningQuarantine.active) {
      warnings.push(context.modelStability.learningQuarantine.reasonJa);
    } else if (context.modelStability?.adaptiveFreeze.active) {
      warnings.push(context.modelStability.adaptiveFreeze.reasonJa);
    }

    if (context.adaptiveExecution && !context.adaptiveExecution.signalQuality.tradeAllowed) {
      violations.push({
        id: 'adaptive-signal',
        severity: 'high',
        messageJa: context.adaptiveExecution.signalQuality.noteJa,
      });
    }

    if (context.adaptiveExecution?.timing.grade === 'defer') {
      warnings.push(context.adaptiveExecution.timing.rationaleJa);
    }

    if (context.dataIntegrity && !context.dataIntegrity.executionSafe) {
      violations.push({
        id: 'data-integrity',
        severity: 'high',
        messageJa: context.dataIntegrity.verdictJa,
      });
    }

    const symbolIntegrity = context.dataIntegrity?.symbols.find(
      (s) => s.symbol === intent.symbol && s.market === intent.market,
    );
    if (symbolIntegrity?.staleQuote?.stale) {
      violations.push({
        id: 'stale-quote',
        severity: 'high',
        messageJa: symbolIntegrity.staleQuote.noteJa,
      });
    }

    if (context.portfolioStress && stressExecutionBlocked(context.portfolioStress)) {
      violations.push({
        id: 'stress-gate',
        severity: 'critical',
        messageJa: context.portfolioStress.verdictJa,
      });
    } else if (context.portfolioStress?.executionGateActive) {
      warnings.push(context.portfolioStress.verdictJa);
    }

    if (context.behavioralRisk && behavioralTradingBlocked(context.behavioralRisk)) {
      violations.push({
        id: 'behavioral-gate',
        severity: 'critical',
        messageJa: context.behavioralRisk.verdictJa,
      });
    } else if (context.behavioralRisk && !context.behavioralRisk.tradingAllowed) {
      warnings.push(context.behavioralRisk.verdictJa);
    } else if (context.behavioralRisk?.revengeTrade.detected) {
      warnings.push(context.behavioralRisk.revengeTrade.noteJa);
    }

    if (
      context.adaptiveExecution?.positionSizing.suggestedShares &&
      context.adaptiveExecution.positionSizing.suggestedShares > 0 &&
      intent.shares > context.adaptiveExecution.positionSizing.suggestedShares
    ) {
      adjustedShares = context.adaptiveExecution.positionSizing.suggestedShares;
      warnings.push(
        `適応サイズ上限: ${context.adaptiveExecution.positionSizing.suggestedShares}株に調整`,
      );
    }

    if (context.constructionReport) {
      for (const w of context.constructionReport.warnings) {
        if (w.severity === 'critical') {
          violations.push({
            id: `construction-${w.id}`,
            severity: 'critical',
            messageJa: w.titleJa,
          });
        } else if (w.severity === 'high') {
          warnings.push(w.titleJa);
        }
      }
    }

    if (context.sizing && context.sizing.suggestedShares > 0) {
      if (intent.shares > context.sizing.suggestedShares) {
        adjustedShares = context.sizing.suggestedShares;
        warnings.push(
          `ポジションサイズ上限: ${context.sizing.suggestedShares}株に調整`,
        );
      }
    }

    if (report.riskBudget.availableRiskMYR <= 0 && context.portfolio.length > 0) {
      warnings.push('リスク予算がほぼ枯渇 — サイズ縮小を推奨');
    }
  }

  if (intent.side === 'sell') {
    const pos = context.portfolio.find(
      (p) => p.symbol === intent.symbol && p.market === intent.market,
    );
    if (!pos || pos.shares < intent.shares) {
      violations.push({
        id: 'shares',
        severity: 'critical',
        messageJa: '保有株数が不足しています',
      });
    }
  }

  const blocked = violations.some(
    (v) =>
      v.severity === 'critical' ||
      (intent.side === 'buy' && v.severity === 'high'),
  );

  return {
    allowed: !blocked,
    adjustedShares: adjustedShares !== intent.shares ? adjustedShares : undefined,
    violations,
    warnings,
  };
}
