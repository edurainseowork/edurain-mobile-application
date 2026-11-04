import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../constants/theme';

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  const handleSupportEmail = () => {
    Linking.openURL('mailto:privacy@edurain.in?subject=Privacy%20Inquiry');
  };

  const handleHelplineCall = () => {
    Linking.openURL('tel:+918796443910');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Native App Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={Theme.colors.ink.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaBadge}>
          <Feather name="lock" size={14} color={Theme.colors.ink.primary} />
          <Text style={styles.metaBadgeText}>DPDP Act 2026 & Store Compliant</Text>
        </View>

        <Text style={styles.docTitle}>EDURAIN Privacy Policy</Text>
        <Text style={styles.docSubtitle}>
          Effective: October 27, 2026 | Compliant with Apple Guideline 5.1.1 & India DPDP Act
        </Text>

        <View style={styles.introCard}>
          <Text style={styles.introText}>
            EDURAIN India ("EDURAIN", "we", "us", or "our") values the trust of students, educators, and guardians. This Privacy Policy outlines the information we collect, how it is safeguarded, the permissions requested by our mobile application, and your statutory rights under India's Digital Personal Data Protection (DPDP) Act, 2026, the Apple App Store Review Guidelines, and the Google Play Developer Distribution Policy.
          </Text>
        </View>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect only the minimum data essential to provide our educational services:
            {'\n'}• <Text style={styles.boldText}>Identity & Contact Data:</Text> Student name, mobile phone number, email address, and academic target (e.g. NEET, JEE, Foundation).
            {'\n'}• <Text style={styles.boldText}>Academic Telemetry:</Text> Quiz scores, mock test submissions, study material progress, doubt tickets, and enrolled batches.
            {'\n'}• <Text style={styles.boldText}>Device & Session Diagnostics:</Text> Operating system version, device model, IP address, and single-session authentication tokens for account security.
            {'\n'}• <Text style={styles.boldText}>Billing Records:</Text> Transaction identifiers, timestamps, and course receipts. EDURAIN does not store complete credit card or debit card credentials on its servers.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>2. Legal Basis & Use of Information</Text>
          <Text style={styles.paragraph}>
            We process personal data based on contractual necessity to fulfill educational delivery and user consent:
            {'\n'}• Authenticating student access and preventing credential leakage.
            {'\n'}• Providing study material, live classes, batch notes and test papers.
            {'\n'}• Generating personalized AI diagnostic reports, rank benchmarks, and syllabus progress.
            {'\n'}• Transmitting service notifications regarding live classes, test unlock dates, and doubt answers.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>3. Device Permissions (Camera & Photos)</Text>
          <Text style={styles.paragraph}>
            Our mobile application may request the following native permissions on an opt-in, runtime basis:
            {'\n'}• <Text style={styles.boldText}>Camera (NSCameraUsageDescription):</Text> Used strictly when the student taps the camera option in "Ask Your Doubt" to snap a photo of a textbook question or problem, or to take a profile avatar.
            {'\n'}• <Text style={styles.boldText}>Photo Library (NSPhotoLibraryUsageDescription):</Text> Used solely to select an existing question diagram or picture for doubt submission or avatar customization.
            {'\n'}• <Text style={styles.boldText}>Push Notifications (POST_NOTIFICATIONS):</Text> Used to alert you of scheduled live classes, upcoming test reminders, and mentor responses.
            {'\n\n'}We never access your media gallery, camera, or background location without explicit, voluntary student interaction.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>4. In-App Purchases & Financial Privacy</Text>
          <Text style={styles.paragraph}>
            Payments are processed by RBI-authorised, PCI-DSS compliant payment gateways (Razorpay). Sensitive banking or card details are never processed or retained on EDURAIN infrastructure.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>5. Third-Party Sub-processors & Data Security</Text>
          <Text style={styles.paragraph}>
            We employ industry-standard encryption (TLS 1.3 in transit and AES-256 at rest). Student data is stored in tier-4 cloud data centers in India. Sub-processors include Firebase (secure auth session state) and MSG91 (two-factor transactional SMS OTP verification). We do not sell, rent, or monetize personal student data to third-party ad networks.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>6. Student Rights & Account Deletion</Text>
          <Text style={styles.paragraph}>
            In compliance with Apple App Store Guideline 5.1.1 and the DPDP Act 2026, students retain full autonomy over their personal data:
            {'\n'}• <Text style={styles.boldText}>Right of Access & Correction:</Text> You can review and update profile details at any time in the Profile tab.
            {'\n'}• <Text style={styles.boldText}>Right to Erase / Delete Account:</Text> You may request the permanent deletion of your account and associated personal data at any time directly through the app or by emailing privacy@edurain.in. Upon request, user data is permanently purged from active systems within 30 days.
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>7. Children & Minor Protection</Text>
          <Text style={styles.paragraph}>
            EDURAIN caters to students preparing for competitive entrance examinations (NEET, JEE, Foundation). For users under 18 years of age, registration must be undertaken with the knowledge and consent of parents or legal guardians. We never perform behavioral profiling, targeted advertising, or non-educational data tracking on minors.
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>8. Data Protection Officer (DPO) & Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions, feedback, or wish to exercise your statutory data privacy rights, please reach out to our designated Data Protection Officer:
          </Text>

          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Data Protection Officer, EDURAIN India</Text>
            <Text style={styles.contactLine}>
              <Text style={styles.boldLabel}>Address: </Text>Sector 132, Urbtech, Expressway, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201304, India
            </Text>
            <TouchableOpacity onPress={handleSupportEmail} style={styles.linkRow}>
              <Feather name="mail" size={15} color={Theme.colors.ink.primary} />
              <Text style={styles.linkText}>privacy@edurain.in / support@edurain.in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleHelplineCall} style={styles.linkRow}>
              <Feather name="phone" size={15} color={Theme.colors.ink.primary} />
              <Text style={styles.linkText}>+91 8796443910</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(23, 90, 103, 0.08)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B3B42',
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  metaBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F0F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B3B42',
  },
  docTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B3B42',
    letterSpacing: -0.3,
  },
  docSubtitle: {
    fontSize: 13,
    color: '#4B6B70',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.1)',
  },
  introText: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#243B3E',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.08)',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B3B42',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: '#3B4E51',
  },
  boldText: {
    fontWeight: '700',
    color: '#0B3B42',
  },
  contactCard: {
    marginTop: 14,
    backgroundColor: '#F7FBFA',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0B3B42',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B3B42',
    marginBottom: 8,
  },
  contactLine: {
    fontSize: 12.5,
    color: '#3B4E51',
    lineHeight: 18,
    marginBottom: 6,
  },
  boldLabel: {
    fontWeight: '700',
    color: '#0B3B42',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  linkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#175A67',
    textDecorationLine: 'underline',
  },
});

