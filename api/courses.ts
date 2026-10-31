import { apiFetch } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Course {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  thumbnail?: string | null;
  banner?: string | null;
  category: string;
  categoryId?: number | null;
  instructorName?: string | null;
  playProductId?: string | null;
  totalLectures?: number;
  totalDurationHours?: number;
  isPopular?: boolean;
  status?: string;
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  icon?: string | null;
}

export interface Banner {
  id: number;
  title?: string | null;
  imageUrl: string;
  actionUrl?: string | null;
  targetType?: string | null;
  targetId?: number | null;
}

export interface StudentGoal {
  id: number | null;
  name: string;
}

export interface SyncVersions {
  courses: number;
  categories: number;
  banners: number;
  support: number;
}

let syncClientId: string | null = null;
async function getSyncClientId(): Promise<string> {
  if (syncClientId) return syncClientId;
  try {
    const saved = await AsyncStorage.getItem('edurain_sync_client_id');
    if (saved) {
      syncClientId = saved;
      return saved;
    }
    const generated = `mob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem('edurain_sync_client_id', generated);
    syncClientId = generated;
    return generated;
  } catch {
    return 'mob_default';
  }
}

export async function fetchCourses(): Promise<Course[]> {
  const res = await apiFetch<{ success?: boolean; data?: Course[] }>('/api/courses');
  return Array.isArray(res) ? res : res?.data || [];
}

export async function fetchCourseById(id: number | string): Promise<Course> {
  const res = await apiFetch<{ success?: boolean; data?: Course }>(`/api/courses/${id}`);
  return (res as any)?.data || res;
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await apiFetch<{ success?: boolean; data?: Category[] }>('/api/categories');
    const list = Array.isArray(res) ? res : res?.data || [];
    if (list.length > 0) return list;
  } catch {}
  return [
    { id: 1, name: 'JEE', slug: 'jee' },
    { id: 2, name: 'NEET', slug: 'neet' },
    { id: 3, name: 'FOUNDATION', slug: 'foundation' },
  ];
}

export async function fetchBanners(): Promise<Banner[]> {
  const res = await apiFetch<{ success?: boolean; data?: Banner[] }>('/api/banners');
  return Array.isArray(res) ? res : res?.data || [];
}

export async function fetchStudentGoal(): Promise<StudentGoal | null> {
  try {
    const res = await apiFetch<{
      success: boolean;
      goal?: { id: number; name: string } | null;
      data?: StudentGoal | null;
    }>('/api/me/goal');
    if (res?.goal) {
      const g: StudentGoal = { id: res.goal.id, name: res.goal.name };
      await AsyncStorage.setItem('edurain_student_goal', JSON.stringify(g));
      return g;
    }
    if (res?.data) {
      await AsyncStorage.setItem('edurain_student_goal', JSON.stringify(res.data));
      return res.data;
    }
  } catch {}

  try {
    const cached = await AsyncStorage.getItem('edurain_student_goal');
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

export async function saveStudentGoal(categoryName: string, categoryId?: number | null): Promise<StudentGoal> {
  let targetId = categoryId;
  if (!targetId) {
    try {
      const cats = await fetchCategories();
      const match = cats.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (match) targetId = match.id;
    } catch {}
  }

  if (targetId) {
    try {
      const res = await apiFetch<{ success: boolean; goal?: { id: number; name: string } }>('/api/me/goal', {
        method: 'PUT',
        body: JSON.stringify({ categoryId: targetId }),
      });
      if (res?.goal) {
        const g: StudentGoal = { id: res.goal.id, name: res.goal.name };
        await AsyncStorage.setItem('edurain_student_goal', JSON.stringify(g));
        return g;
      }
    } catch (err) {
      console.warn('[saveStudentGoal] Remote save failed, falling back to local storage:', err);
    }
  }

  const fallback: StudentGoal = { id: targetId ?? null, name: categoryName };
  await AsyncStorage.setItem('edurain_student_goal', JSON.stringify(fallback));
  return fallback;
}

export async function fetchActiveCourse(): Promise<Course | null> {
  try {
    const res = await apiFetch<{ success: boolean; data: Course | null }>('/api/me/active-course');
    return res?.data ?? null;
  } catch {
    return null;
  }
}

export async function setActiveCourse(courseId: number): Promise<void> {
  await apiFetch('/api/me/active-course', {
    method: 'PUT',
    body: JSON.stringify({ courseId }),
  });
}

export async function fetchEnrolledCourseIds(): Promise<number[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: number[] }>('/api/enrollments/enrolled-ids');
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function fetchSyncVersions(): Promise<SyncVersions | null> {
  try {
    const clientId = await getSyncClientId();
    const res = await apiFetch<{ success: boolean; versions: SyncVersions }>(`/api/sync/versions?c=${clientId}`);
    return res?.versions ?? null;
  } catch {
    return null;
  }
}

