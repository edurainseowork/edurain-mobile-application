import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, goal, enrolledIds, logout, deleteAccount } = useApp();
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out of EduRain?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your enrolled courses, test attempts, streaks, and personal data will be permanently wiped per privacy regulations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const res = await deleteAccount();
            setDeleting(false);
            if (res.ok) {
              Alert.alert('Account Deleted', 'Your account and data have been completely deleted.');
              router.replace('/');
            } else {
              Alert.alert('Error', res.error || 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const initials = (user?.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}

          <Text style={styles.userName}>{user?.name || 'Student'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'student@edurain.in'}</Text>
          {user?.phone ? <Text style={styles.userPhone}>+91 {user.phone}</Text> : null}

          <View style={styles.targetBadge}>
            <Ionicons name="flag" size={12} color={Theme.colors.ink.primary} />
            <Text style={styles.targetBadgeText}>Target: {goal?.name || 'Not Set'}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="flame" size={20} color="#FF6B4A" />
            <Text style={styles.statValue}>{user?.streakCount || 1}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statBox}>
            <Feather name="book-open" size={20} color={Theme.colors.ink.primary} />
            <Text style={styles.statValue}>{enrolledIds.length}</Text>
            <Text style={styles.statLabel}>Enrolled Batches</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <Text style={styles.statValue}>Verified</Text>
            <Text style={styles.statLabel}>Account Status</Text>
          </View>
        </View>

        {/* Account & Support Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionHeader}>SUPPORT & LEGAL</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://edurain.in/privacy-policy')}
          >
            <View style={styles.settingItemLeft}>
              <Feather name="lock" size={18} color={Theme.colors.text.secondary} />
              <Text style={styles.settingItemText}>Privacy Policy</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Theme.colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://edurain.in/terms-and-conditions')}
          >
            <View style={styles.settingItemLeft}>
              <Feather name="file-text" size={18} color={Theme.colors.text.secondary} />
              <Text style={styles.settingItemText}>Terms of Service</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Theme.colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Linking.openURL('mailto:support@edurain.in')}
          >
            <View style={styles.settingItemLeft}>
              <Feather name="mail" size={18} color={Theme.colors.text.secondary} />
              <Text style={styles.settingItemText}>Contact Support</Text>
            </View>
            <Text style={styles.supportEmailText}>support@edurain.in</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={18} color={Theme.colors.ink.primary} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Account Deletion Button (Required by Google Play & Apple App Store) */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color={Theme.colors.accent.error} />
            ) : (
              <>
                <Feather name="trash-2" size={16} color={Theme.colors.accent.error} />
                <Text style={styles.deleteBtnText}>Delete Account & Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>EduRain Mobile v1.0.0 (Build 1)</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.1)',
    ...Theme.shadows.card,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Theme.colors.ink.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  userPhone: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.muted,
    marginTop: 2,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.ink.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  targetBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.primary,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.08)',
    ...Theme.shadows.subtle,
  },
  statValue: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
    marginTop: 2,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.08)',
    ...Theme.shadows.subtle,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.soft,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingItemText: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.ink.deep,
  },
  supportEmailText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
  actionsSection: {
    gap: 10,
    marginBottom: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.2)',
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.accent.error,
  },
  versionText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
    textAlign: 'center',
  },
});

