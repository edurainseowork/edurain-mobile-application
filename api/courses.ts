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

const COURSES_CACHE_KEY = 'edurain_courses_cache_v2';
const BANNERS_CACHE_KEY = 'edurain_banners_cache_v2';
const CATEGORIES_CACHE_KEY = 'edurain_categories_cache';

const DEFAULT_COURSES: Course[] = [
  {
    id: 24,
    title: 'rtyhkhgg',
    description: 'dfghjgvytgfygy',
    price: 98000,
    category: 'JEE',
    categoryId: 1,
    thumbnail: 'https://edurain-media-v2.s3.ap-south-1.amazonaws.com/images/9a38f03d-57b6-4808-a6a7-76decad48d71.png',
  },
  {
    id: 23,
    title: 'Engineering bno',
    description: 'Complete Arjuna JEE Batch Access with Live Lectures & AITS',
    price: 0,
    category: 'JEE',
    categoryId: 1,
    thumbnail: 'https://sjlfsfe8jf.execute-api.ap-south-1.amazonaws.com/uploads/b586c1d9-1a43-48da-9811-b64ad2401333.png',
  },
  {
    id: 22,
    title: 'tedgsdbhsjndms,dsdfsssssssssssssssssssss',
    description: 'Comprehensive NEET exam preparation module',
    price: 56000,
    category: 'NEET',
    categoryId: 2,
    thumbnail: 'https://edurain-notification.s3.ap-south-1.amazonaws.com/images/5c12ad07-637d-446e-8569-4367e354e1ac.png',
  },
  {
    id: 19,
    title: '2ss2',
    description: 'Focused NEET rank booster sprint',
    price: 148,
    category: 'NEET',
    categoryId: 2,
    thumbnail: 'https://edurain-media-v2.s3.ap-south-1.amazonaws.com/images/f74a2ccf-ab94-49b6-b898-888687dc54b1.png',
  },
  {
    id: 10,
    title: 'Class 11th PCB',
    description: 'Complete Class 11th Physics, Chemistry, and Biology course',
    price: 499900,
    category: 'NEET',
    categoryId: 2,
    thumbnail: 'https://edurain-media-v2.s3.ap-south-1.amazonaws.com/courses/thumbnails/pcb-11.jpg',
  },
  {
    id: 9,
    title: 'Doctor',
    description: 'Medical entrance mastery program',
    price: 100000,
    category: 'NEET',
    categoryId: 2,
    thumbnail: 'https://sjlfsfe8jf.execute-api.ap-south-1.amazonaws.com/uploads/64a7a2b4-bb3a-42da-a3b2-2bac34e46129.png',
  },
  {
    id: 20,
    title: 'fmfmdsnfmdsfdsf',
    description: 'Foundation problem solving toolkit',
    price: 53400,
    category: 'FOUNDATION',
    categoryId: 3,
    thumbnail: 'https://edurain-notification.s3.ap-south-1.amazonaws.com/images/99024f1a-6577-410f-abdc-01cb5fd401c4.jpg',
  },
  {
    id: 16,
    title: 'SSC',
    description: 'Crack SSC exam with live classes and mock series',
    price: 99900,
    category: 'FOUNDATION',
    categoryId: 3,
    thumbnail: 'https://sjlfsfe8jf.execute-api.ap-south-1.amazonaws.com/uploads/dc4a69cc-af9e-4851-9df2-81bf6db14243.jpg',
  },
  {
    id: 8,
    title: 'IIT Mechanical',
    description: 'Engineering foundations & core concepts',
    price: 100000,
    category: 'FOUNDATION',
    categoryId: 3,
    thumbnail: 'https://sjlfsfe8jf.execute-api.ap-south-1.amazonaws.com/uploads/54031ad8-3901-4fc6-9d78-e03bedb10ab9.png',
  },
];

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

let inMemoryCourses: Course[] = DEFAULT_COURSES;
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

export async function fetchCourses(): Promise<Course[]> {
  // If in-memory courses are present, trigger background revalidate and return immediately
  if (inMemoryCourses && inMemoryCourses.length > 0) {
    apiFetch<{ success?: boolean; data?: Course[] }>('/api/courses')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          inMemoryCourses = list;
          AsyncStorage.setItem(COURSES_CACHE_KEY, JSON.stringify(list)).catch(() => {});
        }
      })
      .catch(() => {});
    return inMemoryCourses;
  }

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

  try {
    const res = await apiFetch<{ success?: boolean; data?: Course[] }>('/api/courses');
    const list = Array.isArray(res) ? res : res?.data || [];
    if (list.length > 0) {
      inMemoryCourses = list;
      AsyncStorage.setItem(COURSES_CACHE_KEY, JSON.stringify(list)).catch(() => {});
      return list;
    }
  } catch {}

  return DEFAULT_COURSES;
}

export async function fetchCourseById(id: number | string): Promise<Course> {
  try {
    const res = await apiFetch<{ success?: boolean; data?: Course }>(`/api/courses/${id}`);
    const found = (res as any)?.data || res;
    if (found && found.id) return found;
  } catch {}

  const local = inMemoryCourses.find((c) => String(c.id) === String(id));
  if (local) return local;
  return DEFAULT_COURSES[0];
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

export async function fetchBanners(): Promise<Banner[]> {
  if (inMemoryBanners && inMemoryBanners.length > 0) {
    apiFetch<{ success?: boolean; data?: Banner[] }>('/api/banners')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          inMemoryBanners = list;
          AsyncStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify(list)).catch(() => {});
        }
      })
      .catch(() => {});
    return inMemoryBanners;
  }

  try {
    const cached = await AsyncStorage.getItem(BANNERS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryBanners = parsed;
        return parsed;
      }
    }
  } catch {}

  try {
    const res = await apiFetch<{ success?: boolean; data?: Banner[] }>('/api/banners');
    const list = Array.isArray(res) ? res : res?.data || [];
    if (list.length > 0) {
      inMemoryBanners = list;
      AsyncStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify(list)).catch(() => {});
      return list;
    }
  } catch {}

  return DEFAULT_BANNERS;
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

