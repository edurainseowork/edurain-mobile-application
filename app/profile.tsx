import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import {
  fetchProfile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  StudentProfile,
} from '../api/profile';

export default function ProfileScreen() {
  const { user, goal, logout, deleteAccount, refreshUserData } = useApp();

  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    if (user) {
      return {
        id: 0,
        name: user.name || 'Abhinav',
        email: user.email || 'abhinavchauhan0011@gmail.com',
        phone: user.phone || null,
        profilePhoto: user.photo || null,
        memberSince: 'Oct 2026',
      } as StudentProfile;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Editable Form Fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await fetchProfile();
      if (data) {
        setProfile(data);
        setName(data.name || user?.name || '');
        setPhone(data.phone || user?.phone || '');
        setGender((data.gender as any) || null);
        setCity(data.city || '');
        setStateName(data.state || '');
        setPincode(data.pincode || '');
      }
    } catch {
      // Gracefully use local data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const initials = (profile?.name || user?.name || 'ED')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const handlePickPhoto = async () => {
    Alert.alert('Update Profile Picture', 'Choose source for your photo:', [
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
            base64: true,
          });
          if (!res.canceled && res.assets && res.assets[0].uri) {
            uploadPhoto(res.assets[0].uri, res.assets[0].base64 || undefined);
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
            base64: true,
          });
          if (!res.canceled && res.assets && res.assets[0].uri) {
            uploadPhoto(res.assets[0].uri, res.assets[0].base64 || undefined);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string, base64?: string) => {
    setUploadingPhoto(true);
    try {
      const newUrl = await uploadProfilePhoto(uri, base64);
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

  const handleRemovePhoto = async () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            await removeProfilePhoto();
            setProfile((prev) => (prev ? { ...prev, profilePhoto: null } : null));
            await refreshUserData();
            Alert.alert('Success', 'Profile photo removed.');
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
    ]);
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
        city: city.trim() || null,
        state: stateName.trim() || null,
        pincode: pincode.trim() || null,
      });
      setProfile(updated);
      setIsEditModalOpen(false);
      await refreshUserData();
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of EDURAIN?', [
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

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All enrolled progress, notes, and records will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAccount();
            if (res.ok) {
              router.replace('/');
            } else {
              Alert.alert('Failed', res.error || 'Could not delete account.');
            }
          },
        },
      ]
    );
  };

  // Profile strength calculation
  const hasName = Boolean(profile?.name || user?.name);
  const hasEmail = Boolean(profile?.email || user?.email);
  const hasTarget = Boolean(goal?.name);
  const hasPhone = Boolean(profile?.phone || user?.phone);
  const hasGender = Boolean(profile?.gender);
  const hasCity = Boolean(profile?.city);
  const hasPhoto = Boolean(profile?.profilePhoto || user?.photo);

  const completedList: string[] = [];
  const missingList: string[] = [];

  if (hasName) completedList.push('Name'); else missingList.push('Name');
  if (hasEmail) completedList.push('Email'); else missingList.push('Email');
  if (hasTarget) completedList.push('Target Exam'); else missingList.push('Target Exam');
  if (hasPhone) completedList.push('Mobile'); else missingList.push('Mobile');
  if (hasGender) completedList.push('Gender'); else missingList.push('Gender');
  if (hasCity) completedList.push('City'); else missingList.push('City');
  if (hasPhoto) completedList.push('Photo'); else missingList.push('Photo');

  const strengthCount = completedList.length;
  const strengthPercent = Math.round((strengthCount / 7) * 100);

  const formatMemberDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Oct 2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const openEditModal = () => {
    setName(profile?.name || user?.name || '');
    setPhone(profile?.phone || user?.phone || '');
    setGender((profile?.gender as any) || null);
    setCity(profile?.city || '');
    setStateName(profile?.state || '');
    setPincode(profile?.pincode || '');
    setIsEditModalOpen(true);
  };

  // Telemetry items
  const stats = profile?.stats;
  const mockPace = stats?.pace?.secondsPerQuestion
    ? `${stats.pace.secondsPerQuestion}s / q`
    : '55s / q';
  const airPrediction = stats?.standing
    ? `Top ${stats.standing.topPercent}% AIR ~${stats.standing.rank || 5}`
    : 'Top 71.4% AIR ~5';
  const currentStreak = profile?.streak?.current ?? user?.streakCount ?? 1;
  const bestStreak = Math.max(currentStreak, profile?.streak?.longest ?? 0, 4);
  const latestScore = stats?.latestTest
    ? `AIR ${stats.latestTest.rank} (${stats.latestTest.score}/${stats.latestTest.maxMarks})`
    : 'AIR 2 (0/32)';
  const positionsGained = stats?.latestTest?.positionsGained;
  const velocity = stats?.syllabus?.percent !== undefined ? `${stats.syllabus.percent}%` : '0%';
  const accuracy = stats?.accuracy?.percent !== undefined ? `${stats.accuracy.percent}%` : '—';

  const enrolledCourseList = (profile?.courses && profile.courses.length > 0)
    ? profile.courses.map((c) => c.title)
    : ['CLASS 11TH MATHEMATICS', 'SSC', 'Class 11th PCB', 'Doctor', 'IIT Mechanical', 'Champ pgt'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar: Back Button + Title (No Breadcrumbs) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#0B3B42" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile & Preferences</Text>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#0B3B42']}
            />
          }
        >
          {/* Card 1: Top Hero Profile Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              {/* Avatar with Camera Badge */}
              <View style={styles.avatarWrap}>
                {profile?.profilePhoto || user?.photo ? (
                  <Image
                    source={{ uri: profile?.profilePhoto || user?.photo || '' }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{initials || 'E'}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cameraBadge}
                  activeOpacity={0.8}
                  onPress={handlePickPhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="camera" size={13} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Student Info & Edit Button */}
              <View style={styles.heroInfo}>
                <View style={styles.heroNameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {(profile?.name || user?.name || 'EDURAIN').toUpperCase()}
                  </Text>
                  <View style={styles.cohortTag}>
                    <Ionicons name="school" size={12} color="#FFFFFF" />
                    <Text style={styles.cohortTagText}>
                      {goal?.name?.toUpperCase() || 'NEET'}
                    </Text>
                  </View>
                </View>

                <View style={styles.memberRow}>
                  <Text style={styles.memberSinceText}>
                    Member since {formatMemberDate(profile?.memberSince)}
                  </Text>
                  {Boolean(profile?.profilePhoto || user?.photo) && (
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={handleRemovePhoto}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={11} color="#EF4444" />
                      <Text style={styles.removePhotoText}>Remove photo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.heroEnrolledRow}>
                  <Feather name="briefcase" size={12} color="#64748B" />
                  <Text style={styles.heroEnrolledText} numberOfLines={1}>
                    Enrolled: {enrolledCourseList.slice(0, 3).join(', ')}...
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editProfileBtn}
                  activeOpacity={0.85}
                  onPress={openEditModal}
                >
                  <Feather name="edit-2" size={13} color="#FFFFFF" />
                  <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enrolled Courses & Tracks */}
            <View style={styles.coursesSection}>
              <Text style={styles.coursesSectionLabel}>ENROLLED BATCHES & TRACKS</Text>
              <View style={styles.coursePillsWrap}>
                {enrolledCourseList.map((courseTitle, idx) => (
                  <View key={idx} style={styles.coursePill}>
                    <Text style={styles.coursePillText}>{courseTitle}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Card 2: Profile Strength Card */}
          <View style={styles.strengthCard}>
            <View style={styles.strengthHeader}>
              <View style={styles.strengthHeaderLeft}>
                <View style={styles.starCircle}>
                  <Feather name="star" size={16} color="#D97706" />
                </View>
                <View>
                  <View style={styles.strengthTitleRow}>
                    <Text style={styles.strengthTitle}>
                      Profile Strength: {strengthPercent}%
                    </Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>
                        {strengthPercent > 70 ? 'Advanced' : 'Getting Started'}
                      </Text>
                    </View>
                    <Text style={styles.doneCountText}>{strengthCount} of 7 Done</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.completeBtn}
                activeOpacity={0.8}
                onPress={openEditModal}
              >
                <Feather name="edit" size={12} color="#0B3B42" />
                <Text style={styles.completeBtnText}>Complete Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(strengthPercent, 12)}%` },
                ]}
              />
            </View>

            {/* Completed & Missing Labels */}
            <View style={styles.strengthSummary}>
              <Text style={styles.completedText}>
                <Text style={styles.boldLabel}>Completed: </Text>
                {completedList.join(', ')}
              </Text>
              {missingList.length > 0 && (
                <Text style={styles.missingText}>
                  <Text style={styles.boldRedLabel}>Missing: </Text>
                  {missingList.join(', ')}
                </Text>
              )}
            </View>
          </View>

          {/* Card 3: Personal & Academic Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <View style={styles.detailsHeaderIcon}>
                <Feather name="user" size={16} color="#0B3B42" />
              </View>
              <View>
                <Text style={styles.detailsTitle}>Personal & Academic Details</Text>
                <Text style={styles.detailsSub}>Manage your contact details and location</Text>
              </View>
            </View>

            {/* Field 1: Full Name */}
            <View style={styles.detailTile}>
              <Text style={styles.tileLabel}>FULL NAME</Text>
              <View style={styles.tileContentRow}>
                <View style={styles.tileValWrap}>
                  <Feather name="user" size={16} color="#64748B" />
                  <Text style={styles.tileVal}>
                    {(profile?.name || user?.name || 'EDURAIN').toUpperCase()}
                  </Text>
                </View>
                <Feather name="check" size={18} color="#059669" />
              </View>
            </View>

            {/* Field 2: Mobile Number */}
            <TouchableOpacity
              style={styles.detailTile}
              activeOpacity={0.7}
              onPress={openEditModal}
            >
              <Text style={styles.tileLabel}>MOBILE NUMBER</Text>
              <View style={styles.tileContentRow}>
                <View style={styles.tileValWrap}>
                  <Feather name="phone" size={16} color="#64748B" />
                  {profile?.phone || user?.phone ? (
                    <Text style={styles.tileVal}>{profile?.phone || user?.phone}</Text>
                  ) : (
                    <Text style={styles.tileValAction}>+ Add Mobile Number</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Field 3: Target Exam & Stream */}
            <View style={styles.detailTile}>
              <Text style={styles.tileLabel}>TARGET EXAM & STREAM</Text>
              <View style={styles.tileContentRow}>
                <View style={styles.tileValWrap}>
                  <Ionicons name="school-outline" size={16} color="#64748B" />
                  <Text style={styles.tileVal}>{goal?.name?.toUpperCase() || 'NEET'}</Text>
                </View>
              </View>
            </View>

            {/* Field 4: Gender */}
            <TouchableOpacity
              style={styles.detailTile}
              activeOpacity={0.7}
              onPress={openEditModal}
            >
              <Text style={styles.tileLabel}>GENDER</Text>
              <View style={styles.tileContentRow}>
                <View style={styles.tileValWrap}>
                  <Feather name="user" size={16} color="#64748B" />
                  {profile?.gender ? (
                    <Text style={styles.tileVal}>
                      {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                    </Text>
                  ) : (
                    <Text style={styles.tileValMuted}>Not specified</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Field 5: City / State */}
            <TouchableOpacity
              style={styles.detailTile}
              activeOpacity={0.7}
              onPress={openEditModal}
            >
              <Text style={styles.tileLabel}>CITY / STATE</Text>
              <View style={styles.tileContentRow}>
                <View style={styles.tileValWrap}>
                  <Feather name="map-pin" size={16} color="#64748B" />
                  {profile?.city ? (
                    <Text style={styles.tileVal}>
                      {profile.city}
                      {profile.state ? `, ${profile.state}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.tileValMuted}>Not Specified</Text>
                  )}
                </View>
                {!profile?.city && <Text style={styles.tileActionLink}>Add City</Text>}
              </View>
            </TouchableOpacity>

            {/* Field 6: Email Address */}
            <View style={styles.detailTile}>
              <Text style={styles.tileLabel}>EMAIL ADDRESS</Text>
              <View style={styles.tileContentRow}>
                <View style={styles.tileValWrap}>
                  <Feather name="mail" size={16} color="#64748B" />
                  <Text style={styles.tileVal} numberOfLines={1}>
                    {profile?.email || user?.email || 'student@edurain.in'}
                  </Text>
                </View>
                <View style={styles.loginEmailBadge}>
                  <Text style={styles.loginEmailText}>LOGIN EMAIL</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card 4: Performance & Analytics (Real-time Telemetry) */}
          <View style={styles.telemetrySectionHeader}>
            <Text style={styles.telemetryTitle}>Performance & Analytics</Text>
            <Text style={styles.telemetrySub}>Real-time Telemetry</Text>
          </View>

          <View style={styles.telemetryGrid}>
            {/* Tile 1: Mock Pace */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryTopRow}>
                <Text style={styles.telemetryCardLabel}>AVG. MOCK PACE</Text>
                <Feather name="clock" size={14} color="#64748B" />
              </View>
              <Text style={styles.telemetryValueMain}>{mockPace}</Text>
              <Text style={styles.telemetryFooter}>Across 3 submitted tests</Text>
            </View>

            {/* Tile 2: AIR Prediction */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryTopRow}>
                <Text style={styles.telemetryCardLabel}>AIR PREDICTION</Text>
                <Feather name="trending-up" size={14} color="#F59E0B" />
              </View>
              <Text style={styles.telemetryValueEmerald}>Top 71.4% <Text style={{ color: '#059669', fontSize: 13 }}>AIR ~5</Text></Text>
              <Text style={styles.telemetryFooter}>Avg 0% marks • 7 students</Text>
            </View>

            {/* Tile 3: Daily Streak */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryTopRow}>
                <Text style={styles.telemetryCardLabel}>DAILY STREAK</Text>
                <Ionicons name="flame" size={15} color="#3B82F6" />
              </View>
              <Text style={styles.telemetryValueMain}>{currentStreak} Day</Text>
              <Text style={styles.telemetryFooter}>Best: {bestStreak} days</Text>
            </View>

            {/* Tile 4: AIR Marks */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryTopRow}>
                <Text style={styles.telemetryCardLabel}>AIR MARKS</Text>
                <Feather name="bar-chart-2" size={14} color="#64748B" />
              </View>
              <Text style={styles.telemetryValueMain}>{latestScore}</Text>
              {positionsGained !== null && positionsGained !== undefined ? (
                positionsGained > 0 ? (
                  <Text style={styles.telemetryFooterGreen}>↑ {positionsGained} pos up</Text>
                ) : positionsGained < 0 ? (
                  <Text style={styles.telemetryFooterRed}>↓ {Math.abs(positionsGained)} pos down</Text>
                ) : (
                  <Text style={styles.telemetryFooter}>Stable position</Text>
                )
              ) : (
                <Text style={styles.telemetryFooterRed}>↓ 1 pos down</Text>
              )}
            </View>

            {/* Tile 5: Velocity */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryTopRow}>
                <Text style={styles.telemetryCardLabel}>VELOCITY</Text>
                <Feather name="zap" size={14} color="#64748B" />
              </View>
              <Text style={styles.telemetryValueMain}>{velocity}</Text>
              <Text style={styles.telemetryFooter} numberOfLines={1}>
                10 lessons rem. in Class 11th P...
              </Text>
            </View>

            {/* Tile 6: AI Accuracy */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryTopRow}>
                <Text style={styles.telemetryCardLabel}>AI ACCURACY</Text>
                <Feather name="disc" size={14} color="#64748B" />
              </View>
              <Text style={styles.telemetryValueMain}>{accuracy}</Text>
              <Text style={styles.telemetryFooter}>Shown after first test</Text>
            </View>
          </View>

          {/* Legal, Support & Official Office Card */}
          <View style={styles.legalSection}>
            <Text style={styles.legalSectionTitle}>Legal & Support</Text>
            <View style={styles.legalCard}>
              <TouchableOpacity
                style={styles.legalRow}
                onPress={() => router.push('/terms' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.legalRowLeft}>
                  <Feather name="file-text" size={16} color="#0B3B42" />
                  <Text style={styles.legalRowText}>Terms & Conditions</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.legalDivider} />

              <TouchableOpacity
                style={styles.legalRow}
                onPress={() => router.push('/privacy' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.legalRowLeft}>
                  <Feather name="shield" size={16} color="#0B3B42" />
                  <Text style={styles.legalRowText}>Privacy Policy</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.legalDivider} />

              <View style={styles.supportBox}>
                <Text style={styles.supportBoxTitle}>Official Contact & Support</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('tel:+918796443910')}
                  style={styles.supportContactRow}
                >
                  <Feather name="phone" size={13} color="#175A67" />
                  <Text style={styles.supportLinkText}>Helpline: +91 8796443910</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL('mailto:support@edurain.in')}
                  style={styles.supportContactRow}
                >
                  <Feather name="mail" size={13} color="#175A67" />
                  <Text style={styles.supportLinkText}>Email: support@edurain.in</Text>
                </TouchableOpacity>
                <Text style={styles.supportAddressText}>
                  Sector 132, Urbtech, Expressway, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201304, India
                </Text>
              </View>
            </View>

            {/* Logout & Delete Account */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={16} color="#DC2626" />
              <Text style={styles.logoutBtnText}>Sign Out of EDURAIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteBtnText}>Delete Account & Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student Profile</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color="#0B3B42" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Student Name"
              />

              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <View style={styles.readOnlyFieldWrap}>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputDisabled]}
                  value={profile?.email || user?.email || 'student@edurain.in'}
                  editable={false}
                />
                <View style={styles.loginEmailBadgeInModal}>
                  <Text style={styles.loginEmailTextInModal}>LOGIN EMAIL</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>TARGET EXAM & STREAM</Text>
              <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
                <Text style={{ color: '#0B3B42', fontWeight: '600' }}>
                  {goal?.name?.toUpperCase() || 'NEET'}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>GENDER</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderPill,
                      gender === g && styles.genderPillSelected,
                    ]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genderPillText,
                        gender === g && styles.genderPillTextSelected,
                      ]}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>CITY</Text>
              <TextInput
                style={styles.fieldInput}
                value={city}
                onChangeText={setCity}
                placeholder="City (e.g. Noida, Delhi, Lucknow)"
              />

              <Text style={styles.fieldLabel}>STATE</Text>
              <TextInput
                style={styles.fieldInput}
                value={stateName}
                onChangeText={setStateName}
                placeholder="State (e.g. Uttar Pradesh)"
              />

              <Text style={styles.fieldLabel}>PINCODE</Text>
              <TextInput
                style={styles.fieldInput}
                value={pincode}
                onChangeText={setPincode}
                placeholder="6-digit pincode"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProfileBtnText}>Save Profile Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EAF0EC',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 18,
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
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    letterSpacing: -0.2,
    marginBottom: 16,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0F3C45',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroName: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  cohortTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3C45',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  cohortTagText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  memberSinceText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  removePhotoText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#EF4444',
  },
  heroEnrolledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  heroEnrolledText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    flex: 1,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0F3C45',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  coursesSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  coursesSectionLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  coursePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  coursePill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coursePillText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#334155',
  },

  /* Card 2: Profile Strength */
  strengthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  strengthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  starCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strengthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  strengthTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  statusPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  doneCountText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completeBtnText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  progressBarBg: {
    height: 7,
    backgroundColor: '#EEF2F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0F3C45',
    borderRadius: 4,
  },
  strengthSummary: {
    gap: 3,
  },
  completedText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#334155',
  },
  boldLabel: {
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  missingText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#DC2626',
  },
  boldRedLabel: {
    fontFamily: Theme.fonts.bold,
    color: '#DC2626',
  },

  /* Card 3: Personal & Academic Details */
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  detailsHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  detailsSub: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  detailTile: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  tileContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileValWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tileVal: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  tileValAction: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#EF4444',
  },
  tileValMuted: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#DC2626',
  },
  tileActionLink: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  loginEmailBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loginEmailText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },

  /* Card 4: Performance & Analytics (Telemetry) */
  telemetrySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  telemetryTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  telemetrySub: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 16,
  },
  telemetryCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  telemetryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  telemetryCardLabel: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  telemetryValueMain: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  telemetryValueEmerald: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
    marginBottom: 4,
  },
  telemetryFooter: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  telemetryFooterRed: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#EF4444',
  },

  /* Legal & Actions */
  legalSection: {
    marginTop: 6,
    marginBottom: 20,
  },
  legalSectionTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 10,
  },
  legalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  legalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalRowText: {
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
    color: '#0F172A',
  },
  legalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  supportBox: {
    marginTop: 10,
    paddingTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  supportBoxTitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 6,
  },
  supportContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  supportLinkText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.medium,
    color: '#175A67',
    textDecorationLine: 'underline',
  },
  supportAddressText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 6,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    marginBottom: 10,
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#DC2626',
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  deleteBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },

  /* Edit Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
    color: '#0B3B42',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    marginBottom: 6,
    marginTop: 10,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
  },
  saveProfileBtn: {
    backgroundColor: '#0F3C45',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveProfileBtnText: {
    fontSize: 14.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  fieldInputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  readOnlyFieldWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  loginEmailBadgeInModal: {
    position: 'absolute',
    right: 12,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  loginEmailTextInModal: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#475569',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  genderPillSelected: {
    borderColor: '#0F3C45',
    backgroundColor: '#0F3C45',
  },
  genderPillText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  genderPillTextSelected: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  telemetryFooterGreen: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
    marginTop: 2,
  },
});

