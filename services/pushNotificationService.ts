import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken } from '../api/notifications';

// Configure foreground notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permissions from user (iOS & Android 13+),
 * creates the Android notification channel, gets Expo Push Token,
 * and registers it with the backend database.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Setup Android notification channel with MAX importance for heads-up popup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'EDURAIN Announcements',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F3C45',
      sound: 'default',
      showBadge: true,
    });
  }

  // In Expo Go, APNs / FCM remote push tokens are not supported by Expo SDK 52.
  // They are 100% natively supported in Standalone (.ipa / .aab) & EAS Builds.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  // Check existing permissions
  const permRes: any = await Notifications.getPermissionsAsync();
  let finalStatus = permRes?.status;

  // Request runtime permission from user if not already granted
  if (finalStatus !== 'granted') {
    const reqRes: any = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = reqRes?.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = tokenData.data;

    if (token) {
      await registerPushToken(token);
    }
  } catch {
    // Non-fatal if offline or environment limitation
  }

  return token;
}
