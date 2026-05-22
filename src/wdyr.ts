/**
 * why-did-you-render — 開発ビルドのみ
 * 依存が無い場合はスキップ（CI/本番に影響なし）
 */
import { isDev } from './utils/isDev';

if (isDev) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const whyDidYouRender = require('@welldone-software/why-did-you-render');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    whyDidYouRender(React, {
      trackAllPureComponents: false,
      trackHooks: true,
      logOnDifferentValues: true,
      collapseGroups: true,
    });
  } catch {
    // optional devDependency — install with: npm i -D @welldone-software/why-did-you-render
  }
}
