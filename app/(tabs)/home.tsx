import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import { AppHeader } from '../../components/Home/AppHeader';
import { fetchBanners, Banner } from '../../api/courses';
import { fetchNotifications, NotificationItem } from '../../api/notifications';
import { API_BASE_URL, SOCKET_URL } from '../../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, goal, activeCourse, refreshUserData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const loadData = useCallback(async (force: boolean = false) => {
    try {
      if (!force) {
        // Immediate paint from local cache
        const cached = await fetchBanners('home', false).catch(() => []);
        if (Array.isArray(cached) && cached.length > 0) setBanners(cached);
      }

      // Always fetch fresh live banners from server
      const fresh = await fetchBanners('home', true).catch(() => null);
      if (Array.isArray(fresh)) {
        setBanners(fresh);
      }

      const notifList = await fetchNotifications().catch(() => []);
      setNotifications(notifList);
      refreshUserData().catch(() => {});
    } catch {}
  }, [refreshUserData]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Real-time synchronization when tab is focused
  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  // Real-time Socket.io listener: instantly updates when CMS uploads/deletes a banner
  useEffect(() => {
    let socket: any = null;
    try {
      socket = (io as any)(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      } as any);

      const handleUpdate = () => {
        fetchBanners('home', true)
          .then((fresh) => {
            if (Array.isArray(fresh)) setBanners(fresh);
          })
          .catch(() => {});
      };

      socket?.on?.('banners_updated', handleUpdate);
      socket?.on?.('catalog_updated', handleUpdate);
    } catch {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const studentName = user?.name ? user.name.split(' ')[0] : 'Student';
  const targetGoal = goal?.name || 'JEE';
  const currentBatch = activeCourse?.title || 'Engineering bno';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <AppHeader
        showSearch={false}
        unreadCount={notifications.filter((n) => !n.isRead).length}
        onNotificationsPress={() => router.push('/notifications' as any)}
        onProfilePress={() => router.push('/profile' as any)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.colors.ink.primary]} />}
      >
        {/* Welcome Greeting Banner */}
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeText}>
            Welcome back, <Text style={styles.nameHighlight}>{studentName}</Text>
          </Text>
          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>
              Target: <Text style={styles.targetValue}>{targetGoal}</Text> • Current Batch:{' '}
              <Text style={styles.targetValue}>{currentBatch}</Text>
            </Text>
          </View>
        </View>

        {/* Banner Carousel */}
        {banners.length > 0 ? (
          <View style={styles.bannerContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                setActiveBannerIndex(idx);
              }}
              scrollEventThrottle={16}
            >
              {banners.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.9}
                  style={styles.bannerCard}
                  onPress={() => router.push('/(tabs)/courses')}
                >
                  <Image source={{ uri: b.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            {banners.length > 1 && (
              <View style={styles.dotsRow}>
                {banners.map((_, i) => (
                  <View key={i} style={[styles.dot, activeBannerIndex === i && styles.activeDot]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.defaultPromoBanner}
            onPress={() => router.push('/(tabs)/courses')}
          >
            <View style={styles.promoTextWrap}>
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>NEET & JEE 2027-28</Text>
              </View>
              <Text style={styles.promoTitle}>Rank Booster Batch Open</Text>
              <Text style={styles.promoSub}>Live Masterclasses & 1-on-1 Mentorship</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Features Section Header */}
        <View style={styles.sectionHeader}>
          <Feather name="cpu" size={18} color="#0F3C45" />
          <Text style={styles.sectionTitle}>Features</Text>
        </View>

        {/* 3 Core Feature Cards */}
        <View style={styles.featureCardsList}>
          {/* Card 1: 1 to 1 Mentorship */}
          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.85}
            onPress={() => router.push('/mentorship')}
          >
            <View style={styles.featureIconWrap}>
              <Feather name="users" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>1 to 1 Mentorship</Text>
              <Text style={styles.featureDesc}>
                Personalized 1-on-1 strategy, rank roadmap & study motivation
              </Text>
            </View>
            <View style={styles.arrowCircle}>
              <Feather name="chevron-right" size={16} color="#64748B" />
            </View>
          </TouchableOpacity>

          {/* Card 2: Ask Your Doubt */}
          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.85}
            onPress={() => router.push('/doubt' as any)}
          >
            <View style={styles.featureIconWrap}>
              <Feather name="help-circle" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Ask Your Doubt</Text>
              <Text style={styles.featureDesc}>
                Snap a photo or chat with educators for instant step-by-step solutions
              </Text>
            </View>
            <View style={styles.arrowCircle}>
              <Feather name="chevron-right" size={16} color="#64748B" />
            </View>
          </TouchableOpacity>

          {/* Card 3: EduAI Tutor */}
          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.85}
            onPress={() => router.push('/ai-tutor' as any)}
          >
            <View style={styles.featureIconWrap}>
              <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>EduAI Tutor</Text>
              <Text style={styles.featureDesc}>
                Adaptive AI problem-solver, revision quizzes & 24/7 concept breakdown
              </Text>
            </View>
            <View style={styles.arrowCircle}>
              <Feather name="chevron-right" size={16} color="#64748B" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Library Section Header */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Feather name="menu" size={18} color="#0B3B42" />
          <Text style={styles.sectionTitle}>Library</Text>
        </View>

        {/* 4 Library Feature Cards - All 4 displayed simultaneously in a 2x2 grid */}
        <View style={styles.libraryGrid}>
          {/* 1. Saved Bookmarks */}
          <TouchableOpacity
            style={styles.libraryGridCard}
            activeOpacity={0.85}
            onPress={() => router.push('/bookmarks' as any)}
          >
            <View style={[styles.librarySquareIcon, { backgroundColor: '#F59E0B' }]}>
              <Feather name="bookmark" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.libCardTitle}>Saved Bookmarks</Text>
            <Text style={styles.libCardBadge}>Saved Items</Text>
            <Text style={styles.libCardSub} numberOfLines={2}>
              Watch Later & Fast Revision
            </Text>
            <View style={styles.libCardLinkBtn}>
              <Text style={styles.libCardLinkText}>Open Bookmarks  ›</Text>
            </View>
          </TouchableOpacity>

          {/* 2. Your Class Material */}
          <TouchableOpacity
            style={styles.libraryGridCard}
            activeOpacity={0.85}
            onPress={() => router.push('/class-material' as any)}
          >
            <View style={[styles.librarySquareIcon, { backgroundColor: '#10B981' }]}>
              <Feather name="book" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.libCardTitle}>Your Class Material</Text>
            <Text style={styles.libCardBadge}>PDF Notes & Maps</Text>
            <Text style={styles.libCardSub} numberOfLines={2}>
              Recorded Lectures & Archives
            </Text>
            <View style={styles.libCardLinkBtn}>
              <Text style={styles.libCardLinkText}>View Materials  ›</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Your Live Classes */}
          <TouchableOpacity
            style={styles.libraryGridCard}
            activeOpacity={0.85}
            onPress={() => router.push('/live-classes' as any)}
          >
            <View style={[styles.librarySquareIcon, { backgroundColor: '#EF4444' }]}>
              <Feather name="video" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.libCardTitle}>Your Live Classes</Text>
            <Text style={styles.libCardBadge}>LIVE STREAM</Text>
            <Text style={styles.libCardSub} numberOfLines={2}>
              Interactive Q&A Rooms
            </Text>
            <View style={styles.libCardLinkBtn}>
              <Text style={styles.libCardLinkText}>Join Live Room  ›</Text>
            </View>
          </TouchableOpacity>

          {/* 4. All India Test Series */}
          <TouchableOpacity
            style={styles.libraryGridCard}
            activeOpacity={0.85}
            onPress={() => router.push('/test-series' as any)}
          >
            <View style={[styles.librarySquareIcon, { backgroundColor: '#059669' }]}>
              <Feather name="target" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.libCardTitle}>Test Series</Text>
            <Text style={styles.libCardBadge}>Active CBT Tests</Text>
            <Text style={styles.libCardSub} numberOfLines={2}>
             On Real Exam Pattern
            </Text>
            <View style={styles.libCardLinkBtn}>
              <Text style={styles.libCardLinkText}>Start Practice Test  ›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F2',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  greetingSection: {
    marginTop: 6,
    marginBottom: 14,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    letterSpacing: 0.2,
  },
  nameHighlight: {
    color: '#B45309', // Warm amber gold
  },
  targetRow: {
    marginTop: 4,
  },
  targetLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  targetValue: {
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  bannerContainer: {
    marginBottom: 20,
  },
  bannerCard: {
    width: SCREEN_WIDTH - 32,
    height: Math.round((SCREEN_WIDTH - 32) * (320 / 720)),
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F3C45',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 16,
    backgroundColor: '#0F3C45',
  },
  defaultPromoBanner: {
    width: '100%',
    height: 110,
    borderRadius: 18,
    backgroundColor: '#0F3C45',
    padding: 18,
    justifyContent: 'center',
    marginBottom: 20,
  },
  promoTextWrap: {
    gap: 4,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promoBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  promoTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  promoSub: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  featureCardsList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0D9488', // Teal
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  featureDesc: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 16,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 6,
  },
  libraryGridCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 145,
  },
  librarySquareIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  libCardTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    marginBottom: 2,
    textAlign: 'center',
  },
  libCardBadge: {
    fontSize: 9,
    fontFamily: Theme.fonts.bold,
    color: '#0D9488',
    marginBottom: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  libCardSub: {
    fontSize: 10,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 13,
    marginBottom: 6,
  },
  libCardLinkBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  libCardLinkText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0D9488',
  },
});
