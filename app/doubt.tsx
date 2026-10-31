import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import {
  fetchStudentDoubtTickets,
  submitDoubtTicket,
  sendTicketReply,
  DoubtTicket,
} from '../api/doubts';

const CATEGORIES = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'IIT-JEE Advanced',
  'NEET-UG',
  'General Doubt',
];

export default function AskYourDoubtScreen() {
  const { user, goal } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('Mathematics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tickets & Chat
  const [tickets, setTickets] = useState<DoubtTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsModalVisible, setTicketsModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<DoubtTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const cohortName = goal?.name?.toUpperCase() || 'NEET';

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

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo gallery to upload problem diagrams.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
      });
    }
  };

  const handleCaptureWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to photograph your textbook or handwritten notes.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
      });
    }
  };

  const handleImagePickerAction = () => {
    Alert.alert(
      'Attach Problem Screenshot',
      'Choose the method to attach your doubt diagram:',
      [
        { text: 'Take Photo with Camera', onPress: handleCaptureWithCamera },
        { text: 'Choose from Gallery', onPress: handlePickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a doubt topic or concept title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please describe what you have tried & where you are stuck.');
      return;
    }

    setSubmitting(true);
    try {
      const attachments = selectedImage?.base64 ? [selectedImage.base64] : [];
      const res = await submitDoubtTicket({
        subject: selectedCategory,
        title: title.trim(),
        description: description.trim(),
        examTag: cohortName,
        studentName: user?.name || 'Student',
        studentEmail: user?.email || undefined,
        studentPhone: user?.phone || undefined,
        diagramUrl: attachments[0],
        attachments,
      });

      if (res.success) {
        Alert.alert(
          'Doubt Ticket Raised! 🚀',
          'Your ticket is queued for our Teacher Assistant Desk. Average response time is ~14 mins.',
          [
            {
              text: 'View Ticket',
              onPress: () => {
                setTitle('');
                setDescription('');
                setSelectedImage(null);
                loadTickets();
                setTicketsModalVisible(true);
              },
            },
            {
              text: 'Done',
              onPress: () => {
                setTitle('');
                setDescription('');
                setSelectedImage(null);
                loadTickets();
              },
            },
          ]
        );
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit doubt. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTicketReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await sendTicketReply({
        ticketId: selectedTicket.id,
        text: replyText.trim(),
        senderName: user?.name || 'Student',
      });
      if (res.success) {
        setReplyText('');
        loadTickets();
      }
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0B3B42" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Ask a Doubt</Text>

        <TouchableOpacity
          style={styles.myTicketsBtn}
          onPress={() => setTicketsModalVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="ticket-outline" size={16} color="#0B3B42" />
          <Text style={styles.myTicketsBtnText}>My Tickets</Text>
          <View style={styles.myTicketsBadge}>
            <Text style={styles.myTicketsBadgeText}>{tickets.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Card */}
          <View style={styles.formCard}>
            {/* Top Subtitle Row */}
            <View style={styles.subHeaderRow}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>✨ ASK A DOUBT SECTION</Text>
              </View>
              <View style={styles.cohortPill}>
                <Text style={styles.cohortPillLabel}>Cohort: </Text>
                <Text style={styles.cohortPillValue}>{cohortName}</Text>
              </View>
            </View>

            <Text style={styles.mainTitle}>Raise a Ticket</Text>
            <Text style={styles.mainDesc}>
              Have a doubt or question? Submit your query with code, diagrams or screenshots and
              our subject experts will resolve it.
            </Text>

            {/* Subject Selector */}
            <Text style={styles.inputLabel}>
              Select Subject / Topic Category <Text style={styles.asterisk}>*</Text>
            </Text>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, isSelected && styles.catChipSelected]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <View style={styles.catDot} />}
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Concept Title */}
            <Text style={styles.inputLabel}>
              Doubt Topic / Concept Title <Text style={styles.asterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="write your doubt"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            {/* Description Textarea */}
            <View style={styles.descLabelRow}>
              <Text style={styles.inputLabel}>
                Describe What You've Tried & Where You're Stuck <Text style={styles.asterisk}>*</Text>
              </Text>
              <Text style={styles.charCount}>{description.length} / 1000 chars</Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Write clear steps, problem question, equation, or describe the unexpected behavior..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 1000))}
              multiline
              textAlignVertical="top"
            />

            {/* Image Attachment Upload Box */}
            <Text style={styles.inputLabel}>
              Doubt Diagram / Problem Screenshot{' '}
              <Text style={styles.subLabel}>
                (1 Photo {selectedImage ? '1' : '0'} / 1 image (target Max) ~1MB)
              </Text>
            </Text>

            {selectedImage ? (
              <View style={styles.imagePreviewBox}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setSelectedImage(null)}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadDashedBox}
                onPress={handleImagePickerAction}
                activeOpacity={0.8}
              >
                <View style={styles.uploadIconCircle}>
                  <Feather name="upload-cloud" size={24} color="#0B3B42" />
                </View>
                <Text style={styles.uploadMainText}>
                  Drop 1 image file (PNG, JPG, WebP) or{' '}
                  <Text style={styles.browseHighlight}>browse files</Text>
                </Text>
                <Text style={styles.uploadSubText}>
                  Auto-compressed to ~1MB with high visual clarity for TA review
                </Text>
              </TouchableOpacity>
            )}

            {/* Immediate Notice */}
            <View style={styles.noticeBox}>
              <Feather name="zap" size={16} color="#0B3B42" style={{ marginRight: 8 }} />
              <Text style={styles.noticeText}>
                Your query will appear immediately in the Teacher Assistant Desk queue.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Raise a Ticket</Text>
                  <Feather name="send" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Average TA Response Footer */}
          <View style={styles.footerBar}>
            <View style={styles.footerLeft}>
              <View style={styles.footerLiveDot} />
              <Text style={styles.footerText}>
                Average TA Response Time: <Text style={styles.footerBold}>~14 mins</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('EduRain TA FAQ', 'Our teaching assistants and senior mentors review tickets in real time 24/7.')}>
              <Text style={styles.footerFaq}>FAQ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Tickets Modal */}
      <Modal
        visible={ticketsModalVisible}
        animationType="slide"
        onRequestClose={() => setTicketsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setTicketsModalVisible(false)}
            >
              <Feather name="arrow-left" size={20} color="#0B3B42" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>My Doubt Tickets</Text>
            <View style={{ width: 36 }} />
          </View>

          {loadingTickets ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#0B3B42" />
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.centerBox}>
              <Feather name="check-circle" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Doubts Raised Yet</Text>
              <Text style={styles.emptySubtitle}>
                When you raise a doubt ticket, you can chat with assigned educators and view solutions here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {tickets.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.ticketCard}
                  onPress={() => setSelectedTicket(t)}
                  activeOpacity={0.8}
                >
                  <View style={styles.ticketCardHeader}>
                    <Text style={styles.ticketSubject}>{t.subject}</Text>
                    <View
                      style={[
                        styles.ticketStatusPill,
                        t.status === 'resolved'
                          ? { backgroundColor: '#DCFCE7' }
                          : { backgroundColor: '#FEF3C7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ticketStatusText,
                          t.status === 'resolved' ? { color: '#15803D' } : { color: '#B45309' },
                        ]}
                      >
                        {t.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketTitle}>{t.title}</Text>
                  <Text style={styles.ticketSnippet} numberOfLines={2}>
                    {t.description || t.questionFull}
                  </Text>
                  <Text style={styles.ticketMeta}>
                    Submitted {t.submittedAtRelative || 'Recently'} • {t.assignedMentor || 'Faculty'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Chat modal for active ticket */}
          {selectedTicket && (
            <Modal
              visible={Boolean(selectedTicket)}
              animationType="slide"
              onRequestClose={() => setSelectedTicket(null)}
            >
              <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setSelectedTicket(null)}
                  >
                    <Feather name="arrow-left" size={20} color="#0B3B42" />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                      {selectedTicket.title}
                    </Text>
                    <Text style={styles.ticketMeta}>{selectedTicket.subject}</Text>
                  </View>
                </View>

                <ScrollView style={{ flex: 1, padding: 16 }}>
                  <View style={styles.ticketDetailCard}>
                    <Text style={styles.ticketDetailLabel}>Problem Statement:</Text>
                    <Text style={styles.ticketDetailDesc}>
                      {selectedTicket.description || selectedTicket.questionFull}
                    </Text>
                    {selectedTicket.diagramUrl && (
                      <Image
                        source={{ uri: selectedTicket.diagramUrl }}
                        style={styles.ticketDetailImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>

                  {/* Messages */}
                  {(selectedTicket.messages || []).map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatBubble,
                        msg.sender === 'student' ? styles.studentBubble : styles.taBubble,
                      ]}
                    >
                      <Text style={styles.chatSender}>{msg.senderName}</Text>
                      <Text style={styles.chatText}>{msg.text}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.replyBar}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Type follow-up question..."
                    placeholderTextColor="#94A3B8"
                    value={replyText}
                    onChangeText={setReplyText}
                  />
                  <TouchableOpacity
                    style={styles.replySendBtn}
                    onPress={handleSendTicketReply}
                    disabled={sendingReply}
                  >
                    {sendingReply ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="send" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Modal>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  myTicketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  myTicketsBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  myTicketsBadge: {
    backgroundColor: '#0B3B42',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myTicketsBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionPill: {
    backgroundColor: '#E2F3E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
    letterSpacing: 0.4,
  },
  cohortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cohortPillLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  cohortPillValue: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  mainTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 6,
  },
  mainDesc: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#1E293B',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  asterisk: {
    color: '#EF4444',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catChipSelected: {
    backgroundColor: '#0B3B42',
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  catChipText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  catChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    marginBottom: 16,
  },
  descLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    height: 110,
    marginBottom: 16,
  },
  uploadDashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadMainText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  browseHighlight: {
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    textDecorationLine: 'underline',
  },
  uploadSubText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    textAlign: 'center',
  },
  imagePreviewBox: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    height: 180,
    marginBottom: 16,
    backgroundColor: '#0F172A',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#166534',
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3B42',
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  footerText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
  },
  footerBold: {
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  footerFaq: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketSubject: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  ticketStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ticketStatusText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
  },
  ticketTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  ticketSnippet: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 8,
  },
  ticketMeta: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  ticketDetailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  ticketDetailLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#475569',
    marginBottom: 4,
  },
  ticketDetailDesc: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 8,
  },
  ticketDetailImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  chatBubble: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: '85%',
  },
  studentBubble: {
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-end',
  },
  taBubble: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  chatSender: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
    marginBottom: 2,
  },
  chatText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    lineHeight: 18,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  replySendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0B3B42',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
