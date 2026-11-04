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
import { Theme } from '../../constants/theme';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  const handleSupportEmail = () => {
    Linking.openURL('mailto:support@edurain.in?subject=Terms%20Inquiry');
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
          <Feather name="shield" size={14} color={Theme.colors.ink.primary} />
          <Text style={styles.metaBadgeText}>Effective Date: October 27, 2026</Text>
        </View>

        <Text style={styles.docTitle}>EDURAIN Terms of Service</Text>
        <Text style={styles.docSubtitle}>
          Governing Mobile Applications, Website Portal, Test Series & Online Batches
        </Text>

        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Welcome to EDURAIN. By creating an account, downloading our mobile application, or accessing any learning batches, study materials, live classes, and mock test series, you agree to be bound by the following legally binding terms and conditions.
          </Text>
        </View>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>1. Acceptance of Terms & Eligibility</Text>
          <Text style={styles.paragraph}>
            By registering for an EDURAIN account, you represent that you are at least 13 years of age or accessing the services under the express supervision and consent of a parent or legal guardian. If you do not agree to these terms, you must not use or access EDURAIN services.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>2. Account Registration, Single-Device Policy & Security</Text>
          <Text style={styles.paragraph}>
            To protect academic integrity and copyrighted course streams, your student account is strictly personal. Each account is limited to a single active mobile session at any given time. Account sharing, credential distribution, or unauthorized concurrent logins are strictly prohibited and will result in immediate automated suspension without refund.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>3. Course Access, Digital Content & Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All PDF notes, test papers, question banks, study materials, and trademarks displayed on EDURAIN are the exclusive intellectual property of EDURAIN India. You are granted a limited, non-exclusive, non-transferable revocable license for personal, non-commercial educational study only. Screen recording, unauthorized ripping, capturing, or redistribution across social channels is strictly prohibited and subject to legal prosecution under the Indian Copyright Act, 1957.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>4. Fees, In-App Purchases, Billing & Non-Refundable Policy</Text>
          <Text style={styles.paragraph}>
            Batch enrollment payments are processed securely by Reserve Bank of India (RBI) authorised payment gateways (Razorpay). Because instant access to copyrighted study material, live test keys, and proprietary study materials is unlocked immediately upon transaction confirmation, all course and subscription purchases are strictly final and non-refundable.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>5. User Conduct & Zero-Tolerance Community Guidelines</Text>
          <Text style={styles.paragraph}>
            Students agree to maintain mutual respect in doubt forums, mentor bookings, and live interactions. The posting of abusive, defamatory, discriminatory, obscene, or fraudulent content will result in immediate permanent expulsion from the EDURAIN platform.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>6. Disclaimers, Warranty & Exam Outcome Disclaimer</Text>
          <Text style={styles.paragraph}>
            EDURAIN provides high-precision pedagogical instruction curated by premier educators. However, educational materials are provided on an "as is" and "as available" basis without warranties of any kind. EDURAIN does not guarantee specific exam scores, ranks, or admissions into government or private institutions (such as NEET, JEE, or state medical/engineering colleges), as outcomes depend upon student dedication, aptitude, and independent preparation.
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>7. Limitation of Liability & Indemnification</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by applicable law, EDURAIN and its affiliates shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from platform downtime, network latency, or technical interruptions. You agree to defend and hold harmless EDURAIN from any claims arising out of your violation of these Terms.
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>8. Governing Law, Dispute Resolution & Grievance Officer</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed and construed in accordance with the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Gautam Buddha Nagar, Uttar Pradesh, India.
          </Text>

          <View style={styles.grievanceCard}>
            <Text style={styles.grievanceTitle}>Grievance Officer & Official Communications</Text>
            <Text style={styles.grievanceLine}>
              <Text style={styles.boldLabel}>Designation: </Text>Grievance Officer, EDURAIN India
            </Text>
            <Text style={styles.grievanceLine}>
              <Text style={styles.boldLabel}>Registered Office: </Text>Sector 132, Urbtech, Expressway, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201304, India
            </Text>
            <TouchableOpacity onPress={handleSupportEmail} style={styles.linkRow}>
              <Feather name="mail" size={15} color={Theme.colors.ink.primary} />
              <Text style={styles.linkText}>support@edurain.in / grievance@edurain.in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleHelplineCall} style={styles.linkRow}>
              <Feather name="phone" size={15} color={Theme.colors.ink.primary} />
              <Text style={styles.linkText}>+91 8796443910</Text>
            </TouchableOpacity>
            <Text style={styles.grievanceNote}>
              Grievances are acknowledged within 24 hours and redressed within 15 working days as mandated by IT Rules and the Digital Personal Data Protection (DPDP) Act.
            </Text>
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
  grievanceCard: {
    marginTop: 14,
    backgroundColor: '#F7FBFA',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0B3B42',
  },
  grievanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B3B42',
    marginBottom: 8,
  },
  grievanceLine: {
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
  grievanceNote: {
    fontSize: 11.5,
    color: '#657B7E',
    marginTop: 10,
    lineHeight: 16,
  },
});

