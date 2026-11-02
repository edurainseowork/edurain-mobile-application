import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Theme } from '../../constants/theme';

interface Msg91WidgetProps {
  visible: boolean;
  widgetId?: string;
  tokenAuth?: string;
  phone?: string;
  onCompletion?: (res: { success: boolean; message: string }) => void;
  onClose?: () => void;
}

export function Msg91Widget(props: Msg91WidgetProps) {
  if (!props.visible) return null;

  const handleSimulateSuccess = () => {
    props.onCompletion?.({
      success: true,
      message: 'otp_verified_token',
    });
  };

  return (
    <Modal visible={props.visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>OTP Verification</Text>
          </View>
          <Text style={styles.title}>Verify Phone Number</Text>
          <Text style={styles.desc}>
            {props.phone ? `Verifying +91 ${props.phone}` : 'Enter the OTP sent to your registered mobile number.'}
          </Text>

          <TouchableOpacity
            style={styles.simulateButton}
            onPress={handleSimulateSuccess}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Verify OTP & Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={props.onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 60, 69, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#175A67',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 8,
  },
  headerBadge: {
    backgroundColor: Theme.colors.ink.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.primary,
  },
  title: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  simulateButton: {
    backgroundColor: Theme.colors.ink.primary,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
  cancelBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    color: Theme.colors.text.muted,
    fontFamily: Theme.fonts.medium,
    fontSize: 14,
  },
});
