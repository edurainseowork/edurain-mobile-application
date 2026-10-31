import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { AppHeader } from '../components/Home/AppHeader';
import {
  fetchStudentDoubtTickets,
  submitDoubtTicket,
  sendTicketReply,
  DoubtTicket,
} from '../api/doubts';

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];

export default function AskYourDoubtScreen() {
  const insets = useSafeAreaInsets();
  const { user, goal } = useApp();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedSubject, setSelectedSubject] = useState<string>('Physics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [diagramUrl, setDiagramUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tickets history
  const [tickets, setTickets] = useState<DoubtTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Chat Modal for selected ticket
  const [selectedTicket, setSelectedTicket] = useState<DoubtTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [user?.email]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const list = await fetchStudentDoubtTickets(user?.email || undefined);
      setTickets(list);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSubmitDoubt = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a brief topic or title for your doubt.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please explain your doubt or write the problem statement.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDoubtTicket({
        subject: selectedSubject,
        title: title.trim(),
        description: description.trim(),
        examTag: goal?.name || 'JEE Advanced',
        studentName: user?.name || 'Student',
        studentEmail: user?.email || undefined,
        studentPhone: user?.phone || undefined,
        diagramUrl: diagramUrl.trim() || undefined,
      });

      if (res.success) {
        Alert.alert(
          'Doubt Ticket Created! 🎯',
          'Your question has been dispatched to our expert educators and teaching assistants. You can track progress in My Doubts.',
          [
            {
              text: 'View My Doubts',
              onPress: () => {
                setActiveTab('history');
                loadTickets();
              },
            },
          ]
        );
        setTitle('');
        setDescription('');
        setDiagramUrl('');
      } else {
        Alert.alert('Error', res.error || 'Failed to submit doubt ticket');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await sendTicketReply({
        ticketId: selectedTicket.id,
        text: replyText.trim(),
        senderName: user?.name || 'Student',
      });
      if (res.success) {
        const newMsg = {
          id: `msg_${Date.now()}`,
          sender: 'student' as const,
          senderName: user?.name || 'Student',
          text: replyText.trim(),
          time: 'Just now',
        };
        setSelectedTicket((prev) =>
          prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : null
        );
        setReplyText('');
      } else {
        Alert.alert('Error', res.error || 'Failed to send reply');
      }
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'solved':
        return { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
      case 'in_progress':
      case 'in review':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'resolution_requested':
        return { bg: '#E0E7FF', text: '#4F46E5', border: '#C7D2FE' };
      default:
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* App Header */}
      <AppHeader
        unreadCount={0}
        onSearchPress={() => router.push('/(tabs)/courses')}
        onNotificationsPress={() => router.push('/(tabs)/profile')}
        onProfilePress={() => router.push('/(tabs)/profile')}
      />

      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={18} color="#0F3C45" />
        </TouchableOpacity>

        <View style={styles.breadcrumbWrap}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.breadItem}>
            <Feather name="home" size={13} color="#0D9488" />
            <Text style={styles.breadTextLink}>Home</Text>
          </TouchableOpacity>
          <Feather name="chevron-right" size={12} color="#94A3B8" />
          <Text style={styles.breadTextMuted}>Features</Text>
          <Feather name="chevron-right" size={12} color="#94A3B8" />
          <View style={styles.breadActiveBadge}>
            <Text style={styles.breadActiveText}>Ask Your Doubt</Text>
          </View>
        </View>
      </View>

      {/* Page Title & Subtitle */}
      <View style={styles.titleContainer}>
        <Text style={styles.pageTitle}>Ask Your Doubt</Text>
        <Text style={styles.pageSubtitle}>
          Connect with master educators for 1-on-1 problem-solving and step-by-step clarity.
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'new' && styles.tabBtnActive]}
          onPress={() => setActiveTab('new')}
        >
          <Feather
            name="plus-circle"
            size={16}
            color={activeTab === 'new' ? '#0F3C45' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
            New Doubt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('history');
            loadTickets();
          }}
        >
          <Feather
            name="clock"
            size={16}
            color={activeTab === 'history' ? '#0F3C45' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            My Doubts ({tickets.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'new' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Subject Selector */}
          <Text style={styles.fieldLabel}>Select Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
            {SUBJECTS.map((sub) => {
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

          {/* Doubt Title */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Doubt Topic / Question Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Rotational Motion - Moment of Inertia of Hollow Cone"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />

          {/* Problem Details */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Detailed Problem Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Write the full problem statement, textbook question number, or specific step where you got stuck..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          {/* Diagram URL (Optional) */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Diagram or Image URL (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="https://... (Optional diagram link or image preview)"
            placeholderTextColor="#94A3B8"
            value={diagramUrl}
            onChangeText={setDiagramUrl}
            autoCapitalize="none"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitDoubt}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Doubt Ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* History Tab */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        >
          {loadingTickets ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#0F3C45" />
              <Text style={styles.loaderText}>Loading your doubts...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="comment-question-outline" size={56} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No doubts submitted yet</Text>
              <Text style={styles.emptySubtitle}>
                Have a tricky equation or concept? Submit your question and get answers from our educators.
              </Text>
              <TouchableOpacity
                style={styles.askFirstBtn}
                onPress={() => setActiveTab('new')}
              >
                <Text style={styles.askFirstBtnText}>Ask Your First Doubt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            tickets.map((ticket) => {
              const sc = getStatusColor(ticket.status);
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketCard}
                  activeOpacity={0.88}
                  onPress={() => setSelectedTicket(ticket)}
                >
                  <View style={styles.ticketTopRow}>
                    <View style={styles.subjectPill}>
                      <Text style={styles.subjectPillText}>{ticket.subject}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                      <Text style={[styles.statusBadgeText, { color: sc.text }]}>
                        {ticket.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketTitle} numberOfLines={2}>
                    {ticket.title}
                  </Text>

                  {ticket.questionFull ? (
                    <Text style={styles.ticketDesc} numberOfLines={2}>
                      {ticket.questionFull}
                    </Text>
                  ) : null}

                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketMeta}>
                      ID: {ticket.ticketNumber} • {ticket.submittedAtRelative}
                    </Text>
                    <View style={styles.chatAction}>
                      <Text style={styles.chatActionText}>Open Chat</Text>
                      <Feather name="chevron-right" size={14} color="#0D9488" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Ticket Chat Bottom Sheet / Modal */}
      <Modal visible={!!selectedTicket} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 10 }]}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTicketNumber}>{selectedTicket?.ticketNumber}</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {selectedTicket?.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedTicket(null)}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Messages Thread */}
            <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
              {/* Problem statement message */}
              <View style={[styles.msgBubble, styles.msgStudent]}>
                <Text style={styles.msgSender}>You (Initial Doubt)</Text>
                <Text style={styles.msgBody}>{selectedTicket?.questionFull || selectedTicket?.description}</Text>
              </View>

              {(selectedTicket?.messages || []).map((m) => {
                const isMe = m.sender === 'student';
                return (
                  <View
                    key={m.id}
                    style={[styles.msgBubble, isMe ? styles.msgStudent : styles.msgEducator]}
                  >
                    <Text style={isMe ? styles.msgSender : styles.msgEducatorSender}>
                      {isMe ? 'You' : m.senderName || 'Educator / TA'}
                    </Text>
                    <Text style={isMe ? styles.msgBody : styles.msgEducatorBody}>{m.text}</Text>
                    <Text style={styles.msgTime}>{m.time}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Reply Input */}
            <View style={styles.replyBox}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type your follow-up reply..."
                placeholderTextColor="#94A3B8"
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
              >
                {sendingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    gap: 8,
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
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#52796F',
    marginTop: 4,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.12)',
  },
  tabBtnActive: {
    backgroundColor: '#E6F4F1',
    borderColor: '#0D9488',
  },
  tabText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F3C45',
    fontFamily: Theme.fonts.semiBold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    color: '#0F3C45',
    marginBottom: 8,
  },
  subjectScroll: {
    flexDirection: 'row',
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.1)',
  },
  subjectChipActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  subjectChipText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.semiBold,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.15)',
  },
  textArea: {
    minHeight: 110,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F3C45',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    shadowColor: '#0F3C45',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontFamily: Theme.fonts.regular,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  askFirstBtn: {
    marginTop: 16,
    backgroundColor: '#0F3C45',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  askFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 60, 69, 0.08)',
    shadowColor: '#0F3C45',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  subjectPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#15803D',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
  },
  ticketTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    lineHeight: 20,
  },
  ticketDesc: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ticketMeta: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
  },
  chatAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatActionText: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: '#0D9488',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 60, 69, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sheetTicketNumber: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#0D9488',
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  messagesList: {
    flex: 1,
    paddingVertical: 12,
  },
  msgBubble: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: '85%',
  },
  msgStudent: {
    alignSelf: 'flex-end',
    backgroundColor: '#E6F4F1',
    borderBottomRightRadius: 2,
  },
  msgEducator: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  msgSender: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#0D9488',
    marginBottom: 4,
  },
  msgEducatorSender: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: '#D97706',
    marginBottom: 4,
  },
  msgBody: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#0F3C45',
    lineHeight: 18,
  },
  msgEducatorBody: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#1E293B',
    lineHeight: 18,
  },
  msgTime: {
    fontSize: 10,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#1E293B',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F3C45',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
