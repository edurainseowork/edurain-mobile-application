import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';

interface LockedFeatureGuardProps {
  featureTitle: string;
  featureDesc?: string;
  children: React.ReactNode;
}

export const LockedFeatureGuard: React.FC<LockedFeatureGuardProps> = ({
  featureTitle,
  featureDesc,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const { enrolledIds, activeCourse } = useApp();

  const hasEnrolledBatch = (enrolledIds && enrolledIds.length > 0) || !!activeCourse;

  if (hasEnrolledBatch) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#0B3B42" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {featureTitle}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Centered Glassmorphism Card */}
      <View style={styles.centerContainer}>
        <View style={styles.glassCard}>
          <View style={styles.lockIconCircle}>
            <Feather name="lock" size={32} color="#0B3B42" />
          </View>

          <View style={styles.enrolledPill}>
            <Text style={styles.enrolledPillText}>ENROLLED STUDENTS ONLY</Text>
          </View>

          <Text style={styles.lockTitle}>Feature Locked</Text>

          <Text style={styles.lockSubMessage}>
            This tab will become active once you enroll in a batch.
          </Text>

          <Text style={styles.lockDetail}>
            {featureDesc ||
              `${featureTitle} is exclusively available to enrolled students with personalized mentor guidance, study roadmaps, and 24/7 problem-solving.`}
          </Text>

          <TouchableOpacity
            style={styles.exploreBatchesBtn}
            onPress={() => router.push('/(tabs)/courses' as any)}
            activeOpacity={0.85}
          >
            <Feather name="layers" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.exploreBatchesBtnText}>Explore Batches</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#0B3B42',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  lockIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  enrolledPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  enrolledPillText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#D97706',
    letterSpacing: 0.5,
  },
  lockTitle: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginBottom: 6,
    textAlign: 'center',
  },
  lockSubMessage: {
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
    color: '#175A67',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  lockDetail: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  exploreBatchesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3C45',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  exploreBatchesBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
});

