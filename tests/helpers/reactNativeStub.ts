/**
 * Vitest/tsx stub for react-native — avoids Flow `import typeof` in the real package.
 */
const noop = () => {};
const noopSub = () => ({ remove: noop });
const mockFn = () => noop;

export const Platform = {
  OS: 'ios',
  Version: 1,
  select: <T>(spec: { ios?: T; android?: T; default?: T }) =>
    spec.ios ?? spec.default,
};

export const AppState = {
  currentState: 'active',
  addEventListener: () => noopSub(),
  removeEventListener: noop,
};

export const Alert = { alert: mockFn };
export const Vibration = { vibrate: mockFn };

export const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (style: unknown) => style,
};

export const NativeModules = {};
export const NativeEventEmitter = () => ({
  addListener: () => noopSub(),
});

export const View = 'View';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const ScrollView = 'ScrollView';
export const Pressable = 'Pressable';
export const ActivityIndicator = 'ActivityIndicator';
export const KeyboardAvoidingView = 'KeyboardAvoidingView';

export default {
  Platform,
  AppState,
  Alert,
  Vibration,
  Dimensions,
  StyleSheet,
  NativeModules,
  NativeEventEmitter,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
};
