import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { AppHeader } from '../components/Home/AppHeader';
import { askEduAi, fetchAiQuota, AiChatMessage, QuotaStatus } from '../api/doubts';
import { LockedFeatureGuard } from '../components/LockedFeatureGuard';
import { FormattedAiMessage } from '../components/FormattedAiMessage';

const SUGGESTED_PROMPTS = [
  "Explain Faraday's laws of induction with formula",
  "Derive the work-energy theorem for variable force",
  "Difference between SN1 and SN2 reaction mechanisms",
  "Calculate root mean square speed (Vrms) of gas molecules",
];

const COHORTS = [
  { id: 'JEE_MAIN_ADV', label: 'IIT-JEE' },
  { id: 'NEET_UG', label: 'NEET-UG' },
  { id: 'BOARDS_9_10', label: 'Class 9-10' },
  { id: 'FOUNDATION_6_8', label: 'Foundation' },
];

export default function AiTutorScreen() {
  const insets = useSafeAreaInsets();
  const { user, goal } = useApp();
  const scrollRef = useRef<any>(null);

  const [cohort, setCohort] = useState<string>('JEE_MAIN_ADV');
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      content: `Hello ${user?.name ? user.name.split(' ')[0] : 'Student'}! 👋\nI am your 24/7 EduAI Tutor. Ask me any numerical doubt, concept derivation, chemical mechanism, or revision question.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus>({
    isAllowed: true,
    reason: null,
    questionsUsed: 0,
    questionsLimit: 30,
    questionsLeft: 30,
  });

  useEffect(() => {
    fetchAiQuota().then(setQuota).catch(() => {});
    if (goal?.name?.toLowerCase().includes('neet')) {
      setCohort('NEET_UG');
    } else if (goal?.name?.toLowerCase().includes('foundation')) {
      setCohort('FOUNDATION_6_8');
    }
  }, [goal?.name]);

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputQuery).trim();
    if (!prompt || loading) return;

    const userMsg: AiChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: prompt,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    const isIdentityQuery = /^(who\s+are\s+you|tum\s+kaun\s+ho|tumhara\s+naam\s+kya\s+hai|aapka\s+naam\s+kya\s+hai|what\s+is\s+your\s+name|aap\s+kaun\s+ho|naam\s+kya\s+hai|who\s+made\s+you)/i.test(
      prompt.trim()
    );

    try {
      let aiResponseText = '';
      if (isIdentityQuery) {
        aiResponseText = `### 1. Quick Concept Overview\nMai aapka **EduRain AI Academic Mentor** hu! 🎓\n\nMujhe EduRain platform par khas taur par aapke study doubts, IIT-JEE, NEET-UG aur CBSE Board exams ke numericals, derivations aur formulas solve karne ke liye train kiya gaya hai. Aap mujhse koi bhi academic sawal ya numerical puch sakte hain!`;
      } else {
        const res = await askEduAi(prompt, cohort);
        aiResponseText = res.text;
      }

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        content: aiResponseText,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, aiMsg]);
      setQuota((prev) => ({
        ...prev,
        questionsUsed: prev.questionsUsed + 1,
        questionsLeft: Math.max(0, prev.questionsLeft - 1),
      }));
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <LockedFeatureGuard featureTitle="EduAI Tutor">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* App Header */}
      <AppHeader
        onSearchPress={() => router.push('/(tabs)/courses')}
        onNotificationsPress={() => router.push('/notifications' as any)}
        onProfilePress={() => router.push('/profile' as any)}
      />

      {/* Clean Screen Header (No Breadcrumbs) */}
      <View style={styles.breadcrumbBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={18} color="#0F3C45" />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>EduAI Tutor</Text>
      </View>

      {/* Page Title & Quota */}
      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>EduAI Tutor</Text>
          <View style={styles.quotaPill}>
            <Feather name="zap" size={12} color="#0D9488" />
            <Text style={styles.quotaText}>{quota.questionsLeft} questions left</Text>
          </View>
        </View>
        <Text style={styles.pageSubtitle}>
          Instant concept breakdowns, formula explanations & adaptive problem-solving.
        </Text>
      </View>

      {/* Academic Cohort Switcher */}
      <View style={styles.cohortRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cohortScroll}>
          {COHORTS.map((c) => {
            const active = cohort === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.cohortChip, active && styles.cohortChipActive]}
                onPress={() => setCohort(c.id)}
              >
                <Text style={[styles.cohortChipText, active && styles.cohortChipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        {/* Chat Stream */}
        <ScrollView
          ref={scrollRef}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={[styles.chatContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <View
                key={m.id}
                style={[styles.chatBubble, isMe ? styles.userBubble : styles.aiBubble]}
              >
                {!isMe && (
                  <View style={styles.aiBadgeRow}>
                    <MaterialCommunityIcons name="robot" size={14} color="#0D9488" />
                    <Text style={styles.aiBadgeText}>EduRain AI Mentor</Text>
                  </View>
                )}
                {isMe ? (
                  <Text style={[styles.bubbleText, styles.userText]}>{m.content}</Text>
                ) : (
                  <FormattedAiMessage content={m.content} />
                )}
                <Text style={[styles.bubbleTime, isMe ? styles.userTime : styles.aiTime]}>
                  {m.timestamp}
                </Text>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.chatBubble, styles.aiBubble, styles.loadingBubble]}>
              <ActivityIndicator size="small" color="#0D9488" />
              <Text style={styles.loadingText}>EduAI Tutor is calculating derivation...</Text>
            </View>
          )}

          {/* Quick Prompts (if chat is fresh) */}
          {messages.length <= 2 && (
            <View style={styles.suggestedSection}>
              <Text style={styles.suggestedLabel}>Suggested questions:</Text>
              {SUGGESTED_PROMPTS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.promptCard}
                  onPress={() => handleSend(p)}
                >
                  <Ionicons name="sparkles" size={14} color="#0D9488" />
                  <Text style={styles.promptText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Chat Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask any JEE, NEET or board question..."
            placeholderTextColor="#94A3B8"
            value={inputQuery}
            onChangeText={setInputQuery}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputQuery.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputQuery.trim() || loading}
          >
            <Feather name="arrow-up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </View>
    </LockedFeatureGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F2',
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.12)',
  },
  breadcrumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  breadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadTextLink: {
    fontSize: 12,
    color: '#0D9488',
    fontFamily: Theme.fonts.semiBold,
  },
  breadTextMuted: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Theme.fonts.regular,
  },
  breadActiveBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  breadActiveText: {
    fontSize: 11,
    color: '#0F3C45',
    fontFamily: Theme.fonts.semiBold,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  quotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotaText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#0D9488',
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#52796F',
    marginTop: 4,
  },
  cohortRow: {
    paddingVertical: 8,
  },
  cohortScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  cohortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.12)',
  },
  cohortChipActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  cohortChipText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  cohortChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.semiBold,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chatBubble: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F3C45',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.1)',
    shadowColor: '#0F3C45',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#0D9488',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Theme.fonts.regular,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1E293B',
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
    fontFamily: Theme.fonts.regular,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiTime: {
    color: '#94A3B8',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Theme.fonts.regular,
  },
  suggestedSection: {
    marginTop: 10,
  },
  suggestedLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: '#64748B',
    marginBottom: 8,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  promptText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#0F3C45',
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 60, 69, 0.08)',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F0F4F2',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#1E293B',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F3C45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
});
