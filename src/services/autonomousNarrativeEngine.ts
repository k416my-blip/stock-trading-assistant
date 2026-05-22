import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type { AutonomousAttentionItem, AutonomousNarrative } from '../types/autonomousMonitoring';
import type { PortfolioStressMeter } from '../types/autonomousMonitoring';

export function buildAutonomousNarrative(
  global: GlobalMarketAnalysisBundle | null,
  attention: AutonomousAttentionItem[],
  stress: PortfolioStressMeter,
): AutonomousNarrative {
  const paragraphs: string[] = [];

  if (global) {
    paragraphs.push(
      `いまの市場は「${global.regimeLabelJa}」のフェーズです。${global.regimeSummaryJa}`,
    );
    if (global.vix?.value != null) {
      paragraphs.push(
        `不安指標（VIX）は ${global.vix.value.toFixed(1)} 付近 — リスクスコア ${global.marketScores.marketRiskScore}、恐怖度 ${global.marketScores.fearScore} です。`,
      );
    }
  } else {
    paragraphs.push('市場全体のライブデータは限定的です。判断は保有データとキャッシュに基づきます。');
  }

  if (attention.length > 0) {
    paragraphs.push(
      `いちばん注目すべきは ${attention.map((a) => a.headlineJa).join('、')} です。`,
    );
  }

  paragraphs.push(
    `ポートフォリオのストレスは「${stress.labelJa}」（${stress.score}/100）。${stress.factorsJa.join(' · ')}`,
  );

  return {
    titleJa: '今、市場で起きていること',
    paragraphsJa: paragraphs,
  };
}
