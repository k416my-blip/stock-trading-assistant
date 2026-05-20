import { Platform } from 'react-native';
import type { AlertType, NotificationSound } from '../types';
import { areNotificationsSupported } from '../utils/runtimeEnvironment';
import { resolveNotificationSound } from './notificationSounds';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;
let androidChannelReady = false;

async function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (!areNotificationsSupported()) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

async function ensureNotificationHandler(): Promise<void> {
  if (handlerConfigured) return;
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

async function ensureAndroidChannel(sound: NotificationSound): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;
  const soundName = resolveNotificationSound(sound);
  await Notifications.setNotificationChannelAsync('trading-alerts', {
    name: '取引アラート',
    importance: Notifications.AndroidImportance.HIGH,
    sound: soundName ?? undefined,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  });
  androidChannelReady = true;
}

/** Skipped in Expo Go (`Constants.appOwnership === 'expo'`). */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!areNotificationsSupported()) return null;

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;

  await ensureNotificationHandler();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!areNotificationsSupported()) return false;

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function initNotificationService(): Promise<boolean> {
  if (!areNotificationsSupported()) return false;

  await ensureNotificationHandler();
  const granted = await requestNotificationPermissions();
  if (granted) {
    await ensureAndroidChannel('default');
  }
  return granted;
}

export interface PresentNotificationInput {
  title: string;
  body: string;
  sound: NotificationSound;
  vibrationEnabled: boolean;
  alertType: AlertType;
  symbol?: string;
  market?: string;
}

export async function presentLocalNotification(input: PresentNotificationInput): Promise<void> {
  if (!areNotificationsSupported()) return;

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  const soundName = resolveNotificationSound(input.sound);
  await ensureAndroidChannel(input.sound);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: soundName === null ? undefined : soundName ?? 'default',
      data: {
        alertType: input.alertType,
        symbol: input.symbol,
        market: input.market,
      },
    },
    trigger: null,
  });
}
