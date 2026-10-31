import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import { fetchNotifications, NotificationItem } from '../../api/notifications';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, goal, activeCourse, enrolledIds, refreshUserData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadData = async () => {
    try {
      const [notifs] = await Promise.all([
        fetchNotifications().catch(() => []),
        refreshUserData(),
      ]);
      setNotifications(notifs);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const liveClasses = notifications
    .filter((n) => n.liveClass && n.liveClass.status !== 'ended')
    .map((n) => n.liveClass!);

  const initials = (user?.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.profileHeader}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Aspirant'}</Text>
          </View>
        </View>

        <View style={styles.topRightActions}>
          {/* Target Cohort Badge */}
          <TouchableOpacity
            style={styles.goalBadge}
            onPress={() => router.push('/(tabs)/courses')}
            activeOpacity={0.8}
          >
            <Ionicons name="flag" size={12} color={Theme.colors.ink.primary} />
            <Text style={styles.goalBadgeText}>{goal?.name || 'Set Goal'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.colors.ink.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak & Motivation Banner */}
        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <View style={styles.flameIconWrap}>
              <Ionicons name="flame" size={24} color="#FF6B4A" />
            </View>
            <View>
              <Text style={styles.streakNumber}>{user?.streakCount || 1} Day Streak</Text>
              <Text style={styles.streakSub}>Consistency is key to cracking your goal!</Text>
            </View>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>ON TRACK</Text>
          </View>
        </View>

        {/* Active Batch Hero Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR ACTIVE BATCH</Text>
        </View>

        {activeCourse ? (
          <View style={styles.activeCourseCard}>
            <View style={styles.activeCourseTop}>
              <View style={styles.activeBatchBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Theme.colors.accent.emerald} />
                <Text style={styles.activeBatchBadgeText}>ENROLLED & ACTIVE</Text>
              </View>
              <Text style={styles.activeBatchCategory}>{activeCourse.category}</Text>
            </View>

            <Text style={styles.activeBatchTitle}>{activeCourse.title}</Text>
            <Text style={styles.activeBatchInstructor}>
              By {activeCourse.instructorName || 'Senior Faculty'}
            </Text>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: '45%' }]} />
              </View>
              <Text style={styles.progressText}>45% Completed</Text>
            </View>

            <TouchableOpacity
              style={styles.resumeButton}
              onPress={() => router.push(`/course/${activeCourse.id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={styles.resumeButtonText}>Resume Next Lecture</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyBatchCard}>
            <Ionicons name="school-outline" size={36} color={Theme.colors.ink.soft} />
            <Text style={styles.emptyBatchTitle}>No Active Course Selected</Text>
            <Text style={styles.emptyBatchSub}>
              Explore our structured batches aligned with your {goal?.name || 'exam'} target.
            </Text>
            <TouchableOpacity
              style={styles.exploreBatchBtn}
              onPress={() => router.push('/(tabs)/courses')}
            >
              <Text style={styles.exploreBatchBtnText}>Explore Available Courses</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Classes (if any scheduled or live) */}
        {liveClasses.length > 0 && (
          <View style={styles.liveClassesSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveBadgeRow}>
                <View style={styles.liveDot} />
                <Text style={styles.sectionTitle}>LIVE SESSIONS</Text>
              </View>
            </View>

            {liveClasses.map((lc) => (
              <View key={lc.id} style={styles.liveClassCard}>
                <View style={styles.liveClassInfo}>
                  <Text style={styles.liveClassTitle}>{lc.title}</Text>
                  <Text style={styles.liveClassStatus}>
                    {lc.status === 'live' ? '🔴 Live Right Now' : 'Scheduled Soon'}
                  </Text>
                </View>

                {lc.meetUrl && (
                  <TouchableOpacity
                    style={styles.joinLiveBtn}
                    onPress={() => lc.meetUrl && Linking.openURL(lc.meetUrl)}
                  >
                    <Text style={styles.joinLiveBtnText}>Join Class</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Quick Access Tools */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>STUDY RESOURCES</Text>
        </View>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(tabs)/library')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="book" size={20} color="#4F46E5" />
            </View>
            <Text style={styles.quickCardTitle}>E-Books</Text>
            <Text style={styles.quickCardSub}>Digital Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(tabs)/courses')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="layers-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.quickCardTitle}>All Batches</Text>
            <Text style={styles.quickCardSub}>Browse Syllabus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="award" size={20} color="#D97706" />
            </View>
            <Text style={styles.quickCardTitle}>My Standing</Text>
            <Text style={styles.quickCardSub}>Profile & Stats</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.paper.light,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Theme.colors.paper.light,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Theme.colors.ink.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 16,
  },
  welcomeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  userName: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    ...Theme.shadows.subtle,
  },
  goalBadgeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 74, 0.2)',
    ...Theme.shadows.subtle,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF1EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  streakSub: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
  streakBadge: {
    backgroundColor: '#FFF1EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#FF6B4A',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.soft,
    letterSpacing: 0.8,
  },
  activeCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.12)',
    marginBottom: 24,
    ...Theme.shadows.card,
  },
  activeCourseTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeBatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeBatchBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
  },
  activeBatchCategory: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.muted,
  },
  activeBatchTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    lineHeight: 24,
    marginBottom: 4,
  },
  activeBatchInstructor: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.ink.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.muted,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.ink.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  emptyBatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
    ...Theme.shadows.subtle,
  },
  emptyBatchTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyBatchSub: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  exploreBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.ink.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  exploreBatchBtnText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  liveClassesSection: {
    marginBottom: 20,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveClassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 10,
    ...Theme.shadows.subtle,
  },
  liveClassInfo: {
    flex: 1,
    marginRight: 12,
  },
  liveClassTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
  },
  liveClassStatus: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#EF4444',
    marginTop: 2,
  },
  joinLiveBtn: {
    backgroundColor: Theme.colors.ink.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinLiveBtnText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...Theme.shadows.subtle,
  },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
  },
  quickCardSub: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
});

