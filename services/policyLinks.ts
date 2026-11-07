import { router } from 'expo-router';

// Privacy Policy and Terms open inside the app (Android and iOS), with the same text as the website.
export type PolicyKind = 'privacy' | 'terms';

export function openPolicy(kind: PolicyKind) {
  router.push(`/${kind}` as any);
}
