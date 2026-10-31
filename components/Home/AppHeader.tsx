import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import { fetchCategories, Category } from '../../api/goal';
import { fetchNotifications } from '../../api/notifications';

interface AppHeaderProps {
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  unreadCount?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AppHeader({
  onSearchPress,
  onNotificationsPress,
  onProfilePress,
  unreadCount,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user, goal, setGoal, logout } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const cohortName = goal?.name?.toUpperCase() || 'NEET';

  useEffect(() => {
    fetchCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
        const current = cats.find(
          (c) => c.name.toLowerCase() === (goal?.name || 'neet').toLowerCase()
        );
        setSelectedCat(current || cats[0]);
      } else {
        const fallbacks: Category[] = [
          { id: 1, name: 'JEE', slug: 'jee' },
          { id: 2, name: 'NEET', slug: 'neet' },
          { id: 3, name: 'FOUNDATION', slug: 'foundation' },
        ];
        setCategories(fallbacks);
        setSelectedCat(fallbacks[1]);
      }
    });

    fetchNotifications().then((notifs) => {
      const unread = notifs.some((n) => !n.isRead);
      setHasUnread(unread || notifs.length > 0);
    });
  }, [goal]);

  useEffect(() => {
    let active = true;
    const checkNotifs = () => {
      fetchNotifications().then((notifs) => {
        if (!active) return;
        const unread = notifs.some((n) => !n.isRead);
        setHasUnread(unread || notifs.length > 0);
      }).catch(() => {});
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 12000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const initials = (user?.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const handleConfirmGoal = async () => {
    if (!selectedCat) return;
    setSavingGoal(true);
    try {
      await setGoal(selectedCat.name, selectedCat.id);
      setModalVisible(false);
    } catch (err) {
      console.warn('[AppHeader] Failed to switch cohort:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleBellPress = () => {
    if (onNotificationsPress) {
      onNotificationsPress();
    } else {
      router.push('/notifications' as any);
    }
  };

  const handleSupportEmail = () => {
    Linking.openURL('mailto:support@edurain.in?subject=Student%20Support');
  };

  const handleHelplineCall = () => {
    Linking.openURL('tel:+918796443910');
  };

  const handleSignOut = async () => {
    setDrawerVisible(false);
    try {
      await logout();
      router.replace('/' as any);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  };

  const navigateFromDrawer = (route: string) => {
    setDrawerVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <View style={styles.container}>
        {/* Left: Hamburger Menu + Logo + EduRain Brand + Cohort Pill */}
        <View style={styles.brandContainer}>
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setDrawerVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="menu" size={22} color="#0B3B42" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.brandWrap}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>EduRain</Text>
          </TouchableOpacity>

          {/* Dynamic Cohort Pill (e.g. NEET >) */}
          <TouchableOpacity
            style={styles.cohortPill}
            activeOpacity={0.75}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.cohortPillText}>{cohortName}</Text>
            <Feather name="chevron-right" size={13} color="#0B3B42" />
          </TouchableOpacity>
        </View>

        {/* Right Actions: Search + Bell with Red Dot + Student Avatar */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onSearchPress || (() => router.push('/(tabs)/courses'))}
            activeOpacity={0.7}
          >
            <Feather name="search" size={20} color="#0B3B42" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleBellPress}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={20} color="#0B3B42" />
            {hasUnread && <View style={styles.redDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => {
              if (onProfilePress) {
                onProfilePress();
              } else {
                router.push('/profile' as any);
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials || 'E'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Hamburger Drawer Modal */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setDrawerVisible(false)}
          />

          <View style={[styles.drawerPanel, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandWrap}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.drawerBrandTitle}>EDURAIN</Text>
              </View>
              <TouchableOpacity
                style={styles.closeDrawerBtn}
                onPress={() => setDrawerVisible(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color="#0B3B42" />
              </TouchableOpacity>
            </View>

            {/* Student Profile Card */}
            <TouchableOpacity
              style={styles.drawerProfileCard}
              activeOpacity={0.85}
              onPress={() => navigateFromDrawer('/profile')}
            >
              <View style={styles.drawerAvatar}>
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.drawerAvatarText}>{initials || 'S'}</Text>
                )}
              </View>
              <View style={styles.drawerProfileInfo}>
                <Text style={styles.drawerProfileName} numberOfLines={1}>
                  {user?.name || 'EduRain Student'}
                </Text>
                <Text style={styles.drawerProfileSub} numberOfLines={1}>
                  {user?.phone || user?.email || 'Active Aspirant'}
                </Text>
                <View style={styles.drawerCohortTag}>
                  <Text style={styles.drawerCohortText}>{cohortName} Batch</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Scrollable Navigation */}
            <ScrollView
              style={styles.drawerScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerScrollContent}
            >
              <Text style={styles.drawerSectionLabel}>ACADEMIC LEARNING</Text>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/(tabs)/courses')}
              >
                <Feather name="book-open" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>My Batches & Courses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/doubt')}
              >
                <Feather name="help-circle" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>Ask Your Doubt (24x7)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/test-series')}
              >
                <Feather name="clipboard" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>Course Test Series</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/bookmarks')}
              >
                <Feather name="bookmark" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>Saved Bookmarks & Notes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/ebooks')}
              >
                <Feather name="book" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>Digital E-Books Library</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/mentorship')}
              >
                <Feather name="users" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>1-on-1 Mentorship</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/(tabs)/test-pass')}
              >
                <Feather name="award" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>All India Test Pass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/(tabs)/daily-drop')}
              >
                <Feather name="zap" size={18} color="#175A67" />
                <Text style={styles.drawerItemText}>Daily Drop Quizzes</Text>
              </TouchableOpacity>

              {/* Target Switcher */}
              <TouchableOpacity
                style={[styles.drawerItem, styles.drawerItemHighlight]}
                onPress={() => {
                  setDrawerVisible(false);
                  setModalVisible(true);
                }}
              >
                <Feather name="target" size={18} color="#0B3B42" />
                <Text style={styles.drawerItemTextBold}>Switch Target ({cohortName})</Text>
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              <Text style={styles.drawerSectionLabel}>POLICIES & LEGAL</Text>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/terms')}
              >
                <Feather name="file-text" size={18} color="#475569" />
                <Text style={styles.drawerItemText}>Terms & Conditions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/privacy')}
              >
                <Feather name="shield" size={18} color="#475569" />
                <Text style={styles.drawerItemText}>Privacy Policy</Text>
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              {/* Support & Address Card */}
              <View style={styles.supportBox}>
                <Text style={styles.supportTitle}>Official Helpline & Support</Text>
                <TouchableOpacity onPress={handleHelplineCall} style={styles.supportRow}>
                  <Feather name="phone-call" size={14} color="#175A67" />
                  <Text style={styles.supportLink}>+91 8796443910</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSupportEmail} style={styles.supportRow}>
                  <Feather name="mail" size={14} color="#175A67" />
                  <Text style={styles.supportLink}>support@edurain.in</Text>
                </TouchableOpacity>
                <View style={styles.addressWrap}>
                  <Feather name="map-pin" size={13} color="#64748B" style={{ marginTop: 2 }} />
                  <Text style={styles.addressText}>
                    Sector 132, Urbtech, Expressway, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201304, India
                  </Text>
                </View>
              </View>

              {/* Sign Out */}
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <Feather name="log-out" size={18} color="#EF4444" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>

              <Text style={styles.drawerVersion}>
                EDURAIN India v1.0.0 • DPDP & Store Compliant
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Target Selection Bottom Sheet / Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dragHandle} />

            <View style={styles.modalTag}>
              <Text style={styles.modalTagText}>TARGET SELECTION</Text>
            </View>

            <Text style={styles.modalTitle}>Choose Your Exam Target</Text>
            <Text style={styles.modalSubtitle}>
              Select your primary academic target to personalize your courses and batches.
            </Text>

            <View style={styles.catList}>
              {categories.map((cat) => {
                const isSelected =
                  selectedCat?.id === cat.id ||
                  selectedCat?.name.toLowerCase() === cat.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catOption, isSelected && styles.catOptionSelected]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCat(cat)}
                  >
                    <Text
                      style={[
                        styles.catOptionText,
                        isSelected && styles.catOptionTextSelected,
                      ]}
                    >
                      {cat.name.toUpperCase()}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#0B3B42" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.85}
              onPress={handleConfirmGoal}
              disabled={savingGoal}
            >
              {savingGoal ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Target & Explore Courses</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#EAF0EC',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.12)',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logo: {
    width: 30,
    height: 30,
  },
  brandName: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    letterSpacing: 0.3,
  },
  cohortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 2,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    maxWidth: 95,
  },
  cohortPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 4,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#EAF0EC',
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  /* Drawer Styles */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 59, 66, 0.55)',
  },
  drawerPanel: {
    width: Math.min(SCREEN_WIDTH * 0.82, 330),
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  drawerBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerLogo: {
    width: 28,
    height: 28,
  },
  drawerBrandTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    letterSpacing: 0.5,
  },
  closeDrawerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B3B42',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
  },
  drawerProfileInfo: {
    flex: 1,
  },
  drawerProfileName: {
    fontSize: 14.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  drawerProfileSub: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginTop: 1,
  },
  drawerCohortTag: {
    backgroundColor: '#E6F0F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  drawerCohortText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  drawerSectionLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  drawerItemHighlight: {
    backgroundColor: '#EAF0EC',
    marginTop: 4,
  },
  drawerItemText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.medium,
    color: '#334155',
  },
  drawerItemTextBold: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginVertical: 10,
  },
  supportBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 6,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  supportLink: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#175A67',
    textDecorationLine: 'underline',
  },
  addressWrap: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  addressText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 15,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    marginTop: 4,
    marginBottom: 10,
  },
  signOutText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#EF4444',
  },
  drawerVersion: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },

  /* Cohort Selection Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTag: {
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalTagText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  catList: {
    gap: 10,
    marginBottom: 24,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  catOptionSelected: {
    borderColor: '#0B3B42',
    backgroundColor: '#F0FDF4',
  },
  catOptionText: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#1E293B',
  },
  catOptionTextSelected: {
    color: '#0B3B42',
  },
  confirmBtn: {
    backgroundColor: '#0B3B42',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
  },
});
