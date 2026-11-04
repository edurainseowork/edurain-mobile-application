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
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as ScreenCapture from 'expo-screen-capture';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { fetchCourseContent, ContentItem } from '../api/courses';
import {
  getSavedPdfs,
  toggleSavePdf,
  recordLectureWatch,
} from '../services/bookmarkStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - 42) / 2);

export default function ClassMaterialScreen() {
  const insets = useSafeAreaInsets();
  const { activeCourse, goal, user } = useApp();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<ContentItem | null>(null);
  const [folderHistory, setFolderHistory] = useState<ContentItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pdf' | 'video'>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // DRM In-App Protected Viewer State
  const [activeMedia, setActiveMedia] = useState<{
    type: 'video' | 'pdf';
    title: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (activeMedia) {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    }
  }, [activeMedia]);

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

  useEffect(() => {
    getSavedPdfs().then((saved) => {
      setBookmarkedIds(new Set(saved.map((s) => s.id)));
    });
  }, []);

  const handleGoBackFolder = () => {
    if (folderHistory.length > 0) {
      const prev = folderHistory[folderHistory.length - 1];
      setFolderHistory((h) => h.slice(0, -1));
      setCurrentFolder(prev);
    } else {
      setCurrentFolder(null);
    }
  };

  const handleToggleBookmark = async (item: ContentItem) => {
    const isSaved = await toggleSavePdf({
      id: item.id,
      title: item.title,
      mediaUrl: item.mediaUrl || '',
      subject: item.subject || currentCourseCategory,
      courseTitle: currentCourseTitle,
      fileSize: item.fileSize || '1.2 MB',
      category: item.category || undefined,
    });

    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) {
        next.add(item.id);
        Alert.alert('PDF Saved', `"${item.title}" saved to Your Saved PDFs.`);
      } else {
        next.delete(item.id);
        Alert.alert('Bookmark Removed', `"${item.title}" removed from Saved PDFs.`);
      }
      return next;
    });
  };

  const getVideoSource = (url: string) => {
    if (url.includes('iframe.mediadelivery.net') || url.includes('/play/') || url.includes('/embed/')) {
      return { uri: url };
    }
    const isAndroid = Platform.OS === 'android';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: #000000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
          video { width: 100%; height: 100%; object-fit: contain; }
        </style>
        ${isAndroid && url.includes('.m3u8') ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>' : ''}
      </head>
      <body>
        <video id="player" src="${url}" controls autoplay playsinline controlslist="nodownload" disablepictureinpicture></video>
        ${
          isAndroid && url.includes('.m3u8')
            ? `
        <script>
          var video = document.getElementById('player');
          if (Hls.isSupported()) {
            var hls = new Hls();
            hls.loadSource('${url}');
            hls.attachMedia(video);
          }
        </script>
        `
            : ''
        }
      </body>
      </html>
    `;
    return { html };
  };

  const getPdfSource = (url: string) => {
    return {
      uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`,
    };
  };

  const handleOpenPdf = (item: ContentItem) => {
    if (item.mediaUrl) {
      setActiveMedia({
        type: 'pdf',
        title: item.title,
        url: item.mediaUrl,
      });
    } else {
      Alert.alert('Notes Document', `${item.title}\n\nDocument is being prepared by educators.`);
    }
  };

  const handleWatchVideo = (item: ContentItem) => {
    if (item.mediaUrl) {
      recordLectureWatch({
        id: item.id,
        title: item.title,
        subject: item.subject || currentCourseCategory,
        standard: currentCourseTitle,
        duration: item.duration || '45:00',
        mediaUrl: item.mediaUrl,
      });
      setActiveMedia({
        type: 'video',
        title: item.title,
        url: item.mediaUrl,
      });
    } else {
      Alert.alert('Study Material', `${item.title}\n\nThis material is not available yet.`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: Math.max(insets.top, 16) + 6 },
        ]}
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
                Materials ({summaryCounts.lectures})
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
                PDF notes and study material for this course will appear here as soon as your teachers add them.
              </Text>

              <View style={styles.emptyPill}>
                <Text style={styles.emptyPillText}>PDF Notes  •  Study Material</Text>
              </View>
            </View>
          </View>
        ) : currentFolder !== null ? (
          /* ======================================================== */
          /*  HORIZONTAL LONG TILES FOR FOLDER CONTENTS (SS5)        */
          /* ======================================================== */
          <View style={styles.listContainer}>
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
                    style={styles.longTileCard}
                    activeOpacity={0.8}
                    onPress={() => handleOpenFolder(item)}
                  >
                    <View style={styles.longTileTopRow}>
                      <View style={styles.folderIconBoxLarge}>
                        <Feather name="folder" size={22} color="#175A67" />
                      </View>
                      <View style={styles.fileCountPill}>
                        <Text style={styles.fileCountPillText}>
                          {childCount} {childCount === 1 ? 'file' : 'files'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.longTileTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.longTileBottomRow}>
                      <Text style={styles.openFolderLink}>Open folder ›</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              if (isPdf) {
                return (
                  <View key={item.id} style={styles.longTileCard}>
                    <View style={styles.longTileTopRow}>
                      <View style={styles.pdfIconBoxLarge}>
                        <Feather name="file-text" size={20} color="#E11D48" />
                      </View>
                      <View style={styles.pdfBadgePill}>
                        <Text style={styles.pdfBadgePillText}>PDF Notes</Text>
                      </View>
                    </View>

                    <Text style={styles.longTileTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {Boolean(item.fileSize) && (
                      <Text style={styles.fileSizeTextLarge}>{item.fileSize}</Text>
                    )}

                    <View style={styles.longTileActionRow}>
                      <TouchableOpacity
                        style={styles.longTilePrimaryBtn}
                        onPress={() => handleOpenPdf(item)}
                        activeOpacity={0.8}
                      >
                        <Feather name="eye" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.longTilePrimaryBtnText}>View Notes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.longTileBookmarkBtn}
                        onPress={() => handleToggleBookmark(item)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="bookmark"
                          size={18}
                          color={isBookmarked ? '#0D9488' : '#64748B'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              // Lecture Video Long Tile
              return (
                <View key={item.id} style={styles.longTileCard}>
                  <View style={styles.longTileTopRow}>
                    <View style={styles.videoIconBoxLarge}>
                      <Feather name="video" size={20} color="#059669" />
                    </View>
                    <View style={styles.videoBadgePill}>
                      <Feather name="play" size={10} color="#059669" style={{ marginRight: 3 }} />
                      <Text style={styles.videoBadgePillText}>Material</Text>
                    </View>
                  </View>

                  <Text style={styles.longTileTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {Boolean(item.fileSize) && (
                    <Text style={styles.fileSizeTextLarge}>{item.fileSize}</Text>
                  )}

                  <View style={styles.longTileActionRow}>
                    <TouchableOpacity
                      style={styles.longTilePrimaryBtn}
                      onPress={() => handleWatchVideo(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="play" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.longTilePrimaryBtnText}>Open Material</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.longTileBookmarkBtn}
                      onPress={() => handleToggleBookmark(item)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="bookmark"
                        size={18}
                        color={isBookmarked ? '#0D9488' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
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
                        onPress={() => handleToggleBookmark(item)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="bookmark"
                          size={15}
                          color={isBookmarked ? '#0D9488' : '#64748B'}
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
                      <Text style={styles.videoBadgePillText}>Material</Text>
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
                    <Text style={styles.watchLectureBtnText}>Open Material</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Bottom Section: Your E-Book (Matching Screenshot 2 - Always visible at bottom) */}
        <View style={styles.ebookSection}>
          <View style={styles.ebookHeaderRow}>
            <Ionicons name="book-outline" size={16} color="#0B3B42" />
            <Text style={styles.ebookHeaderTitle}>Your E-Book</Text>
            <View style={styles.liveNowPill}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.liveNowText}>LIVE NOW</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ebookCard}
            activeOpacity={0.85}
            onPress={() => router.push('/ebooks' as any)}
          >
            <View style={styles.swordsIconBox}>
              <MaterialCommunityIcons name="sword-cross" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.ebookCardTitle}>Your E-Book Library</Text>
            <Text style={styles.ebookCardSub}>Digital reference textbooks & derivations</Text>
            <View style={styles.ebookCardBtn}>
              <Text style={styles.ebookCardBtnText}>Explore Ebooks ›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* DRM In-App Protected Viewer Modal */}
      <Modal
        visible={!!activeMedia}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActiveMedia(null)}
      >
        <SafeAreaView style={styles.drmModalSafe} edges={['left', 'right', 'bottom']}>
          {/* Header - optimized view directly below front camera / notch */}
          <View style={[styles.drmModalHeader, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
            <TouchableOpacity
              style={styles.drmModalCloseBtn}
              onPress={() => setActiveMedia(null)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.drmModalTitleWrap}>
              <Text style={styles.drmModalTitle} numberOfLines={1}>
                {activeMedia?.title}
              </Text>
              <View style={styles.drmSecurityBadge}>
                <Feather name="shield" size={10} color="#34D399" />
                <Text style={styles.drmSecurityText}>DRM Protected Content</Text>
              </View>
            </View>
          </View>

          {/* Player / Reader Body */}
          <View style={styles.drmModalBody}>
            {activeMedia && (
              <WebView
                source={
                  activeMedia.type === 'video'
                    ? getVideoSource(activeMedia.url)
                    : getPdfSource(activeMedia.url)
                }
                style={styles.drmWebView}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.drmLoader}>
                    <ActivityIndicator size="large" color="#38BDF8" />
                    <Text style={styles.drmLoaderText}>
                      Loading secure {activeMedia.type === 'video' ? 'lecture stream' : 'PDF reader'}...
                    </Text>
                  </View>
                )}
              />
            )}

            {/* Subtle Piracy-Proof Watermark: PDF only (1-2 watermarks in center), ZERO on video */}
            {activeMedia?.type === 'pdf' && (
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
            )}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    gap: 10,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },
  folderBackBarText: {
    fontSize: 13,
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
    marginTop: 20,
    marginBottom: 10,
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
  liveNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  liveGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  liveNowText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#16A34A',
    letterSpacing: 0.5,
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

  /* Long Tile Cards (Inside Folder List View - SS5) */
  listContainer: {
    gap: 14,
  },
  longTileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  longTileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  folderIconBoxLarge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfIconBoxLarge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIconBoxLarge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  longTileTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    lineHeight: 22,
    marginBottom: 4,
  },
  fileSizeTextLarge: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginBottom: 12,
  },
  longTileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  longTilePrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3C45',
    paddingVertical: 11,
    borderRadius: 14,
  },
  longTilePrimaryBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  longTileBookmarkBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  longTileBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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

  /* DRM Modal & Watermark Styles */
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    backgroundColor: '#000000',
    position: 'relative',
  },
  drmWebView: {
    flex: 1,
    backgroundColor: '#000000',
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
    letterSpacing: 2,
    textAlign: 'center',
    color: 'rgba(15, 60, 69, 0.12)',
  },
});

