import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { fetchMyLiveClasses, LiveClassItem } from '../api/courses';

export default function LiveClassesScreen() {
  const { user, activeCourse, enrolledIds } = useApp();

  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchMyLiveClasses();
      setClasses(data);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleJoinClass = (liveClass: LiveClassItem) => {
    if (liveClass.meetUrl) {
      Linking.openURL(liveClass.meetUrl).catch(() => {
        Alert.alert('Cannot Open Link', 'Could not open the Google Meet live class link.');
      });
    } else {
      Alert.alert(
        'Live Room',
        `Live session: "${liveClass.title}"\n\nThe educator has not attached a Google Meet link yet.`
      );
    }
  };

  const activeBatchCount = enrolledIds?.length > 0 ? enrolledIds.length : 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
        {/* Back Button (NO Breadcrumbs) */}
        <View style={styles.navRow}>
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
            <Feather name="arrow-left" size={20} color="#0B3B42" />
          </TouchableOpacity>
        </View>

        {/* Top Hero Banner (Matching Screenshot 5) */}
        <View style={styles.heroCard}>
          <View style={styles.heroContentRow}>
            <View style={styles.radioIconSquare}>
              <MaterialCommunityIcons name="radio-tower" size={26} color="#FFFFFF" />
            </View>

            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Your Live Class</Text>
              <Text style={styles.heroSub}>Live interactive streaming and educator sessions.</Text>
            </View>
          </View>

          <View style={styles.batchPillWrap}>
            <View style={styles.batchPill}>
              <Text style={styles.batchPillText}>
                {activeBatchCount} Active {activeBatchCount === 1 ? 'Batch' : 'Batches'}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Content Area */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#0B3B42" />
            <Text style={styles.loaderText}>Checking live classes...</Text>
          </View>
        ) : classes.length === 0 ? (
          /* ======================================================== */
          /*  EMPTY STATE (Matching Screenshot 5)                     */
          /* ======================================================== */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="radio-tower" size={32} color="#175A67" />
            </View>

            <Text style={styles.emptyTitle}>No live classes going on</Text>

            <Text style={styles.emptySub}>
              Live sessions scheduled from the educator portal will appear here automatically.
            </Text>
          </View>
        ) : (
          /* Live and Scheduled Classes List */
          <View style={styles.classesList}>
            {classes.map((cls) => {
              const isLive = cls.status === 'live';

              return (
                <View key={cls.id} style={[styles.classCard, isLive && styles.liveClassBorder]}>
                  <View style={styles.classCardHeader}>
                    <View style={[styles.statusBadge, isLive ? styles.statusLive : styles.statusScheduled]}>
                      {isLive && <View style={styles.pulseDot} />}
                      <Text style={[styles.statusBadgeText, isLive ? styles.statusLiveText : styles.statusScheduledText]}>
                        {isLive ? 'LIVE NOW' : 'UPCOMING'}
                      </Text>
                    </View>

                    {cls.courseTitle && (
                      <View style={styles.courseTag}>
                        <Text style={styles.courseTagText}>{cls.courseTitle}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.classTitle}>{cls.title}</Text>

                  {cls.educatorName && (
                    <View style={styles.educatorRow}>
                      <Feather name="user" size={13} color="#64748B" />
                      <Text style={styles.educatorText}>Faculty: {cls.educatorName}</Text>
                    </View>
                  )}

                  <View style={styles.timeRow}>
                    <Feather name="clock" size={13} color="#64748B" />
                    <Text style={styles.timeText}>
                      {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.joinBtn, isLive ? styles.joinBtnLive : styles.joinBtnUpcoming]}
                    onPress={() => handleJoinClass(cls)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="videocam" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.joinBtnText}>
                      {isLive ? 'Join Live Room' : 'View Session Link'}
                    </Text>
                  </TouchableOpacity>
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
    paddingBottom: 40,
    paddingTop: 8,
  },
  navRow: {
    marginBottom: 14,
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

  /* Top Hero Card (Matching Screenshot 5) */
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  radioIconSquare: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#175A67',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
  },
  heroSub: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  batchPillWrap: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  batchPill: {
    backgroundColor: 'rgba(23, 90, 103, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  batchPillText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },

  /* Empty State Card (Matching Screenshot 5) */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginTop: 10,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },

  /* Class Cards */
  classesList: {
    gap: 14,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  liveClassBorder: {
    borderColor: '#10B981',
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusLive: {
    backgroundColor: '#DCFCE7',
  },
  statusLiveText: {
    color: '#15803D',
  },
  statusScheduled: {
    backgroundColor: '#E0F2FE',
  },
  statusScheduledText: {
    color: '#0369A1',
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  courseTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  courseTagText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.semiBold,
    color: '#475569',
  },
  classTitle: {
    fontSize: 15.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  educatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  educatorText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  timeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
  },
  joinBtnLive: {
    backgroundColor: '#0F3C45',
  },
  joinBtnUpcoming: {
    backgroundColor: '#175A67',
  },
  joinBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginTop: 10,
  },
});
