import { apiFetch } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StudentGoal {
  id: number;
  name: string;
  slug: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder?: number;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'JEE', slug: 'jee' },
  { id: 2, name: 'NEET', slug: 'neet' },
  { id: 3, name: 'FOUNDATION', slug: 'foundation' },
];

let cachedCategoriesInMemory: Category[] | null = null;

export async function fetchGoal(): Promise<StudentGoal | null> {
  try {
    const res = await apiFetch<{ success: boolean; goal: StudentGoal | null }>('/api/me/goal');
    return res?.goal ?? null;
  } catch {
    return null;
  }
}

export async function updateGoal(categoryId: number): Promise<{ goal: StudentGoal | null; activeCourseId?: number }> {
  try {
    const res = await apiFetch<{ success: boolean; goal: StudentGoal | null; activeCourseId?: number }>('/api/me/goal', {
      method: 'PUT',
      body: JSON.stringify({ categoryId }),
    });
    return { goal: res?.goal ?? null, activeCourseId: res?.activeCourseId };
  } catch {
    return { goal: null };
  }
}

export async function fetchCategories(): Promise<Category[]> {
  if (cachedCategoriesInMemory && cachedCategoriesInMemory.length > 0) {
    return cachedCategoriesInMemory;
  }

  try {
    const cached = await AsyncStorage.getItem('edurain_categories_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedCategoriesInMemory = parsed;
        return parsed;
      }
    }
  } catch {}

  try {
    const res = await apiFetch<Category[]>('/api/categories');
    if (Array.isArray(res) && res.length > 0) {
      cachedCategoriesInMemory = res;
      AsyncStorage.setItem('edurain_categories_cache', JSON.stringify(res)).catch(() => {});
      return res;
    }
  } catch {}

  cachedCategoriesInMemory = DEFAULT_CATEGORIES;
  return DEFAULT_CATEGORIES;
}


