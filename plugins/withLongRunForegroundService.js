const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const SERVICE = 'expo.modules.stanativeruntime.LongRunForegroundService';

function withLongRunForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const services = app.service ?? [];

    const exists = services.some(
      (s) => s.$?.['android:name'] === SERVICE || s.$?.['android:name'] === `.LongRunForegroundService`,
    );

    if (!exists) {
      services.push({
        $: {
          'android:name': SERVICE,
          'android:exported': 'false',
          'android:stopWithTask': 'false',
          'android:foregroundServiceType': 'dataSync',
        },
      });
      app.service = services;
    }

    return cfg;
  });
}

module.exports = withLongRunForegroundService;
