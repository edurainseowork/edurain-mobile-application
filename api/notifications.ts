import { apiFetch } from './client';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const READ_IDS_KEY = 'edurain_read_notification_ids';
const ALL_READ_TIMESTAMP_KEY = 'edurain_all_read_timestamp';

let localReadIds = new Set<number>();
let localAllReadTimestamp = 0;

// Initialize cache from AsyncStorage
AsyncStorage.getItem(READ_IDS_KEY).then((data) => {
  if (data) {
    try {
      const arr = JSON.parse(data);
      if (Array.isArray(arr)) localReadIds = new Set(arr);
    } catch {}
  }
}).catch(() => {});

AsyncStorage.getItem(ALL_READ_TIMESTAMP_KEY).then((data) => {
  if (data) {
    localAllReadTimestamp = parseInt(data, 10) || 0;
  }
}).catch(() => {});

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
    const items = Array.isArray(res?.data) ? res.data : [];
    
    // Apply local read state
    return items.map((item) => {
      const itemTime = new Date(item.createdAt).getTime();
      const isMarkedRead =
        item.isRead ||
        localReadIds.has(item.id) ||
        (localAllReadTimestamp > 0 && itemTime <= localAllReadTimestamp);
      return {
        ...item,
        isRead: isMarkedRead,
      };
    });
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

export function subscribeNotificationUpdates(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifySubscribers() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

export async function markNotificationAsRead(id: number): Promise<void> {
  localReadIds.add(id);
  AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(localReadIds))).catch(() => {});
  notifySubscribers();
  try {
    if (id > 0) {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    }
  } catch {}
}

export async function markAllNotificationsAsRead(): Promise<void> {
  localAllReadTimestamp = Date.now();
  AsyncStorage.setItem(ALL_READ_TIMESTAMP_KEY, String(localAllReadTimestamp)).catch(() => {});
  notifySubscribers();
  try {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
  } catch {}
}


