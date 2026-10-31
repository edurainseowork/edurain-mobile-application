import { auth } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://sjlfsfe8jf.execute-api.ap-south-1.amazonaws.com'
).replace(/\/+$/, '');

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
  const url = `${API_BASE_URL}${cleanPath}`;

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

  const response = await fetch(url, {
    ...options,
    headers,
  });

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

