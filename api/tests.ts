import { apiFetch } from './client';

export interface TestAttemptSummary {
  id: number;
  status: 'STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  started_at?: string;
  end_at?: string;
  submitted_at?: string;
  score?: number;
  correct_count?: number;
  wrong_count?: number;
  skipped_count?: number;
  total_questions?: number;
  submission_reason?: string;
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
  myAttempt?: TestAttemptSummary | null;
}

export interface TestQuestionItem {
  id: number;
  question_order: number;
  type: string;
  question_text: string;
  passage?: string | null;
  options?: string[] | Record<string, string> | any;
  multiple_correct?: boolean;
  correct_answer?: string | null;
  marks_positive: number;
  marks_negative: number;
}

export interface TestStartResponse {
  test_id: number;
  course_name: string;
  test_title: string;
  duration_minutes: number;
  total_questions: number;
  started_at: string;
  end_at: string;
  server_time: string;
}

export interface TestQuestionsResponse {
  test_id: number;
  end_at: string;
  server_time: string;
  violation_count: number;
  questions: TestQuestionItem[];
}

export interface SubmittedAnswer {
  question_id: number;
  my_answer: string | string[] | null;
}

export interface TestReviewItem {
  questionId: number;
  questionOrder: number;
  type: string;
  questionText: string;
  passage?: string | null;
  options: any;
  correctAnswer: string;
  solution?: string | null;
  myAnswer: string | null;
  status: 'CORRECT' | 'WRONG' | 'SKIPPED';
  marksAwarded: number;
}

export interface TestResultResponse {
  test_id: number;
  course_name: string;
  test_title: string;
  id: number;
  status: string;
  started_at?: string;
  end_at?: string;
  submitted_at?: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  total_questions: number;
  submission_reason?: string;
  answers_available: boolean;
  review?: TestReviewItem[] | null;
}

export async function fetchStudentTests(courseId?: number): Promise<StudentTest[]> {
  try {
    const url = courseId ? `/api/tests?courseId=${courseId}` : '/api/tests';
    const res = await apiFetch<{ success: boolean; data: StudentTest[] }>(url);
    if (Array.isArray(res?.data)) {
      return res.data.map((t) => ({
        ...t,
        attempt: t.attempt || t.myAttempt || null,
      }));
    }
    return [];
  } catch (err) {
    console.warn('[fetchStudentTests] Error:', err);
    return [];
  }
}

export async function startTestAttempt(testId: number): Promise<TestStartResponse | null> {
  try {
    const res = await apiFetch<{ success: boolean; data: TestStartResponse }>(`/api/tests/${testId}/start`, {
      method: 'POST',
    });
    return res?.data || null;
  } catch (err) {
    console.warn('[startTestAttempt] Error:', err);
    return null;
  }
}

export async function fetchTestQuestions(testId: number): Promise<TestQuestionsResponse | null> {
  try {
    const res = await apiFetch<{ success: boolean; data: TestQuestionsResponse }>(`/api/tests/${testId}/questions`);
    return res?.data || null;
  } catch (err) {
    console.warn('[fetchTestQuestions] Error:', err);
    return null;
  }
}

export async function recordTestViolation(testId: number, type: string = 'APP_MINIMIZED'): Promise<number> {
  try {
    const res = await apiFetch<{ success: boolean; data: { violation_count: number } }>(
      `/api/tests/${testId}/violations`,
      {
        method: 'POST',
        body: JSON.stringify({ type }),
      }
    );
    return res?.data?.violation_count ?? 1;
  } catch {
    return 1;
  }
}

export async function submitTestAttempt(
  testId: number,
  answers: SubmittedAnswer[],
  submission_reason: 'STUDENT_SUBMISSION' | 'TIME_EXPIRED' | 'VIOLATION_LIMIT_EXCEEDED' = 'STUDENT_SUBMISSION',
  violation_count: number = 0
): Promise<{ success: boolean; data?: TestAttemptSummary; error?: string }> {
  try {
    const res = await apiFetch<{ success: boolean; data: TestAttemptSummary; message?: string }>(
      `/api/tests/${testId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({
          answers,
          submission_reason,
          violation_count,
        }),
      }
    );
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit test' };
  }
}

export async function fetchTestResult(testId: number): Promise<TestResultResponse | null> {
  try {
    const res = await apiFetch<{ success: boolean; data: TestResultResponse }>(`/api/tests/${testId}/result`);
    return res?.data || null;
  } catch (err) {
    console.warn('[fetchTestResult] Error:', err);
    return null;
  }
}
