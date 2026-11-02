import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import type { RazorpayOrderResponse } from '../../api/payments';

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutModalProps {
  visible: boolean;
  order: RazorpayOrderResponse | null;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onError: (error: any) => void;
  onClose: () => void;
}

const FALLBACK_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';
const RazorpayWebView = WebView as any;

export function RazorpayCheckoutModal({
  visible,
  order,
  user,
  onSuccess,
  onError,
  onClose,
}: RazorpayCheckoutModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  const [webViewLoading, setWebViewLoading] = useState(true);

  if (!visible || !order || !order.orderId) {
    return null;
  }

  const keyId = order.keyId || FALLBACK_KEY_ID;
  const prefillName = user?.name || order.prefill?.name || '';
  const prefillEmail = user?.email || order.prefill?.email || '';
  const prefillPhone = user?.phone || order.prefill?.contact || '';
  const courseTitle = order.courseTitle || 'EduRain Course Enrollment';

  const checkoutHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>EduRain Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
    }
    .wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 24px;
      text-align: center;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #E2E8F0;
      border-top-color: #175A67;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      margin-top: 18px;
      font-size: 16px;
      font-weight: 700;
      color: #0F3C45;
    }
    .subtitle {
      margin-top: 6px;
      font-size: 13px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="spinner"></div>
    <div class="title">Securing Payment Gateway...</div>
    <div class="subtitle">Please wait while Razorpay loads your checkout.</div>
  </div>

  <script>
    function postBack(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    window.onload = function() {
      try {
        const options = {
          key: ${JSON.stringify(keyId)},
          amount: ${JSON.stringify(order.amount)},
          currency: ${JSON.stringify(order.currency || 'INR')},
          name: "EduRain",
          description: ${JSON.stringify(courseTitle)},
          order_id: ${JSON.stringify(order.orderId)},
          prefill: {
            name: ${JSON.stringify(prefillName)},
            email: ${JSON.stringify(prefillEmail)},
            contact: ${JSON.stringify(prefillPhone)}
          },
          theme: {
            color: "#175A67"
          },
          modal: {
            ondismiss: function() {
              postBack({ event: 'CANCELLED' });
            }
          },
          handler: function(response) {
            postBack({
              event: 'SUCCESS',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
          }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function(resp) {
          postBack({
            event: 'FAILED',
            error: resp.error || {}
          });
        });
        rzp.open();
      } catch (err) {
        postBack({
          event: 'ERROR',
          message: err.message || 'Failed to initialize Razorpay checkout'
        });
      }
    };
  </script>
</body>
</html>
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === 'SUCCESS') {
        onSuccess({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      } else if (data.event === 'CANCELLED') {
        onClose();
      } else if (data.event === 'FAILED') {
        onError(data.error?.description || data.error?.reason || 'Payment failed on Razorpay');
      } else if (data.event === 'ERROR') {
        onError(data.message || 'Payment window encountered an error');
      }
    } catch (parseErr) {
      console.warn('Could not parse WebView message', parseErr);
    }
  };

  const handleShouldStartLoadWithRequest = (request: { url: string }) => {
    const { url } = request;
    // Allow internal webview pages
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('about:blank') ||
      url.startsWith('data:')
    ) {
      return true;
    }

    // Intercept UPI intents and third party payment apps (GPay, PhonePe, Paytm, Cred, BHIM, etc.)
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url).catch(() => {});
        } else {
          Alert.alert(
            'UPI App Not Found',
            'No matching UPI app was found on your phone. Please pay via Cards or NetBanking.'
          );
        }
      })
      .catch(() => {});
    return false;
  };

  const handlePromptClose = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to cancel the checkout session?',
      [
        { text: 'No, Continue', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: onClose },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handlePromptClose}
    >
      <View style={[styles.modalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Top Header */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#0B7A55" />
              <Text style={styles.secureBadgeText}>100% SECURE CHECKOUT</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Razorpay Payment
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handlePromptClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* WebView Container */}
        <View style={styles.webViewWrap}>
          <RazorpayWebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{
              html: checkoutHtml,
              baseUrl: 'https://edurain.in',
            }}
            onMessage={handleMessage}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            scalesPageToFit={true}
            style={styles.webView}
          />

          {webViewLoading && (
            <View style={styles.overlayLoader}>
              <ActivityIndicator size="large" color="#175A67" />
              <Text style={styles.overlayLoaderText}>Loading payment gateway...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  secureBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0B7A55',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  webViewWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  overlayLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayLoaderText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#0F3C45',
  },
});

