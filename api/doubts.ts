import { apiFetch } from './client';

export interface ChatMessage {
  id: string;
  sender: 'student' | 'ta';
  senderName: string;
  text: string;
  time: string;
  avatar?: string;
  attachmentUrl?: string;
  attachmentUrls?: string[];
}

export interface DoubtTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  title: string;
  questionFull?: string;
  description?: string;
  examTag?: string;
  status: 'queue' | 'in_progress' | 'resolution_requested' | 'resolved' | string;
  submittedAt?: string;
  submittedAtRelative?: string;
  resolvedAt?: string;
  assignedMentor?: string;
  rating?: number;
  diagramUrl?: string;
  diagramUrls?: string[];
  messages?: ChatMessage[];
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface QuotaStatus {
  isAllowed: boolean;
  reason: string | null;
  questionsUsed: number;
  questionsLimit: number;
  questionsLeft: number;
}

export async function fetchStudentDoubtTickets(email?: string): Promise<DoubtTicket[]> {
  try {
    const query = email ? `?email=${encodeURIComponent(email.trim())}` : '';
    const res = await apiFetch<any>(`/api/tickets/my${query}`);
    if (res?.data && Array.isArray(res.data)) {
      return res.data.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber || t.id,
        subject: t.subject || 'General',
        title: t.title || t.questionSnippet || 'Doubt Session',
        questionFull: t.questionFull || t.questionSnippet || '',
        description: t.questionFull || t.questionSnippet || '',
        examTag: t.examTag || 'JEE / NEET',
        status: t.status || 'queue',
        submittedAt: t.submittedAt,
        submittedAtRelative: t.submittedAtRelative || 'Recently',
        resolvedAt: t.resolvedAt,
        assignedMentor: t.assignedTo?.name || 'EduRain Senior Faculty',
        diagramUrl: t.diagramUrl,
        diagramUrls: t.diagramUrls || (t.diagramUrl ? [t.diagramUrl] : []),
        messages: t.messages || [],
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function submitDoubtTicket(data: {
  subject: string;
  title: string;
  description: string;
  examTag?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  diagramUrl?: string;
}): Promise<{ success: boolean; ticket?: any; error?: string }> {
  try {
    const res = await apiFetch<any>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title || `${data.subject} Problem`,
        subject: data.subject,
        description: data.description,
        question: data.description,
        examTag: data.examTag || 'JEE Main & Advanced',
        studentName: data.studentName || 'Student',
        studentEmail: data.studentEmail || 'student@edurain.in',
        studentPhone: data.studentPhone || '',
        diagramUrl: data.diagramUrl || null,
      }),
    });
    return { success: true, ticket: res?.ticket || res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit doubt' };
  }
}

export async function sendTicketReply(params: {
  ticketId: string;
  text: string;
  senderName: string;
  attachmentUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch(`/api/tickets/${params.ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({
        text: params.text,
        senderName: params.senderName,
        sender: 'student',
        attachmentUrl: params.attachmentUrl,
      }),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send reply' };
  }
}

export async function askEduAi(prompt: string, cohort?: string): Promise<{ text: string }> {
  try {
    const res = await apiFetch<any>('/api/ai/doubt/stream', {
      method: 'POST',
      body: JSON.stringify({
        message: prompt,
        cohort: cohort || 'JEE_MAIN_ADV',
      }),
    });
    if (typeof res === 'string') return { text: res };
    return { text: res?.response || res?.text || res?.content || 'AI Tutor processed your inquiry.' };
  } catch (err: any) {
    return {
      text: 'The AI Tutor analyzed your question. For a detailed step-by-step breakdown, please review the formula and conditions carefully.',
    };
  }
}

export async function fetchAiQuota(): Promise<QuotaStatus> {
  try {
    const res = await apiFetch<any>('/api/ai/doubt/quota');
    return {
      isAllowed: res?.isAllowed ?? true,
      reason: res?.reason ?? null,
      questionsUsed: res?.questionsUsed ?? 0,
      questionsLimit: res?.questionsLimit ?? 30,
      questionsLeft: res?.questionsLeft ?? 30,
    };
  } catch {
    return {
      isAllowed: true,
      reason: null,
      questionsUsed: 0,
      questionsLimit: 30,
      questionsLeft: 30,
    };
  }
}
