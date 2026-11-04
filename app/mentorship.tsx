import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
  AppState,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { AppHeader } from '../components/Home/AppHeader';
import { LockedFeatureGuard } from '../components/LockedFeatureGuard';
import {
  fetchMentors,
  fetchMentorDetails,
  bookMentorSlot,
  holdMentorSlot,
  releaseMentorSlot,
  fetchMyBookings,
  Mentor,
  MentorSlot,
  MentorBooking,
} from '../api/mentorship';
import { fetchCategories, Category } from '../api/courses';

export default function MentorshipScreen() {
  const insets = useSafeAreaInsets();
  const { goal, setGoal } = useApp();

  const [activeTab, setActiveTab] = useState<'find' | 'my_sessions'>('find');

  // Mentors state
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const isGrid = viewMode === 'grid';

  // My Sessions state
  const [myBookings, setMyBookings] = useState<MentorBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Booking Modal State
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [mentorSlots, setMentorSlots] = useState<MentorSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MentorSlot | null>(null);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Goal Selector Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadMentors = useCallback(async () => {
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
  }, [goal?.id, searchQuery]);

  const loadBookings = useCallback(async (silent: boolean = false) => {
    if (!silent) setBookingsLoading(true);
    try {
      const data = await fetchMyBookings();
      setMyBookings(data);
    } catch {
      if (!silent) setMyBookings([]);
    } finally {
      if (!silent) setBookingsLoading(false);
    }
  }, []);

  // Sessions change by themselves: the mentor can send the Meet link any time, the Join button opens a few
  // minutes before the start, and a session leaves the list when it ends. While the list is on screen, refresh
  // right after the next change the server announced, and at least once a minute; and when the app comes back.
  useEffect(() => {
    if (activeTab !== 'my_sessions') return;
    const next = Math.min(60_000, ...myBookings.map((b) => (b.msUntilChange ?? 60_000) + 1_000));
    const timer = setTimeout(() => loadBookings(true), Math.max(5_000, next));
    const sub = AppState.addEventListener('change', (state) => state === 'active' && loadBookings(true));
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [activeTab, myBookings, loadBookings]);

  useEffect(() => {
    loadMentors();
    loadBookings();
  }, [loadMentors, loadBookings]);

  // Slot hold countdown timer (30 seconds)
  useEffect(() => {
    if (holdSeconds <= 0) return;
    const timer = setInterval(() => {
      setHoldSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (selectedSlot) {
            releaseMentorSlot(selectedSlot.id);
            setSelectedSlot(null);
            Alert.alert('Hold Expired', 'Your 30-second slot reservation has ended. Please tap a slot again to reserve.');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [holdSeconds, selectedSlot]);

  const handleOpenBooking = async (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setSelectedSlot(null);
    setHoldSeconds(0);
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

  const handleCloseBookingModal = () => {
    if (selectedSlot) {
      releaseMentorSlot(selectedSlot.id);
    }
    setSelectedSlot(null);
    setSelectedMentor(null);
    setHoldSeconds(0);
  };

  const handleSelectSlot = async (slot: MentorSlot) => {
    if (selectedSlot?.id === slot.id) return;
    if (selectedSlot) {
      releaseMentorSlot(selectedSlot.id);
    }

    const res = await holdMentorSlot(slot.id);
    if (!res.success) {
      Alert.alert('Slot Unavailable', res.error || 'This slot is currently held by another student.');
      setSelectedSlot(null);
      setHoldSeconds(0);
      return;
    }

    setSelectedSlot(slot);
    setHoldSeconds(30);
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
        `Your 1:1 Mentorship session with ${selectedMentor?.name} has been confirmed. Meet link will appear in My Scheduled Sessions.`
      );
      setSelectedSlot(null);
      setSelectedMentor(null);
      setHoldSeconds(0);
      loadMentors();
      loadBookings();
      setActiveTab('my_sessions');
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
    <LockedFeatureGuard featureTitle="1 to 1 Mentorship">
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

        {/* Top Tab Switcher: Find Mentors vs My Scheduled Sessions */}
        <View style={styles.topTabsRow}>
          <TouchableOpacity
            style={[styles.topTabBtn, activeTab === 'find' && styles.topTabBtnActive]}
            onPress={() => setActiveTab('find')}
            activeOpacity={0.8}
          >
            <Feather
              name="compass"
              size={14}
              color={activeTab === 'find' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.topTabBtnText, activeTab === 'find' && styles.topTabBtnTextActive]}>
              Find Mentors
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTabBtn, activeTab === 'my_sessions' && styles.topTabBtnActive]}
            onPress={() => {
              setActiveTab('my_sessions');
              loadBookings();
            }}
            activeOpacity={0.8}
          >
            <Feather
              name="calendar"
              size={14}
              color={activeTab === 'my_sessions' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.topTabBtnText, activeTab === 'my_sessions' && styles.topTabBtnTextActive]}>
              My Scheduled Sessions
            </Text>
            {myBookings.length > 0 && (
              <View style={styles.bookingsCountPill}>
                <Text style={styles.bookingsCountPillText}>{myBookings.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeTab === 'my_sessions' ? (
          /* ======================================================== */
          /*  MY SCHEDULED SESSIONS TAB                               */
          /* ======================================================== */
          <View style={styles.sessionsContainer}>
            {bookingsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F3C45" />
                <Text style={styles.loadingText}>Loading your scheduled sessions...</Text>
              </View>
            ) : myBookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="calendar" size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Scheduled Sessions</Text>
                <Text style={styles.emptySub}>
                  You haven't scheduled any 1-on-1 mentorship sessions yet. Book a session to get personalized strategy with top mentors.
                </Text>
                <TouchableOpacity style={styles.changeGoalBtn} onPress={() => setActiveTab('find')}>
                  <Text style={styles.changeGoalBtnText}>Find a Mentor</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bookingsList}>
                {myBookings.map((b) => (
                  <View key={b.id} style={styles.bookingCard}>
                    <View style={styles.bookingCardHeader}>
                      <View style={styles.mentorAvatarCircle}>
                        <Text style={styles.mentorAvatarInitials}>
                          {(b.mentorName || 'Mentor').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.bookingHeaderInfo}>
                        <Text style={styles.bookingMentorName}>{b.mentorName || '1:1 Mentor'}</Text>
                        <Text style={styles.bookingCourseTitle} numberOfLines={1}>
                          {b.courseTitle || 'EduRain Academic Mentorship'}
                        </Text>
                      </View>
                      <View style={styles.confirmedPill}>
                        <View style={styles.confirmedDot} />
                        <Text style={styles.confirmedText}>Confirmed</Text>
                      </View>
                    </View>

                    <View style={styles.bookingTopicBox}>
                      <Text style={styles.bookingTopicLabel}>Discussion Topic:</Text>
                      <Text style={styles.bookingTopicText}>{b.topic}</Text>
                    </View>

                    <View style={styles.bookingTimeRow}>
                      <Feather name="clock" size={14} color="#0F3C45" />
                      <Text style={styles.bookingTimeText}>
                        {new Date(b.startsAt).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        at{' '}
                        {new Date(b.startsAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}{' '}
                        ({b.durationMinutes} mins)
                      </Text>
                    </View>

                    {b.joinOpen && b.meetLink ? (
                      <TouchableOpacity
                        style={styles.joinMeetBtn}
                        onPress={() =>
                          Linking.openURL(b.meetLink!).catch(() =>
                            Alert.alert('Cannot Open Link', 'Could not open the Google Meet session.')
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Feather name="video" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.joinMeetBtnText}>Join Session (Google Meet) ›</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.meetPendingPill}>
                        <Feather name="info" size={13} color="#0369A1" />
                        <Text style={styles.meetPendingText}>
                          {b.linkReady && b.joinOpensAt
                            ? `Your Google Meet link is ready. The Join button opens at ${new Date(b.joinOpensAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}.`
                            : 'Your mentor will share the Google Meet link here before the session.'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* ======================================================== */
          /*  FIND MENTORS TAB                                        */
          /* ======================================================== */
          <View>
            {/* Search Bar */}
            <View style={styles.searchBarWrap}>
              <Feather name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search mentor, batch or..."
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
                <Text style={styles.filterPillActiveText}>Batch Mentor</Text>
              </View>

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
            <Text style={styles.countText}>
              Showing <Text style={styles.countBold}>{mentors.length}</Text> of {totalCount || mentors.length} mentors
            </Text>

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
              <View style={[styles.mentorsContainer, isGrid && styles.mentorsGrid]}>
                {mentors.map((m) => {
                  const hasSlots = m.openSlots > 0;
                  return (
                    <View key={m.id} style={[styles.mentorCard, isGrid && styles.mentorCardGrid]}>
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

                      <View style={[styles.mentorInfo, isGrid && styles.mentorInfoGrid]}>
                        <View style={styles.nameRow}>
                          <Text style={styles.mentorName} numberOfLines={isGrid ? 2 : undefined}>{m.name}</Text>
                          {m.verified && <MaterialCommunityIcons name="check-decagram" size={15} color="#0284C7" />}
                        </View>

                        {m.courses && m.courses.length > 0 && (
                          <Text style={styles.bioBullet} numberOfLines={1}>
                            {m.courses.map((c) => c.title).join(', ')}
                          </Text>
                        )}

                        <Text style={styles.bioSub} numberOfLines={2}>
                          {m.headline || m.about || 'IITian • Experienced Educator & Rank Producer'}
                        </Text>

                        <View style={[styles.slotBadge, hasSlots ? styles.slotBadgeGreen : styles.slotBadgeGrey]}>
                          <View style={[styles.slotDot, hasSlots ? styles.slotDotGreen : styles.slotDotGrey]} />
                          <Text style={[styles.slotBadgeText, hasSlots ? styles.slotTextGreen : styles.slotTextGrey]}>
                            {hasSlots ? `${m.openSlots} Slots Available` : 'No slots yet'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.bookBtn, isGrid && styles.bookBtnGrid, !hasSlots && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                        onPress={() => handleOpenBooking(m)}
                        disabled={!hasSlots}
                      >
                        <Text style={styles.bookBtnText}>Book 1:1</Text>
                        <Feather name="arrow-right" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Booking Slot Modal with 30s Live Hold Timer */}
      <Modal visible={!!selectedMentor} transparent animationType="slide" onRequestClose={handleCloseBookingModal}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Book 1:1 Mentorship</Text>
                <Text style={styles.modalSubtitle}>With {selectedMentor?.name}</Text>
              </View>
              <TouchableOpacity onPress={handleCloseBookingModal}>
                <Feather name="x" size={22} color="#0F3C45" />
              </TouchableOpacity>
            </View>

            {holdSeconds > 0 && (
              <View style={styles.holdBanner}>
                <Ionicons name="timer-outline" size={16} color="#B45309" />
                <Text style={styles.holdBannerText}>
                  Slot reserved for{' '}
                  <Text style={{ fontFamily: Theme.fonts.bold }}>
                    0:{holdSeconds < 10 ? `0${holdSeconds}` : holdSeconds}
                  </Text>
                </Text>
              </View>
            )}

            {slotsLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0F3C45" />
                <Text style={{ marginTop: 10, color: '#64748B', fontFamily: Theme.fonts.regular }}>
                  Fetching available slots...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                <Text style={styles.fieldLabel}>Select Available Slot</Text>
                {mentorSlots.length === 0 ? (
                  <Text style={{ color: '#94A3B8', fontFamily: Theme.fonts.regular, marginBottom: 16 }}>
                    No slots are currently open for this mentor.
                  </Text>
                ) : (
                  mentorSlots.map((s) => {
                    const isSelected = selectedSlot?.id === s.id;
                    const dateStr = new Date(s.startsAt).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.slotItem, isSelected && styles.slotItemSelected]}
                        onPress={() => handleSelectSlot(s)}
                        activeOpacity={0.8}
                      >
                        <Feather name="clock" size={16} color={isSelected ? '#0F3C45' : '#64748B'} />
                        <Text style={[styles.slotItemText, isSelected && styles.slotItemTextSelected]}>
                          {dateStr} ({s.durationMinutes || 30} mins)
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0F3C45" />}
                      </TouchableOpacity>
                    );
                  })
                )}

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
        </KeyboardAvoidingView>
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
    </LockedFeatureGuard>
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
  topTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topTabBtnActive: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  topTabBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  topTabBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  bookingsCountPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  bookingsCountPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
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
    gap: 8,
    marginBottom: 8,
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
  countText: {
    marginBottom: 14,
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
  mentorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: 0,
    rowGap: 12,
  },
  mentorCardGrid: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 12,
    gap: 8,
  },
  mentorInfoGrid: {
    flex: 0,
    flexGrow: 1,
    alignSelf: 'stretch',
  },
  bookBtnGrid: {
    alignSelf: 'stretch',
    justifyContent: 'center',
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
    flexShrink: 1,
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

  // Sessions Tab
  sessionsContainer: {
    marginTop: 4,
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  mentorAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F3C45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentorAvatarInitials: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  bookingHeaderInfo: {
    flex: 1,
  },
  bookingMentorName: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  bookingCourseTitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginTop: 1,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  confirmedText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#16A34A',
  },
  bookingTopicBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bookingTopicLabel: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bookingTopicText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    color: '#0F3C45',
  },
  bookingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bookingTimeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
  },
  joinMeetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 12,
  },
  joinMeetBtnText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  meetPendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  meetPendingText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#0369A1',
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
    marginBottom: 12,
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
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 12,
  },
  holdBannerText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#B45309',
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
