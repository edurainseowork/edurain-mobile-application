import { apiFetch } from './client';
import { Platform } from 'react-native';

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type?: string;
  imageUrl?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  liveClass?: {
    id: number;
    title: string;
    meetUrl?: string | null;
    status: 'scheduled' | 'live' | 'ended';
  } | null;
}

export async function registerPushToken(token: string): Promise<void> {
  try {
    await apiFetch('/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }),
    });
  } catch (err) {
    console.warn('[registerPushToken] Failed to register push token:', err);
  }
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: NotificationItem[] }>('/api/notifications');
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id: number): Promise<void> {
  try {
    if (id > 0) {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    }
  } catch {}
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
  } catch {}
}

