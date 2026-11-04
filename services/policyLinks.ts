import { Linking, Platform } from 'react-native';
import { router } from 'expo-router';

// Android: Privacy Policy and Terms open on the website (same policy as the web app).
// iOS: they open inside the app (app/privacy.ios.tsx, app/terms.ios.tsx).
export const POLICY_URLS = {
  privacy: 'https://edurain.in/privacy',
  terms: 'https://edurain.in/terms',
} as const;

export type PolicyKind = keyof typeof POLICY_URLS;

export function openPolicy(kind: PolicyKind) {
  if (Platform.OS === 'ios') {
    router.push(`/${kind}` as any);
    return;
  }
  Linking.openURL(POLICY_URLS[kind]).catch(() => {});
}
