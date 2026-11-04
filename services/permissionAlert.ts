import { Alert, Linking } from 'react-native';

/** Permission was refused: explain why, and offer to open the app's settings to allow it. */
export function showPermissionAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
  ]);
}
