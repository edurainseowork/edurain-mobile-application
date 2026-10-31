import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { goal } = useApp();
  const [search, setSearch] = useState('');

  const libraryItems = [
    {
      id: '1',
      title: 'Complete Formula Handbook & Quick Reference',
      subject: 'Physics',
      pages: '142 Pages',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
    },
    {
      id: '2',
      title: 'Organic Chemistry Reaction Mechanisms & Mindmaps',
      subject: 'Chemistry',
      pages: '98 Pages',
      color: '#059669',
      bgColor: '#ECFDF5',
    },
    {
      id: '3',
      title: 'Human Physiology & High-Yield Diagrams Guide',
      subject: 'Biology',
      pages: '176 Pages',
      color: '#DC2626',
      bgColor: '#FEF2F2',
    },
    {
      id: '4',
      title: 'Calculus & Coordinate Geometry Problem Repository',
      subject: 'Mathematics',
      pages: '210 Pages',
      color: '#D97706',
      bgColor: '#FEF3C7',
    },
  ];

  const filtered = libraryItems.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Digital Library</Text>
        <Text style={styles.headerSubtitle}>
          Curated E-Books & Reference Material for {goal?.name || 'Aspirants'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={Theme.colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by topic, formula, or subject..."
          placeholderTextColor={Theme.colors.text.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={Theme.colors.text.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.bookCard}>
            <View style={[styles.bookIconWrap, { backgroundColor: item.bgColor }]}>
              <Feather name="book-open" size={24} color={item.color} />
            </View>

            <View style={styles.bookInfo}>
              <View style={styles.subjectTag}>
                <Text style={[styles.subjectText, { color: item.color }]}>{item.subject}</Text>
                <Text style={styles.pagesText}>• {item.pages}</Text>
              </View>

              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.title}
              </Text>

              <TouchableOpacity
                style={styles.readBtn}
                onPress={() => Linking.openURL('https://edurain.in/study/library')}
              >
                <Text style={styles.readBtnText}>Open Document</Text>
                <Feather name="external-link" size={12} color={Theme.colors.ink.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.paper.light,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.15)',
    gap: 10,
    ...Theme.shadows.subtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.primary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.1)',
    alignItems: 'center',
    gap: 14,
    ...Theme.shadows.subtle,
  },
  bookIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  subjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  subjectText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    textTransform: 'uppercase',
  },
  pagesText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
  bookTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    lineHeight: 19,
    marginBottom: 8,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.primary,
  },
});

