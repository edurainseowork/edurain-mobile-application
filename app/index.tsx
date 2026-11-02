import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { Msg91Widget } from '../components/Shared/Msg91Widget';
import { fetchCategories, Category } from '../api/courses';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const {
    user,
    isReady,
    goal,
    setGoal,
    enrolledIds,
    login,
    verifyOtpAndSignup,
    sendPasswordReset,
  } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState(''); // Email or 10-digit Phone
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // MSG91 OTP Widget State
  const [isOtpWidgetOpen, setIsOtpWidgetOpen] = useState(false);

  // Cohort Goal Modal State (for first-time student onboarding after SIGNUP only)
  const [isJustSignedUp, setIsJustSignedUp] = useState(false);
  const [isCohortModalOpen, setIsCohortModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);

  // 1. Smart Landing Router for authenticated users
  useEffect(() => {
    if (!isReady || !user) return;
    // If the student just signed up, wait for them to confirm or skip the target selection modal
    if (isJustSignedUp) return;

    // Returning / Logged in student: NEVER show target selection modal
    // If enrolled -> navigate to home
    // If unenrolled -> navigate to courses
    if (enrolledIds.length > 0) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(tabs)/courses');
    }
  }, [isReady, user, isJustSignedUp, enrolledIds.length]);

  const handleLoginSubmit = async () => {
    setError(null);
    setInfoMessage(null);
    if (!identifier.trim()) {
      setError('Please enter your 10-digit phone number or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const res = await login(identifier, password);
    setLoading(false);

    if (res.ok) {
      // Existing login user: NEVER open target selection modal
      setIsJustSignedUp(false);
      setIsCohortModalOpen(false);
      const count = res.enrolledCount ?? enrolledIds.length;
      if (count > 0) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(tabs)/courses');
      }
    } else {
      setError(res.error || 'Login failed. Please check credentials.');
    }
  };

  const handleSignupInitiate = () => {
    setError(null);
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanPhone = signupPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms & Conditions and Privacy Policy to create your account.');
      return;
    }

    // Trigger MSG91 OTP Verification
    setIsOtpWidgetOpen(true);
  };

  const handleOtpVerified = async (result: { success: boolean; message: string }) => {
    setIsOtpWidgetOpen(false);
    if (!result.success) {
      setError('OTP verification failed.');
      return;
    }

    setLoading(true);
    const cleanPhone = signupPhone.trim().replace(/\D/g, '');
    const res = await verifyOtpAndSignup({
      name: name.trim(),
      email: signupEmail.trim().toLowerCase(),
      password,
      phone: cleanPhone,
      accessToken: result.message,
    });
    setLoading(false);

    if (res.ok) {
      // New signup confirmed! Now and only now show target selection modal
      setIsJustSignedUp(true);
      fetchCategories()
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0) {
            setSelectedCohort(cats[0].name);
          }
          setIsCohortModalOpen(true);
        })
        .catch(() => {
          setSelectedCohort('NEET');
          setIsCohortModalOpen(true);
        });
    } else {
      setError(res.error || 'Account creation failed. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfoMessage(null);
    if (!identifier.trim() || !identifier.includes('@')) {
      setError('Please enter your registered email address to receive password reset link.');
      return;
    }

    setLoading(true);
    const res = await sendPasswordReset(identifier);
    setLoading(false);

    if (res.ok) {
      setInfoMessage('Password reset link sent! Please check your inbox.');
    } else {
      setError(res.error || 'Could not send reset email. Verify email address.');
    }
  };

  const handleConfirmCohort = async () => {
    if (!selectedCohort) return;
    setLoading(true);
    setError(null);
    try {
      const match = categories.find(
        (c) => c.name.toLowerCase() === selectedCohort.toLowerCase()
      );
      await setGoal(selectedCohort, match?.id ?? null);
      setIsCohortModalOpen(false);
      // First-time signed up student navigates to courses to enroll!
      router.replace('/(tabs)/courses');
    } catch {
      setError('Could not save goal preference.');
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <Text style={styles.loadingBrandTitle}>EDURAIN</Text>
        <Text style={styles.loadingBrandSubtitle}>Victory Starts Here</Text>
        <ActivityIndicator size="large" color={Theme.colors.ink.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>EDURAIN</Text>
          <Text style={styles.brandSubtitle}>Victory Starts Here</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.activeTab]}
              onPress={() => {
                setMode('login');
                setError(null);
                setInfoMessage(null);
              }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.activeTab]}
              onPress={() => {
                setMode('signup');
                setError(null);
                setInfoMessage(null);
              }}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Banners */}
          {error && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color={Theme.colors.accent.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {infoMessage && (
            <View style={styles.infoBox}>
              <Feather name="check-circle" size={16} color={Theme.colors.accent.emerald} />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          )}

          {/* Forms */}
          {mode === 'login' ? (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>Mobile Number or Email</Text>
              <View style={styles.inputWrap}>
                <Feather name="user" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210 or student@email.com"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your account password"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={Theme.colors.text.muted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => {
                  setMode('forgot');
                  setError(null);
                }}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLoginSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Sign In to EduRain</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : mode === 'signup' ? (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrap}>
                <Feather name="user" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <Text style={styles.inputLabel}>10-Digit Mobile Number</Text>
              <View style={styles.inputWrap}>
                <Feather name="phone" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={signupPhone}
                  onChangeText={setSignupPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Feather name="mail" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="student@email.com"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.inputLabel}>Create Password</Text>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Min 6 characters"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
              </View>

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <Feather name="check" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>

              {/* Mandatory Terms & Conditions / Privacy Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.8}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <View style={[styles.checkboxBox, agreedToTerms && styles.checkboxBoxActive]}>
                  {agreedToTerms && <Feather name="check" size={13} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the{' '}
                  <Text
                    style={styles.legalLink}
                    onPress={() => router.push('/terms' as any)}
                  >
                    Terms & Conditions
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.legalLink}
                    onPress={() => router.push('/privacy' as any)}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, !agreedToTerms && styles.submitBtnDisabled]}
                onPress={handleSignupInitiate}
                disabled={loading || !agreedToTerms}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify OTP & Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>Registered Email Address</Text>
              <View style={styles.inputWrap}>
                <Feather name="mail" size={18} color={Theme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email to receive reset link"
                  placeholderTextColor={Theme.colors.text.muted}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleForgotPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Password Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={() => {
                  setMode('login');
                  setError(null);
                  setInfoMessage(null);
                }}
              >
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer Note with Direct Legal Links */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>
            By continuing, you agree to EDURAIN's{' '}
            <Text style={styles.footerLink} onPress={() => router.push('/terms' as any)}>
              Terms of Service
            </Text>{' '}
            &{' '}
            <Text style={styles.footerLink} onPress={() => router.push('/privacy' as any)}>
              Privacy Policy
            </Text>
          </Text>
          <Text style={styles.footerSubText}>
            Helpline: +91 8796443910 • support@edurain.in{'\n'}Sector 132, Urbtech, Expressway, Noida
          </Text>
        </View>
      </ScrollView>

      {/* MSG91 OTP Widget */}
      <Msg91Widget
        visible={isOtpWidgetOpen}
        phone={signupPhone}
        onCompletion={handleOtpVerified}
        onClose={() => setIsOtpWidgetOpen(false)}
      />

      {/* Cohort / Target Goal Selector Modal (Onboarding) */}
      <Modal visible={isCohortModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderBadge}>
              <Text style={styles.modalHeaderBadgeText}>Target Selection</Text>
            </View>
            <Text style={styles.modalTitle}>Choose Your Exam Target</Text>
            <Text style={styles.modalDesc}>
              Select your primary academic target to personalize your courses and batches.
            </Text>

            <ScrollView style={styles.cohortList} showsVerticalScrollIndicator={false}>
              {(categories.length > 0
                ? categories.map((c) => c.name)
                : ['NEET-UG', 'IIT-JEE', 'Foundation (9-10)', 'CUET', 'CBSE Boards']
              ).map((catName) => (
                <TouchableOpacity
                  key={catName}
                  style={[
                    styles.cohortItem,
                    selectedCohort === catName && styles.cohortItemSelected,
                  ]}
                  onPress={() => setSelectedCohort(catName)}
                >
                  <Text
                    style={[
                      styles.cohortItemText,
                      selectedCohort === catName && styles.cohortItemTextSelected,
                    ]}
                  >
                    {catName}
                  </Text>
                  {selectedCohort === catName && (
                    <Ionicons name="checkmark-circle" size={20} color={Theme.colors.ink.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.confirmCohortBtn,
                !selectedCohort && styles.confirmCohortBtnDisabled,
              ]}
              disabled={!selectedCohort || loading}
              onPress={handleConfirmCohort}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmCohortBtnText}>Confirm Target & Explore Courses</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipCohortBtn}
              onPress={() => {
                setIsCohortModalOpen(false);
                router.replace('/(tabs)/courses');
              }}
            >
              <Text style={styles.skipCohortBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: Theme.colors.paper.light,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingLogo: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  loadingBrandTitle: {
    fontSize: 24,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    letterSpacing: 1.2,
  },
  loadingBrandSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#4B6B70',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.secondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogoImage: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Theme.colors.ink.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#175A67',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.primary,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: Theme.colors.paper.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    ...Theme.shadows.card,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.paper.light,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Theme.colors.paper.white,
    ...Theme.shadows.subtle,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.muted,
  },
  activeTabText: {
    color: Theme.colors.ink.primary,
    fontFamily: Theme.fonts.bold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.accent.error,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.accent.emerald,
  },
  form: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.soft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.primary,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.ink.primary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxBoxActive: {
    backgroundColor: '#0B3B42',
    borderColor: '#0B3B42',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
    lineHeight: 18,
  },
  legalLink: {
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
    textDecorationLine: 'underline',
  },
  submitBtn: {
    backgroundColor: Theme.colors.ink.primary,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#175A67',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  backToLoginBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backToLoginText: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.ink.primary,
  },
  footerWrap: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
    textDecorationLine: 'underline',
  },
  footerSubText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 60, 69, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeaderBadge: {
    backgroundColor: Theme.colors.ink.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  modalHeaderBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.primary,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  cohortList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  cohortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  cohortItemSelected: {
    borderColor: Theme.colors.ink.primary,
    backgroundColor: Theme.colors.ink.light,
  },
  cohortItemText: {
    fontSize: 15,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.primary,
  },
  cohortItemTextSelected: {
    color: Theme.colors.ink.primary,
    fontFamily: Theme.fonts.bold,
  },
  confirmCohortBtn: {
    backgroundColor: Theme.colors.ink.primary,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCohortBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmCohortBtnText: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  skipCohortBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  skipCohortBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.muted,
  },
});

