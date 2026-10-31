import { apiFetch } from './client';

export interface EBookItem {
  id: string;
  title: string;
  subject: string;
  courseId?: number;
  courseTitle?: string;
  totalPages: number;
  pagesRead: number;
  rating: number;
  isCourseBook: boolean;
  pdfUrl: string;
  fileSize?: string;
  createdAt?: string;
}

export async function fetchEBooks(courseId?: number | string): Promise<EBookItem[]> {
  try {
    const query = courseId && courseId !== 'all' ? `?courseId=${courseId}` : '';
    const res = await apiFetch<{ success: boolean; ebooks: EBookItem[] }>(`/api/ebooks${query}`);
    return Array.isArray(res?.ebooks) ? res.ebooks : [];
  } catch (err) {
    console.warn('[fetchEBooks] Error:', err);
    return [];
  }
}

