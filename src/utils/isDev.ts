/** React Native の __DEV__ と Node 検証スクリプトの両方で使える開発モード判定 */
export const isDev =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : typeof process !== 'undefined'
      ? process.env.NODE_ENV !== 'production'
      : false;
