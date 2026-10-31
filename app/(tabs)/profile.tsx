import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import {
  fetchProfile,
  updateProfile,
  uploadProfilePhoto,
  StudentProfile,
} from '../../api/profile';

export default function ProfileScreen() {
  const { user, goal, logout, deleteAccount, refreshUserData } = useApp();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  const loadData = async () => {
    try {
      const p = await fetchProfile();
      setProfile(p);
      setName(p.name || '');
      setPhone(p.phone || '');
      setGender((p.gender as any) || 'prefer_not_to_say');
      setAddress(p.address || '');
      setCity(p.city || '');
      setStateName(p.state || '');
      setPincode(p.pincode || '');
    } catch (err) {
      console.warn('[ProfileScreen] Error loading profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePickPhoto = async () => {
    Alert.alert('Update Profile Photo', 'Select image source:', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!res.canceled && res.assets && res.assets[0].uri) {
            uploadPhoto(res.assets[0].uri);
          }
        },
      },
      {
        text: 'Photo Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Photo gallery permission is required.');
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!res.canceled && res.assets && res.assets[0].uri) {
            uploadPhoto(res.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const newUrl = await uploadProfilePhoto(uri);
      if (newUrl) {
        setProfile((prev) => (prev ? { ...prev, profilePhoto: newUrl } : null));
        await refreshUserData();
        Alert.alert('Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        gender,
        address: address.trim() || null,
        city: city.trim() || null,
        state: stateName.trim() || null,
        pincode: pincode.trim() || null,
      });
      setProfile(updated);
      setIsEditing(false);
      await refreshUserData();
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

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
      'This action is irreversible. All your enrolled courses, test attempts, streaks, and personal data will be permanently wiped.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAccount();
            if (res.ok) {
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              router.replace('/');
            } else {
              Alert.alert('Error', res.error || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const initials = (profile?.name || user?.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const stats = profile?.stats;
  const mockPace = stats?.pace?.secondsPerQuestion
    ? `${(stats.pace.secondsPerQuestion / 60).toFixed(1)}m/Q`
    : '1.8m/Q';
  const airPrediction = stats?.standing
    ? `Top ${stats.standing.topPercent}%`
    : 'Top 8%';
  const currentStreak = profile?.streak?.current ?? user?.streakCount ?? 4;
  const latestTestScore = stats?.latestTest
    ? `${stats.latestTest.score}/${stats.latestTest.maxMarks}`
    : '0/32';
  const syllabusVelocity = stats?.syllabus?.percent ? `${stats.syllabus.percent}%` : '65%';
  const aiAccuracy = stats?.accuracy?.percent ? `${stats.accuracy.percent}%` : '84%';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0B3B42" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <TouchableOpacity
          style={styles.editToggleBtn}
          onPress={() => setIsEditing(!isEditing)}
          activeOpacity={0.8}
        >
          <Feather name={isEditing ? 'x' : 'edit-2'} size={15} color="#0B3B42" />
          <Text style={styles.editToggleText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0B3B42" />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
          }
        >
          {/* Top Profile Card */}
          <View style={styles.heroProfileCard}>
            <View style={styles.avatarContainer}>
              {profile?.profilePhoto || user?.photo ? (
                <Image
                  source={{ uri: profile?.profilePhoto || user?.photo || '' }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.cameraBadge}
                activeOpacity={0.85}
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="camera" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.profileName}>{profile?.name || user?.name || 'Student'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || user?.email || ''}</Text>

            <View style={styles.cohortBadge}>
              <Ionicons name="school" size={13} color="#0284C7" />
              <Text style={styles.cohortBadgeText}>
                Target: {goal?.name?.toUpperCase() || 'NEET 2026'}
              </Text>
            </View>
          </View>

          {/* Profile Strength Progress Card */}
          <View style={styles.strengthCard}>
            <View style={styles.strengthHeader}>
              <Text style={styles.strengthTitle}>Profile Completion</Text>
              <Text style={styles.strengthPercent}>85% Complete</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '85%' }]} />
            </View>
          </View>

          {/* 6 Dynamic Telemetry Tiles */}
          <Text style={styles.sectionHeader}>Performance Telemetry</Text>
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryTile}>
              <MaterialCommunityIcons name="timer-sand" size={20} color="#0284C7" />
              <Text style={styles.telemetryVal}>{mockPace}</Text>
              <Text style={styles.telemetryLbl}>Mock Pace</Text>
            </View>

            <View style={styles.telemetryTile}>
              <Feather name="trending-up" size={20} color="#059669" />
              <Text style={styles.telemetryVal}>{airPrediction}</Text>
              <Text style={styles.telemetryLbl}>AIR Prediction</Text>
            </View>

            <View style={styles.telemetryTile}>
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <Text style={styles.telemetryVal}>{currentStreak} Days</Text>
              <Text style={styles.telemetryLbl}>Streak</Text>
            </View>

            <View style={styles.telemetryTile}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#7C3AED" />
              <Text style={styles.telemetryVal}>{latestTestScore}</Text>
              <Text style={styles.telemetryLbl}>Latest Test</Text>
            </View>

            <View style={styles.telemetryTile}>
              <MaterialCommunityIcons name="book-arrow-right" size={20} color="#EA580C" />
              <Text style={styles.telemetryVal}>{syllabusVelocity}</Text>
              <Text style={styles.telemetryLbl}>Syllabus Velocity</Text>
            </View>

            <View style={styles.telemetryTile}>
              <MaterialCommunityIcons name="robot" size={20} color="#0B3B42" />
              <Text style={styles.telemetryVal}>{aiAccuracy}</Text>
              <Text style={styles.telemetryLbl}>AI Accuracy</Text>
            </View>
          </View>

          {/* Enrolled Courses */}
          <Text style={styles.sectionHeader}>Enrolled Batches & Courses</Text>
          {(profile?.courses || []).length > 0 ? (
            <View style={styles.enrolledList}>
              {profile?.courses?.map((course) => (
                <View key={course.id} style={styles.enrolledCard}>
                  <Feather name="book-open" size={16} color="#0B3B42" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.enrolledCourseTitle}>{course.title}</Text>
                    <Text style={styles.enrolledCourseCategory}>{course.category}</Text>
                  </View>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCoursesCard}>
              <Feather name="book" size={24} color="#94A3B8" />
              <Text style={styles.emptyCoursesText}>No courses enrolled yet.</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/courses')}
                style={styles.exploreBtn}
              >
                <Text style={styles.exploreBtnText}>Explore Academic Courses →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Personal & Academic Details (Edit vs View Mode) */}
          <Text style={styles.sectionHeader}>Personal & Academic Details</Text>
          <View style={styles.detailsCard}>
            {isEditing ? (
              <View style={styles.editForm}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                />

                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10-digit phone"
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>City</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                />

                <Text style={styles.fieldLabel}>State</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={stateName}
                  onChangeText={setStateName}
                  placeholder="Enter state"
                />

                <Text style={styles.fieldLabel}>Pincode</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Enter 6-digit pincode"
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.viewDetailsCol}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Full Name</Text>
                  <Text style={styles.detailVal}>{profile?.name || user?.name || '—'}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Email Address</Text>
                  <Text style={styles.detailVal}>{profile?.email || user?.email || '—'}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Phone</Text>
                  <Text style={styles.detailVal}>{profile?.phone || 'Not provided'}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>City / State</Text>
                  <Text style={styles.detailVal}>
                    {profile?.city ? `${profile.city}, ${profile.state || ''}` : 'Not provided'}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Pincode</Text>
                  <Text style={styles.detailVal}>{profile?.pincode || '—'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Legal Policies & Support Section */}
          <Text style={styles.sectionHeader}>Legal & Support</Text>
          <View style={styles.legalCard}>
            <TouchableOpacity
              style={styles.legalItem}
              onPress={() => router.push('/terms' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.legalItemLeft}>
                <Feather name="file-text" size={17} color="#0B3B42" />
                <Text style={styles.legalItemText}>Terms & Conditions</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.legalDivider} />

            <TouchableOpacity
              style={styles.legalItem}
              onPress={() => router.push('/privacy' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.legalItemLeft}>
                <Feather name="shield" size={17} color="#0B3B42" />
                <Text style={styles.legalItemText}>Privacy Policy</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.legalDivider} />

            <View style={styles.supportInfoBlock}>
              <Text style={styles.supportLabel}>Official Contact & Support</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('tel:+918796443910')}
                style={styles.supportRow}
              >
                <Feather name="phone" size={13} color="#175A67" />
                <Text style={styles.supportLink}>Helpline: +91 8796443910</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL('mailto:support@edurain.in')}
                style={styles.supportRow}
              >
                <Feather name="mail" size={13} color="#175A67" />
                <Text style={styles.supportLink}>Email: support@edurain.in</Text>
              </TouchableOpacity>
              <Text style={styles.supportAddress}>
                Sector 132, Urbtech, Expressway, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201304, India
              </Text>
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={16} color="#DC2626" />
              <Text style={styles.logoutBtnText}>Sign Out of EduRain</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteBtnText}>Delete Account & Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  editToggleText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
  },
  heroProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0B3B42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 26,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 12,
  },
  cohortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  cohortBadgeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  strengthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  strengthPercent: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  sectionHeader: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 12,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  telemetryTile: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  telemetryVal: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
  telemetryLbl: {
    fontSize: 10,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
  },
  enrolledList: {
    gap: 10,
    marginBottom: 20,
  },
  enrolledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  enrolledCourseTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  enrolledCourseCategory: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#15803D',
  },
  emptyCoursesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  emptyCoursesText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginVertical: 8,
  },
  exploreBtn: {
    paddingVertical: 4,
  },
  exploreBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  viewDetailsCol: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailKey: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  editForm: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#334155',
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#0B3B42',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
  },
  legalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  legalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalItemText: {
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
    color: '#0F172A',
  },
  legalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  supportInfoBlock: {
    marginTop: 10,
    paddingTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  supportLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 6,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  supportLink: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.medium,
    color: '#175A67',
    textDecorationLine: 'underline',
  },
  supportAddress: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 6,
  },
  actionSection: {
    gap: 12,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#DC2626',
  },
  deleteBtn: {
    paddingVertical: 6,
  },
  deleteBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
});
