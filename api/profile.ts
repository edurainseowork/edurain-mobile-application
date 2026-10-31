import { apiFetch } from './client';

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
  streakCount?: number;
  accuracyRate?: number;
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

