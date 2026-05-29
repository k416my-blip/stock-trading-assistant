/**
 * why-did-you-render — EXPO_PUBLIC_WDYR=1 のときのみ
 */
import { WDYR_ENABLED } from './utils/devLog';

if (WDYR_ENABLED) {
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
    // optional devDependency
  }
}
