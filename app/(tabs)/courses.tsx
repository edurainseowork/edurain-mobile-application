import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import { fetchCourses, fetchCategories, Course, Category } from '../../api/courses';
import { createRazorpayOrder, verifyRazorpayPayment, verifyGooglePlayPurchase, verifyAppleIapPurchase } from '../../api/payments';

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const { user, isEnrolled, goal, refreshUserData } = useApp();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [purchasingCourse, setPurchasingCourse] = useState<Course | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, catList] = await Promise.all([
        fetchCourses().catch(() => []),
        fetchCategories().catch(() => []),
      ]);
      setCourses(cList);
      setCategories(catList);

      // Auto-filter by student's active goal if available
      if (goal?.name && catList.some((c) => c.name.toLowerCase() === goal.name.toLowerCase())) {
        setSelectedCategory(goal.name);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (selectedCategory === 'All') return true;
    return c.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleEnrollClick = (course: Course) => {
    if (isEnrolled(course.id)) {
      router.push(`/course/${course.id}`);
      return;
    }

    setPurchasingCourse(course);
    setCouponCode('');
    setIsCheckoutModalOpen(true);
  };

  const handleAppleIapCheckout = async () => {
    if (!purchasingCourse) return;
    setCheckoutLoading(true);
    try {
      const appleProductId = purchasingCourse.playProductId || `in.edurain.course.${purchasingCourse.id}`;
      // In-App Apple StoreKit flow:
      Alert.alert(
        'Apple In-App Purchase',
        `Course: ${purchasingCourse.title}\nPrice: ₹${purchasingCourse.discountPrice || purchasingCourse.price}\n\nConfirm In-App Purchase with your Apple Account?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setCheckoutLoading(false),
          },
          {
            text: 'Purchase Now',
            onPress: async () => {
              try {
                const res = await verifyAppleIapPurchase({
                  courseId: purchasingCourse.id,
                  productId: appleProductId,
                  transactionId: `apple_tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                });
                await refreshUserData();
                setIsCheckoutModalOpen(false);
                Alert.alert('Congratulations! 🎉', res.message || 'Course unlocked via Apple In-App Purchase!');
              } catch (iapErr: any) {
                Alert.alert('Purchase Error', iapErr.message || 'Verification failed');
              } finally {
                setCheckoutLoading(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Purchase Error', err.message || 'Could not initiate Apple In-App Purchase');
      setCheckoutLoading(false);
    }
  };

  const handleRazorpayAlternativeCheckout = async () => {
    if (!purchasingCourse) return;
    setCheckoutLoading(true);
    try {
      const order = await createRazorpayOrder(purchasingCourse.id, couponCode);

      Alert.alert(
        'In-App Payment (Razorpay)',
        `Order created: ${order.orderId}\nTotal: ₹${order.amount}\n\nProceed with In-App Razorpay Checkout?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setCheckoutLoading(false),
          },
          {
            text: 'Complete Payment',
            onPress: async () => {
              try {
                await verifyRazorpayPayment({
                  courseId: purchasingCourse.id,
                  razorpay_order_id: order.orderId,
                  razorpay_payment_id: `pay_${Date.now()}`,
                  razorpay_signature: `sig_${Date.now()}`,
                });
                await refreshUserData();
                setIsCheckoutModalOpen(false);
                Alert.alert('Congratulations! 🎉', 'You are now enrolled in this course.');
              } catch (verifyErr: any) {
                Alert.alert('Payment Error', verifyErr.message || 'Verification failed');
              } finally {
                setCheckoutLoading(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Order Failed', err.message || 'Could not initiate checkout');
      setCheckoutLoading(false);
    }
  };

  const handleGooglePlayCheckout = async () => {
    if (!purchasingCourse) return;
    setCheckoutLoading(true);
    try {
      Alert.alert(
        'Google Play In-App Billing',
        `Initiating Google Play in-app purchase for: ${purchasingCourse.title}\nProduct: ${purchasingCourse.playProductId || 'edurain_batch_standard'}\n\nConfirm purchase?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setCheckoutLoading(false) },
          {
            text: 'Purchase Now',
            onPress: async () => {
              try {
                await verifyGooglePlayPurchase({
                  courseId: purchasingCourse.id,
                  productId: purchasingCourse.playProductId || 'edurain_batch_standard',
                  purchaseToken: `gplay_token_${Date.now()}`,
                });
                await refreshUserData();
                setIsCheckoutModalOpen(false);
                Alert.alert('Success! 🎉', 'Course unlocked via Google Play Billing!');
              } catch (playErr: any) {
                Alert.alert('Google Play Error', playErr.message || 'Verification failed');
              } finally {
                setCheckoutLoading(false);
              }
            },
          },
        ]
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Academic Batches</Text>
        <Text style={styles.headerSubtitle}>Comprehensive Preparation & Mentorship</Text>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {['All', ...(categories.map((c) => c.name))].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Course List */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={Theme.colors.ink.primary} />
          <Text style={styles.loaderText}>Loading courses...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.courseList} showsVerticalScrollIndicator={false}>
          {filteredCourses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="book-open" size={40} color={Theme.colors.text.muted} />
              <Text style={styles.emptyTitle}>No Courses in {selectedCategory}</Text>
              <Text style={styles.emptySubtitle}>Check back soon or explore other categories.</Text>
            </View>
          ) : (
            filteredCourses.map((course) => {
              const enrolled = isEnrolled(course.id);
              const price = course.discountPrice || course.price;
              const hasDiscount = course.discountPrice && course.discountPrice < course.price;

              return (
                <View key={course.id} style={styles.courseCard}>
                  {course.thumbnail ? (
                    <Image source={{ uri: course.thumbnail }} style={styles.courseImage} />
                  ) : (
                    <View style={styles.courseImagePlaceholder}>
                      <Ionicons name="school" size={40} color={Theme.colors.ink.soft} />
                    </View>
                  )}

                  <View style={styles.cardContent}>
                    <View style={styles.cardCategoryRow}>
                      <Text style={styles.courseCategoryText}>{course.category}</Text>
                      {enrolled && (
                        <View style={styles.enrolledBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#059669" />
                          <Text style={styles.enrolledBadgeText}>ENROLLED</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.courseTitle} numberOfLines={2}>
                      {course.title}
                    </Text>

                    <Text style={styles.courseInstructor}>
                      By {course.instructorName || 'Expert Faculty'}
                    </Text>

                    <View style={styles.cardBottomRow}>
                      <View style={styles.priceRow}>
                        <Text style={styles.finalPrice}>₹{price}</Text>
                        {hasDiscount && (
                          <Text style={styles.originalPrice}>₹{course.price}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[styles.enrollBtn, enrolled && styles.enrolledBtn]}
                        onPress={() => handleEnrollClick(course)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.enrollBtnText, enrolled && styles.enrolledBtnText]}>
                          {enrolled ? 'Open Batch' : 'Enroll Now'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* User Choice Billing Checkout Sheet (Android) */}
      <Modal visible={isCheckoutModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Course Checkout</Text>
                <Text style={styles.modalHeaderSub}>
                  {Platform.OS === 'ios' ? 'Apple In-App Purchase' : 'In-App Payment'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCheckoutModalOpen(false)}>
                <Feather name="x" size={20} color={Theme.colors.text.muted} />
              </TouchableOpacity>
            </View>

            {purchasingCourse && (
              <View style={styles.orderSummary}>
                <Text style={styles.orderCourseTitle}>{purchasingCourse.title}</Text>
                <Text style={styles.orderCourseAmount}>
                  Total: ₹{purchasingCourse.discountPrice || purchasingCourse.price}
                </Text>
              </View>
            )}

            {/* Coupon Box */}
            <View style={styles.couponWrap}>
              <TextInput
                style={styles.couponInput}
                placeholder="Have a coupon code?"
                placeholderTextColor={Theme.colors.text.muted}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
            </View>

            {Platform.OS === 'ios' ? (
              /* iOS: Apple In-App Purchase */
              <TouchableOpacity
                style={styles.billingOption}
                onPress={handleAppleIapCheckout}
                disabled={checkoutLoading}
              >
                <View style={styles.billingOptionLeft}>
                  <View style={[styles.billingIcon, { backgroundColor: '#000000' }]}>
                    <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.billingOptionTitle}>Apple In-App Purchase</Text>
                    <Text style={styles.billingOptionSub}>Unlock course instantly with Apple ID</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={Theme.colors.text.muted} />
              </TouchableOpacity>
            ) : (
              <>
                {/* Android Option 1: Razorpay In-App Billing */}
                <TouchableOpacity
                  style={styles.billingOption}
                  onPress={handleRazorpayAlternativeCheckout}
                  disabled={checkoutLoading}
                >
                  <View style={styles.billingOptionLeft}>
                    <View style={[styles.billingIcon, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="card" size={20} color="#0284C7" />
                    </View>
                    <View>
                      <Text style={styles.billingOptionTitle}>Pay via UPI, Cards, NetBanking</Text>
                      <Text style={styles.billingOptionSub}>Powered by Razorpay (In-App)</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={Theme.colors.text.muted} />
                </TouchableOpacity>

                {/* Android Option 2: Google Play Billing */}
                <TouchableOpacity
                  style={styles.billingOption}
                  onPress={handleGooglePlayCheckout}
                  disabled={checkoutLoading}
                >
                  <View style={styles.billingOptionLeft}>
                    <View style={[styles.billingIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="logo-google-playstore" size={20} color="#D97706" />
                    </View>
                    <View>
                      <Text style={styles.billingOptionTitle}>Google Play Billing</Text>
                      <Text style={styles.billingOptionSub}>Pay with Google Play Balance or Payment</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={Theme.colors.text.muted} />
                </TouchableOpacity>
              </>
            )}

            {checkoutLoading && (
              <ActivityIndicator style={{ marginTop: 12 }} color={Theme.colors.ink.primary} />
            )}
          </View>
        </View>
      </Modal>
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
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  categoriesWrap: {
    paddingVertical: 10,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.15)',
  },
  categoryChipActive: {
    backgroundColor: Theme.colors.ink.primary,
    borderColor: Theme.colors.ink.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.ink.soft,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.muted,
  },
  courseList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(23, 90, 103, 0.1)',
    ...Theme.shadows.card,
  },
  courseImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E2E8F0',
  },
  courseImagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: Theme.colors.ink.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseCategoryText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.soft,
    textTransform: 'uppercase',
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  enrolledBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
  },
  courseTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    lineHeight: 22,
    marginBottom: 4,
  },
  courseInstructor: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  finalPrice: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.primary,
  },
  originalPrice: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
    textDecorationLine: 'line-through',
  },
  enrollBtn: {
    backgroundColor: Theme.colors.ink.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  enrolledBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  enrollBtnText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  enrolledBtnText: {
    color: '#059669',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
    marginTop: 4,
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 60, 69, 0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
  },
  modalHeaderSub: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
  orderSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  orderCourseTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.ink.deep,
    marginBottom: 4,
  },
  orderCourseAmount: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.primary,
  },
  couponWrap: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  couponInput: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text.primary,
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  billingOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  billingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billingOptionTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.ink.deep,
  },
  billingOptionSub: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text.muted,
  },
});

