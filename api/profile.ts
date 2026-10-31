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

export async function uploadProfilePhoto(imageUri: string): Promise<string | null> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;

    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore
    formData.append('photo', {
      uri: imageUri,
      name: filename,
      type,
    });

    const res = await fetch(`${API_BASE_URL}/api/profile/photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    return data?.data?.profilePhoto || null;
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
