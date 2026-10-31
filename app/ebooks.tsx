import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '../components/Home/AppHeader';
import { Theme } from '../constants/theme';
import { fetchEBooks, EBookItem } from '../api/ebooks';

const SUBJECT_FILTERS = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Recommended'];

export default function EBooksScreen() {
  const [ebooks, setEbooks] = useState<EBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  const loadData = async () => {
    try {
      const data = await fetchEBooks();
      if (data && data.length > 0) {
        setEbooks(data);
      } else {
        setEbooks([
          {
            id: 'eb-1',
            title: 'Complete Formula Handbook & Quick Derivations',
            subject: 'Physics',
            totalPages: 142,
            pagesRead: 34,
            rating: 4.9,
            isCourseBook: true,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '4.2 MB',
            courseTitle: 'Class 11th PCB, Doctor',
          },
          {
            id: 'eb-2',
            title: 'Organic Chemistry Reaction Mechanisms & Mindmaps',
            subject: 'Chemistry',
            totalPages: 98,
            pagesRead: 12,
            rating: 4.8,
            isCourseBook: true,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '3.1 MB',
            courseTitle: 'NEET Foundation',
          },
          {
            id: 'eb-3',
            title: 'Human Physiology & High-Yield Diagrams Guide',
            subject: 'Biology',
            totalPages: 176,
            pagesRead: 56,
            rating: 5.0,
            isCourseBook: true,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '5.8 MB',
            courseTitle: 'Doctor Batch 2026',
          },
          {
            id: 'eb-4',
            title: 'Calculus & Coordinate Geometry Problem Repository',
            subject: 'Mathematics',
            totalPages: 210,
            pagesRead: 0,
            rating: 4.9,
            isCourseBook: false,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '6.4 MB',
            courseTitle: 'JEE Advanced Sprint',
          },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenPdf = (book: EBookItem) => {
    if (book.pdfUrl) {
      Linking.openURL(book.pdfUrl).catch(() => {
        Alert.alert('Unable to Open PDF', 'Please ensure a PDF viewer is installed on your device.');
      });
    } else {
      Alert.alert('Notice', 'PDF is being prepared on the CDN server.');
    }
  };

  const filtered = ebooks.filter((b) => {
    if (selectedFilter !== 'All' && selectedFilter !== 'Recommended') {
      if (b.subject.toLowerCase() !== selectedFilter.toLowerCase()) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return b.title.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q);
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {/* Title Row */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>E-Books Library</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search in E-Books"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillList}
        >
          {SUBJECT_FILTERS.map((f) => {
            const isSelected = selectedFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                onPress={() => setSelectedFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Ebooks List */}
        {loading ? (
          <ActivityIndicator size="large" color="#0B3B42" style={{ marginVertical: 32 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="book-open" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No E-Books Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search query or subject filters.
            </Text>
          </View>
        ) : (
          <View style={styles.booksCol}>
            {filtered.map((book) => {
              const isSaved = bookmarkedIds.includes(book.id);
              return (
                <View key={book.id} style={styles.bookCard}>
                  <View style={styles.bookIconWrap}>
                    <MaterialCommunityIcons name="book-open-page-variant" size={28} color="#0B3B42" />
                  </View>

                  <View style={styles.bookContent}>
                    <View style={styles.bookTopRow}>
                      <View style={styles.subjectBadge}>
                        <Text style={styles.subjectBadgeText}>{book.subject.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleBookmark(book.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather
                          name="bookmark"
                          size={18}
                          color={isSaved ? '#0284C7' : '#94A3B8'}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.bookTitle}>{book.title}</Text>
                    {book.courseTitle && (
                      <Text style={styles.courseSubtitle}>{book.courseTitle}</Text>
                    )}

                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{book.totalPages} pages</Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.metaText}>{book.fileSize || '3.5 MB'}</Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.metaRating}>★ {book.rating.toFixed(1)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.readBtn}
                      activeOpacity={0.85}
                      onPress={() => handleOpenPdf(book)}
                    >
                      <Feather name="file-text" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.readBtnText}>Read E-Book PDF</Text>
                    </TouchableOpacity>
                  </View>
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
    paddingBottom: 36,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 12,
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
  filterPillList: {
    gap: 8,
    paddingBottom: 16,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillSelected: {
    backgroundColor: '#0B3B42',
    borderColor: '#0B3B42',
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  filterPillTextSelected: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  booksCol: {
    gap: 12,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  bookIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookContent: {
    flex: 1,
  },
  bookTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subjectBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  bookTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 20,
  },
  courseSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  metaDot: {
    marginHorizontal: 6,
    fontSize: 10,
    color: '#CBD5E1',
  },
  metaRating: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#D97706',
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3B42',
    paddingVertical: 10,
    borderRadius: 10,
  },
  readBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
});

