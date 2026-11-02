import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as ScreenCapture from 'expo-screen-capture';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { fetchEBooks, EBookItem } from '../api/ebooks';
import { getSavedEBooks, toggleSaveEBook } from '../services/bookmarkStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 42) / 2);

export default function EBooksScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [ebooks, setEbooks] = useState<EBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedType, setSelectedType] = useState<'all' | 'recommended'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // DRM In-App PDF Reader Modal State
  const [activePdf, setActivePdf] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    if (activePdf) {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    }
  }, [activePdf]);

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
            pagesRead: 0,
            rating: 4.95,
            isCourseBook: true,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '4.2 MB',
            courseTitle: 'Doctor',
          },
          {
            id: 'eb-2',
            title: 'Organic Chemistry Reaction Mechanisms & Mindmaps',
            subject: 'Chemistry',
            totalPages: 98,
            pagesRead: 12,
            rating: 4.88,
            isCourseBook: true,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '3.1 MB',
            courseTitle: 'Doctor',
          },
          {
            id: 'eb-3',
            title: 'Human Physiology & High-Yield Diagrams Guide',
            subject: 'Biology',
            totalPages: 176,
            pagesRead: 45,
            rating: 5.0,
            isCourseBook: true,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '5.8 MB',
            courseTitle: 'Doctor',
          },
          {
            id: 'eb-4',
            title: 'Calculus & Coordinate Geometry Problem Repository',
            subject: 'Mathematics',
            totalPages: 210,
            pagesRead: 0,
            rating: 4.92,
            isCourseBook: false,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: '6.4 MB',
            courseTitle: 'IIT Mechanical',
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
    getSavedEBooks().then((saved) => {
      setBookmarkedIds(saved.map((s) => s.id));
    });
  }, []);

  // Course Filter List
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    ebooks.forEach((b) => {
      if (b.courseTitle) set.add(b.courseTitle);
    });
    return Array.from(set);
  }, [ebooks]);

  const handleToggleBookmark = async (book: EBookItem) => {
    const isSaved = await toggleSaveEBook({
      id: book.id,
      title: book.title,
      subject: book.subject,
      totalPages: book.totalPages,
      pagesRead: book.pagesRead,
      rating: book.rating,
      isCourseBook: book.isCourseBook,
      pdfUrl: book.pdfUrl,
      fileSize: book.fileSize,
      courseTitle: book.courseTitle,
    });

    setBookmarkedIds((prev) => {
      if (isSaved) {
        Alert.alert('PDF Saved', `"${book.title}" saved to your reference library.`);
        return [...prev, book.id];
      } else {
        Alert.alert('Bookmark Removed', `"${book.title}" removed from saved PDFs.`);
        return prev.filter((item) => item !== book.id);
      }
    });
  };

  const handleOpenPdf = (book: EBookItem) => {
    if (book.pdfUrl) {
      setActivePdf({
        title: book.title,
        url: book.pdfUrl,
      });
    } else {
      Alert.alert('E-Book Reader', `"${book.title}" is being formatted for digital reading.`);
    }
  };

  // Filter Logic
  const filtered = useMemo(() => {
    return ebooks.filter((b) => {
      // Course filter
      if (selectedCourse !== 'All') {
        if (b.courseTitle?.toLowerCase() !== selectedCourse.toLowerCase()) return false;
      }
      // Type filter
      if (selectedType === 'recommended' && !b.isCourseBook) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          b.title.toLowerCase().includes(q) ||
          b.subject.toLowerCase().includes(q) ||
          (b.courseTitle && b.courseTitle.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [ebooks, selectedCourse, selectedType, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Clean Header: Back Button + Title (No Breadcrumbs) */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#0B3B42" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Digital E-Books Library</Text>
      </View>

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
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search textbooks, handbooks or notes..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Row 1: Courses (Screenshot 3 & 4) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollRow}
        >
          <TouchableOpacity
            style={[styles.courseFilterChip, selectedCourse === 'All' && styles.courseFilterChipActive]}
            onPress={() => setSelectedCourse('All')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.courseFilterChipText,
                selectedCourse === 'All' && styles.courseFilterChipTextActive,
              ]}
            >
              All Batches ({ebooks.length})
            </Text>
          </TouchableOpacity>

          {availableCourses.map((c) => {
            const count = ebooks.filter((b) => b.courseTitle === c).length;
            const isSelected = selectedCourse === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.courseFilterChip, isSelected && styles.courseFilterChipActive]}
                onPress={() => setSelectedCourse(c)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.courseFilterChipText,
                    isSelected && styles.courseFilterChipTextActive,
                  ]}
                >
                  {c} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter Row 2: Types (All E-Books vs Course Recommended) */}
        <View style={styles.typeFilterRow}>
          <TouchableOpacity
            style={[styles.typeFilterChip, selectedType === 'all' && styles.typeFilterChipActive]}
            onPress={() => setSelectedType('all')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.typeFilterChipText,
                selectedType === 'all' && styles.typeFilterChipTextActive,
              ]}
            >
              All E-Books
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeFilterChip, selectedType === 'recommended' && styles.typeFilterChipActive]}
            onPress={() => setSelectedType('recommended')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="sparkles-outline"
              size={12}
              color={selectedType === 'recommended' ? '#FFFFFF' : '#0B3B42'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.typeFilterChipText,
                selectedType === 'recommended' && styles.typeFilterChipTextActive,
              ]}
            >
              Batch Recommended
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subheader: Showing X books + Grid/List Toggle */}
        <View style={styles.subheaderRow}>
          <Text style={styles.showingCountText}>
            Showing <Text style={{ fontFamily: Theme.fonts.bold, color: '#0F172A' }}>{filtered.length}</Text> books
          </Text>

          <View style={styles.viewModeToggleWrap}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="grid"
                size={16}
                color={viewMode === 'grid' ? '#0B3B42' : '#94A3B8'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <Feather
                name="list"
                size={17}
                color={viewMode === 'list' ? '#0B3B42' : '#94A3B8'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Books Content */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#0B3B42" />
            <Text style={styles.loaderText}>Loading digital library...</Text>
          </View>
        ) : filtered.length === 0 ? (
          /* ======================================================== */
          /*  EMPTY STATE (Matching Screenshot 3)                     */
          /* ======================================================== */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Feather name="book-open" size={32} color="#175A67" />
            </View>
            <Text style={styles.emptyTitle}>No E-Books Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search query or course filters to find available reference textbooks.
            </Text>
          </View>
        ) : viewMode === 'grid' ? (
          /* ======================================================== */
          /*  GRID VIEW (Matching Screenshot 4)                       */
          /* ======================================================== */
          <View style={styles.gridContainer}>
            {filtered.map((book) => {
              const isSaved = bookmarkedIds.includes(book.id);
              const readPct = book.totalPages > 0 ? Math.round((book.pagesRead / book.totalPages) * 100) : 0;

              return (
                <View key={book.id} style={styles.gridCard}>
                  {/* Category & Course Tag Pills */}
                  <View style={styles.tagsRow}>
                    <View style={styles.subjectPill}>
                      <Text style={styles.subjectPillText}>{book.subject.toUpperCase()}</Text>
                    </View>
                    {book.courseTitle && (
                      <View style={styles.courseTagPill}>
                        <Text style={styles.courseTagPillText} numberOfLines={1}>
                          {book.courseTitle}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Dark Book Cover */}
                  <View style={styles.darkBookCover}>
                    <MaterialCommunityIcons name="book-open-page-variant" size={36} color="#FFFFFF" />
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>★ {book.rating.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Book Title */}
                  <Text style={styles.bookGridTitle} numberOfLines={2}>
                    {book.title}
                  </Text>

                  {/* Reading Progress */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${Math.max(readPct, 4)}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                      {readPct}% Read • {book.pagesRead} / {book.totalPages} pgs
                    </Text>
                  </View>

                  {/* Action Buttons: Save PDF & Read */}
                  <View style={styles.gridActionRow}>
                    <TouchableOpacity
                      style={[styles.savePdfBtn, isSaved && styles.savePdfBtnActive]}
                      onPress={() => handleToggleBookmark(book)}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name="bookmark"
                        size={12}
                        color={isSaved ? '#0284C7' : '#64748B'}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.savePdfBtnText, isSaved && styles.savePdfBtnTextActive]}>
                        {isSaved ? 'Saved' : 'Save PDF'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.readBookBtn}
                      onPress={() => handleOpenPdf(book)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.readBookBtnText}>Read ›</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* ======================================================== */
          /*  LIST VIEW (Matching Screenshot 4)                       */
          /* ======================================================== */
          <View style={styles.listContainer}>
            {filtered.map((book) => {
              const isSaved = bookmarkedIds.includes(book.id);
              const readPct = book.totalPages > 0 ? Math.round((book.pagesRead / book.totalPages) * 100) : 0;

              return (
                <View key={book.id} style={styles.listCard}>
                  {/* Left Dark Cover */}
                  <View style={styles.listBookCover}>
                    <MaterialCommunityIcons name="book-open-page-variant" size={32} color="#FFFFFF" />
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>★ {book.rating.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Right Details */}
                  <View style={styles.listDetailsCol}>
                    <View style={styles.tagsRow}>
                      <View style={styles.subjectPill}>
                        <Text style={styles.subjectPillText}>{book.subject.toUpperCase()}</Text>
                      </View>
                      {book.courseTitle && (
                        <View style={styles.courseTagPill}>
                          <Text style={styles.courseTagPillText} numberOfLines={1}>
                            {book.courseTitle}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.bookListTitle} numberOfLines={2}>
                      {book.title}
                    </Text>

                    {/* Reading Progress */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${Math.max(readPct, 4)}%` }]} />
                      </View>
                      <Text style={styles.progressLabel}>
                        {readPct}% Read • {book.pagesRead} / {book.totalPages} pgs
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.listActionRow}>
                      <TouchableOpacity
                        style={[styles.savePdfBtn, isSaved && styles.savePdfBtnActive]}
                        onPress={() => handleToggleBookmark(book)}
                        activeOpacity={0.75}
                      >
                        <Feather
                          name="bookmark"
                          size={12}
                          color={isSaved ? '#0284C7' : '#64748B'}
                          style={{ marginRight: 3 }}
                        />
                        <Text style={[styles.savePdfBtnText, isSaved && styles.savePdfBtnTextActive]}>
                          {isSaved ? 'Saved' : 'Save PDF'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.readBookBtn}
                        onPress={() => handleOpenPdf(book)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.readBookBtnText}>Read E-Book ›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* DRM In-App Protected PDF Viewer Modal */}
      <Modal
        visible={!!activePdf}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActivePdf(null)}
      >
        <SafeAreaView style={styles.drmModalSafe} edges={['left', 'right', 'bottom']}>
          {/* Header - optimized view directly below front camera / notch */}
          <View style={[styles.drmModalHeader, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
            <TouchableOpacity
              style={styles.drmModalCloseBtn}
              onPress={() => setActivePdf(null)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.drmModalTitleWrap}>
              <Text style={styles.drmModalTitle} numberOfLines={1}>
                {activePdf?.title}
              </Text>
              <View style={styles.drmSecurityBadge}>
                <Feather name="shield" size={10} color="#34D399" />
                <Text style={styles.drmSecurityText}>DRM Protected Document • No Download</Text>
              </View>
            </View>
          </View>

          {/* PDF Reader Body */}
          <View style={styles.drmModalBody}>
            {activePdf && (
              <WebView
                source={{
                  uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activePdf.url)}`,
                }}
                style={styles.drmWebView}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.drmLoader}>
                    <ActivityIndicator size="large" color="#38BDF8" />
                    <Text style={styles.drmLoaderText}>Loading DRM Protected PDF Reader...</Text>
                  </View>
                )}
              />
            )}

            {/* Subtle Anti-Piracy Watermark: only 1-2 watermarks in center */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.watermarkWrapper}>
                {[0, 1].map((idx) => (
                  <View key={idx} style={styles.watermarkRow}>
                    <Text style={styles.watermarkText}>
                      {user?.name || 'STUDENT'} • {user?.email || 'EDURAIN'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#EAF0EC',
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
  topHeaderTitle: {
    fontSize: 16.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
  },
  filterScrollRow: {
    gap: 8,
    paddingBottom: 10,
  },
  courseFilterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  courseFilterChipActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  courseFilterChipText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  courseFilterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  typeFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeFilterChipActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  typeFilterChipText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  typeFilterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  subheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  showingCountText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  viewModeToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
  },
  viewModeBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: '#F1F5F9',
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
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
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  subjectPill: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectPillText: {
    fontSize: 9,
    fontFamily: Theme.fonts.bold,
    color: '#E11D48',
  },
  courseTagPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 80,
  },
  courseTagPillText: {
    fontSize: 9,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },
  darkBookCover: {
    width: '100%',
    height: 100,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#FBBF24',
  },
  bookGridTitle: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    lineHeight: 16,
    marginBottom: 8,
    minHeight: 32,
  },
  progressSection: {
    marginBottom: 10,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
  },
  gridActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savePdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    borderRadius: 10,
  },
  savePdfBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  savePdfBtnText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  savePdfBtnTextActive: {
    color: '#0284C7',
    fontFamily: Theme.fonts.bold,
  },
  readBookBtn: {
    backgroundColor: '#0F3C45',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  readBookBtnText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 12,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  listBookCover: {
    width: 80,
    height: 100,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  listDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookListTitle: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  listActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  drmModalSafe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  drmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  drmModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drmModalTitleWrap: {
    flex: 1,
  },
  drmModalTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  drmSecurityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  drmSecurityText: {
    fontSize: 10,
    fontFamily: Theme.fonts.medium,
    color: '#34D399',
  },
  drmModalBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  drmWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  drmLoader: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  drmLoaderText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
  },
  watermarkWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 90,
    transform: [{ rotate: '-25deg' }],
  },
  watermarkRow: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  watermarkText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: 'rgba(15, 60, 69, 0.12)',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
