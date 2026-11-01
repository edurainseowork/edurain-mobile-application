import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { fetchCourseContent, ContentItem } from '../api/courses';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - 42) / 2);

export default function ClassMaterialScreen() {
  const { activeCourse, goal } = useApp();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<ContentItem | null>(null);
  const [folderHistory, setFolderHistory] = useState<ContentItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pdf' | 'video'>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const currentCourseId = activeCourse?.id ?? 19; // 19 is 2ss2
  const currentCourseTitle = activeCourse?.title || '2ss2';
  const currentCourseCategory = activeCourse?.category || goal?.name || 'NEET';

  const loadContent = useCallback(async () => {
    try {
      const data = await fetchCourseContent(currentCourseId);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentCourseId]);

  useEffect(() => {
    setLoading(true);
    setCurrentFolder(null);
    setFolderHistory([]);
    loadContent();
  }, [currentCourseId, loadContent]);

  // Compute item counts inside each folder
  const folderChildCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      if (item.parentId) {
        counts[item.parentId] = (counts[item.parentId] || 0) + 1;
      }
    }
    return counts;
  }, [items]);

  // Items at current folder level
  const currentLevelItems = useMemo(() => {
    return items.filter((item) => {
      if (currentFolder) {
        return item.parentId === currentFolder.id;
      }
      return !item.parentId;
    });
  }, [items, currentFolder]);

  // Summary counts for filter tabs
  const summaryCounts = useMemo(() => {
    const all = currentLevelItems.length;
    const pdfs = currentLevelItems.filter((i) => i.type === 'pdf' || i.type === 'note').length;
    const lectures = currentLevelItems.filter((i) => i.type === 'video').length;
    return { all, pdfs, lectures };
  }, [currentLevelItems]);

  // Filtered items to display in grid
  const displayedItems = useMemo(() => {
    return currentLevelItems.filter((item) => {
      if (selectedFilter === 'pdf') return item.type === 'pdf' || item.type === 'note';
      if (selectedFilter === 'video') return item.type === 'video';
      return true; // 'all' includes folders, pdfs, and videos
    });
  }, [currentLevelItems, selectedFilter]);

  const handleOpenFolder = (folder: ContentItem) => {
    setFolderHistory((prev) => (currentFolder ? [...prev, currentFolder] : []));
    setCurrentFolder(folder);
    setSelectedFilter('all');
  };

  const handleGoBackFolder = () => {
    if (folderHistory.length > 0) {
      const prev = folderHistory[folderHistory.length - 1];
      setFolderHistory((h) => h.slice(0, -1));
      setCurrentFolder(prev);
    } else {
      setCurrentFolder(null);
    }
  };

  const handleToggleBookmark = (id: string, title: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        Alert.alert('Bookmark Removed', `"${title}" removed from bookmarks.`);
      } else {
        next.add(id);
        Alert.alert('Bookmark Saved', `"${title}" saved to your bookmarks.`);
      }
      return next;
    });
  };

  const handleOpenPdf = (item: ContentItem) => {
    if (item.mediaUrl) {
      Linking.openURL(item.mediaUrl).catch(() => {
        Alert.alert('Cannot Open PDF', 'Could not open the PDF document.');
      });
    } else {
      Alert.alert('Notes Document', `${item.title}\n\nDocument is being prepared by educators.`);
    }
  };

  const handleWatchVideo = (item: ContentItem) => {
    if (item.mediaUrl) {
      Linking.openURL(item.mediaUrl).catch(() => {
        Alert.alert('Cannot Open Video', 'Could not open video player.');
      });
    } else {
      Alert.alert('Lecture Video', `${item.title}\n\nLecture recording will be available shortly.`);
    }
  };

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
              loadContent();
            }}
            colors={['#0B3B42']}
          />
        }
      >
        {/* Top Header Card (Matching Screenshot 3) */}
        <View style={styles.topHeaderCard}>
          <View style={styles.topHeaderNavRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (currentFolder) {
                  handleGoBackFolder();
                } else if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/home');
                }
              }}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color="#0B3B42" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                setRefreshing(true);
                loadContent();
              }}
              activeOpacity={0.7}
            >
              <Feather name="rotate-cw" size={17} color="#0B3B42" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerInfoRow}>
            <View style={styles.bookIconSquare}>
              <Ionicons name="book-outline" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Your Class Material</Text>
              <Text style={styles.headerBatchSubtitle}>{currentCourseTitle}</Text>
              <View style={styles.cohortBadge}>
                <Text style={styles.cohortBadgeText}>{currentCourseCategory}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Folder Hierarchy Navigation Breadcrumb Bar if inside folder */}
        {currentFolder && (
          <TouchableOpacity
            style={styles.folderBackBar}
            onPress={handleGoBackFolder}
            activeOpacity={0.7}
          >
            <Feather name="corner-left-up" size={16} color="#175A67" />
            <Text style={styles.folderBackBarText} numberOfLines={1}>
              Back to parent folder • <Text style={{ fontFamily: Theme.fonts.bold }}>{currentFolder.title}</Text>
            </Text>
          </TouchableOpacity>
        )}

        {/* Items Summary & Filter Tabs (Matching Screenshot 3) */}
        <View style={styles.controlsRow}>
          <View style={styles.itemsCountBadge}>
            <View style={styles.tealDot} />
            <Text style={styles.itemsCountText}>
              {currentLevelItems.length} {currentLevelItems.length === 1 ? 'Item' : 'Items'} Available
            </Text>
          </View>

          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedFilter === 'all' && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter('all')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === 'all' && styles.filterPillTextActive,
                ]}
              >
                All ({summaryCounts.all})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedFilter === 'pdf' && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter('pdf')}
              activeOpacity={0.75}
            >
              <Feather
                name="file-text"
                size={11}
                color={selectedFilter === 'pdf' ? '#FFFFFF' : '#475569'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === 'pdf' && styles.filterPillTextActive,
                ]}
              >
                PDFs ({summaryCounts.pdfs})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedFilter === 'video' && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter('video')}
              activeOpacity={0.75}
            >
              <Feather
                name="video"
                size={11}
                color={selectedFilter === 'video' ? '#FFFFFF' : '#475569'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === 'video' && styles.filterPillTextActive,
                ]}
              >
                Lectures ({summaryCounts.lectures})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#0B3B42" />
            <Text style={styles.loaderText}>Loading class materials...</Text>
          </View>
        ) : displayedItems.length === 0 ? (
          /* ======================================================== */
          /*  EMPTY STATE (Matching Screenshot 3)                     */
          /* ======================================================== */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Feather name="folder" size={32} color="#175A67" />
              </View>

              <Text style={styles.emptyCardTitle}>No Class Material Published Yet</Text>

              <Text style={styles.emptyCardSub}>
                PDF notes and recorded lectures for this course will appear here as soon as your teachers add them.
              </Text>

              <View style={styles.emptyPill}>
                <Text style={styles.emptyPillText}>PDF Notes  •  Recorded Lectures</Text>
              </View>
            </View>

            {/* Bottom Section: Your E-Book (Matching Screenshot 3) */}
            <View style={styles.ebookSection}>
              <View style={styles.ebookHeaderRow}>
                <Ionicons name="book-outline" size={16} color="#0B3B42" />
                <Text style={styles.ebookHeaderTitle}>Your E-Book</Text>
              </View>

              <TouchableOpacity
                style={styles.ebookCard}
                activeOpacity={0.85}
                onPress={() => router.push('/ebooks' as any)}
              >
                <View style={styles.swordsIconBox}>
                  <MaterialCommunityIcons name="sword-cross" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.ebookCardTitle}>Your Ebook</Text>
                <Text style={styles.ebookCardSub}>Digital reference textbooks & derivations</Text>
                <View style={styles.ebookCardBtn}>
                  <Text style={styles.ebookCardBtnText}>Explore Ebooks ›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ======================================================== */
          /*  COMPACT 2-COLUMN GRID (Matching Screenshot 4 & Request) */
          /* ======================================================== */
          <View style={styles.gridContainer}>
            {displayedItems.map((item) => {
              const isFolder = item.type === 'folder';
              const isPdf = item.type === 'pdf' || item.type === 'note';
              const isVideo = item.type === 'video';
              const childCount = folderChildCounts[item.id] || 0;
              const isBookmarked = bookmarkedIds.has(item.id);

              if (isFolder) {
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridCard}
                    activeOpacity={0.8}
                    onPress={() => handleOpenFolder(item)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.folderIconBox}>
                        <Feather name="folder" size={18} color="#175A67" />
                      </View>
                      <View style={styles.fileCountPill}>
                        <Text style={styles.fileCountPillText}>
                          {childCount} {childCount === 1 ? 'file' : 'files'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.cardBottomRow}>
                      <Text style={styles.openFolderLink}>Open folder ›</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              if (isPdf) {
                return (
                  <View key={item.id} style={styles.gridCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.pdfIconBox}>
                        <Feather name="file-text" size={18} color="#E11D48" />
                      </View>
                      <View style={styles.pdfBadgePill}>
                        <Text style={styles.pdfBadgePillText}>PDF Notes</Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {Boolean(item.fileSize) && (
                      <Text style={styles.fileSizeText}>{item.fileSize}</Text>
                    )}

                    <View style={styles.pdfActionRow}>
                      <TouchableOpacity
                        style={styles.viewNotesBtn}
                        onPress={() => handleOpenPdf(item)}
                        activeOpacity={0.8}
                      >
                        <Feather name="eye" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.viewNotesBtnText}>View Notes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.bookmarkIconBtn}
                        onPress={() => handleToggleBookmark(item.id, item.title)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="bookmark"
                          size={15}
                          color={isBookmarked ? '#E11D48' : '#64748B'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              // Lecture Video Card
              return (
                <View key={item.id} style={styles.gridCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.videoIconBox}>
                      <Feather name="video" size={18} color="#059669" />
                    </View>
                    <View style={styles.videoBadgePill}>
                      <Feather name="play" size={9} color="#059669" style={{ marginRight: 2 }} />
                      <Text style={styles.videoBadgePillText}>Lecture</Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {Boolean(item.fileSize) && (
                    <Text style={styles.fileSizeText}>{item.fileSize}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.watchLectureBtn}
                    onPress={() => handleWatchVideo(item)}
                    activeOpacity={0.8}
                  >
                    <Feather name="play" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.watchLectureBtnText}>Watch Lecture</Text>
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

  /* Top Header Card (Matching Screenshot 3) */
  topHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 14,
  },
  topHeaderNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bookIconSquare: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#175A67',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
  },
  headerBatchSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginTop: 1,
  },
  cohortBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  cohortBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },

  /* Folder Back Bar */
  folderBackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginBottom: 12,
  },
  folderBackBarText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#175A67',
    flex: 1,
  },

  /* Controls: Items available + Filter Pills */
  controlsRow: {
    marginBottom: 16,
    gap: 10,
  },
  itemsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#175A67',
  },
  itemsCountText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  filterPillText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },

  /* Empty State (SS3) */
  emptyContainer: {
    gap: 20,
    marginTop: 10,
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
  emptyCardTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCardSub: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 290,
  },
  emptyPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  emptyPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#64748B',
  },

  /* E-Book Bottom Card (SS3) */
  ebookSection: {
    marginTop: 10,
  },
  ebookHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ebookHeaderTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  ebookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  swordsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#175A67',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  ebookCardTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginBottom: 4,
  },
  ebookCardSub: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 12,
  },
  ebookCardBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ebookCardBtnText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },

  /* Compact 2-Column Grid (SS4 & Request) */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridCard: {
    width: GRID_ITEM_WIDTH,
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
    justifyContent: 'space-between',
    minHeight: 140,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  folderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fileCountPillText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
  },
  pdfIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfBadgePill: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pdfBadgePillText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#E11D48',
  },
  videoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  videoBadgePillText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
  },
  cardTitle: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    lineHeight: 16,
    marginBottom: 4,
  },
  fileSizeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    marginBottom: 6,
  },
  cardBottomRow: {
    marginTop: 'auto',
    paddingTop: 4,
  },
  openFolderLink: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },
  pdfActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 4,
  },
  viewNotesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#175A67',
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewNotesBtnText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  bookmarkIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchLectureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#175A67',
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 'auto',
  },
  watchLectureBtnText: {
    fontSize: 10.5,
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

