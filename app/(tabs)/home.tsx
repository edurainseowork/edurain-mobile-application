import React, { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import { AppHeader } from '../../components/Home/AppHeader';
import { fetchBanners, Banner } from '../../api/courses';
import { fetchNotifications, NotificationItem } from '../../api/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, goal, activeCourse, refreshUserData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const loadData = async () => {
    try {
      const [bannerList, notifList] = await Promise.all([
        fetchBanners().catch(() => []),
        fetchNotifications().catch(() => []),
        refreshUserData().catch(() => {}),
      ]);
      setBanners(bannerList);
      setNotifications(notifList);
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

  const studentName = user?.name ? user.name.split(' ')[0] : 'Student';
  const targetGoal = goal?.name || 'JEE';
  const currentBatch = activeCourse?.title || 'Engineering bno';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <AppHeader
        unreadCount={notifications.filter((n) => !n.isRead).length}
        onSearchPress={() => router.push('/(tabs)/courses')}
        onNotificationsPress={() => router.push('/(tabs)/profile')}
        onProfilePress={() => router.push('/(tabs)/profile')}
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
          <Feather name="book-open" size={18} color="#0F3C45" />
          <Text style={styles.sectionTitle}>Library</Text>
        </View>

        {/* Library Cards Grid */}
        <View style={styles.libraryGrid}>
          <TouchableOpacity
            style={styles.libraryCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/library')}
          >
            <View style={[styles.libraryIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="book" size={22} color="#D97706" />
            </View>
            <Text style={styles.libraryCardTitle}>Course Notes</Text>
            <Text style={styles.libraryCardSub}>PDFs & Modules</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.libraryCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/courses')}
          >
            <View style={[styles.libraryIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="trophy" size={22} color="#0284C7" />
            </View>
            <Text style={styles.libraryCardTitle}>Test Series</Text>
            <Text style={styles.libraryCardSub}>All India Mocks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.libraryCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/courses')}
          >
            <View style={[styles.libraryIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="videocam" size={22} color="#16A34A" />
            </View>
            <Text style={styles.libraryCardTitle}>Live Classes</Text>
            <Text style={styles.libraryCardSub}>Recorded Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.libraryCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={[styles.libraryIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="ribbon" size={22} color="#9333EA" />
            </View>
            <Text style={styles.libraryCardTitle}>Purchases</Text>
            <Text style={styles.libraryCardSub}>Invoices & Access</Text>
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
    height: 120,
    borderRadius: 18,
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
    gap: 12,
  },
  libraryCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 6,
  },
  libraryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  libraryCardTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  libraryCardSub: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
});
