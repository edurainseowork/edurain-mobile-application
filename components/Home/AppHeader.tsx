import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

export function AppHeader({
  onSearchPress,
  onNotificationsPress,
  onProfilePress,
  unreadCount,
}: AppHeaderProps) {
  const { user, goal, setGoal } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
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

  return (
    <>
      <View style={styles.container}>
        {/* Brand: Logo + EduRain + Dynamic Cohort Switcher Pill */}
        <View style={styles.brandContainer}>
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
            <Feather name="chevron-right" size={14} color="#0B3B42" />
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
            onPress={onProfilePress || (() => router.push('/(tabs)/profile'))}
            activeOpacity={0.8}
          >
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials || 'E'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
                const isSelected = selectedCat?.id === cat.id || selectedCat?.name.toLowerCase() === cat.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catOption, isSelected && styles.catOptionSelected]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCat(cat)}
                  >
                    <Text style={[styles.catOptionText, isSelected && styles.catOptionTextSelected]}>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EAF0EC',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 32,
    height: 32,
  },
  brandName: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    letterSpacing: 0.3,
  },
  cohortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cohortPillText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 5,
    right: 6,
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
