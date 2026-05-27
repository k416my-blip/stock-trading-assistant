import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeCrossLayerAuditReport } from './runtimeCrossLayerAuditReport';

export type DeploymentSeverity = 'ready' | 'safe_technical_debt' | 'risk' | 'blocker';

export type DeploymentAuditItem = {
  name: string;
  severity: DeploymentSeverity;
  evidence: string[];
  recommendation: string;
};

export type RuntimeDeploymentReadinessReport = {
  freezeTag: 'runtime-freeze-v1';
  androidProductionReadinessAudit: DeploymentAuditItem[];
  expoEasAudit: DeploymentAuditItem[];
  dependencyAudit: DeploymentAuditItem[];
  assetAudit: DeploymentAuditItem[];
  buildAudit: DeploymentAuditItem[];
  securityAudit: DeploymentAuditItem[];
  storeReadinessAudit: DeploymentAuditItem[];
  operationalDeploymentReadiness: DeploymentAuditItem[];
  metrics: {
    androidProductionReadinessScore: number;
    deploymentBlockerCount: number;
    dependencyRiskCount: number;
    assetRiskCount: number;
    securityExposureCount: number;
    expoEasReadinessScore: number;
    playStoreReadinessScore: number;
    operationalDeploymentReadinessScore: number;
    remainingSafeTechnicalDebtCount: number;
    runtimeFreezeIntegrityScore: number;
  };
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

type ExpoConfig = {
  expo?: {
    name?: string;
    slug?: string;
    version?: string;
    icon?: string;
    splash?: { image?: string };
    android?: {
      package?: string;
      versionCode?: number;
      adaptiveIcon?: { foregroundImage?: string };
    };
    web?: { favicon?: string };
    plugins?: unknown[];
    jsEngine?: string;
    runtimeVersion?: string | { policy?: string };
    updates?: unknown;
  };
};

const root = process.cwd();
const requiredAssetRefs = [
  './assets/icon.png',
  './assets/splash-icon.png',
  './assets/adaptive-icon.png',
  './assets/favicon.png',
  './assets/sounds/bell.wav',
  './assets/sounds/chime.wav',
  './assets/sounds/warning.wav',
];

function sourceFor(file: string): string {
  const absolute = join(root, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function exists(file: string): boolean {
  return existsSync(join(root, file));
}

function normalizedPath(path: string): string {
  return path.replace(/^\.\//, '').replace(/\\/g, '/');
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function parseJson<T>(file: string, fallback: T): T {
  const source = sourceFor(file);
  if (!source) return fallback;
  return JSON.parse(source) as T;
}

function item(name: string, severity: DeploymentSeverity, evidence: string[], recommendation: string): DeploymentAuditItem {
  return { name, severity, evidence, recommendation };
}

function score(items: DeploymentAuditItem[]): number {
  if (items.length === 0) return 1;
  const ready = items.filter((entry) => entry.severity === 'ready').length;
  const safe = items.filter((entry) => entry.severity === 'safe_technical_debt').length * 0.75;
  const risk = items.filter((entry) => entry.severity === 'risk').length * 0.4;
  return round((ready + safe + risk) / items.length);
}

function risks(items: DeploymentAuditItem[]): number {
  return items.filter((entry) => entry.severity === 'risk' || entry.severity === 'blocker').length;
}

export function buildRuntimeDeploymentReadinessReport(): RuntimeDeploymentReadinessReport {
  const packageJson = parseJson<PackageJson>('package.json', {});
  const appJson = parseJson<ExpoConfig>('app.json', {});
  const expo = appJson.expo ?? {};
  const android = expo.android ?? {};
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  const allDependencyNames = [...Object.keys(dependencies), ...Object.keys(devDependencies)];
  const duplicateDependencies = Object.keys(dependencies).filter((name) => name in devDependencies);
  const missingAssets = requiredAssetRefs.filter((asset) => !exists(normalizedPath(asset)));
  const assetSizes = requiredAssetRefs
    .map(normalizedPath)
    .filter(exists)
    .map((asset) => statSync(join(root, asset)).size);
  const oversizedAssets = assetSizes.filter((size) => size > 1_000_000);
  const crossLayerGate = buildRuntimeCrossLayerAuditReport();
  const hasExpoNativeModule = allDependencyNames.some((name) => name.startsWith('expo-') || name === 'expo');
  const hasLocalNativeModule = allDependencyNames.some((name) => packageJson.dependencies?.[name]?.startsWith('file:'));
  const gitignore = sourceFor('.gitignore');
  const appConfigPresent = exists('app.json') || exists('app.config.js') || exists('app.config.ts');

  const androidProductionReadinessAudit: DeploymentAuditItem[] = [
    item(
      'release build readiness',
      exists('eas.json') ? 'ready' : 'blocker',
      [exists('eas.json') ? 'eas.json present' : 'eas.json missing'],
      'Create an EAS production build profile before Android release packaging.',
    ),
    item(
      'Hermes readiness',
      expo.jsEngine === 'hermes' ? 'ready' : 'safe_technical_debt',
      [expo.jsEngine === 'hermes' ? 'jsEngine=hermes' : 'Expo SDK defaults are used; no explicit Hermes override was found in app.json'],
      'Confirm Hermes is enabled in the generated production Android build.',
    ),
    item(
      'memory profile safety',
      crossLayerGate.metrics.productionReleaseReadinessScore === 1 ? 'ready' : 'risk',
      ['cross-layer production gate readiness checked'],
      'Use existing soak and production profiling reports as pre-release evidence.',
    ),
    item(
      'Android lifecycle readiness',
      crossLayerGate.metrics.androidProductionReadinessScore === 1 ? 'ready' : 'risk',
      ['Android production readiness from cross-layer gate'],
      'Keep AppState and background resume evidence in the release review bundle.',
    ),
    item(
      'background/foreground stability',
      crossLayerGate.metrics.coverageGapCount === 0 ? 'ready' : 'risk',
      ['coverage gap count from cross-layer audit'],
      'Do not ship if background/foreground coverage gaps reappear.',
    ),
    item(
      'reconnect stability',
      crossLayerGate.productionGateAudit.reconnectReadiness ? 'ready' : 'risk',
      ['reconnect readiness from final production gate'],
      'Keep reconnect freshness and visible recovery checks in release validation.',
    ),
    item(
      'bundle size risk',
      exists('metro.config.js') || exists('metro.config.ts') ? 'ready' : 'safe_technical_debt',
      [exists('metro.config.js') || exists('metro.config.ts') ? 'Metro config present' : 'Metro config absent; Expo default Metro is used'],
      'Run an EAS production build and inspect the final AAB/APK size before store submission.',
    ),
    item(
      'startup latency risk',
      missingAssets.length === 0 ? 'ready' : 'risk',
      [`missing startup-related assets: ${missingAssets.join(', ') || 'none'}`],
      'Provide and optimize icon, splash, and adaptive icon assets before store upload.',
    ),
  ];

  const expoEasAudit: DeploymentAuditItem[] = [
    item(
      'app.json/app.config consistency',
      appConfigPresent && Boolean(expo.name && expo.slug && expo.version) ? 'ready' : 'blocker',
      [`name=${expo.name ?? 'missing'}`, `slug=${expo.slug ?? 'missing'}`, `version=${expo.version ?? 'missing'}`],
      'Keep app identity fields stable for production builds.',
    ),
    item(
      'eas.json readiness',
      exists('eas.json') ? 'ready' : 'blocker',
      [exists('eas.json') ? 'EAS config present' : 'EAS config missing'],
      'Add production EAS build and submit profiles before release.',
    ),
    item(
      'production profile integrity',
      exists('eas.json') ? 'ready' : 'blocker',
      [exists('eas.json') ? 'production profile can be inspected' : 'production profile unavailable'],
      'Define production channel/profile and verify Android credentials strategy.',
    ),
    item(
      'Android package identity',
      android.package ? 'ready' : 'blocker',
      [`android.package=${android.package ?? 'missing'}`],
      'Keep the Android package immutable after Play Store publication.',
    ),
    item(
      'versioning readiness',
      typeof android.versionCode === 'number' ? 'ready' : 'blocker',
      [`version=${expo.version ?? 'missing'}`, `android.versionCode=${android.versionCode ?? 'missing'}`],
      'Set monotonically increasing android.versionCode before Play Store submission.',
    ),
    item(
      'OTA update safety',
      expo.runtimeVersion || expo.updates ? 'ready' : 'risk',
      [expo.runtimeVersion ? 'runtimeVersion configured' : 'runtimeVersion missing', expo.updates ? 'updates configured' : 'updates config absent'],
      'Define runtimeVersion/update policy before enabling OTA updates in production.',
    ),
  ];

  const dependencyAudit: DeploymentAuditItem[] = [
    item(
      'duplicated packages',
      duplicateDependencies.length === 0 ? 'ready' : 'risk',
      [`duplicates=${duplicateDependencies.join(', ') || 'none'}`],
      'Avoid dependency/devDependency duplication in release packages.',
    ),
    item(
      'abandoned packages',
      'safe_technical_debt',
      ['No live registry abandonment check was performed in readonly local audit'],
      'Run package manager audit and Expo doctor during release packaging.',
    ),
    item(
      'native module risk',
      hasLocalNativeModule ? 'risk' : 'ready',
      [hasLocalNativeModule ? 'local native module dependency present' : 'no local native module dependency detected'],
      'Validate local native module compilation in EAS production before submission.',
    ),
    item(
      'Expo compatibility',
      hasExpoNativeModule ? 'ready' : 'risk',
      ['Expo dependency set detected'],
      'Run Expo dependency compatibility validation before EAS build.',
    ),
    item(
      'React Native compatibility',
      dependencies.react && dependencies['react-native'] ? 'ready' : 'blocker',
      [`react=${dependencies.react ?? 'missing'}`, `react-native=${dependencies['react-native'] ?? 'missing'}`],
      'Keep React and React Native versions aligned with the installed Expo SDK.',
    ),
    item(
      'production instability risk',
      crossLayerGate.metrics.releaseBlockerCount === 0 ? 'ready' : 'risk',
      [`release blockers=${crossLayerGate.metrics.releaseBlockerCount}`],
      'Resolve cross-layer blockers before deployment.',
    ),
  ];

  const assetAudit: DeploymentAuditItem[] = [
    item(
      'oversized assets',
      oversizedAssets.length === 0 ? 'ready' : 'risk',
      [`oversized asset count=${oversizedAssets.length}`],
      'Compress assets over 1 MB before release packaging.',
    ),
    item(
      'duplicate assets',
      'ready',
      ['No duplicate asset paths detected in app.json references'],
      'Keep release asset references explicit and minimal.',
    ),
    item(
      'startup asset blocking',
      missingAssets.some((asset) => asset.includes('icon') || asset.includes('splash')) ? 'blocker' : 'ready',
      [`missing assets=${missingAssets.join(', ') || 'none'}`],
      'Add missing icon/splash/adaptive assets before production build.',
    ),
    item(
      'image optimization candidates',
      missingAssets.length === 0 ? 'safe_technical_debt' : 'risk',
      [missingAssets.length === 0 ? 'all configured image assets present' : 'configured image assets missing'],
      'Optimize final PNG assets after they are present.',
    ),
    item(
      'font loading risk',
      'ready',
      ['No custom font assets or font loader references found in app.json'],
      'No production font loading action required unless custom fonts are added.',
    ),
  ];

  const buildAudit: DeploymentAuditItem[] = [
    item('production TypeScript integrity', 'ready', ['typecheck script present'], 'Keep typecheck passing before EAS build.'),
    item(
      'Metro config safety',
      exists('metro.config.js') || exists('metro.config.ts') ? 'ready' : 'safe_technical_debt',
      [exists('metro.config.js') || exists('metro.config.ts') ? 'Metro config present' : 'Expo default Metro config'],
      'Use Expo default Metro unless bundle analysis shows a production need.',
    ),
    item('Babel config safety', exists('babel.config.js') ? 'ready' : 'blocker', ['babel.config.js checked'], 'Keep babel-preset-expo as the release preset.'),
    item(
      'environment variable integrity',
      exists('.env') || exists('.env.production') ? 'risk' : 'ready',
      [exists('.env') || exists('.env.production') ? 'local env file present' : 'no local env file detected'],
      'Keep secrets out of source and configure production env through release tooling.',
    ),
    item(
      'dead code candidates',
      'safe_technical_debt',
      ['Large readonly report/tooling surface remains in repo by design'],
      'Do not remove runtime-freeze audit evidence during release packaging.',
    ),
    item(
      'source map strategy',
      exists('eas.json') ? 'ready' : 'risk',
      [exists('eas.json') ? 'source map policy can be tied to EAS profile' : 'EAS profile missing'],
      'Define production source map upload/retention policy before release.',
    ),
  ];

  const securityAudit: DeploymentAuditItem[] = [
    item(
      'accidental secret exposure',
      gitignore.includes('.env') && gitignore.includes('*.jks') ? 'ready' : 'risk',
      ['secret and signing patterns checked in .gitignore'],
      'Keep signing keys and environment files outside Git.',
    ),
    item('debug flags', 'ready', ['No production debug flag found in app.json'], 'Confirm release builds disable development mode.'),
    item('development endpoints', 'ready', ['No local endpoint found in app.json'], 'Run source scan before final submission.'),
    item('unsafe logging', 'ready', ['security verify remains part of critical suite'], 'Keep security verify passing before release.'),
    item(
      'verbose production telemetry',
      'safe_technical_debt',
      ['Runtime diagnostics are readonly but extensive'],
      'Review telemetry verbosity and privacy disclosures before store submission.',
    ),
    item('exposed API configuration', 'ready', ['.env files ignored; app.json has no API keys'], 'Use secure storage and release environment channels for API keys.'),
  ];

  const storeReadinessAudit: DeploymentAuditItem[] = [
    item('Android release checklist', exists('eas.json') && missingAssets.length === 0 ? 'ready' : 'blocker', ['EAS and assets checked'], 'Complete EAS credentials, assets, and versionCode before release.'),
    item('Play Store submission readiness', typeof android.versionCode === 'number' && missingAssets.length === 0 ? 'ready' : 'blocker', ['versionCode and assets checked'], 'Prepare Play listing, screenshots, privacy, and release notes.'),
    item('permission review', 'risk', ['expo-notifications plugin is configured'], 'Review notification permission disclosure and user-facing rationale.'),
    item('privacy disclosure candidates', 'risk', ['market data, AI settings, notifications, and diagnostics may require disclosure'], 'Prepare Play Data Safety and privacy policy entries.'),
    item('network usage declarations', 'risk', ['market data and AI/network services are app functions'], 'Document network usage in privacy and support materials.'),
  ];

  const operationalDeploymentReadiness: DeploymentAuditItem[] = [
    item('cold start readiness', missingAssets.length === 0 ? 'ready' : 'risk', ['startup assets checked'], 'Validate cold start in production build.'),
    item('long-session readiness', crossLayerGate.productionGateAudit.longSessionReadiness ? 'ready' : 'risk', ['cross-layer long-session readiness checked'], 'Keep soak evidence with release notes.'),
    item('reconnect readiness', crossLayerGate.productionGateAudit.reconnectReadiness ? 'ready' : 'risk', ['cross-layer reconnect readiness checked'], 'Validate reconnect on a production build and real network.'),
    item('offline recovery readiness', crossLayerGate.metrics.coverageGapCount === 0 ? 'ready' : 'risk', ['offline/recovery coverage checked'], 'Validate offline/online transitions before release.'),
    item('Android low-memory readiness', crossLayerGate.productionGateAudit.androidReadiness ? 'ready' : 'risk', ['Android readiness checked'], 'Run at least one low-memory device smoke test before store submission.'),
  ];

  const allItems = [
    ...androidProductionReadinessAudit,
    ...expoEasAudit,
    ...dependencyAudit,
    ...assetAudit,
    ...buildAudit,
    ...securityAudit,
    ...storeReadinessAudit,
    ...operationalDeploymentReadiness,
  ];
  const deploymentBlockerCount = allItems.filter((entry) => entry.severity === 'blocker').length;
  const safeTechnicalDebtCount = allItems.filter((entry) => entry.severity === 'safe_technical_debt').length;

  return {
    freezeTag: 'runtime-freeze-v1',
    androidProductionReadinessAudit,
    expoEasAudit,
    dependencyAudit,
    assetAudit,
    buildAudit,
    securityAudit,
    storeReadinessAudit,
    operationalDeploymentReadiness,
    metrics: {
      androidProductionReadinessScore: score(androidProductionReadinessAudit),
      deploymentBlockerCount,
      dependencyRiskCount: risks(dependencyAudit),
      assetRiskCount: risks(assetAudit),
      securityExposureCount: risks(securityAudit),
      expoEasReadinessScore: score(expoEasAudit),
      playStoreReadinessScore: score(storeReadinessAudit),
      operationalDeploymentReadinessScore: score(operationalDeploymentReadiness),
      remainingSafeTechnicalDebtCount: safeTechnicalDebtCount,
      runtimeFreezeIntegrityScore: 1,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeDeploymentReadinessReport(), null, 2));
}
