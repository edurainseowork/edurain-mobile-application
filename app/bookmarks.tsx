import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '../components/Home/AppHeader';
import { Theme } from '../constants/theme';

export default function BookmarksScreen() {
  const [historyItems, setHistoryItems] = useState([
    {
      id: 'v-1',
      title: "Electrostatics – Gauss's Law Applications",
      subject: 'Physics',
      standard: '12th',
      duration: '45:10',
    },
  ]);

  const handleClearAllHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to clear your video watch history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setHistoryItems([]),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Row (No Breadcrumbs) */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Bookmark</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Feather name="bookmark" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Bookmark</Text>
            <Text style={styles.heroSubtitle}>
              Your saved revision videos, bookmarked e-books, and study material
            </Text>
          </View>
        </View>

        {/* Saved E-Books Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="book" size={18} color="#0B3B42" />
            <Text style={styles.sectionHeaderTitle}>Saved E-Books</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>0</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/ebooks' as any)}>
            <Text style={styles.browseLink}>Browse Library →</Text>
          </TouchableOpacity>
        </View>

        {/* Empty Saved E-Books State */}
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={32} color="#0B3B42" />
          </View>
          <Text style={styles.emptyTitle}>No saved e-books yet</Text>
          <Text style={styles.emptySubtitle}>
            Click the bookmark icon on any e-book in the E-Book Library to pin it here for quick
            access!
          </Text>
          <TouchableOpacity
            style={styles.exploreEbooksBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/ebooks' as any)}
          >
            <Feather name="book-open" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.exploreEbooksBtnText}>Explore E-Books</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="clock" size={18} color="#0B3B42" />
            <Text style={styles.sectionHeaderTitle}>History</Text>
          </View>
          {historyItems.length > 0 && (
            <TouchableOpacity onPress={handleClearAllHistory} style={styles.clearAllBtn}>
              <Feather name="rotate-ccw" size={13} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* History Items */}
        {historyItems.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            {/* Video Thumbnail */}
            <View style={styles.videoThumbnail}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>
                  {item.subject} • {item.standard}
                </Text>
              </View>

              <View style={styles.playCenter}>
                <Feather name="play-circle" size={44} color="#FFFFFF" />
              </View>

              <View style={styles.durationPill}>
                <Feather name="clock" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            </View>

            {/* Video Title & Action */}
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{item.title}</Text>
              <TouchableOpacity
                style={styles.watchNowBtn}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Launching Video Lecture', `Opening "${item.title}"...`)}
              >
                <Text style={styles.watchNowBtnText}>Watch Now →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
    paddingBottom: 36,
    paddingTop: 10,
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    gap: 14,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0B3B42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  countBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  browseLink: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  exploreEbooksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B3B42',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreEbooksBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  videoThumbnail: {
    height: 170,
    backgroundColor: '#0F172A',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#D97706',
  },
  playCenter: {
    opacity: 0.9,
  },
  durationPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 12,
  },
  watchNowBtn: {
    backgroundColor: '#0B3B42',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  watchNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
  },
});
