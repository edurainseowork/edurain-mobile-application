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

const STORAGE_KEYS = {
  SAVED_EBOOKS: 'edurain_saved_ebooks',
  SAVED_PDFS: 'edurain_saved_pdfs',
};

// The mobile app no longer keeps a study history; this key held it on older versions
const OLD_HISTORY_KEY = 'edurain_lecture_history';

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

/** Deletes the study history older app versions saved on the phone. */
export async function removeOldStudyHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OLD_HISTORY_KEY);
  } catch {}
}

