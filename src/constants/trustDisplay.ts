import type { InvestmentStyle, RiskLevel } from '../types';

export type TrustProfileTypeLabel = '安定型' | '標準型' | '積極型';

export const TRUST_HOME_TITLE_JA = '資産運用コンシェルジュ';
export const TRUST_HOME_SUBTITLE_JA = '専属MDが今月の配分をご提案します';
export const TRUST_CONCIERGE_BADGE_JA = '専属MD';
export const TRUST_MD_APPROVED_LABEL_JA = '専属MD承認済み';
export const TRUST_MD_PENDING_LABEL_JA = '専属MDが確認中です';
export const TRUST_MD_GENERATING_LABEL_JA = '専属MDが今月の提案を作成中です';
export const TRUST_MD_APPROVED_BRIEF_JA = '専属MD承認済みです。';
export const TRUST_MD_PENDING_BRIEF_JA = '専属MDが確認中です。';
export const TRUST_HOME_NO_PLAN_HINT_JA =
  '入金額を入力すると、専属MDが今月の提案を作成します。';
export const TRUST_RECOMMENDED_AMOUNT_LABEL_JA = 'おすすめの金額';
export const TRUST_MONTHLY_AMOUNT_LABEL_JA = '今月の金額';
export const TRUST_EXPAND_ALLOCATION_LABEL_JA = '配分を見る';
export const TRUST_COLLAPSE_ALLOCATION_LABEL_JA = '配分を閉じる';
export const TRUST_MONTHLY_ONE_LINER_LABEL_JA = '今月の一言';
export const TRUST_MONTHLY_REPORT_TITLE_JA = '先月の実績';
export const TRUST_MONTHLY_REPORT_PORTFOLIO_LABEL_JA = '先月の結果';
export const TRUST_MONTHLY_REPORT_MARKET_LABEL_JA = '市場平均';
export const TRUST_MONTHLY_REPORT_OUTCOME_LABEL_JA = '結果';
export const TRUST_MONTHLY_REPORT_REASON_LABEL_JA = '理由';
export const TRUST_OPERATING_PERFORMANCE_TITLE_JA = 'AI運用実績';
export const TRUST_OPERATING_START_LABEL_JA = '運用開始';
export const TRUST_OPERATING_CUMULATIVE_LABEL_JA = '累積成績';
export const TRUST_OPERATING_MARKET_DIFF_LABEL_JA = '市場平均との差';
export const TRUST_OPERATING_WIN_RATE_LABEL_JA = '勝率';
export const TRUST_OPERATING_WIN_RATE_HINT_JA = '（月単位）';
export const TRUST_OPERATING_MAX_DRAWDOWN_LABEL_JA = '最大下落率';
export const TRUST_OPERATING_RATING_LABEL_JA = '現在評価';
export const TRUST_APPROVE_BUTTON_LABEL_JA = 'この提案で進める';

export function mapToTrustProfileTypeLabel(input: {
  investmentStyle: InvestmentStyle;
  riskLevel: RiskLevel;
}): TrustProfileTypeLabel {
  if (input.investmentStyle === 'dividend' || input.riskLevel === 'low') {
    return '安定型';
  }
  if (input.investmentStyle === 'short_term' || input.riskLevel === 'high') {
    return '積極型';
  }
  return '標準型';
}
