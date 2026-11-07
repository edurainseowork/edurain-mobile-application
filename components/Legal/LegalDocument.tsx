import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import type { LegalBlock, LegalDoc, LegalSeg } from '../../constants/legalContent';

// Only email, phone and WhatsApp open outside the app; the other policy opens in the app.
// Website addresses stay plain text so the policy does not send students out of the app.
function linkAction(href?: string): (() => void) | undefined {
  if (!href) return undefined;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('https://wa.me/')) {
    return () => Linking.openURL(href).catch(() => {});
  }
  if (href === '/terms' || href === '/privacy') {
    return () => router.push(href as any);
  }
  return undefined;
}

function Segments({ segs }: { segs: LegalSeg[] }) {
  return (
    <>
      {segs.map((s, i) => {
        const onPress = linkAction(s.href);
        return (
          <Text key={i} style={[s.b && styles.bold, onPress && styles.link]} onPress={onPress}>
            {s.t}
          </Text>
        );
      })}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case 'h3':
      return <Text style={styles.subHeading}><Segments segs={block.segs} /></Text>;
    case 'h4':
      return <Text style={styles.cardTitle}><Segments segs={block.segs} /></Text>;
    case 'li':
      return (
        <View style={styles.listRow}>
          <Text style={styles.bullet}>{block.n ? `${block.n}.` : '•'}</Text>
          <Text style={styles.listText}><Segments segs={block.segs} /></Text>
        </View>
      );
    default:
      return <Text style={styles.paragraph}><Segments segs={block.segs} /></Text>;
  }
}

export default function LegalDocument({ doc, headerTitle }: { doc: LegalDoc; headerTitle: string }) {
  const insets = useSafeAreaInsets();

  // Blocks before the first section heading are the introduction; each h2 starts a section card
  const intro: LegalBlock[] = [];
  const sections: { heading: LegalBlock; blocks: LegalBlock[] }[] = [];
  for (const block of doc.blocks) {
    if (block.type === 'h2') sections.push({ heading: block, blocks: [] });
    else if (sections.length) sections[sections.length - 1].blocks.push(block);
    else intro.push(block);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={Theme.colors.ink.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.docTitle}>{doc.title}</Text>
        <Text style={styles.docSubtitle}>{doc.updated}</Text>

        {intro.length > 0 && (
          <View style={styles.introCard}>
            {intro.map((block, i) => <Block key={i} block={block} />)}
          </View>
        )}

        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading}><Segments segs={section.heading.segs} /></Text>
            {section.blocks.map((block, j) => <Block key={j} block={block} />)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(23, 90, 103, 0.08)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0B3B42' },
  headerSpacer: { width: 38 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 18 },
  docTitle: { fontSize: 22, fontWeight: '800', color: '#0B3B42', letterSpacing: -0.3 },
  docSubtitle: { fontSize: 12.5, color: '#4B6B70', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.1)',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.08)',
  },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: '#0B3B42', marginBottom: 8 },
  subHeading: { fontSize: 13.5, fontWeight: '700', color: '#175A67', marginTop: 8, marginBottom: 6 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#175A67', marginTop: 8, marginBottom: 2 },
  paragraph: { fontSize: 13, lineHeight: 20, color: '#3B4E51', marginBottom: 8 },
  listRow: { flexDirection: 'row', gap: 8, marginBottom: 6, paddingRight: 4 },
  bullet: { fontSize: 13, lineHeight: 20, color: '#175A67', fontWeight: '700', minWidth: 14 },
  listText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#3B4E51' },
  bold: { fontWeight: '700', color: '#0B3B42' },
  link: { color: '#175A67', textDecorationLine: 'underline', fontWeight: '600' },
});
