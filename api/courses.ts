import { apiFetch } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CourseMentor {
  name: string;
  experience?: string | null;
  photo?: string | null;
}

export interface CoursePaidPlan {
  price: number; // paise
  originalPrice: number | null; // paise
  features: string[];
}

export interface CoursePlans {
  basic?: { features: string[] };
  pro?: CoursePaidPlan;
  proMax?: CoursePaidPlan;
}

export interface Course {
  id: number;
  title: string;
  description?: string | null;
  price: number; // paise
  originalPrice?: number | null; // paise
  discountPrice?: number | null;
  thumbnail?: string | null;
  banner?: string | null;
  bannerImage?: string | null;
  category: string;
  categoryId?: number | null;
  categorySlug?: string | null;
  instructorName?: string | null;
  mentors?: CourseMentor[] | null;
  studentsEnrolled?: number | null;
  duration?: string | null;
  totalLessons?: number | null;
  totalLectures?: number | null;
  playProductId?: string | null;
  isPopular?: boolean;
  status?: string;
  plans?: CoursePlans;
}

export interface DisplayPlan {
  id: 'basic' | 'pro' | 'proMax';
  name: string;
  price: number; // rupees
  mrp: number; // rupees
  features: string[];
}

export const paiseToRupees = (paise: number | null | undefined): number => {
  if (paise == null) return 0;
  return Math.round(paise / 100);
};

export const discountPct = (price: number, mrp: number): number => {
  if (!mrp || mrp <= price) return 0;
  return Math.round((1 - price / mrp) * 100);
};

export const formatINR = (rupees: number): string => {
  return `₹${rupees.toLocaleString('en-IN')}`;
};

export function getDisplayPlans(course: Course): DisplayPlan[] {
  const basicPrice = paiseToRupees(course.price);
  const basicMrp = Math.max(basicPrice, paiseToRupees(course.originalPrice ?? course.price));
  const plans: DisplayPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: basicPrice,
      mrp: basicMrp,
      features: course.plans?.basic?.features || [],
    },
  ];

  if (course.plans?.pro) {
    const proPrice = paiseToRupees(course.plans.pro.price);
    const proMrp = Math.max(proPrice, paiseToRupees(course.plans.pro.originalPrice ?? course.plans.pro.price));
    plans.push({
      id: 'pro',
      name: 'Pro',
      price: proPrice,
      mrp: proMrp,
      features: course.plans.pro.features || [],
    });
  }

  if (course.plans?.proMax) {
    const maxPrice = paiseToRupees(course.plans.proMax.price);
    const maxMrp = Math.max(maxPrice, paiseToRupees(course.plans.proMax.originalPrice ?? course.plans.proMax.price));
    plans.push({
      id: 'proMax',
      name: 'Pro Max',
      price: maxPrice,
      mrp: maxMrp,
      features: course.plans.proMax.features || [],
    });
  }

  return plans;
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

const COURSES_CACHE_KEY = 'edurain_courses_cache_v2';
const BANNERS_CACHE_KEY = 'edurain_banners_cache_v2';
const CATEGORIES_CACHE_KEY = 'edurain_categories_cache';

const DEFAULT_BANNERS: Banner[] = [
  {
    id: 11,
    imageUrl: 'https://edurain-media-v2.s3.ap-south-1.amazonaws.com/images/9f36ab4a-24ac-4e76-b9e0-445f51351457.png',
  },
  {
    id: 14,
    imageUrl: 'https://edurain-media-v2.s3.ap-south-1.amazonaws.com/images/47083379-8176-434e-a7cb-2c0ee8ad7ba8.png',
  },
  {
    id: 10,
    imageUrl: 'https://edurain-media-v2.s3.ap-south-1.amazonaws.com/images/df2bc26c-456b-4185-98cc-8c64e30d9f61.png',
  },
];

let inMemoryCourses: Course[] = [];
let inMemoryBanners: Banner[] = DEFAULT_BANNERS;
let inMemoryCategories: Category[] | null = null;

// Initialize caches from AsyncStorage
AsyncStorage.getItem(COURSES_CACHE_KEY).then((data) => {
  if (data) {
    try {
      const arr = JSON.parse(data);
      if (Array.isArray(arr) && arr.length > 0) inMemoryCourses = arr;
    } catch {}
  }
}).catch(() => {});

AsyncStorage.getItem(BANNERS_CACHE_KEY).then((data) => {
  if (data) {
    try {
      const arr = JSON.parse(data);
      if (Array.isArray(arr) && arr.length > 0) inMemoryBanners = arr;
    } catch {}
  }
}).catch(() => {});

export async function fetchCourses(forceNetwork: boolean = false): Promise<Course[]> {
  try {
    const res = await apiFetch<{ success?: boolean; data?: Course[] }>('/api/courses');
    const list = Array.isArray(res) ? res : res?.data || [];
    if (Array.isArray(list) && list.length > 0) {
      inMemoryCourses = list;
      AsyncStorage.setItem(COURSES_CACHE_KEY, JSON.stringify(list)).catch(() => {});
      return list;
    }
  } catch (err) {
    console.warn('[fetchCourses] Network error, using cache:', err);
  }

  // Fallback to cache if network is down
  if (inMemoryCourses.length > 0) return inMemoryCourses;
  try {
    const cached = await AsyncStorage.getItem(COURSES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCourses = parsed;
        return parsed;
      }
    }
  } catch {}

  return inMemoryCourses;
}

export async function fetchCourseById(id: number | string): Promise<Course | null> {
  try {
    const res = await apiFetch<{ success?: boolean; data?: Course }>(`/api/courses/${id}`);
    const found = (res as any)?.data || res;
    if (found && found.id) return found;
  } catch {}

  const local = inMemoryCourses.find((c) => String(c.id) === String(id));
  if (local) return local;
  return inMemoryCourses[0] || null;
}

export async function fetchCategories(): Promise<Category[]> {
  if (inMemoryCategories && inMemoryCategories.length > 0) {
    return inMemoryCategories;
  }

  try {
    const cached = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCategories = parsed;
        return parsed;
      }
    }
  } catch {}

  try {
    const res = await apiFetch<{ success?: boolean; data?: Category[] }>('/api/categories');
    const list = Array.isArray(res) ? res : res?.data || [];
    if (list.length > 0) {
      inMemoryCategories = list;
      AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(list)).catch(() => {});
      return list;
    }
  } catch {}

  const fallback: Category[] = [
    { id: 1, name: 'JEE', slug: 'jee' },
    { id: 2, name: 'NEET', slug: 'neet' },
    { id: 3, name: 'FOUNDATION', slug: 'foundation' },
  ];
  inMemoryCategories = fallback;
  return fallback;
}

export interface ContentItem {
  id: string;
  courseId: number;
  parentId: string | null;
  title: string;
  type: 'folder' | 'video' | 'pdf' | 'note' | 'quiz';
  mediaUrl: string | null;
  fileSize?: string | null;
  order: number;
}

export interface LiveClassItem {
  id: number;
  courseId: number;
  courseTitle?: string | null;
  title: string;
  meetUrl?: string | null;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'live' | 'ended';
  educatorName?: string | null;
}

export async function fetchCourseContent(courseId: number): Promise<ContentItem[]> {
  try {
    const res = await apiFetch<{ success?: boolean; data?: ContentItem[]; content?: ContentItem[] }>(
      `/api/courses/${courseId}/content?parentId=all`
    );
    const raw = res?.data ?? res?.content ?? [];
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.warn(`[fetchCourseContent] Error loading content for course ${courseId}:`, err);
    return [];
  }
}

export async function fetchMyLiveClasses(): Promise<LiveClassItem[]> {
  try {
    const res = await apiFetch<{ success?: boolean; data?: LiveClassItem[] }>('/api/live-classes/my');
    const raw = res?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.warn('[fetchMyLiveClasses] Error loading live classes:', err);
    return [];
  }
}

export async function fetchBanners(placement: string = 'home'): Promise<Banner[]> {
  const cacheKey = `${BANNERS_CACHE_KEY}_${placement}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Return cached and refresh in background
        apiFetch<{ success?: boolean; data?: Banner[] }>(`/api/banners?placement=${placement}`)
          .then((res) => {
            const list = Array.isArray(res) ? res : res?.data || [];
            if (list.length > 0) {
              AsyncStorage.setItem(cacheKey, JSON.stringify(list)).catch(() => {});
            }
          })
          .catch(() => {});
        return parsed;
      }
    }
  } catch {}

  try {
    const res = await apiFetch<{ success?: boolean; data?: Banner[] }>(`/api/banners?placement=${placement}`);
    const list = Array.isArray(res) ? res : res?.data || [];
    if (list.length > 0) {
      AsyncStorage.setItem(cacheKey, JSON.stringify(list)).catch(() => {});
      return list;
    }
  } catch {}

  return placement === 'home' ? DEFAULT_BANNERS : [];
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
    const res = await apiFetch<{ success: boolean; activeCourseId?: number | null; data?: Course | null }>('/api/me/active-course');
    const courseId = res?.activeCourseId ?? (res?.data as any)?.id ?? null;
    if (courseId) {
      const course = await fetchCourseById(courseId);
      if (course) {
        await AsyncStorage.setItem('edurain_active_course', JSON.stringify(course));
        return course;
      }
    }
  } catch {}

  try {
    const cached = await AsyncStorage.getItem('edurain_active_course');
    if (cached) return JSON.parse(cached);
  } catch {}

  return inMemoryCourses[1] || inMemoryCourses[0] || null;
}

export async function setActiveCourse(courseId: number): Promise<{ activeCourseId: number; goalCategoryId?: number | null }> {
  try {
    const res = await apiFetch<{ success: boolean; activeCourseId: number; goalCategoryId?: number | null }>('/api/me/active-course', {
      method: 'PUT',
      body: JSON.stringify({ courseId }),
    });
    const course = await fetchCourseById(courseId);
    if (course) {
      await AsyncStorage.setItem('edurain_active_course', JSON.stringify(course));
    }
    return { activeCourseId: res?.activeCourseId ?? courseId, goalCategoryId: res?.goalCategoryId };
  } catch {
    const course = await fetchCourseById(courseId);
    if (course) {
      await AsyncStorage.setItem('edurain_active_course', JSON.stringify(course));
    }
    return { activeCourseId: courseId };
  }
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

