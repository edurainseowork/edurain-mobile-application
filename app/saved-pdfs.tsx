import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
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
  getSavedPdfs,
  removeSavedPdf,
  SavedPdf,
} from '../services/bookmarkStorage';

export default function SavedPdfsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();

  const [savedList, setSavedList] = useState<SavedPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [activePdf, setActivePdf] = useState<{ title: string; url: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getSavedPdfs();
      setSavedList(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Screen capture prevention while DRM reader is open
  useEffect(() => {
    if (activePdf) {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    }
  }, [activePdf]);

  const handleDelete = (item: SavedPdf) => {
    Alert.alert(
      'Remove Saved PDF',
      `Are you sure you want to remove "${item.title}" from your saved documents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeSavedPdf(item.id);
            setSavedList((prev) => prev.filter((p) => p.id !== item.id));
          },
        },
      ]
    );
  };

  // Unique subjects for filter chips
  const subjects = useMemo(() => {
    const set = new Set<string>();
    savedList.forEach((item) => {
      if (item.subject) set.add(item.subject);
    });
    return ['All', ...Array.from(set)];
  }, [savedList]);

  // Filtered list based on search and subject
  const filteredList = useMemo(() => {
    return savedList.filter((item) => {
      if (selectedSubject !== 'All' && item.subject?.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubject = item.subject?.toLowerCase().includes(q);
        const matchesCourse = item.courseTitle?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesCourse) return false;
      }
      return true;
    });
  }, [savedList, selectedSubject, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Breadcrumb Bar */}
        <View style={styles.breadcrumbBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={17} color="#0B3B42" />
          </TouchableOpacity>

          <View style={styles.breadcrumbLinks}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/home' as any)}>
              <Text style={styles.crumbText}>
                <Feather name="home" size={12} color="#64748B" /> Home
              </Text>
            </TouchableOpacity>
            <Feather name="chevron-right" size={13} color="#94A3B8" />
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.crumbText}>Bookmark</Text>
            </TouchableOpacity>
            <Feather name="chevron-right" size={13} color="#94A3B8" />
            <View style={styles.activeCrumbPill}>
              <Text style={styles.activeCrumbText}>Saved PDFs</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadData}
            activeOpacity={0.7}
          >
            <Feather name="rotate-cw" size={15} color="#0B3B42" />
          </TouchableOpacity>
        </View>

        {/* Top Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Ionicons name="documents-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextWrap}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle}>Saved PDFs</Text>
                <View style={styles.heroCountBadge}>
                  <Text style={styles.heroCountText}>{savedList.length}</Text>
                </View>
              </View>
              <Text style={styles.heroSubtitle}>
                Your saved revision PDFs, study notes, and protected course documents
              </Text>
              <View style={styles.disclaimerRow}>
                <Feather name="lock" size={11} color="#64748B" />
                <Text style={styles.disclaimerText}>Device download is disabled</Text>
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search in Saved PDFs..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.collectionCountRow}>
            <MaterialCommunityIcons name="layers-outline" size={16} color="#0B3B42" />
            <Text style={styles.collectionCountText}>
              {filteredList.length} Documents in Collection
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            {subjects.map((sub) => {
              const active = selectedSubject === sub;
              const count =
                sub === 'All'
                  ? savedList.length
                  : savedList.filter((p) => p.subject?.toLowerCase() === sub.toLowerCase()).length;
              return (
                <TouchableOpacity
                  key={sub}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setSelectedSubject(sub)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {sub} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Collection Main Card */}
        <View style={styles.collectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="file-text" size={18} color="#0B3B42" />
              <Text style={styles.cardHeaderTitle}>Your Saved PDFs</Text>
              <View style={styles.smallCountBadge}>
                <Text style={styles.smallCountText}>{filteredList.length}</Text>
              </View>
            </View>
            <View style={styles.inAppStudyPill}>
              <Feather name="lock" size={10} color="#0D9488" style={{ marginRight: 4 }} />
              <Text style={styles.inAppStudyText}>In-App Study Only</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0B3B42" />
              <Text style={styles.loadingText}>Loading saved documents...</Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="document-text-outline" size={32} color="#0B3B42" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching PDFs' : 'No saved PDFs yet'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'Try searching with a different keyword or subject filter.'
                  : 'Bookmark notes and PDFs from Class Material to study them here anytime!'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => router.push('/class-material' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exploreBtnText}>Go to Class Material</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.itemsList}>
              {filteredList.map((item, index) => (
                <View key={item.id} style={styles.documentCard}>
                  <View style={styles.docLeftCol}>
                    {/* # Index Badge */}
                    <View style={styles.indexBadge}>
                      <Text style={styles.indexBadgeText}>#{index + 1}</Text>
                    </View>

                    {/* PDF Icon Box */}
                    <View style={styles.pdfIconBox}>
                      <MaterialCommunityIcons name="file-pdf-box" size={26} color="#E11D48" />
                    </View>
                  </View>

                  {/* Center Details */}
                  <View style={styles.docCenterCol}>
                    <Text style={styles.docTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.docTagsRow}>
                      {Boolean(item.subject) && (
                        <View style={styles.subjectTag}>
                          <Text style={styles.subjectTagText}>{item.subject}</Text>
                        </View>
                      )}
                      {Boolean(item.courseTitle) && (
                        <Text style={styles.courseTagText} numberOfLines={1}>
                          {item.courseTitle}
                        </Text>
                      )}
                    </View>

                    <View style={styles.docMetaRow}>
                      <Text style={styles.fileSizeText}>{item.fileSize || '1.2 MB'}</Text>
                      <View style={styles.protectedBadge}>
                        <Text style={styles.protectedBadgeText}>PROTECTED</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right Actions */}
                  <View style={styles.docRightCol}>
                    <TouchableOpacity
                      style={styles.studyBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (item.mediaUrl) {
                          setActivePdf({ title: item.title, url: item.mediaUrl });
                        } else {
                          Alert.alert('Study Document', `"${item.title}" will open inside DRM viewer.`);
                        }
                      }}
                    >
                      <Feather name="eye" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.studyBtnText}>Study</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      activeOpacity={0.7}
                      onPress={() => handleDelete(item)}
                    >
                      <Feather name="trash-2" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Security Banner */}
        <View style={styles.bottomBanner}>
          <View style={styles.bannerRow}>
            <Feather name="lock" size={14} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.bannerText}>Device downloads disabled • In-app study only</Text>
          </View>
          <View style={styles.bannerRow}>
            <Feather name="shield" size={14} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.bannerSubText}>EduRain Revision Hub</Text>
          </View>
        </View>
      </ScrollView>

      {/* DRM In-App Protected Viewer Modal */}
      <Modal
        visible={!!activePdf}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActivePdf(null)}
      >
        <SafeAreaView style={styles.drmModalSafe} edges={['left', 'right', 'bottom']}>
          {/* Header */}
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

          {/* Reader Body */}
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

            {/* Subtle Piracy-Proof Watermark: Only 1-2 centered entries */}
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
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
  },

  /* Breadcrumb */
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
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
  breadcrumbLinks: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  crumbText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  activeCrumbPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeCrumbText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* Top Hero Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0F3C45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  heroCountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  heroCountText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  heroSubtitle: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 4,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    padding: 0,
  },

  /* Filter */
  filterSection: {
    marginBottom: 16,
    gap: 10,
  },
  collectionCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectionCountText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },

  /* Collection Card */
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  smallCountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  smallCountText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  inAppStudyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inAppStudyText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0D9488',
  },

  /* Document Items */
  itemsList: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  docLeftCol: {
    alignItems: 'center',
    gap: 6,
  },
  indexBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  indexBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#D97706',
  },
  pdfIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docCenterCol: {
    flex: 1,
  },
  docTitle: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  docTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  subjectTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectTagText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },
  courseTagText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileSizeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
  },
  protectedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  protectedBadgeText: {
    fontSize: 9,
    fontFamily: Theme.fonts.bold,
    color: '#16A34A',
  },
  docRightCol: {
    alignItems: 'center',
    gap: 10,
  },
  studyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3C45',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  studyBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  deleteBtn: {
    padding: 4,
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  exploreBtn: {
    backgroundColor: '#0B3B42',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  exploreBtnText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },

  /* Bottom Security Banner */
  bottomBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 4,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#0B3B42',
  },
  bannerSubText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0D9488',
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

