import { Alert } from 'react-native';

/** 破壊的操作の二段階確認 */
export function confirmDestructiveAction(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}): void {
  Alert.alert(options.title, options.message, [
    { text: 'キャンセル', style: 'cancel' },
    {
      text: options.confirmLabel ?? '続行',
      style: 'destructive',
      onPress: () => {
        void Promise.resolve(options.onConfirm());
      },
    },
  ]);
}

/** 破損バックアップ等 — 警告後の最終確認 */
export function confirmDestructiveWithWarning(options: {
  title: string;
  warningMessage: string;
  finalMessage: string;
  onConfirm: () => void | Promise<void>;
}): void {
  Alert.alert(options.title, options.warningMessage, [
    { text: 'キャンセル', style: 'cancel' },
    {
      text: '詳細を確認して続行',
      style: 'destructive',
      onPress: () => {
        Alert.alert('最終確認', options.finalMessage, [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'インポートする',
            style: 'destructive',
            onPress: () => {
              void Promise.resolve(options.onConfirm());
            },
          },
        ]);
      },
    },
  ]);
}
