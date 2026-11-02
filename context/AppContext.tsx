import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { apiFetch, API_BASE_URL } from '../api/client';
import {
  fetchStudentGoal,
  saveStudentGoal,
  fetchActiveCourse,
  setActiveCourse as setServerActiveCourse,
  fetchEnrolledCourseIds,
  fetchSyncVersions,
  Course,
  StudentGoal,
} from '../api/courses';
import { fetchProfile, recordStreakActivity, deleteAccount as apiDeleteAccount, StudentProfile } from '../api/profile';
import { registerPushToken } from '../api/notifications';
import { registerForPushNotificationsAsync } from '../services/pushNotificationService';

export interface AppUser {
  uid: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  photo?: string | null;
  role: 'student' | 'admin' | 'faculty';
  streakCount: number;
}

interface AppContextValue {
  user: AppUser | null;
  isReady: boolean;
  goal: StudentGoal | null;
  activeCourse: Course | null;
  enrolledIds: number[];
  isEnrolled: (courseId: number) => boolean;
  setGoal: (name: string, id?: number | null) => Promise<StudentGoal>;
  selectActiveCourse: (courseId: number) => Promise<void>;
  login: (emailOrPhone: string, password: string) => Promise<{ ok: boolean; enrolledCount?: number; error?: string }>;
  verifyOtpAndSignup: (params: {
    name: string;
    email: string;
    password: string;
    phone: string;
    accessToken: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
  refreshUserData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [goal, setGoal] = useState<StudentGoal | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<number[]>([]);

  // 1. Refresh student profile, goal, and enrolled courses
  const refreshUserData = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const [p, g, c, ids] = await Promise.all([
        fetchProfile().catch(() => null),
        fetchStudentGoal().catch(() => null),
        fetchActiveCourse().catch(() => null),
        fetchEnrolledCourseIds().catch(() => []),
      ]);

      if (p) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: p.name || prev.name,
                email: p.email || prev.email,
                phone: p.phone,
                photo: p.profilePhoto,
                streakCount: p.streakCount || 0,
              }
            : null
        );
      }
      setGoal(g);
      setActiveCourse(c);
      setEnrolledIds(ids);
    } catch (err) {
      console.warn('[refreshUserData] Failed to refresh student data:', err);
    }
  }, []);

  // 2. Firebase Auth state listener
  useEffect(() => {
    let isMounted = true;

    // Hard fallback: App must NEVER hang on splash screen for more than 1.2s
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsReady(true);
      }
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          let role: 'student' | 'admin' | 'faculty' = 'student';
          try {
            const idTokenPromise = firebaseUser.getIdTokenResult();
            const idToken = await Promise.race([
              idTokenPromise,
              new Promise<any>((_, reject) => setTimeout(() => reject('timeout'), 1000)),
            ]);
            if (idToken?.claims?.role === 'admin' || idToken?.claims?.role === 'faculty') {
              role = idToken.claims.role;
            }
          } catch {}

          if (!isMounted) return;

          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            role,
            streakCount: 0,
          });

          // Background sync so user never waits on splash screen
          refreshUserData().catch(() => {});
          recordStreakActivity().catch(() => {});
          registerForPushNotificationsAsync().catch(() => {});
        } else {
          if (!isMounted) return;
          setUser(null);
          setGoal(null);
          setActiveCourse(null);
          setEnrolledIds([]);
        }
      } catch (err) {
        console.warn('[onAuthStateChanged] Non-fatal auth listener error:', err);
      } finally {
        if (isMounted) {
          setIsReady(true);
          clearTimeout(safetyTimer);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [refreshUserData]);

  // 3. AppState listener for Foreground Sync & Streak
  const lastSyncCheck = useRef(0);
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const now = Date.now();
        // Only poll sync at most once every 30 seconds
        if (now - lastSyncCheck.current > 30_000) {
          lastSyncCheck.current = now;
          fetchSyncVersions()
            .then((versions) => {
              if (versions) refreshUserData();
            })
            .catch(() => {});
          recordStreakActivity().catch(() => {});
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshUserData]);

  // 4. Login flow: resolves 10-digit phone number to email if needed
  const login = useCallback(
    async (emailOrPhone: string, password: string): Promise<{ ok: boolean; enrolledCount?: number; error?: string }> => {
      try {
        const trimmed = emailOrPhone.trim().toLowerCase();
        let targetEmail = trimmed;

        // Check if input is a 10-digit phone number
        if (/^\d{10}$/.test(trimmed)) {
          const res = await apiFetch<{ success: boolean; email?: string }>('/api/auth/get-email-by-phone', {
            method: 'POST',
            body: JSON.stringify({ phone: trimmed }),
          });
          if (!res?.email) {
            return { ok: false, error: 'No account found for this mobile number. Please sign up.' };
          }
          targetEmail = res.email;
        }

        await signInWithEmailAndPassword(auth, targetEmail, password);
        await refreshUserData();
        const ids = await fetchEnrolledCourseIds().catch(() => []);
        return { ok: true, enrolledCount: ids.length };
      } catch (err: any) {
        let msg = err.message || 'Login failed';
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = 'Incorrect password. Please try again.';
        } else if (err.code === 'auth/user-not-found') {
          msg = 'No student account found with these credentials.';
        }
        return { ok: false, error: msg };
      }
    },
    [refreshUserData]
  );

  // 5. Signup flow with MSG91 OTP
  const verifyOtpAndSignup = useCallback(
    async (params: {
      name: string;
      email: string;
      password: string;
      phone: string;
      accessToken: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await apiFetch<{ success: boolean; message?: string }>('/api/auth/verify-otp-and-signup', {
          method: 'POST',
          body: JSON.stringify(params),
        });

        if (!res.success) {
          return { ok: false, error: res.message || 'Signup failed' };
        }

        // Automatic sign-in after account creation
        await signInWithEmailAndPassword(auth, params.email.trim(), params.password);
        await refreshUserData();
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Failed to verify OTP and complete registration' };
      }
    },
    [refreshUserData]
  );

  // 6. Forgot Password
  const sendPasswordReset = useCallback(async (email: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiFetch<{ success: boolean; message?: string }>('/api/auth/send-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to send password reset email' };
    }
  }, []);

  // 7. Logout
  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setGoal(null);
    setActiveCourse(null);
    setEnrolledIds([]);
  }, []);

  // 8. Delete Account (DPDP & App Store Compliance)
  const deleteAccount = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      await apiDeleteAccount();
      await signOut(auth);
      setUser(null);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to delete account' };
    }
  }, []);

  // 9. Save Goal & Set Active Course
  const setGoalHandler = useCallback(async (name: string, id?: number | null) => {
    const saved = await saveStudentGoal(name, id);
    setGoal(saved);
    return saved;
  }, []);

  const selectActiveCourse = useCallback(async (courseId: number) => {
    const res = await setServerActiveCourse(courseId);
    if (res?.goal) {
      setGoal(res.goal);
    }
    const [updated, goalFresh] = await Promise.all([
      fetchActiveCourse(),
      fetchStudentGoal(),
    ]);
    if (updated) setActiveCourse(updated);
    if (goalFresh) setGoal(goalFresh);
  }, []);

  const isEnrolled = useCallback(
    (courseId: number) => enrolledIds.includes(courseId),
    [enrolledIds]
  );

  const value = useMemo(
    () => ({
      user,
      isReady,
      goal,
      activeCourse,
      enrolledIds,
      isEnrolled,
      setGoal: setGoalHandler,
      selectActiveCourse,
      login,
      verifyOtpAndSignup,
      sendPasswordReset,
      logout,
      deleteAccount,
      refreshUserData,
    }),
    [
      user,
      isReady,
      goal,
      activeCourse,
      enrolledIds,
      isEnrolled,
      setGoalHandler,
      selectActiveCourse,
      login,
      verifyOtpAndSignup,
      sendPasswordReset,
      logout,
      deleteAccount,
      refreshUserData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

