import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../api/client';
import { AppHeader } from '../../components/Home/AppHeader';

interface EBookItem {
  id: string;
  title: string;
  subject: string;
  totalPages?: number;
  pdfUrl?: string;
  fileSize?: string;
  color?: string;
  bgColor?: string;
}

const DEFAULT_BOOKS: EBookItem[] = [
  {
    id: 'b-1',
    title: 'Complete Formula Handbook & Quick Derivations',
    subject: 'Physics',
    totalPages: 142,
    fileSize: '4.2 MB',
    color: '#0284C7',
    bgColor: '#E0F2FE',
  },
  {
    id: 'b-2',
    title: 'Organic Chemistry Reaction Mechanisms & Mindmaps',
    subject: 'Chemistry',
    totalPages: 98,
    fileSize: '3.1 MB',
    color: '#059669',
    bgColor: '#ECFDF5',
  },
  {
    id: 'b-3',
    title: 'Human Physiology & High-Yield Diagrams Guide',
    subject: 'Biology',
    totalPages: 176,
    fileSize: '5.8 MB',
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  {
    id: 'b-4',
    title: 'Calculus & Coordinate Geometry Problem Repository',
    subject: 'Mathematics',
    totalPages: 210,
    fileSize: '6.4 MB',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
];

const SUBJECT_COLORS: Record<string, { color: string; bgColor: string }> = {
  Physics: { color: '#0284C7', bgColor: '#E0F2FE' },
  Chemistry: { color: '#059669', bgColor: '#ECFDF5' },
  Biology: { color: '#DC2626', bgColor: '#FEF2F2' },
  Mathematics: { color: '#D97706', bgColor: '#FEF3C7' },
  General: { color: '#0D9488', bgColor: '#E6F4F1' },
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { goal } = useApp();
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [books, setBooks] = useState<EBookItem[]>(DEFAULT_BOOKS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEbooks();
  }, []);

  const loadEbooks = async () => {
    try {
      const res = await apiFetch<any>('/api/ebooks');
      if (res?.ebooks && Array.isArray(res.ebooks) && res.ebooks.length > 0) {
        const mapped = res.ebooks.map((b: any) => {
          const sc = SUBJECT_COLORS[b.subject] || SUBJECT_COLORS.General;
          return {
            id: String(b.id),
            title: b.title,
            subject: b.subject || 'General',
            totalPages: b.totalPages || 100,
            pdfUrl: b.pdfUrl,
            fileSize: b.fileSize || 'PDF',
            color: sc.color,
            bgColor: sc.bgColor,
          };
        });
        setBooks(mapped);
      }
    } catch {
      // Use curated defaults
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEbooks();
    setRefreshing(false);
  };

  const openPdf = (url?: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      Linking.openURL(url);
    }
  };

  const subjects = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'];

  const filtered = books.filter((item) => {
    const matchesSubject = selectedSubject === 'All' || item.subject.toLowerCase() === selectedSubject.toLowerCase();
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <AppHeader
        unreadCount={0}
        onSearchPress={() => router.push('/(tabs)/courses')}
        onNotificationsPress={() => router.push('/(tabs)/profile')}
        onProfilePress={() => router.push('/(tabs)/profile')}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Digital Library</Text>
        <Text style={styles.headerSubtitle}>
          Curated notes, e-books & mindmaps for {goal?.name || 'Aspirants'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by topic, formula, or subject..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Subject Filter Chips */}
      <View style={styles.subjectRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectScroll}>
          {subjects.map((sub) => {
            const active = selectedSubject === sub;
            return (
              <TouchableOpacity
                key={sub}
                style={[styles.subjectChip, active && styles.subjectChipActive]}
                onPress={() => setSelectedSubject(sub)}
              >
                <Text style={[styles.subjectChipText, active && styles.subjectChipTextActive]}>
                  {sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Books List */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F3C45']} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="book-open" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No materials found</Text>
            <Text style={styles.emptySub}>Try searching with a different keyword or subject</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const sc = SUBJECT_COLORS[item.subject] || SUBJECT_COLORS.General;
            return (
              <View key={item.id} style={styles.bookCard}>
                <View style={[styles.bookIconWrap, { backgroundColor: item.bgColor || sc.bgColor }]}>
                  <Ionicons name="document-text" size={24} color={item.color || sc.color} />
                </View>

                <View style={styles.bookInfo}>
                  <View style={styles.subjectTag}>
                    <Text style={[styles.subjectText, { color: item.color || sc.color }]}>
                      {item.subject}
                    </Text>
                    <Text style={styles.pagesText}>
                      • {item.totalPages ? `${item.totalPages} Pages` : item.fileSize}
                    </Text>
                  </View>

                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.bookFooter}>
                    <Text style={styles.fileSizeText}>EduRain Certified Study Material</Text>
                    {item.pdfUrl ? (
                      <TouchableOpacity
                        style={styles.readBtn}
                        onPress={() => openPdf(item.pdfUrl)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.readBtnText}>Open PDF</Text>
                        <Feather name="external-link" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
                        <Text style={styles.verifiedText}>Available in App</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F2',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#52796F',
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.12)',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#0F3C45',
  },
  subjectRow: {
    paddingVertical: 8,
  },
  subjectScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.12)',
  },
  subjectChipActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  subjectChipText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.semiBold,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.08)',
    shadowColor: '#0F3C45',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  bookIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  subjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  subjectText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  pagesText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    marginLeft: 4,
  },
  bookTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
    color: '#0F3C45',
    lineHeight: 19,
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  fileSizeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F3C45',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#0D9488',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginTop: 4,
  },
});
