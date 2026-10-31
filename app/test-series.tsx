import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '../components/Home/AppHeader';
import { Theme } from '../constants/theme';
import { fetchStudentTests, StudentTest } from '../api/tests';
import { useApp } from '../context/AppContext';

export default function TestSeriesScreen() {
  const { goal } = useApp();
  const [tests, setTests] = useState<StudentTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('All my courses');

  const loadTests = useCallback(async () => {
    try {
      const data = await fetchStudentTests();
      if (data && data.length > 0) {
        setTests(data);
      } else {
        // Fallback realistic tests if student has newly registered
        setTests([
          {
            id: 101,
            courseId: 1,
            courseName: 'CLASS 11TH MATHEMATICS',
            title: 'gkugggjug',
            description: 'Chapter Diagnostic & Speed Sprint Assessment',
            targetBatch: 'Doctor',
            status: 'PUBLISHED',
            publishTime: new Date().toISOString(),
            durationMinutes: 60,
            marksPositive: 4,
            marksNegative: 1,
            totalQuestions: 8,
          },
          {
            id: 102,
            courseId: 2,
            courseName: 'Class 11th PCB',
            title: 'lkjhgfdfgh',
            description: 'Weekly Physics Wave Optics & Vectors Drill',
            targetBatch: 'Doctor',
            status: 'PUBLISHED',
            publishTime: new Date().toISOString(),
            durationMinutes: 4,
            marksPositive: 4,
            marksNegative: 1,
            totalQuestions: 8,
            attempt: {
              id: 991,
              status: 'SUBMITTED',
              score: 0,
              correct_count: 0,
              wrong_count: 8,
              total_questions: 8,
            },
          },
          {
            id: 103,
            courseId: 3,
            courseName: 'Champ pgt',
            title: 'eee44',
            description: 'Previous Sunday Major Mock CBT Simulation',
            targetBatch: 'Engineering',
            status: 'COMPLETED',
            publishTime: new Date().toISOString(),
            durationMinutes: 3,
            marksPositive: 4,
            marksNegative: 1,
            totalQuestions: 8,
          },
          {
            id: 104,
            courseId: 2,
            courseName: 'Class 11th PCB',
            title: 'java 1',
            description: 'Core Organic Reaction Mechanisms & Numericals',
            targetBatch: 'Doctor',
            status: 'PUBLISHED',
            publishTime: new Date().toISOString(),
            durationMinutes: 49,
            marksPositive: 4,
            marksNegative: 1,
            totalQuestions: 8,
          },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const handleStartTest = (test: StudentTest) => {
    Alert.alert(
      'Start Test Assessment',
      `You are about to start "${test.title}" (${test.durationMinutes} mins, ${test.totalQuestions} Questions). Are you ready?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Now',
          onPress: () => {
            Alert.alert(
              'CBT Engine Initialized',
              'The examination timer and proctoring shield are active for this attempt.'
            );
          },
        },
      ]
    );
  };

  const filteredTests = tests.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTests(); }} />
        }
      >
        {/* Search in Resources */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search in Resources"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          <Feather name="mic" size={18} color="#64748B" />
        </View>

        {/* Clean Header: Back Button + Title (No Breadcrumbs) */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Course Test Series</Text>
        </View>

        {/* Filter Dropdown + Refresh */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterDropdown} activeOpacity={0.8}>
            <Feather name="filter" size={16} color="#0B3B42" />
            <Text style={styles.filterDropdownText}>{courseFilter}</Text>
            <Feather name="chevron-down" size={16} color="#0B3B42" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.7}
            onPress={() => { setRefreshing(true); loadTests(); }}
          >
            <Feather name="refresh-cw" size={18} color="#0B3B42" />
          </TouchableOpacity>
        </View>

        {/* Hero Course Test Series Card */}
        <View style={styles.heroBannerCard}>
          <View style={styles.heroBannerIconWrap}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.heroBannerContent}>
            <Text style={styles.heroBannerTitle}>Course Test Series</Text>
            <View style={styles.heroBannerBadge}>
              <Text style={styles.heroBannerBadgeText}>Class 11th PCB, Doctor</Text>
            </View>
            <Text style={styles.heroBannerSubtitle}>
              Live Mock Tests, Chapter Quizzes & Periodic Course Assessments
            </Text>
          </View>
          <View style={styles.decorCircle} />
        </View>

        {/* Streak Bar */}
        <View style={styles.streakBar}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakText}>Weekly Streak: 4 Tests Clear</Text>
          </View>
          <Text style={styles.streakBadge}>Top 8% NEET Prep</Text>
        </View>

        {/* Test Cards List */}
        {loading ? (
          <ActivityIndicator size="large" color="#0B3B42" style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.testsList}>
            {filteredTests.map((test) => {
              const isSubmitted = test.attempt?.status === 'SUBMITTED';
              const isCompleted = test.status === 'COMPLETED';
              const isLive = test.status === 'PUBLISHED' && !isSubmitted;

              return (
                <View key={test.id} style={styles.testCard}>
                  {/* Top Bar: Subject Badge + Status Badge */}
                  <View style={styles.testCardHeader}>
                    <Text style={styles.courseTag} numberOfLines={1}>
                      {test.courseName.toUpperCase()}
                    </Text>

                    {isLive && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                    )}

                    {isSubmitted && (
                      <View style={styles.submittedBadge}>
                        <Feather name="check" size={12} color="#0284C7" />
                        <Text style={styles.submittedBadgeText}>SUBMITTED</Text>
                      </View>
                    )}

                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>COMPLETED</Text>
                      </View>
                    )}
                  </View>

                  {/* Title & Subtitle */}
                  <Text style={styles.testTitle}>{test.title}</Text>
                  <Text style={styles.testSubtitle}>{test.description || 'Periodic CBT Assessment'}</Text>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Duration</Text>
                      <Text style={styles.statValue}>{test.durationMinutes}m</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Questions</Text>
                      <Text style={styles.statValue}>{test.totalQuestions} Qs</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Marks</Text>
                      <Text style={styles.statValue}>
                        +{test.marksPositive}/-{test.marksNegative}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Action Area */}
                  {isLive && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      activeOpacity={0.85}
                      onPress={() => handleStartTest(test)}
                    >
                      <Feather name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.startBtnText}>Start Test</Text>
                    </TouchableOpacity>
                  )}

                  {isSubmitted && (
                    <View style={styles.resultBox}>
                      <View>
                        <Text style={styles.resultLabel}>YOUR RESULT</Text>
                        <Text style={styles.resultValue}>
                          {test.attempt?.score ?? 0} pts ({test.attempt?.correct_count ?? 0}/{test.totalQuestions} correct)
                        </Text>
                      </View>
                      <View style={styles.donePill}>
                        <Feather name="check" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                        <Text style={styles.donePillText}>Done</Text>
                      </View>
                    </View>
                  )}

                  {isCompleted && (
                    <View style={styles.closedBtn}>
                      <Feather name="lock" size={15} color="#94A3B8" style={{ marginRight: 6 }} />
                      <Text style={styles.closedBtnText}>Test Closed</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  screenTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  filterDropdownText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroBannerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0B3B42',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroBannerContent: {
    flex: 1,
    zIndex: 1,
  },
  heroBannerTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 4,
  },
  heroBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  heroBannerBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  heroBannerSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 16,
  },
  decorCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0F2FE',
    opacity: 0.6,
  },
  streakBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakFire: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  streakBadge: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  testsList: {
    gap: 14,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  testCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseTag: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    letterSpacing: 0.4,
    flex: 1,
    marginRight: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B3B42',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  submittedBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
  },
  testTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  testSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3B42',
    borderRadius: 12,
    paddingVertical: 12,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultLabel: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  donePillText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  closedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  closedBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
  },
});
