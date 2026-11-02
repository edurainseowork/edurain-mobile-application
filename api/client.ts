import { auth } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FALLBACK_API_URL = (
  process.env.EXPO_PUBLIC_FALLBACK_API_URL || 'https://sjlfsfe8jf.execute-api.ap-south-1.amazonaws.com'
).replace(/\/+$/, '');

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_URL
).replace(/\/+$/, '');

export const SOCKET_URL = (
  process.env.EXPO_PUBLIC_SOCKET_URL || API_BASE_URL
).replace(/\/+$/, '');

let localDownUntil = 0;

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const now = Date.now();
  const shouldSkipLocal = now < localDownUntil;
  let url = (!shouldSkipLocal ? API_BASE_URL : FALLBACK_API_URL) + cleanPath;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach Firebase ID Token if student is signed in
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('[apiFetch] Could not retrieve auth token:', err);
  }

  let response: Response;
  const isLocal = !url.includes('amazonaws.com') && !url.includes('https://');
  try {
    const controller = new AbortController();
    const timeoutMs = isLocal ? 800 : 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (networkErr) {
    if (isLocal) {
      localDownUntil = Date.now() + 300000; // Skip unreachable local server for 5 minutes
    }
    if (url !== `${FALLBACK_API_URL}${cleanPath}`) {
      url = `${FALLBACK_API_URL}${cleanPath}`;
      const fallbackController = new AbortController();
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 12000);
      try {
        response = await fetch(url, {
          ...options,
          headers,
          signal: options.signal || fallbackController.signal,
        });
      } finally {
        clearTimeout(fallbackTimeout);
      }
    } else {
      throw networkErr;
    }
  }

  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (typeof responseData === 'object' && (responseData?.error || responseData?.message)) ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return responseData as T;
}

