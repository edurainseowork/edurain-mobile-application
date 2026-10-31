import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { AppHeader } from '../components/Home/AppHeader';
import {
  fetchMentors,
  fetchMentorDetails,
  bookMentorSlot,
  Mentor,
  MentorSlot,
} from '../api/mentorship';
import { fetchCategories, Category } from '../api/courses';

export default function MentorshipScreen() {
  const insets = useSafeAreaInsets();
  const { goal, setGoal } = useApp();

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Booking Modal State
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [mentorSlots, setMentorSlots] = useState<MentorSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MentorSlot | null>(null);
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Goal Selector Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadMentors = async () => {
    setLoading(true);
    try {
      const res = await fetchMentors({
        categoryId: goal?.id ?? null,
        q: searchQuery,
      });
      setMentors(res.mentors);
      setTotalCount(res.total);
    } catch {
      setMentors([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMentors();
  }, [goal?.id, searchQuery]);

  const handleOpenBooking = async (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setSelectedSlot(null);
    setBookingTopic('');
    setSlotsLoading(true);
    try {
      const details = await fetchMentorDetails(mentor.id);
      setMentorSlots(details?.slots || []);
    } catch {
      setMentorSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      Alert.alert('Select a Slot', 'Please select a date and time slot for your mentorship session.');
      return;
    }
    setBookingInProgress(true);
    const res = await bookMentorSlot(selectedSlot.id, bookingTopic.trim() || 'General Academic Guidance');
    setBookingInProgress(false);

    if (res.success) {
      Alert.alert(
        'Session Booked!',
        `Your 1:1 Mentorship session with ${selectedMentor?.name} has been booked. Meet link will be shared before session.`
      );
      setSelectedMentor(null);
      loadMentors();
    } else {
      Alert.alert('Booking Notice', res.error || 'Could not complete slot booking. Please try another slot.');
    }
  };

  const handleOpenGoalModal = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch {}
    setIsGoalModalOpen(true);
  };

  const handleSelectGoal = async (cat: Category) => {
    await setGoal(cat.name, cat.id);
    setIsGoalModalOpen(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <AppHeader
        onSearchPress={() => {}}
        onNotificationsPress={() => router.push('/notifications' as any)}
        onProfilePress={() => router.push('/profile' as any)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Clean Header: Back Button + Title (No Breadcrumbs) */}
        <View style={styles.titleHeaderRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={18} color="#0F3C45" />
          </TouchableOpacity>
          <Text style={styles.titleHeaderLabel}>1 to 1 Mentorship</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarWrap}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search mentor, course or..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Title Block */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>1-on-1 Mentorship Sessions</Text>
          <Text style={styles.pageSubtitle}>
            Book live personalized guidance with the mentors of your{' '}
            <Text style={styles.goalBold}>{goal?.name || 'JEE'}</Text> courses.{' '}
            <Text style={styles.changeGoalLink} onPress={handleOpenGoalModal}>
              Change goal
            </Text>
          </Text>
        </View>

        {/* Filter Controls Row */}
        <View style={styles.filterRow}>
          <View style={styles.filterPillActive}>
            <Ionicons name="school" size={15} color="#FFFFFF" />
            <Text style={styles.filterPillActiveText}>Course Mentor</Text>
          </View>

          <View style={styles.filterRight}>
            <Text style={styles.countText}>
              Showing <Text style={styles.countBold}>{mentors.length}</Text> of {totalCount || mentors.length} mentors
            </Text>
            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
                onPress={() => setViewMode('grid')}
              >
                <Feather name="grid" size={14} color={viewMode === 'grid' ? '#0F3C45' : '#94A3B8'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <Feather name="list" size={14} color={viewMode === 'list' ? '#0F3C45' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Mentors List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0F3C45" />
            <Text style={styles.loadingText}>Loading verified mentors...</Text>
          </View>
        ) : mentors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="users" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Mentors Available</Text>
            <Text style={styles.emptySub}>
              We are onboarding top mentors for {goal?.name || 'this goal'}. Check back soon or try another goal.
            </Text>
            <TouchableOpacity style={styles.changeGoalBtn} onPress={handleOpenGoalModal}>
              <Text style={styles.changeGoalBtnText}>Change Exam Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mentorsContainer}>
            {mentors.map((m) => {
              const hasSlots = m.openSlots > 0;
              return (
                <View key={m.id} style={styles.mentorCard}>
                  {/* Left: Avatar */}
                  <View style={styles.avatarBox}>
                    {m.photo ? (
                      <Image source={{ uri: m.photo }} style={styles.avatarImg} />
                    ) : (
                      <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.crestLogoAvatar}
                        resizeMode="contain"
                      />
                    )}
                  </View>

                  {/* Middle: Details */}
                  <View style={styles.mentorInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.mentorName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      {m.verified && (
                        <Ionicons name="checkmark-circle" size={17} color="#0284C7" />
                      )}
                    </View>

                    {m.headline ? (
                      <Text style={styles.bioBullet} numberOfLines={1}>
                        • {m.headline}
                      </Text>
                    ) : null}
                    {m.about ? (
                      <Text style={styles.bioSub} numberOfLines={2}>
                        {m.about}
                      </Text>
                    ) : null}

                    {/* Availability Badge */}
                    <View style={[styles.slotBadge, hasSlots ? styles.slotBadgeGreen : styles.slotBadgeGrey]}>
                      <View style={[styles.slotDot, hasSlots ? styles.slotDotGreen : styles.slotDotGrey]} />
                      <Text style={[styles.slotBadgeText, hasSlots ? styles.slotTextGreen : styles.slotTextGrey]}>
                        {hasSlots ? `${m.openSlots} slots open` : 'No slots yet'}
                      </Text>
                    </View>
                  </View>

                  {/* Right: Book 1:1 Action Button */}
                  <TouchableOpacity
                    style={styles.bookBtn}
                    activeOpacity={0.85}
                    onPress={() => handleOpenBooking(m)}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.bookBtnText}>Book 1:1</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Booking Slot Modal */}
      <Modal visible={Boolean(selectedMentor)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Book 1:1 Mentorship</Text>
                <Text style={styles.modalSubtitle}>With {selectedMentor?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMentor(null)}>
                <Feather name="x" size={22} color="#0F3C45" />
              </TouchableOpacity>
            </View>

            {slotsLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#0F3C45" />
                <Text style={{ marginTop: 8, color: '#64748B', fontSize: 13 }}>Fetching open calendar slots...</Text>
              </View>
            ) : mentorSlots.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Feather name="calendar" size={32} color="#94A3B8" />
                <Text style={{ marginTop: 8, fontSize: 15, fontFamily: Theme.fonts.bold, color: '#0F3C45' }}>
                  No Open Slots Currently
                </Text>
                <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 12, marginTop: 4, paddingHorizontal: 20 }}>
                  {selectedMentor?.name} has not published new slots for this week. Please check back soon or book another mentor.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Select Session Slot</Text>
                {mentorSlots.map((s) => {
                  const dateStr = new Date(s.startsAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });
                  const isSelected = selectedSlot?.id === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.slotItem, isSelected && styles.slotItemSelected]}
                      onPress={() => setSelectedSlot(s)}
                    >
                      <Feather name="clock" size={16} color={isSelected ? '#0F3C45' : '#64748B'} />
                      <Text style={[styles.slotItemText, isSelected && styles.slotItemTextSelected]}>
                        {dateStr} ({s.durationMinutes || 30} mins)
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0F3C45" />}
                    </TouchableOpacity>
                  );
                })}

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>What would you like to discuss?</Text>
                <TextInput
                  style={styles.topicInput}
                  placeholder="e.g. Physics mechanics strategy, mock test analysis"
                  placeholderTextColor="#94A3B8"
                  value={bookingTopic}
                  onChangeText={setBookingTopic}
                />
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBookingBtn,
                (!selectedSlot || bookingInProgress || mentorSlots.length === 0) && styles.confirmBookingBtnDisabled,
              ]}
              disabled={!selectedSlot || bookingInProgress || mentorSlots.length === 0}
              onPress={handleConfirmBooking}
            >
              {bookingInProgress ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBookingBtnText}>Confirm 1:1 Session</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Goal Switcher Modal */}
      <Modal visible={isGoalModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Academic Goal</Text>
              <TouchableOpacity onPress={() => setIsGoalModalOpen(false)}>
                <Feather name="x" size={22} color="#0F3C45" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 220 }}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.slotItem, goal?.id === c.id && styles.slotItemSelected]}
                  onPress={() => handleSelectGoal(c)}
                >
                  <Text style={[styles.slotItemText, goal?.id === c.id && styles.slotItemTextSelected]}>
                    {c.name}
                  </Text>
                  {goal?.id === c.id && <Ionicons name="checkmark-circle" size={18} color="#0F3C45" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F2',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  titleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleHeaderLabel: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#0F3C45',
  },
  titleSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  goalBold: {
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  changeGoalLink: {
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    textDecorationLine: 'underline',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  filterPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F3C45',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  filterPillActiveText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  filterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  countBold: {
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  mentorsContainer: {
    gap: 12,
  },
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EEF6F3',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  crestLogoAvatar: {
    width: 38,
    height: 38,
  },
  mentorInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mentorName: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  bioBullet: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  bioSub: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    lineHeight: 14,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  slotBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  slotBadgeGrey: {
    backgroundColor: '#F1F5F9',
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slotDotGreen: {
    backgroundColor: '#16A34A',
  },
  slotDotGrey: {
    backgroundColor: '#94A3B8',
  },
  slotBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
  },
  slotTextGreen: {
    color: '#16A34A',
  },
  slotTextGrey: {
    color: '#64748B',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F3C45',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: 'center',
  },
  bookBtnText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  emptySub: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  changeGoalBtn: {
    backgroundColor: '#0F3C45',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  changeGoalBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 60, 69, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  slotItemSelected: {
    borderColor: '#0F3C45',
    backgroundColor: '#EEF6F3',
  },
  slotItemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#0F3C45',
  },
  slotItemTextSelected: {
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  topicInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#0F3C45',
    marginBottom: 16,
  },
  confirmBookingBtn: {
    backgroundColor: '#0F3C45',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBookingBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmBookingBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
});

