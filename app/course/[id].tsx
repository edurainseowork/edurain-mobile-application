import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import { fetchCourseById, Course } from '../../api/courses';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isEnrolled, selectActiveCourse, activeCourse } = useApp();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLectureIndex, setActiveLectureIndex] = useState<number | null>(null);

  const courseId = Number(id);
  const enrolled = isEnrolled(courseId);
  const isActive = activeCourse?.id === courseId;

  // Screen recording & screenshot protection for DRM
  useEffect(() => {
    if (Platform.OS === 'android') {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
      return () => {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      };
    }
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    fetchCourseById(courseId)
      .then((c) => setCourse(c))
      .catch((err) => Alert.alert('Error', err.message || 'Failed to load course details'))
      .finally(() => setLoading(false));
  }, [courseId]);

  const lectures = [
    { id: 1, title: '01. Course Orientation & Syllabus Roadmap', duration: '24 min', freePreview: true },
    { id: 2, title: '02. Fundamental Principles & Foundation Concepts', duration: '48 min', freePreview: false },
    { id: 3, title: '03. High-Yield Problem Solving Techniques', duration: '52 min', freePreview: false },
    { id: 4, title: '04. Previous Year Exam Pattern Breakdown', duration: '45 min', freePreview: false },
    { id: 5, title: '05. Comprehensive Practice Session & DPP', duration: '60 min', freePreview: false },
  ];

  const handlePlayLecture = (index: number) => {
    const lecture = lectures[index];
    if (!enrolled && !lecture.freePreview) {
      Alert.alert(
        'Enrollment Required',
        'This lecture is part of the full course curriculum. Please enroll to access all videos and study material.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enroll Now', onPress: () => router.push('/(tabs)/courses') },
        ]
      );
      return;
    }
    setActiveLectureIndex(index);
  };

  const handleSetAsActiveCourse = async () => {
    if (!course) return;
    try {
      await selectActiveCourse(course.id);
      Alert.alert('Success', `"${course.title}" is now your active study batch!`);
    } catch {
      Alert.alert('Error', 'Failed to update active course.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.ink.primary} />
        <Text style={styles.loadingText}>Loading curriculum...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Course not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Theme.colors.ink.deep} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {course.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Video Player Box or Banner */}
        <View style={styles.playerContainer}>
          {activeLectureIndex !== null ? (
            <View style={styles.videoPlayingPlaceholder}>
              <Ionicons name="play-circle" size={54} color="#FFFFFF" />
              <Text style={styles.playingTitle}>
                {lectures[activeLectureIndex].title}
              </Text>
              <Text style={styles.playingStatus}>Streaming via Bunny HLS CDN (Protected)</Text>
            </View>
          ) : course.thumbnail ? (
            <Image source={{ uri: course.thumbnail }} style={styles.bannerImage} />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="school" size={48} color={Theme.colors.ink.soft} />
            </View>
          )}
        </View>

        {/* Course Info */}
        <View style={styles.infoSection}>
          <View style={styles.categoryBadgeRow}>
            <Text style={styles.categoryBadge}>{course.category}</Text>
            {enrolled && (
              <View style={styles.enrolledTag}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={styles.enrolledTagText}>ENROLLED</Text>
              </View>
            )}
          </View>

          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseInstructor}>
            Taught by {course.instructorName || 'Senior Academic Faculty'}
          </Text>

          {enrolled && (
            <TouchableOpacity
              style={[styles.activeToggleBtn, isActive && styles.activeToggleBtnActive]}
              onPress={handleSetAsActiveCourse}
              disabled={isActive}
            >
              <Ionicons
                name={isActive ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={isActive ? '#059669' : Theme.colors.ink.primary}
              />
              <Text style={[styles.activeToggleText, isActive && styles.activeToggleTextActive]}>
                {isActive ? 'Current Active Batch on Home' : 'Set as Active Batch'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Curriculum / Lectures List */}
        <View style={styles.curriculumSection}>
          <Text style={styles.curriculumHeader}>LECTURES & SYLLABUS</Text>

          {lectures.map((lec, idx) => {
            const isPlaying = activeLectureIndex === idx;
            const canPlay = enrolled || lec.freePreview;

            return (
              <TouchableOpacity
                key={lec.id}
                style={[styles.lectureCard, isPlaying && styles.lectureCardPlaying]}
                onPress={() => handlePlayLecture(idx)}
                activeOpacity={0.8}
              >
                <View style={[styles.lectureIconWrap, isPlaying && styles.lectureIconWrapPlaying]}>
                  <Ionicons
                    name={canPlay ? (isPlaying ? 'pause' : 'play') : 'lock-closed'}
                    size={16}
                    color={isPlaying ? '#FFFFFF' : canPlay ? Theme.colors.ink.primary : '#94A3B8'}
                  />
                </View>

                <View style={styles.lectureDetails}>
                  <Text style={[styles.lectureTitle, isPlaying && styles.lectureTitlePlaying]}>
                    {lec.title}
                  </Text>
                  <View style={styles.lectureMetaRow}>
                    <Text style={styles.lectureDuration}>{lec.duration}</Text>
                    {lec.freePreview && !enrolled && (
                      <Text style={styles.previewTag}>FREE PREVIEW</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Action Bar (if not enrolled) */}
      {!enrolled && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <View>
            <Text style={styles.bottomPriceLabel}>One-time Enrollment</Text>
            <Text style={styles.bottomPriceValue}>
              ₹{course.discountPrice || course.price}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bottomEnrollBtn}
            onPress={() => router.push('/(tabs)/courses')}
          >
            <Text style={styles.bottomEnrollBtnText}>Enroll Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.paper.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.paper.light,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.muted,
  },
  errorText: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: Theme.colors.ink.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.subtle,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  playerContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#0F172A',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Theme.colors.ink.deep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayingPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  playingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    marginTop: 10,
    textAlign: 'center',
  },
  playingStatus: {
    color: Theme.colors.accent.emerald,
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.primary,
    textTransform: 'uppercase',
  },
  enrolledTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  enrolledTagText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
  },
  courseTitle: {
    fontSize: 19,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    lineHeight: 26,
    marginBottom: 4,
  },
  courseInstructor: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
    marginBottom: 14,
  },
  activeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.ink.light,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  activeToggleBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  activeToggleText: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.primary,
  },
  activeToggleTextActive: {
    color: '#059669',
  },
  curriculumSection: {
    padding: 20,
  },
  curriculumHeader: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.soft,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  lectureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  lectureCardPlaying: {
    borderColor: Theme.colors.ink.primary,
    backgroundColor: Theme.colors.ink.light,
  },
  lectureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lectureIconWrapPlaying: {
    backgroundColor: Theme.colors.ink.primary,
  },
  lectureDetails: {
    flex: 1,
  },
  lectureTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.deep,
    lineHeight: 18,
  },
  lectureTitlePlaying: {
    color: Theme.colors.ink.primary,
  },
  lectureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  lectureDuration: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
  previewTag: {
    fontSize: 9,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    ...Theme.shadows.card,
  },
  bottomPriceLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
  bottomPriceValue: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.primary,
  },
  bottomEnrollBtn: {
    backgroundColor: Theme.colors.ink.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  bottomEnrollBtnText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
});

