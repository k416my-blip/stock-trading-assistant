import { REAL_TRADING_ENABLED_DEFAULT } from '../../constants/paperBroker';

/** 実マネー執行はコード上常に禁止 */
export function isRealTradingAllowed(): boolean {
  return false;
}

export function assertPaperOnlyExecution(): void {
  if (REAL_TRADING_ENABLED_DEFAULT !== false) {
    throw new Error('Safety policy: real trading must stay disabled');
  }
}

export function validateRealMoneyUnlockAttempt(_pin: string, _confirmCount: number): {
  allowed: false;
  reasonJa: string;
} {
  return {
    allowed: false,
    reasonJa: '実注文は本バージョンでは無効です。紙上シミュレーションのみ利用できます。',
  };
}
