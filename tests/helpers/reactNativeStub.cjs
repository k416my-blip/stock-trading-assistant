const noop = () => {};
const noopSub = () => ({ remove: noop });

const Platform = {
  OS: 'ios',
  Version: 1,
  select: (spec) => spec.ios ?? spec.default,
};

const AppState = {
  currentState: 'active',
  addEventListener: () => noopSub(),
  removeEventListener: noop,
};

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
};

const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
};

module.exports = {
  Platform,
  AppState,
  Alert: { alert: noop },
  Vibration: { vibrate: noop },
  Dimensions,
  StyleSheet,
  NativeModules: {},
  NativeEventEmitter: () => ({ addListener: () => noopSub() }),
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  default: {
    Platform,
    AppState,
    Alert: { alert: noop },
    Vibration: { vibrate: noop },
    Dimensions,
    StyleSheet,
    NativeModules: {},
    NativeEventEmitter: () => ({ addListener: () => noopSub() }),
    View: 'View',
    Text: 'Text',
  },
};
