/**
 * @deprecated 実装は advisor-engine / signal-engine に移行。互換のため re-export のみ。
 */
export {
  buildProactiveFingerprint,
  evaluateProactiveAdvice,
  evaluateProactiveSuggestions,
  fingerprintChanged,
  type ProactiveEvaluationInput,
} from './advisor-engine';
