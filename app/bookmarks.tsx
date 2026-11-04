import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as ScreenCapture from 'expo-screen-capture';
import { AppHeader } from '../components/Home/AppHeader';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import {
  getSavedEBooks,
  getSavedPdfs,
  getLectureHistory,
  clearLectureHistory,
  SavedEBook,
  SavedPdf,
  LectureHistoryItem,
} from '../services/bookmarkStorage';

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();

  const [savedEBooks, setSavedEBooks] = useState<SavedEBook[]>([]);
  const [savedPdfs, setSavedPdfs] = useState<SavedPdf[]>([]);
  const [historyItems, setHistoryItems] = useState<LectureHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // In-App DRM modal state for playback/reading directly from bookmarks
  const [activeMedia, setActiveMedia] = useState<{
    type: 'video' | 'pdf';
    title: string;
    url: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [ebooks, pdfs, history] = await Promise.all([
        getSavedEBooks(),
        getSavedPdfs(),
        getLectureHistory(),
      ]);
      setSavedEBooks(ebooks);
      setSavedPdfs(pdfs);

      if (history.length > 0) {
        setHistoryItems(history);
      } else {
        // Fallback initial demo lecture if history is empty
        setHistoryItems([
          {
            id: 'v-demo-1',
            title: "Electrostatics – Gauss's Law Applications",
            subject: 'Physics',
            standard: '12th',
            duration: '45:10',
            mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            watchedAt: Date.now(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Screen capture prevention while DRM viewer is active
  useEffect(() => {
    if (activeMedia) {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    }
  }, [activeMedia]);

  const handleClearAllHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear your study history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearLectureHistory();
            setHistoryItems([]);
          },
        },
      ]
    );
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

  // Starting me user ko max 2 recently saved e-books dikhenge
  const displayEBooks = savedEBooks.slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
              Your saved study material, bookmarked e-books and notes
            </Text>
          </View>
        </View>

        {/* Saved E-Books Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="book" size={18} color="#0B3B42" />
            <Text style={styles.sectionHeaderTitle}>Saved E-Books</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{savedEBooks.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/ebooks' as any)}>
            <Text style={styles.browseLink}>Browse Library →</Text>
          </TouchableOpacity>
        </View>

        {/* E-Books Content: Max 2 recent items or Empty State */}
        {savedEBooks.length === 0 ? (
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
        ) : (
          <View style={styles.ebooksGrid}>
            {displayEBooks.map((book) => (
              <View key={book.id} style={styles.savedEbookCard}>
                <View style={styles.ebookCoverBox}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={28} color="#FFFFFF" />
                  {Boolean(book.rating) && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={10} color="#FBBF24" />
                      <Text style={styles.ratingText}>{book.rating}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.ebookInfo}>
                  <Text style={styles.ebookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.ebookSub}>
                    {book.subject || 'Reference'} • {book.fileSize || 'Digital PDF'}
                  </Text>
                  <TouchableOpacity
                    style={styles.readBookBtn}
                    onPress={() => {
                      if (book.pdfUrl) {
                        setActiveMedia({
                          type: 'pdf',
                          title: book.title,
                          url: book.pdfUrl,
                        });
                      } else {
                        router.push('/ebooks' as any);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.readBookBtnText}>Read ›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* History Section (Recent videos, auto-prunes after 5 days) */}
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

        {historyItems.length === 0 ? (
          <View style={[styles.emptyCard, { paddingVertical: 18, marginBottom: 20 }]}>
            <Text style={[styles.emptyTitle, { fontSize: 13.5, marginBottom: 2 }]}>
              No watch history in the last 5 days
            </Text>
            <Text style={styles.emptySubtitle}>
              Material you open in Class Material will appear here automatically.
            </Text>
          </View>
        ) : (
          historyItems.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.historyCard}>
              {/* Video Thumbnail */}
              <View style={styles.videoThumbnail}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>
                    {item.subject || 'Course'} {item.standard ? `• ${item.standard}` : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.playCenter}
                  onPress={() =>
                    setActiveMedia({
                      type: 'video',
                      title: item.title,
                      url: item.mediaUrl,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Feather name="play-circle" size={44} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.durationPill}>
                  <Feather name="clock" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.durationText}>{item.duration || '45:00'}</Text>
                </View>
              </View>

              {/* Video Title & Action */}
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{item.title}</Text>
                <TouchableOpacity
                  style={styles.watchNowBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    setActiveMedia({
                      type: 'video',
                      title: item.title,
                      url: item.mediaUrl,
                    })
                  }
                >
                  <Text style={styles.watchNowBtnText}>Open →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Wishlist Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="folder" size={18} color="#0B3B42" />
            <Text style={styles.sectionHeaderTitle}>Wishlist</Text>
          </View>
        </View>

        {/* Your Saved PDF Card */}
        <View style={styles.wishlistCard}>
          <View style={styles.wishlistTopRow}>
            <View style={styles.wishlistIconBox}>
              <Ionicons name="documents-outline" size={22} color="#0B3B42" />
            </View>
            <View style={styles.wishlistTextWrap}>
              <View style={styles.wishlistTitleRow}>
                <Text style={styles.wishlistTitle}>Your Saved PDF</Text>
                <View style={styles.wishlistCountBadge}>
                  <Text style={styles.wishlistCountText}>{savedPdfs.length}</Text>
                </View>
              </View>
              <Text style={styles.wishlistSub}>
                Saved notes & formula sheets ({savedPdfs.length} saved)
              </Text>
            </View>
          </View>

          {/* Mint Disclaimer Box */}
          <View style={styles.mintDisclaimerBox}>
            <Feather name="lock" size={12} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.mintDisclaimerText}>
              Protected notes • Device downloads disabled. Study inside the portal.
            </Text>
          </View>

          {/* Open Saved PDFs Page Button */}
          <TouchableOpacity
            style={styles.openSavedPdfsBtn}
            onPress={() => router.push('/saved-pdfs' as any)}
            activeOpacity={0.85}
          >
            <Feather name="external-link" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.openSavedPdfsBtnText}>
              Open Saved PDFs Page ({savedPdfs.length})
            </Text>
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
          {/* Header */}
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

          {/* Body */}
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

            {/* Piracy-proof Watermark: PDF only (1-2 watermarks in center), zero on video */}
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

  /* Saved E-Books Grid */
  ebooksGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  savedEbookCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  ebookCoverBox: {
    height: 100,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  ebookInfo: {
    padding: 10,
  },
  ebookTitle: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  ebookSub: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginBottom: 8,
  },
  readBookBtn: {
    backgroundColor: '#0F3C45',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  readBookBtnText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
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

  /* Wishlist Card */
  wishlistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  wishlistTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  wishlistIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistTextWrap: {
    flex: 1,
  },
  wishlistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  wishlistTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  wishlistCountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
  },
  wishlistCountText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  wishlistSub: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  mintDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  mintDisclaimerText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#0F766E',
    flex: 1,
    lineHeight: 15,
  },
  openSavedPdfsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3C45',
    paddingVertical: 12,
    borderRadius: 12,
  },
  openSavedPdfsBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  /* DRM Modal */
  drmModalSafe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  drmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
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
