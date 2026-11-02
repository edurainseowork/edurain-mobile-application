import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedEBook {
  id: string;
  title: string;
  subject?: string;
  totalPages?: number;
  pagesRead?: number;
  rating?: number;
  isCourseBook?: boolean;
  pdfUrl?: string;
  fileSize?: string;
  courseTitle?: string;
  savedAt: number;
}

export interface SavedPdf {
  id: string;
  title: string;
  mediaUrl: string;
  subject?: string;
  courseTitle?: string;
  fileSize?: string;
  category?: string;
  savedAt: number;
}

export interface LectureHistoryItem {
  id: string;
  title: string;
  subject?: string;
  standard?: string;
  duration?: string;
  mediaUrl: string;
  watchedAt: number;
}

const STORAGE_KEYS = {
  SAVED_EBOOKS: 'edurain_saved_ebooks',
  SAVED_PDFS: 'edurain_saved_pdfs',
  LECTURE_HISTORY: 'edurain_lecture_history',
};

// Auto-expire history older than 5 days (in ms)
const MAX_HISTORY_AGE_MS = 5 * 24 * 60 * 60 * 1000;

/* =======================================================================
 * SAVED E-BOOKS
 * ======================================================================= */
export async function getSavedEBooks(): Promise<SavedEBook[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EBOOKS);
    if (!raw) return [];
    const list: SavedEBook[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function toggleSaveEBook(book: Omit<SavedEBook, 'savedAt'>): Promise<boolean> {
  try {
    const list = await getSavedEBooks();
    const index = list.findIndex((item) => item.id === book.id);
    let isSaved = false;

    if (index >= 0) {
      // Remove
      list.splice(index, 1);
      isSaved = false;
    } else {
      // Add to front
      list.unshift({
        ...book,
        savedAt: Date.now(),
      });
      isSaved = true;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EBOOKS, JSON.stringify(list));
    return isSaved;
  } catch {
    return false;
  }
}

export async function isEBookSaved(id: string): Promise<boolean> {
  const list = await getSavedEBooks();
  return list.some((item) => item.id === id);
}

/* =======================================================================
 * SAVED PDFS (Class Material & Notes)
 * ======================================================================= */
export async function getSavedPdfs(): Promise<SavedPdf[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PDFS);
    if (!raw) return [];
    const list: SavedPdf[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function toggleSavePdf(pdf: Omit<SavedPdf, 'savedAt'>): Promise<boolean> {
  try {
    const list = await getSavedPdfs();
    const index = list.findIndex((item) => item.id === pdf.id);
    let isSaved = false;

    if (index >= 0) {
      list.splice(index, 1);
      isSaved = false;
    } else {
      list.unshift({
        ...pdf,
        savedAt: Date.now(),
      });
      isSaved = true;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PDFS, JSON.stringify(list));
    return isSaved;
  } catch {
    return false;
  }
}

export async function removeSavedPdf(id: string): Promise<void> {
  try {
    const list = await getSavedPdfs();
    const updated = list.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PDFS, JSON.stringify(updated));
  } catch {}
}

export async function isPdfSaved(id: string): Promise<boolean> {
  const list = await getSavedPdfs();
  return list.some((item) => item.id === id);
}

/* =======================================================================
 * LECTURE WATCH HISTORY (Auto-resets after 5 days)
 * ======================================================================= */
export async function getLectureHistory(): Promise<LectureHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LECTURE_HISTORY);
    if (!raw) return [];
    const list: LectureHistoryItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const now = Date.now();
    // Keep only entries watched within the last 5 days
    const active = list.filter((item) => now - item.watchedAt <= MAX_HISTORY_AGE_MS);

    // If some were pruned, save cleaned list back
    if (active.length !== list.length) {
      await AsyncStorage.setItem(STORAGE_KEYS.LECTURE_HISTORY, JSON.stringify(active));
    }
    return active;
  } catch {
    return [];
  }
}

export async function recordLectureWatch(lecture: {
  id: string;
  title: string;
  subject?: string;
  standard?: string;
  duration?: string;
  mediaUrl: string;
}): Promise<void> {
  try {
    const list = await getLectureHistory();
    // Remove if already in history so we can put it on top with latest timestamp
    const filtered = list.filter((item) => item.id !== lecture.id);
    const updated: LectureHistoryItem[] = [
      {
        ...lecture,
        watchedAt: Date.now(),
      },
      ...filtered,
    ];

    await AsyncStorage.setItem(STORAGE_KEYS.LECTURE_HISTORY, JSON.stringify(updated.slice(0, 30)));
  } catch {}
}

export async function clearLectureHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.LECTURE_HISTORY);
  } catch {}
}

