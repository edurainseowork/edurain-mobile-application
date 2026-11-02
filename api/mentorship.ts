import { apiFetch } from './client';

export interface Mentor {
  id: string;
  name: string;
  photo: string | null;
  headline: string | null;
  about: string | null;
  institute: string | null;
  achievement: string | null;
  languages?: string | null;
  verified: boolean;
  sessionMinutes?: number;
  courses: { id: number; title: string }[];
  goals: string[];
  openSlots: number;
  nextSlotAt: string | null;
  isFavorite: boolean;
}

export interface MentorSlot {
  id: number;
  startsAt: string;
  durationMinutes: number;
  available: boolean;
  held?: boolean;
}

export interface MentorBooking {
  id: number;
  mentorId: string;
  mentorName?: string | null;
  topic: string;
  startsAt: string;
  durationMinutes: number;
  courseTitle?: string | null;
  meetLink?: string | null;
}

export interface MentorListResponse {
  success: boolean;
  goal: { id: number; name: string } | null;
  courses: { id: number; title: string; mentorCount: number }[];
  total: number;
  mentors: Mentor[];
}

export interface MentorDetailsResponse {
  success: boolean;
  mentor: Mentor;
  slots: MentorSlot[];
}

export async function fetchMentors(params?: {
  categoryId?: number | null;
  courseId?: number | null;
  q?: string;
}): Promise<MentorListResponse> {
  const query = new URLSearchParams();
  if (params?.categoryId) query.set('categoryId', String(params.categoryId));
  if (params?.courseId) query.set('courseId', String(params.courseId));
  if (params?.q?.trim()) query.set('q', params.q.trim());

  const qs = query.toString();
  const res = await apiFetch<MentorListResponse>(`/api/mentorship/mentors${qs ? `?${qs}` : ''}`);
  return {
    success: true,
    goal: res?.goal ?? null,
    courses: res?.courses ?? [],
    total: res?.total ?? (res?.mentors?.length || 0),
    mentors: res?.mentors ?? [],
  };
}

export async function fetchMentorDetails(mentorId: string): Promise<MentorDetailsResponse | null> {
  try {
    const res = await apiFetch<any>(`/api/mentorship/mentors/${mentorId}`);
    return res ?? null;
  } catch {
    return null;
  }
}

/** Reserves the slot for this student for 30 seconds to 2 minutes; rejects if held by another */
export async function holdMentorSlot(slotId: number): Promise<{ success: boolean; heldUntil?: string; error?: string }> {
  try {
    const res = await apiFetch<{ heldUntil: string }>(`/api/mentorship/slots/${slotId}/hold`, { method: 'POST' });
    return { success: true, heldUntil: res.heldUntil };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Slot is currently being booked by another student' };
  }
}

/** Releases a held slot */
export async function releaseMentorSlot(slotId: number): Promise<void> {
  try {
    await apiFetch(`/api/mentorship/slots/${slotId}/hold`, { method: 'DELETE' });
  } catch {
    // Ignore error on best-effort release
  }
}

export async function bookMentorSlot(slotId: number, topic: string): Promise<{ success: boolean; error?: string; booking?: any }> {
  try {
    const res = await apiFetch<any>('/api/mentorship/bookings', {
      method: 'POST',
      body: JSON.stringify({ slotId, topic }),
    });
    return { success: true, booking: res?.booking || res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not complete booking' };
  }
}

export async function fetchMyBookings(): Promise<MentorBooking[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: MentorBooking[] }>('/api/mentorship/bookings');
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
}
