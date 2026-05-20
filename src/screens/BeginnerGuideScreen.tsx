import { StyleSheet, Text } from 'react-native';
import { BeginnerWarningBanner } from '../components/BeginnerWarningBanner';
import { TermHint } from '../components/TermHint';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { GLOSSARY_ORDER } from '../constants/glossary';
import { NO_AUTO_TRADE_DISCLAIMER } from '../constants/disclaimers';
import {
  APP_MODE_LIVE_ANALYSIS_LABEL,
  APP_MODE_PRACTICE_LABEL,
  ORDER_EXECUTION_NOTICE_JA,
} from '../constants/platformClarification';
import { theme } from '../theme';

const APP_USAGE = [
  {
    step: '1',
    title: 'モードを選ぶ',
    body: `「${APP_MODE_PRACTICE_LABEL}」は仮想のお金で練習。「${APP_MODE_LIVE_ANALYSIS_LABEL}」は証券会社で約定した取引を記録し、AI分析を行います。${ORDER_EXECUTION_NOTICE_JA}`,
  },
  {
    step: '2',
    title: 'お金の設定',
    body: `${APP_MODE_PRACTICE_LABEL}：仮想資金（最初はRM10,000）。${APP_MODE_LIVE_ANALYSIS_LABEL}：投資金額を入力し、証券会社で入金・約定後に記録します。`,
  },
  {
    step: '3',
    title: '銘柄を探す',
    body: '「スクリーナー」でバルサ・米国・香港の銘柄を見比べます。気になる銘柄をタップして分析を見ます。',
  },
  {
    step: '3b',
    title: 'おすすめ配分プラン（参考）',
    body: `入金額を入力すると、購入候補と配分の参考案が出ます。証券会社への注文送信はしません。${ORDER_EXECUTION_NOTICE_JA}`,
  },
  {
    step: '4',
    title: '売買を記録する',
    body: `練習：仮想買付・仮想売却。実運用分析：証券会社で約定後、アプリに売買を記録（分析支援のみ）。`,
  },
  {
    step: '5',
    title: '成績を確認',
    body: '「保有銘柄」「成績」で、含み損益・リターンなどを確認します。わからない言葉は「？」をタップ。',
  },
];

export function BeginnerGuideScreen() {
  return (
    <Screen title="初心者ガイド" subtitle="株投資がはじめての方へ">
      <BeginnerWarningBanner />

      <Text style={styles.heading}>このアプリの使い方</Text>
      <Text style={styles.intro}>{NO_AUTO_TRADE_DISCLAIMER}</Text>

      {APP_USAGE.map((item) => (
        <Card key={item.step}>
          <Text style={styles.step}>ステップ {item.step}</Text>
          <Text style={styles.stepTitle}>{item.title}</Text>
          <Text style={styles.stepBody}>{item.body}</Text>
        </Card>
      ))}

      <Text style={styles.heading}>用語の意味（？をタップしても表示）</Text>
      {GLOSSARY_ORDER.map((key) => (
        <Card key={key}>
          <TermHint term={key} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  intro: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: theme.spacing.sm },
  step: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
  stepTitle: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '700', marginTop: 4 },
  stepBody: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 6, lineHeight: 20 },
});
