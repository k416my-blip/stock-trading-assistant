export type SmokeTestItem = {
  id: string;
  titleJa: string;
  stepsJa: string;
  /** Expo Go 等向けの補足（完全オフライン起動の制約など） */
  noteJa?: string;
};

/** 実機での手動スモークテスト（docs/DEVICE_SMOKE_TEST_CHECKLIST.md と同期） */
export const DEVICE_SMOKE_TEST_CHECKLIST: SmokeTestItem[] = [
  {
    id: 'fresh_install',
    titleJa: '新規インストール',
    stepsJa: 'アプリ初回起動 → 空のポートフォリオ → 設定・ホームが表示されること',
  },
  {
    id: 'app_restart',
    titleJa: 'アプリ再起動',
    stepsJa: '保有・設定を保存 → 完全終了 → 再起動 → データが復元されること',
  },
  {
    id: 'phone_offline',
    titleJa: 'オフライン',
    stepsJa:
      'オンライン起動 → データ表示 → 機内モードON → キャッシュ表示・AsyncStorage復元・オフラインバナーを確認',
    noteJa:
      'Expo Goでは完全オフライン起動はMetro bundle取得が必要なため失敗する場合があります。本番ビルドで確認してください。',
  },
  {
    id: 'api_key_missing',
    titleJa: 'APIキー未設定',
    stepsJa: 'キー削除 → 株価更新が失敗メッセージで止まりアプリは使えること',
  },
  {
    id: 'api_quota',
    titleJa: 'APIクォータ超過',
    stepsJa: '429/制限後 → バックオフ → 保有が消えないこと',
  },
  {
    id: 'stale_price',
    titleJa: 'ステール価格',
    stepsJa: '古い取得成功 → STALE バッジ → 売買ゲートがブロックされること（練習）',
  },
  {
    id: 'add_holding',
    titleJa: '保有追加',
    stepsJa: '練習買付 → 保有に反映 → 再起動後も残ること',
  },
  {
    id: 'edit_holding',
    titleJa: '保有編集',
    stepsJa: '価格・銘柄・市場の手動修正が保存されること',
  },
  {
    id: 'delete_holding',
    titleJa: '保有削除',
    stepsJa: '削除確認 → 一覧から消える → 元に戻す（取り消し）が使えること',
  },
  {
    id: 'practice_trade',
    titleJa: '練習売買',
    stepsJa: '買付・売却がジャーナル経由で記録され残高が整合すること',
  },
  {
    id: 'duplicate_tap',
    titleJa: '売買ボタン連打',
    stepsJa: '確定を連打 → 重複注文がブロックされること',
  },
  {
    id: 'corrupt_recovery',
    titleJa: '破損ストレージ復旧',
    stepsJa: '開発シミュレーション後 → 拒否またはデフォルト復旧 → クラッシュしないこと',
  },
  {
    id: 'clear_sensitive',
    titleJa: '機密データ削除',
    stepsJa: '確認後 → APIキー・ジャーナル削除 → 再設定可能',
  },
  {
    id: 'safe_boot',
    titleJa: '安全モード',
    stepsJa: '復旧上限後 → 安全モードバナー → 診断画面で復旧手順',
  },
];
