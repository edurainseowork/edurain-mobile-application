import { apiFetch, API_BASE_URL } from './client';
import { auth } from '../firebaseConfig';

export interface StudentStats {
  pace?: { secondsPerQuestion: number; tests: number } | null;
  accuracy?: { percent: number; correct: number; answered: number; platformPercent: number | null } | null;
  standing?: { topPercent: number; rank: number; students: number; averagePercent: number } | null;
  latestTest?: { title: string; rank: number; students: number; score: number; maxMarks: number; positionsGained: number | null } | null;
  syllabus?: { percent: number; done: number; total: number; focus: { title: string; remaining: number } | null } | null;
}

export interface EnrolledCourseItem {
  id: number;
  title: string;
  category: string;
  thumbnail?: string | null;
  purchasedAt?: string;
}

export interface StudentProfile {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  profilePhoto?: string | null;
  memberSince?: string;
  streak?: {
    current: number;
    longest: number;
    lastActiveAt?: string;
  };
  streakCount?: number;
  accuracyRate?: number;
  courses?: EnrolledCourseItem[];
  stats?: StudentStats | null;
}

export async function fetchProfile(): Promise<StudentProfile> {
  const res = await apiFetch<{ success: boolean; data: StudentProfile }>('/api/profile');
  return res.data;
}

export async function updateProfile(
  patch: Partial<Pick<StudentProfile, 'name' | 'phone' | 'gender' | 'address' | 'city' | 'state' | 'pincode'>>
): Promise<StudentProfile> {
  const res = await apiFetch<{ success: boolean; data: StudentProfile }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return res.data;
}

/**
 * Moves the login number to `phone` after its OTP was verified (MSG91 access token).
 * Then refreshes the sign-in token so the new number is used right away.
 */
export async function changeLoginPhone(phone: string, accessToken: string): Promise<string> {
  const res = await apiFetch<{ success: boolean; phone: string }>('/api/auth/change-phone', {
    method: 'POST',
    body: JSON.stringify({ phone, accessToken }),
  });
  await auth.currentUser?.getIdToken(true).catch(() => {});
  return res.phone;
}

function base64ToUint8Array(base64: string): Uint8Array {
  // Safe base64 decoding for binary image upload without external dependencies
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let validLen = clean.length;
  if (clean.endsWith('==')) validLen -= 2;
  else if (clean.endsWith('=')) validLen -= 1;

  const byteLength = Math.max(0, Math.floor((validLen * 3) / 4));
  const bytes = new Uint8Array(byteLength);
  let p = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const enc1 = chars.indexOf(clean[i]);
    const enc2 = chars.indexOf(clean[i + 1]);
    const enc3 = i + 2 < clean.length ? chars.indexOf(clean[i + 2]) : 64;
    const enc4 = i + 3 < clean.length ? chars.indexOf(clean[i + 3]) : 64;

    if (enc1 === -1 || enc2 === -1) break;

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    if (p < byteLength) bytes[p++] = chr1;

    if (enc3 !== 64 && enc3 !== -1 && p < byteLength) {
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      bytes[p++] = chr2;
    }
    if (enc4 !== 64 && enc4 !== -1 && p < byteLength) {
      const chr3 = ((enc3 & 3) << 6) | enc4;
      bytes[p++] = chr3;
    }
  }

  return bytes;
}

export async function uploadProfilePhoto(imageUri: string, base64?: string): Promise<string | null> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;

    // Strategy 1: Raw binary payload (Backend Express express.raw)
    if (base64) {
      try {
        const uint8 = base64ToUint8Array(base64);
        const res = await fetch(`${API_BASE_URL}/api/profile/photo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'image/jpeg',
          },
          body: uint8 as any,
        });

        if (res.ok) {
          const json = await res.json().catch(() => null);
          const photoUrl = json?.data?.profilePhoto || json?.profilePhoto;
          if (photoUrl) return photoUrl;
        }
      } catch (err) {
        console.warn('[uploadProfilePhoto] raw binary attempt error:', err);
      }
    }

    // Strategy 2: Multipart form-data with 'photo' field (Backend Multer single('photo'))
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: imageUri,
        name: 'profile-photo.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${API_BASE_URL}/api/profile/photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const photoUrl = json?.data?.profilePhoto || json?.profilePhoto;
        if (photoUrl) return photoUrl;
      }
    } catch (err) {
      console.warn('[uploadProfilePhoto] multipart form attempt error:', err);
    }

    return null;
  } catch (err) {
    console.warn('[uploadProfilePhoto] Error:', err);
    return null;
  }
}

export async function removeProfilePhoto(): Promise<boolean> {
  try {
    await apiFetch('/api/profile/photo', { method: 'DELETE' });
    return true;
  } catch {
    return true; // gracefully clear local photo
  }
}

export async function deleteAccount(): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch<{ success: boolean; message: string }>('/api/profile', {
    method: 'DELETE',
  });
  return res;
}

export async function recordStreakActivity(): Promise<void> {
  try {
    await apiFetch('/api/progress/streak', { method: 'POST' });
  } catch {
    // Fail silently in background
  }
}
