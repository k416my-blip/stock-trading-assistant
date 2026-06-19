import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type EasBuildProfile = {
  env?: Record<string, string>;
  android?: { buildType?: string };
};

describe('releaseBuildFlavor (eas.json)', () => {
  const eas = JSON.parse(readFileSync('eas.json', 'utf8')) as {
    build: Record<string, EasBuildProfile>;
  };

  it('enables 12h monitor only on preview profile', () => {
    expect(eas.build.preview.env?.EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR).toBe('1');
    expect(eas.build.production.env?.EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR).not.toBe('1');
    expect(eas.build.apk.env?.EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR).not.toBe('1');
  });

  it('uses AAB for production and APK for preview/internal smoke', () => {
    expect(eas.build.production.android?.buildType).toBe('app-bundle');
    expect(eas.build.preview.android?.buildType).toBe('apk');
    expect(eas.build.apk.android?.buildType).toBe('apk');
  });
});
