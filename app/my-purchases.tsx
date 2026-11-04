import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import {
  fetchCourses,
  fetchActiveCourse,
  fetchBanners,
  fetchEnrolledCourseIds,
  setActiveCourse as setServerActiveCourse,
  Course,
  Banner,
} from '../api/courses';
import { fetchProfile, StudentProfile } from '../api/profile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EnrolledCourseItem {
  id: number;
  title: string;
  category: string;
  lectures: number;
  upNext: string;
  progress: number;
}

const DEFAULT_FALLBACK_ENROLLED: EnrolledCourseItem[] = [
  {
    id: 1,
    title: '2ss2',
    category: 'NEET',
    lectures: 33,
    upNext: '24hr course • open to start learning',
    progress: 15,
  },
  {
    id: 2,
    title: 'rtyhkhgg',
    category: 'JEE',
    lectures: 22,
    upNext: '32 course • open to start learning',
    progress: 0,
  },
  {
    id: 3,
    title: 'Engineering bno',
    category: 'JEE',
    lectures: 30,
    upNext: '30 hours course • open to start learning',
    progress: 0,
  },
  {
    id: 10,
    title: 'Class 11th PCB',
    category: 'NEET',
    lectures: 45,
    upNext: 'Cell Biology Fundamentals • open to start learning',
    progress: 20,
  },
  {
    id: 9,
    title: 'Doctor',
    category: 'NEET',
    lectures: 60,
    upNext: 'Human Physiology Mastery • open to start learning',
    progress: 0,
  },
];

export default function MyPurchasesScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const { user, activeCourse, selectActiveCourse, refreshUserData, enrolledIds } = useApp();

  const [currentView, setCurrentView] = useState<'overview' | 'enrolled'>(
    params.view === 'enrolled' ? 'enrolled' : 'overview'
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [enrolledList, setEnrolledList] = useState<EnrolledCourseItem[]>(DEFAULT_FALLBACK_ENROLLED);
  const [purchasesBanners, setPurchasesBanners] = useState<Banner[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [profileData, allCourses, pBanners, freshIds] = await Promise.all([
        fetchProfile().catch(() => null),
        fetchCourses().catch(() => []),
        fetchBanners('mobile_purchases').catch(() => []),
        fetchEnrolledCourseIds().catch(() => []),
      ]);
      if (pBanners && pBanners.length > 0) {
        setPurchasesBanners(pBanners);
      }

      const items: EnrolledCourseItem[] = [];
      const seenIds = new Set<number>();

      // 1. From profile.courses
      if (profileData?.courses && profileData.courses.length > 0) {
        for (const c of profileData.courses) {
          const match = allCourses.find((ac) => ac.id === c.id);
          seenIds.add(c.id);
          items.push({
            id: c.id,
            title: c.title || match?.title || `Batch #${c.id}`,
            category: c.category || match?.category || 'NEET',
            lectures: match?.totalLectures || 33,
            upNext: `${c.title || 'Course'} • open to start learning`,
            progress: (match as any)?.progress || 0,
          });
        }
      }

      // 2. From freshIds or enrolledIds in context
      const allEnrolledIds = Array.from(new Set([...(freshIds || []), ...(enrolledIds || [])]));
      if (allEnrolledIds.length > 0) {
        for (const id of allEnrolledIds) {
          if (!seenIds.has(id)) {
            const match = allCourses.find((ac) => ac.id === id);
            if (match) {
              seenIds.add(id);
              items.push({
                id: match.id,
                title: match.title,
                category: match.category || 'NEET',
                lectures: match.totalLectures || 25,
                upNext: `${match.title} • open to start learning`,
                progress: (match as any)?.progress || 0,
              });
            }
          }
        }
      }

      if (items.length > 0) {
        setEnrolledList(items);
      }
    } catch {
      // Keep existing list
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enrolledIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3000);
  };

  const handleSetActive = async (courseId: number, title: string) => {
    if (activatingId !== null || activeCourse?.id === courseId) return;
    setActivatingId(courseId);
    try {
      await selectActiveCourse(courseId);
      await refreshUserData();
      showToast(`"${title}" is now your active course`);
    } catch {
      showToast(`Set as active`);
    } finally {
      setActivatingId(null);
    }
  };

  const handleStartLearning = (courseId: number) => {
    router.push({
      pathname: '/course/[id]',
      params: { id: String(courseId) },
    });
  };

  const activeCourseId = activeCourse?.id ?? enrolledList[0]?.id ?? 1;

  // Sort enrolled courses so active course is always first
  const sortedCourses = useMemo(() => {
    return [...enrolledList].sort((a, b) => {
      const aActive = a.id === activeCourseId;
      const bActive = b.id === activeCourseId;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [enrolledList, activeCourseId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastWrap}>
          <Feather name="check-circle" size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {currentView === 'overview' ? (
        /* ======================================================== */
        /*  VIEW 1: OVERVIEW HUB (Matching Screenshot 1)            */
        /* ======================================================== */
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#0B3B42']}
            />
          }
        >
          {/* Top Header: Back Button + Title (NO Breadcrumbs) */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/home');
                }
              }}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={22} color="#0B3B42" />
            </TouchableOpacity>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>My Purchases</Text>
            <Text style={styles.pageSub}>Manage your enrolled academic batches.</Text>
          </View>

          {/* Hero Card: Your Enrolled Courses */}
          <TouchableOpacity
            style={styles.overviewHeroCard}
            activeOpacity={0.9}
            onPress={() => setCurrentView('enrolled')}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.capIconWrap}>
                <Ionicons name="school" size={26} color="#FFFFFF" />
              </View>
              <View style={styles.batchesEnrolledBadge}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.batchesEnrolledText}>
                  {enrolledList.length} Batches Enrolled
                </Text>
              </View>
            </View>

            <Text style={styles.cardHeading}>Your Enrolled Batches</Text>
            <Text style={styles.cardDescription}>
              Access your active academic batches, daily study material, comprehensive curriculum roadmap, and chapter-wise DPPs.
            </Text>

            <View style={styles.cardDivider} />

            <View style={styles.heroBottomRow}>
              <View style={styles.openCoursesLink}>
                <Text style={styles.openCoursesLinkText}>Open Enrolled Batches</Text>
                <Feather name="arrow-right" size={16} color="#175A67" />
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleStartLearning(activeCourseId);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.resumeLecturesText}>Start Learning ›</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* ======================================================== */
        /*  VIEW 2: ENROLLED COURSES LIST (Matching Screenshot 2)   */
        /* ======================================================== */
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#0B3B42']}
            />
          }
        >
          {/* Header Row: Back Button + Title + Badges (NO Breadcrumbs) */}
          <View style={styles.enrolledHeaderRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setCurrentView('overview')}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={22} color="#0B3B42" />
            </TouchableOpacity>

            <View style={styles.enrolledTitleWrap}>
              <Text style={styles.enrolledHeaderTitle}>Your Enrolled</Text>
              <Text style={styles.enrolledHeaderTitle}>Courses</Text>
            </View>

            <View style={styles.headerBadgesWrap}>
              <View style={styles.enrolledCountBadge}>
                <Text style={styles.enrolledCountBadgeText}>{enrolledList.length} ENROLLED</Text>
              </View>
              <View style={styles.activeCountBadge}>
                <Text style={styles.activeCountBadgeText}>1 ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Explore All Courses Button */}
          <TouchableOpacity
            style={styles.exploreAllBtn}
            onPress={() => router.push('/(tabs)/courses')}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreAllBtnText}>Explore All Courses</Text>
            <Feather name="arrow-right" size={15} color="#0B3B42" />
          </TouchableOpacity>

          {/* Custom Purchases Banners (1.8:1 ratio) */}
          {purchasesBanners.length > 0 && (
            <View style={styles.purchasesBannerContainer}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {purchasesBanners.map((b) => (
                  <View key={b.id} style={styles.purchasesBannerCard}>
                    <Image source={{ uri: b.imageUrl }} style={styles.purchasesBannerImg} resizeMode="cover" />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Course Cards List */}
          <View style={styles.courseCardsList}>
            {sortedCourses.map((course) => {
              const isActive = course.id === activeCourseId;
              const isActivating = activatingId === course.id;

              return (
                <View
                  key={course.id}
                  style={[
                    styles.courseCard,
                    isActive && styles.activeCourseCardBorder,
                  ]}
                >
                  {/* Card Header: Category Badge + Status Badge */}
                  <View style={styles.courseCardHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {course.category.toUpperCase()}
                      </Text>
                    </View>

                    {isActive ? (
                      <View style={styles.activeStatusPill}>
                        <Feather name="check" size={12} color="#059669" />
                        <Text style={styles.activeStatusPillText}>Active</Text>
                      </View>
                    ) : (
                      <View style={styles.justEnrolledPill}>
                        <View style={styles.tealDot} />
                        <Text style={styles.justEnrolledPillText}>Just Enrolled</Text>
                      </View>
                    )}
                  </View>

                  {/* Course Title */}
                  <Text style={styles.courseTitle}>{course.title}</Text>

                  {/* UP NEXT Box */}
                  <View style={styles.upNextBox}>
                    <Text style={styles.upNextLabel}>UP NEXT</Text>
                    <Text style={styles.upNextTitle} numberOfLines={1}>
                      {course.upNext}
                    </Text>
                  </View>

                  {/* Syllabus Covered & Lecture Count */}
                  <View style={styles.syllabusRow}>
                    <Text style={styles.syllabusLabel}>Syllabus Covered</Text>
                    <Text style={styles.lecturesCountText}>{course.lectures} Materials</Text>
                  </View>

                  {/* Progress Bar Track */}
                  <View style={styles.progressTrackBg}>
                    <View
                      style={[
                        styles.progressTrackFill,
                        { width: `${Math.max(course.progress, 6)}%` },
                      ]}
                    />
                  </View>

                  {/* Actions Section */}
                  <View style={styles.actionsWrap}>
                    {isActive ? (
                      <>
                        <View style={styles.yourActiveCourseNotice}>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                          <Text style={styles.yourActiveCourseNoticeText}>
                            Your active batch
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.startLearningBtn}
                          onPress={() => handleStartLearning(course.id)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="play" size={14} color="#FFFFFF" />
                          <Text style={styles.startLearningBtnText}>Start Learning</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.setAsActiveBtn}
                          onPress={() => handleSetActive(course.id, course.title)}
                          disabled={isActivating}
                          activeOpacity={0.8}
                        >
                          {isActivating ? (
                            <ActivityIndicator size="small" color="#0B3B42" />
                          ) : (
                            <>
                              <Ionicons name="radio-button-off" size={14} color="#0B3B42" />
                              <Text style={styles.setAsActiveBtnText}>Set as Active</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.startLearningBtn}
                          onPress={() => handleStartLearning(course.id)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="play" size={14} color="#FFFFFF" />
                          <Text style={styles.startLearningBtnText}>Start Learning</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  toastWrap: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: '#0F3C45',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#FFFFFF',
  },

  /* Header - Clean Back Button without Breadcrumbs */
  headerRow: {
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  titleSection: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#2A707C',
    marginTop: 3,
  },

  /* Overview Hero Card (SS1) */
  overviewHeroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  capIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#175A67',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#175A67',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  batchesEnrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  batchesEnrolledText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#15803D',
  },
  cardHeading: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#40484B',
    lineHeight: 20,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(23, 90, 103, 0.1)',
    marginVertical: 20,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openCoursesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openCoursesLinkText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },
  resumeLecturesText: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: '#70787C',
  },

  /* View 2: Enrolled Courses List (SS2) */
  enrolledHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  enrolledTitleWrap: {
    flex: 1,
  },
  enrolledHeaderTitle: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    lineHeight: 24,
  },
  headerBadgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  enrolledCountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  enrolledCountBadgeText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },
  activeCountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  activeCountBadgeText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#15803D',
  },
  exploreAllBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  exploreAllBtnText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  purchasesBannerContainer: {
    marginBottom: 16,
  },
  purchasesBannerCard: {
    width: SCREEN_WIDTH - 32,
    height: Math.round((SCREEN_WIDTH - 32) * (320 / 720)),
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F3C45',
  },
  purchasesBannerImg: {
    width: '100%',
    height: '100%',
  },

  /* Cards List */
  courseCardsList: {
    gap: 16,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  activeCourseCardBorder: {
    borderColor: '#10B981',
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: '#F6EFE9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#475569',
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeStatusPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#15803D',
  },
  justEnrolledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#175A67',
  },
  justEnrolledPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },
  courseTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginBottom: 12,
  },
  upNextBox: {
    backgroundColor: '#FBF5F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  upNextLabel: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  upNextTitle: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
    color: '#0F172A',
    marginTop: 2,
  },
  syllabusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  syllabusLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  lecturesCountText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#64748B',
  },
  progressTrackBg: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F1E6DD',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: '#175A67',
    borderRadius: 2.5,
  },
  actionsWrap: {
    gap: 8,
  },
  yourActiveCourseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  yourActiveCourseNoticeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: '#059669',
  },
  setAsActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 20,
  },
  setAsActiveBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  startLearningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0B1C20',
    paddingVertical: 12,
    borderRadius: 20,
  },
  startLearningBtnText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
});
