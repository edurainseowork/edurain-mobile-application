import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Theme } from '../../constants/theme';

interface Msg91WidgetProps {
  visible: boolean;
  widgetId?: string;
  tokenAuth?: string;
  phone?: string;
  /** First ask for the number (e.g. changing the login number); otherwise the OTP goes to `phone` right away */
  askForNumber?: boolean;
  title?: string;
  onCompletion?: (res: { success: boolean; message: string; phone: string }) => void;
  onClose?: () => void;
}

// MSG91 OTP widget REST API (the same calls MSG91's own React Native SDK makes)
const MSG91_API = 'https://control.msg91.com/api/v5/widget';
const RESEND_SECONDS = 30;
const SMS_CHANNEL = 11;

async function callMsg91(path: string, body: Record<string, unknown>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${MSG91_API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: { type?: string; message?: string } = await res.json().catch(() => ({}));
    if (data.type !== 'success' || !data.message) {
      throw new Error(data.message || 'Could not reach the OTP service. Please try again.');
    }
    return data.message;
  } catch (err: any) {
    throw new Error(err?.name === 'AbortError' ? 'The OTP service is taking too long. Please try again.' : err?.message);
  } finally {
    clearTimeout(timer);
  }
}

/** Sends an SMS OTP to a number, verifies it, and hands MSG91's access token to `onCompletion`. */
export function Msg91Widget(props: Msg91WidgetProps) {
  const widgetId = props.widgetId || process.env.EXPO_PUBLIC_MSG91_WIDGET_ID || '';
  const tokenAuth = props.tokenAuth || process.env.EXPO_PUBLIC_MSG91_TOKEN_AUTH || '';
  const presetDigits = (props.phone || '').replace(/\D/g, '').slice(-10);

  const [digits, setDigits] = useState(presetDigits);
  const [reqId, setReqId] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const session = useRef(0);

  const sendOtp = (number: string) => {
    const mine = ++session.current;
    setReqId('');
    setOtp('');
    setError('');
    if (!widgetId || !tokenAuth) {
      setError('OTP service is not configured in this build.');
      return;
    }
    if (!/^[6-9][0-9]{9}$/.test(number)) {
      setError('Enter a valid 10-digit mobile number first.');
      return;
    }
    setBusy(true);
    callMsg91('sendOtpMobile', { widgetId, tokenAuth, identifier: `91${number}` })
      .then((id) => {
        if (session.current !== mine) return;
        setReqId(id);
        setSecondsLeft(RESEND_SECONDS);
      })
      .catch((err) => session.current === mine && setError(err.message))
      .finally(() => session.current === mine && setBusy(false));
  };

  // A fresh start every time the popup opens; replies from an older session are ignored
  useEffect(() => {
    if (!props.visible) return;
    setDigits(presetDigits);
    if (props.askForNumber) {
      session.current++;
      setReqId('');
      setOtp('');
      setError('');
      setBusy(false);
      return;
    }
    sendOtp(presetDigits);
  }, [props.visible, presetDigits, props.askForNumber, widgetId, tokenAuth]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  if (!props.visible) return null;

  const handleVerify = async () => {
    if (!reqId || otp.length < 4 || busy) return;
    const mine = session.current;
    setBusy(true);
    setError('');
    try {
      const accessToken = await callMsg91('verifyOtp', { widgetId, tokenAuth, reqId, otp });
      if (session.current === mine) props.onCompletion?.({ success: true, message: accessToken, phone: digits });
    } catch (err: any) {
      if (session.current === mine) setError(err.message || 'Wrong OTP. Please try again.');
    } finally {
      if (session.current === mine) setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!reqId || secondsLeft > 0 || busy) return;
    const mine = session.current;
    setBusy(true);
    setError('');
    try {
      await callMsg91('retryOtp', { widgetId, tokenAuth, reqId, retryChannel: SMS_CHANNEL });
      if (session.current === mine) {
        setOtp('');
        setSecondsLeft(RESEND_SECONDS);
      }
    } catch (err: any) {
      if (session.current === mine) setError(err.message);
    } finally {
      if (session.current === mine) setBusy(false);
    }
  };

  const handleClose = () => {
    session.current++;
    setBusy(false);
    props.onClose?.();
  };

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>OTP Verification</Text>
          </View>
          <Text style={styles.title}>{props.title || 'Verify Phone Number'}</Text>
          <Text style={styles.desc}>
            {reqId
              ? `Enter the OTP sent to +91 ${digits}`
              : busy
                ? `Sending OTP to +91 ${digits}…`
                : props.askForNumber
                  ? 'Enter the new mobile number. We will send an OTP to it.'
                  : `Verifying +91 ${digits}`}
          </Text>

          {props.askForNumber && !reqId && (
            <>
              <View style={styles.numberRow}>
                <Text style={styles.numberPrefix}>+91</Text>
                <TextInput
                  style={styles.numberInput}
                  value={digits}
                  onChangeText={(v) => setDigits(v.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={Theme.colors.text.muted}
                  editable={!busy}
                  onSubmitEditing={() => sendOtp(digits)}
                />
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[styles.verifyButton, (digits.length !== 10 || busy) && styles.buttonDisabled]}
                onPress={() => sendOtp(digits)}
                disabled={digits.length !== 10 || busy}
                activeOpacity={0.8}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          )}

          {!(props.askForNumber && !reqId) && (
          <>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            placeholder="Enter OTP"
            placeholderTextColor={Theme.colors.text.muted}
            editable={!!reqId && !busy}
            onSubmitEditing={handleVerify}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.verifyButton, (!reqId || otp.length < 4 || busy) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={!reqId || otp.length < 4 || busy}
            activeOpacity={0.8}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify OTP & Continue</Text>}
          </TouchableOpacity>

          {!!reqId && (
            <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={secondsLeft > 0 || busy} activeOpacity={0.7}>
              <Text style={[styles.resendText, (secondsLeft > 0 || busy) && styles.resendTextMuted]}>
                {secondsLeft > 0 ? `Resend OTP in ${secondsLeft}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          )}
          {props.askForNumber && !!reqId && (
            <TouchableOpacity style={styles.resendBtn} onPress={() => { session.current++; setReqId(''); setOtp(''); setError(''); setBusy(false); }} activeOpacity={0.7}>
              <Text style={styles.resendText}>Change number</Text>
            </TouchableOpacity>
          )}
          </>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  numberRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.accent.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  numberPrefix: {
    fontSize: 17,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.deep,
    marginRight: 8,
  },
  numberInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
    letterSpacing: 1,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.deep,
  },
  otpInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: Theme.colors.accent.border,
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.deep,
    marginBottom: 12,
  },
  errorText: {
    color: Theme.colors.accent.error,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  verifyButton: {
    backgroundColor: Theme.colors.ink.primary,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resendBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  resendText: {
    color: Theme.colors.ink.primary,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 14,
  },
  resendTextMuted: {
    color: Theme.colors.text.muted,
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
