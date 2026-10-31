import { apiFetch } from './client';

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

export async function fetchGoal(): Promise<StudentGoal | null> {
  try {
    const res = await apiFetch<{ success: boolean; goal: StudentGoal | null }>('/api/me/goal');
    return res?.goal ?? null;
  } catch (err) {
    console.warn('[fetchGoal] Error:', err);
    return null;
  }
}

export async function updateGoal(categoryId: number): Promise<{ goal: StudentGoal | null; activeCourseId?: number }> {
  const res = await apiFetch<{ success: boolean; goal: StudentGoal | null; activeCourseId?: number }>('/api/me/goal', {
    method: 'PUT',
    body: JSON.stringify({ categoryId }),
  });
  return { goal: res?.goal ?? null, activeCourseId: res?.activeCourseId };
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await apiFetch<Category[]>('/api/categories');
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn('[fetchCategories] Error:', err);
    return [
      { id: 1, name: 'JEE', slug: 'jee' },
      { id: 2, name: 'NEET', slug: 'neet' },
      { id: 3, name: 'FOUNDATION', slug: 'foundation' },
    ];
  }
}

