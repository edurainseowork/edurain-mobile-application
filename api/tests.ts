import { apiFetch } from './client';

export interface TestAttemptSummary {
  id: number;
  status: 'STARTED' | 'SUBMITTED' | 'EXPIRED';
  started_at?: string;
  end_at?: string;
  submitted_at?: string;
  score?: number;
  correct_count?: number;
  wrong_count?: number;
  skipped_count?: number;
  total_questions?: number;
}

export interface StudentTest {
  id: number;
  courseId: number;
  courseName: string;
  title: string;
  description?: string | null;
  targetBatch?: string | null;
  status: 'SCHEDULED' | 'PUBLISHED' | 'COMPLETED';
  publishTime: string;
  closeTime?: string | null;
  durationMinutes: number;
  marksPositive: number;
  marksNegative: number;
  totalQuestions: number;
  attempt?: TestAttemptSummary | null;
}

export async function fetchStudentTests(courseId?: number): Promise<StudentTest[]> {
  try {
    const url = courseId ? `/api/tests?courseId=${courseId}` : '/api/tests';
    const res = await apiFetch<{ success: boolean; data: StudentTest[] }>(url);
    return Array.isArray(res?.data) ? res.data : [];
  } catch (err) {
    console.warn('[fetchStudentTests] Error:', err);
    return [];
  }
}

