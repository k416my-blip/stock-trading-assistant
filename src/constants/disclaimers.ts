/** Shown in UI — analysis / decision-support only (no broker execution) */

import { ANALYSIS_SUPPORT_DISCLAIMER_JA, ORDER_EXECUTION_NOTICE_JA } from './platformClarification';

export const NO_AUTO_TRADE_DISCLAIMER = ANALYSIS_SUPPORT_DISCLAIMER_JA;

export { ORDER_EXECUTION_NOTICE_JA };

export const NOT_FINANCIAL_ADVICE =
  '投資助言ではありません。手数料・為替レートは概算です。取引前にRakuten Tradeの公式情報を必ずご確認ください。';

export const RISK_WARNING_BODY = `【重要なリスク告知】

・本アプリは注文を送信しません。すべての取引はRakuten Tradeで手動実行してください。
・Cash Upfront（現金前払い）のみを推奨・対応の中心としています。
・Contra・RakuMarginは高リスクのため、本アプリでは選択できません。
・株式投資には元本割れのリスクがあります。
・米国・香港株は為替変動の影響を受けます。
・表示される手数料・買いシグナル・売りシグナルは参考値です。`;

export const BEGINNER_TRADE_WARNING =
  'このアプリは投資判断を保証するものではありません。実際の売買は自分で確認して行ってください。';

/** Full line for internal testing / primary surfaces (non-blocking). */
export const INTERNAL_TESTING_SAFETY_NOTICE_JA =
  'このアプリは投資判断の参考情報を表示するもので、利益を保証するものではありません。実際の注文は証券会社アプリで内容を確認し、ご自身で手動入力してください。';

/** Compact line for Home / Concierge / proposals (prefer this on dense screens). */
export const SHORT_INTERNAL_TESTING_SAFETY_NOTICE_JA =
  '参考情報のみ。利益保証なし。実際の注文は証券会社アプリで手動確認・手動入力してください。';
