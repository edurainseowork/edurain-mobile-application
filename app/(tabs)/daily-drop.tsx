import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '../../components/Home/AppHeader';
import { Theme } from '../../constants/theme';

export default function DailyDropScreen() {
  const [isNotified, setIsNotified] = useState(false);

  const handleNotifyPress = () => {
    setIsNotified(true);
    Alert.alert(
      'Daily Drop Alert',
      "You're on the priority list! We'll notify you as soon as the Daily Drop feature launches with daily flashcards and mock drills."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Daily Drop</Text>
        </View>

        <View style={styles.lockedHeroCard}>
          <View style={styles.lockIconBox}>
            <Feather name="zap" size={28} color="#0B3B42" />
            <View style={styles.lockActiveDot} />
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>• LOCKED • COMING SOON</Text>
          </View>

          <Text style={styles.heroTitle}>Daily Concept Drop</Text>

          <Text style={styles.heroDesc}>
            This feature is currently under active development. Daily high-yield question drops,
            bite-sized memory flashcards, and rapid speed drills will be available every morning.
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
              {isNotified ? 'Notification Enabled' : 'Notify Me When Available'}
            </Text>
          </TouchableOpacity>

          <View style={styles.altLinkRow}>
            <Text style={styles.altLinkText}>Explore full courses instead? </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/courses')}>
              <Text style={styles.altLinkHighlight}>Browse Courses →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.featuresHeaderRow}>
          <View style={styles.featuresHeaderLeft}>
            <MaterialCommunityIcons name="star-shooting-outline" size={18} color="#0B3B42" />
            <Text style={styles.featuresHeaderTitle}>What to Expect in Daily Drop</Text>
          </View>
        </View>

        <View style={styles.featureCardsCol}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Feather name="help-circle" size={22} color="#0EA5E9" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureCardTitle}>5-Minute Daily Quiz</Text>
              <Text style={styles.featureCardSubtitle}>
                3 curated high-probability NEET & JEE questions delivered each morning
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Feather name="award" size={22} color="#0EA5E9" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureCardTitle}>Streak & Daily Badges</Text>
              <Text style={styles.featureCardSubtitle}>
                Earn badges and track continuous retention alongside your peers
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Feather name="layers" size={22} color="#0EA5E9" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureCardTitle}>Instant Formula Flashcards</Text>
              <Text style={styles.featureCardSubtitle}>
                Rapid formula revisions and organic reaction summary sheets
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
    paddingTop: 12,
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
    backgroundColor: '#FEF3C7',
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
    backgroundColor: '#F59E0B',
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#D97706',
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
    backgroundColor: '#FEF3C7',
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

