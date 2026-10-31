import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '../../components/Home/AppHeader';
import { Theme } from '../../constants/theme';

export default function TestPassScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotified, setIsNotified] = useState(false);

  const handleNotifyPress = () => {
    setIsNotified(true);
    Alert.alert(
      'Notification Saved',
      "You are on the priority list! We'll notify you as soon as the All India Test Pass is unlocked."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Dynamic Header with Logo, Cohort Pill, Bell & Avatar */}
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search in All India Test Pass"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Clean Header (No Breadcrumbs) */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>All India Test Pass</Text>
        </View>

        {/* Hero Locked Card */}
        <View style={styles.lockedHeroCard}>
          <View style={styles.lockIconBox}>
            <Feather name="lock" size={28} color="#0B3B42" />
            <View style={styles.lockActiveDot} />
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>• LOCKED • COMING SOON</Text>
          </View>

          <Text style={styles.heroTitle}>All India Test Pass</Text>

          <Text style={styles.heroDesc}>
            This feature is currently locked while our all-India CBT testing engine and percentile
            benchmarking system are being finalized. It will unlock soon ahead of the examination
            season.
          </Text>

          <TouchableOpacity
            style={[styles.notifyBtn, isNotified && styles.notifyBtnDone]}
            onPress={handleNotifyPress}
            activeOpacity={0.85}
          >
            <Feather
              name={isNotified ? 'check' : 'bell'}
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.notifyBtnText}>
              {isNotified ? 'Notification Enabled' : 'Notify Me When Unlocked'}
            </Text>
          </TouchableOpacity>

          <View style={styles.altLinkRow}>
            <Text style={styles.altLinkText}>Looking to practice today? </Text>
            <TouchableOpacity onPress={() => router.push('/test-series' as any)}>
              <Text style={styles.altLinkHighlight}>Solve Course Tests →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pre-season Included Features */}
        <View style={styles.featuresHeaderRow}>
          <View style={styles.featuresHeaderLeft}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color="#0B3B42" />
            <Text style={styles.featuresHeaderTitle}>Included in Full Pass</Text>
          </View>
          <Text style={styles.featuresHeaderBadge}>Pre-season Release</Text>
        </View>

        {/* 3 Feature Cards */}
        <View style={styles.featureCardsCol}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Feather name="monitor" size={22} color="#0EA5E9" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureCardTitle}>NTA Simulation Engine</Text>
              <Text style={styles.featureCardSubtitle}>
                Exact interface, palette & navigation timers
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Feather name="trending-up" size={22} color="#0EA5E9" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureCardTitle}>Real-Time Percentile</Text>
              <Text style={styles.featureCardSubtitle}>
                Live benchmarking vs 250,000+ aspirants
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Feather name="cpu" size={22} color="#0EA5E9" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureCardTitle}>AI Diagnostic Scorecard</Text>
              <Text style={styles.featureCardSubtitle}>
                Topic-level speed & negative mark forensics
              </Text>
            </View>
          </View>
        </View>
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
    marginBottom: 16,
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
  lockedHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  lockIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  lockActiveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B3B42',
  },
  statusPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3B42',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    marginBottom: 16,
  },
  notifyBtnDone: {
    backgroundColor: '#059669',
  },
  notifyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
  },
  altLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  altLinkText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  altLinkHighlight: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  featuresHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featuresHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuresHeaderTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  featuresHeaderBadge: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  featureCardsCol: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureInfo: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 2,
  },
  featureCardSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 16,
  },
});
