import { useEffect } from 'react';
import { router } from 'expo-router';
import { openPolicy } from '../../services/policyLinks';

// Android (and web): this screen opens the policy on the website, then goes back.
export default function PolicyRedirect() {
  useEffect(() => {
    openPolicy('terms');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  return null;
}
