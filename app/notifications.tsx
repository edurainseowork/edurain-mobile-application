import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../constants/theme';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationItem,
} from '../api/notifications';
import { fetchMyLiveClasses, LiveClassItem } from '../api/courses';

// Live countdown badge component for ticking timer
function LiveCountdownBadge({ targetTime, onZero }: { targetTime: string; onZero?: () => void }) {
  const calculate = () => {
    const diff = Math.max(0, new Date(targetTime).getTime() - Date.now());
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isZero: diff <= 0,
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculate);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = calculate();
      setTimeLeft(next);
      if (next.isZero) {
        clearInterval(interval);
        onZero?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (timeLeft.isZero) {
    return (
      <View style={styles.liveNowPill}>
        <Text style={styles.liveNowPillText}>🔴 LIVE NOW</Text>
      </View>
    );
  }

  const h = String(timeLeft.hours).padStart(2, '0');
  const m = String(timeLeft.minutes).padStart(2, '0');
  const s = String(timeLeft.seconds).padStart(2, '0');

  return (
    <View style={styles.countdownBadge}>
      <Feather name="clock" size={12} color="#D97706" style={{ marginRight: 4 }} />
      <Text style={styles.countdownText}>Starts in {h}h {m}m {s}s</Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [notifs, classes] = await Promise.all([
        fetchNotifications().catch(() => []),
        fetchMyLiveClasses().catch(() => []),
      ]);
      setNotifications(notifs);
      setLiveClasses(classes);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleJoinMeet = (url?: string | null, title?: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Cannot Open Link', 'Could not open the Google Meet live class link.');
      });
    } else {
      Alert.alert('Live Class Room', `"${title || 'Live Class'}" link is being prepared by educators.`);
    }
  };

  // Format time range: e.g. "Today, 8:08 PM – 10:04 PM"
  const formatTimeRange = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const now = new Date();
      const isToday = start.toDateString() === now.toDateString();
      const dayPrefix = isToday ? 'Today' : start.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const startTime = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const endTime = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${dayPrefix}, ${startTime} – ${endTime}`;
    } catch {
      return 'Scheduled Session';
    }
  };

  // Combine notifications & live classes into unified list matching Screenshot 3 & 4
  const displayItems = React.useMemo(() => {
    const list: Array<{
      id: string;
      kind: 'live_class' | 'general';
      title: string;
      courseTitle?: string;
      startTime?: string;
      endTime?: string;
      meetUrl?: string | null;
      isRead: boolean;
      body?: string;
      rawNotif?: NotificationItem;
    }> = [];

    // Add Live Classes as priority items
    liveClasses.forEach((lc) => {
      list.push({
        id: `live_${lc.id}`,
        kind: 'live_class',
        title: lc.title,
        courseTitle: lc.courseTitle || 'Champ pgt',
        startTime: lc.startTime,
        endTime: lc.endTime,
        meetUrl: lc.meetUrl,
        isRead: false,
      });
    });

    // Add Backend Notifications
    notifications.forEach((n) => {
      if (n.liveClass) {
        // Only if not duplicate
        if (!list.some((it) => it.id === `live_${n.liveClass?.id}`)) {
          list.push({
            id: `notif_lc_${n.id}`,
            kind: 'live_class',
            title: n.liveClass.title,
            courseTitle: (n.liveClass as any).courseTitle || 'Champ pgt',
            startTime: (n.liveClass as any).startTime,
            endTime: (n.liveClass as any).endTime,
            meetUrl: n.liveClass.meetUrl,
            isRead: n.isRead,
          });
        }
      } else {
        list.push({
          id: `notif_${n.id}`,
          kind: 'general',
          title: n.title,
          body: n.body,
          isRead: n.isRead,
          rawNotif: n,
        });
      }
    });

    return list;
  }, [liveClasses, notifications]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0B3B42" />
        </View>
      ) : displayItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Feather name="bell-off" size={32} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptySubtitle}>
            Updates regarding live classes, test series schedules, and announcements will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
          renderItem={({ item }) => {
            if (item.kind === 'live_class' && item.startTime && item.endTime) {
              const now = Date.now();
              const start = new Date(item.startTime).getTime();
              const end = new Date(item.endTime).getTime();

              const isLiveNow = now >= start - 10 * 60 * 1000 && now <= end;
              const isUpcoming = now < start - 10 * 60 * 1000;
              const isEnded = now > end;

              // 1. LIVE NOW Card (Screenshot 4)
              if (isLiveNow) {
                return (
                  <View style={styles.liveNowCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.liveCameraSquare}>
                        <Feather name="video" size={18} color="#FFFFFF" />
                      </View>
                      <View style={styles.cardHeaderTextCol}>
                        <Text style={styles.liveScheduledLabel}>NEW LIVE CLASS SCHEDULED</Text>
                        <Text style={styles.liveTitleDark} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.batchTagDark}>{item.courseTitle || 'Champ pgt'}</Text>
                      </View>
                      <View style={styles.liveNowPill}>
                        <Text style={styles.liveNowPillText}>LIVE NOW</Text>
                      </View>
                    </View>

                    <View style={styles.timeRowDark}>
                      <Feather name="calendar" size={12} color="#94A3B8" style={{ marginRight: 6 }} />
                      <Text style={styles.timeTextDark}>{formatTimeRange(item.startTime, item.endTime)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.joinLiveNowBtn}
                      activeOpacity={0.85}
                      onPress={() => handleJoinMeet(item.meetUrl, item.title)}
                    >
                      <Feather name="video" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.joinLiveNowBtnText}>Join Live Class</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              // 2. UPCOMING / ENDED Card (Screenshot 3)
              return (
                <View style={styles.scheduledCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.scheduledCameraSquare}>
                      <Feather name="video" size={18} color="#EA580C" />
                    </View>
                    <View style={styles.cardHeaderTextCol}>
                      <Text style={styles.scheduledLabelLight}>NEW LIVE CLASS SCHEDULED</Text>
                      <Text style={styles.scheduledTitleLight} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.batchTagLight}>{item.courseTitle || 'Champ pgt'}</Text>
                    </View>
                    {isUpcoming ? (
                      <View style={styles.upcomingPill}>
                        <Text style={styles.upcomingPillText}>UPCOMING</Text>
                      </View>
                    ) : (
                      <View style={styles.endedPill}>
                        <Text style={styles.endedPillText}>ENDED</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.timeRowLight}>
                    <Feather name="calendar" size={12} color="#EA580C" style={{ marginRight: 6 }} />
                    <Text style={styles.timeTextLight}>{formatTimeRange(item.startTime, item.endTime)}</Text>
                  </View>

                  {isUpcoming && (
                    <View style={styles.upcomingTimerRow}>
                      <LiveCountdownBadge targetTime={item.startTime} onZero={loadData} />
                      <Text style={styles.upcomingDisabledBtnText}>Join opens 10 min before start</Text>
                    </View>
                  )}
                </View>
              );
            }

            // General Notification Card (Interactive: tap to navigate to test series or link)
            const handleNotifPress = () => {
              if (item.rawNotif?.id) {
                markNotificationAsRead(item.rawNotif.id).catch(() => {});
              }
              const link = item.rawNotif?.link || '';
              const titleLower = (item.title || '').toLowerCase();
              const bodyLower = (item.body || '').toLowerCase();

              if (link.startsWith('/')) {
                router.push(link as any);
              } else if (link.startsWith('http://') || link.startsWith('https://')) {
                Linking.openURL(link).catch(() => {});
              } else if (titleLower.includes('test') || bodyLower.includes('test')) {
                router.push('/test-series');
              } else if (titleLower.includes('class') || bodyLower.includes('live')) {
                router.push('/(tabs)/courses');
              }
            };

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleNotifPress}
                style={[styles.generalCard, !item.isRead && styles.generalCardUnread]}
              >
                <View style={styles.generalIconSquare}>
                  <MaterialCommunityIcons name="bell-outline" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.generalTitle}>{item.title}</Text>
                  <Text style={styles.generalBody} numberOfLines={2}>{item.body}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94A3B8" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  markAllText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#0B3B42',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Live Now Card (Screenshot 4) */
  liveNowCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  liveCameraSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  liveScheduledLabel: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  liveTitleDark: {
    fontSize: 15.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  batchTagDark: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
  },
  liveNowPill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveNowPillText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timeRowDark: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
  },
  timeTextDark: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#CBD5E1',
  },
  joinLiveNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 12,
  },
  joinLiveNowBtnText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  /* Scheduled / Ended Card (Screenshot 3) */
  scheduledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scheduledCameraSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduledLabelLight: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scheduledTitleLight: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  batchTagLight: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  upcomingPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  upcomingPillText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  endedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  endedPillText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  timeRowLight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  timeTextLight: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#334155',
  },
  upcomingDisabledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  upcomingTimerRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    gap: 4,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  countdownText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#B45309',
  },
  upcomingDisabledBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },

  /* General Card */
  generalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  generalCardUnread: {
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
  },
  generalIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generalTitle: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  generalBody: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
});
