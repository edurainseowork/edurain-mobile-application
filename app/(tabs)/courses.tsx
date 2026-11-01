import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TextInput,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import {
  fetchCourses,
  fetchCategories,
  fetchBanners,
  Course,
  Category,
  Banner,
  getDisplayPlans,
  paiseToRupees,
  DisplayPlan,
} from '../../api/courses';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyGooglePlayPurchase,
  verifyAppleIapPurchase,
} from '../../api/payments';
import { AppHeader } from '../../components/Home/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const { isEnrolled, goal, refreshUserData } = useApp();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Checkout & Plan selection state
  const [purchasingCourse, setPurchasingCourse] = useState<Course | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<DisplayPlan | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [cList, catList, bList] = await Promise.all([
        fetchCourses(isRefresh),
        fetchCategories(),
        fetchBanners('mobile_courses'),
      ]);

      if (Array.isArray(cList)) setCourses(cList);
      if (Array.isArray(catList) && catList.length > 0) setCategories(catList);

      if (Array.isArray(bList) && bList.length > 0) {
        setBanners(bList);
      } else {
        const homeBanners = await fetchBanners('home');
        if (Array.isArray(homeBanners) && homeBanners.length > 0) setBanners(homeBanners);
      }
    } catch {
      // Silently maintain local cached data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    setLoading(true);
    loadData(false);
  }, [loadData]);

  const onRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // Dynamic search and category filtering
  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return courses.filter((c) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'All' ||
        (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase()) ||
        String(c.categoryId) === selectedCategory;

      if (!matchesCategory) return false;

      // Keyword query filter
      if (!q) return true;

      const titleMatch = (c.title || '').toLowerCase().includes(q);
      const descMatch = (c.description || '').toLowerCase().includes(q);
      const catMatch = (c.category || '').toLowerCase().includes(q);
      const instructorMatch = (c.instructorName || '').toLowerCase().includes(q);
      const mentorsMatch =
        Array.isArray(c.mentors) &&
        c.mentors.some((m) => (m?.name || '').toLowerCase().includes(q));

      return titleMatch || descMatch || catMatch || instructorMatch || mentorsMatch;
    });
  }, [courses, selectedCategory, searchQuery]);

  const handleOpenCourse = (course: Course) => {
    router.push(`/course/${course.id}`);
  };

  const handleEnrollClick = (course: Course) => {
    if (isEnrolled(course.id)) {
      handleOpenCourse(course);
      return;
    }

    const availablePlans = getDisplayPlans(course);
    setSelectedPlan(availablePlans[0]);
    setPurchasingCourse(course);
    setCouponCode('');
    setIsCheckoutModalOpen(true);
  };

  const handleAppleIapCheckout = async () => {
    if (!purchasingCourse || !selectedPlan) return;
    setCheckoutLoading(true);
    try {
      const appleProductId =
        purchasingCourse.playProductId ||
        `in.edurain.course.${purchasingCourse.id}${selectedPlan.id !== 'basic' ? `.${selectedPlan.id}` : ''}`;

      Alert.alert(
        'Apple In-App Purchase',
        `Course: ${purchasingCourse.title}\nPlan: ${selectedPlan.name}\nPrice: ₹${selectedPlan.price}\n\nConfirm In-App Purchase with your Apple Account?`,
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
    if (!purchasingCourse || !selectedPlan) return;
    setCheckoutLoading(true);
    try {
      const order = await createRazorpayOrder(purchasingCourse.id, couponCode);

      Alert.alert(
        'In-App Payment (Razorpay)',
        `Order ID: ${order.orderId}\nPlan: ${selectedPlan.name}\nAmount: ₹${selectedPlan.price}\n\nProceed with Razorpay Checkout?`,
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
                Alert.alert('Congratulations! 🎉', 'You are now enrolled in this batch.');
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
    if (!purchasingCourse || !selectedPlan) return;
    setCheckoutLoading(true);
    try {
      Alert.alert(
        'Google Play In-App Billing',
        `Initiating Google Play in-app purchase for: ${purchasingCourse.title}\nPlan: ${selectedPlan.name}\nPrice: ₹${selectedPlan.price}\n\nConfirm purchase?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setCheckoutLoading(false),
          },
          {
            text: 'Confirm Google Play',
            onPress: async () => {
              try {
                const res = await verifyGooglePlayPurchase({
                  courseId: purchasingCourse.id,
                  purchaseToken: `token_${Date.now()}_play`,
                  productId: purchasingCourse.playProductId || 'edurain_batch_standard',
                });
                await refreshUserData();
                setIsCheckoutModalOpen(false);
                Alert.alert('Congratulations! 🎉', res.message || 'Course unlocked via Google Play Billing!');
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
      {/* Top Header - No Search Icon */}
      <AppHeader />

      {/* Back Button with Search Bar Row */}
      <View style={styles.searchHeaderRow}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home');
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={19} color="#0B3B42" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Feather name="search" size={17} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search batches, courses, subjects..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.clearBtn}
            >
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 85 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Theme.colors.ink.primary]}
          />
        }
      >
        {/* Title: Academic Batches & Crash Courses */}
        <View style={styles.titleWrap}>
          <Text style={styles.screenTitle}>Academic Batches & Crash Courses</Text>
        </View>

        {/* Category Filter Pills (matching Screenshot 2) */}
        <View style={styles.categoriesWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {/* All Courses Tab */}
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === 'All' && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory('All')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === 'All' && styles.categoryChipTextActive,
                ]}
              >
                All Courses ({courses.length})
              </Text>
            </TouchableOpacity>

            {/* Dynamic CMS Categories */}
            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Mobile Banners Carousel in 1.8:1 Ratio (matching CMS dimensions) */}
        {banners.length > 0 && (
          <View style={styles.bannerContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                setActiveBannerIndex(idx);
              }}
              scrollEventThrottle={16}
            >
              {banners.map((b) => (
                <View key={b.id} style={styles.bannerCard}>
                  <Image
                    source={{ uri: b.imageUrl }}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
            {banners.length > 1 && (
              <View style={styles.dotsRow}>
                {banners.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, activeBannerIndex === i && styles.activeDot]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Dynamic Course Cards List */}
        {loading && courses.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#0B3B42" />
            <Text style={styles.loaderText}>Syncing latest batches...</Text>
          </View>
        ) : filteredCourses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="search" size={28} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No batches match your search' : `No courses in ${selectedCategory}`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try checking for typos or searching by mentor or subject.'
                : 'Batches for this category will appear here as soon as they are published.'}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                <Text style={styles.clearFilterBtnText}>Clear Search & Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.courseCardsContainer}>
            {filteredCourses.map((course) => {
              const plans = getDisplayPlans(course);
              const hasMultiplePlans = plans.length > 1;
              const planNamesStr = plans.map((p) => p.name).join(', ');

              const priceInRupees = paiseToRupees(course.price);
              const mrpInRupees = Math.max(
                priceInRupees,
                paiseToRupees(course.originalPrice ?? course.price)
              );
              const discount =
                mrpInRupees > priceInRupees
                  ? Math.round((1 - priceInRupees / mrpInRupees) * 100)
                  : 0;
              const enrolled = isEnrolled(course.id);

              const mentorNames =
                (course.mentors ?? []).map((m) => m?.name).filter(Boolean).join(', ') ||
                course.instructorName;

              const tag =
                course.duration ||
                (course.totalLessons ? `${course.totalLessons} lessons` : String(course.id));

              return (
                <TouchableOpacity
                  key={course.id}
                  style={styles.courseCard}
                  activeOpacity={0.92}
                  onPress={() => handleOpenCourse(course)}
                >
                  {/* Card Thumbnail / Header */}
                  <View style={styles.thumbnailContainer}>
                    {course.thumbnail ? (
                      <Image
                        source={{ uri: course.thumbnail }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Ionicons name="school" size={42} color="#0F3C45" />
                        <Text style={styles.placeholderCourseName} numberOfLines={1}>
                          {course.title}
                        </Text>
                      </View>
                    )}

                    {/* Multiple Plans Badge (Matching Screenshot 2 & Web) */}
                    {hasMultiplePlans && (
                      <View style={styles.multiplePlansBadge}>
                        <Feather name="star" size={12} color="#FBBF24" />
                        <Text style={styles.multiplePlansText}>
                          Multiple plans inside:{' '}
                          <Text style={styles.multiplePlansBold}>{planNamesStr}</Text>
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    {/* Row 1: Category Tag (Orange) + Right Tag Badge */}
                    <View style={styles.cardCategoryRow}>
                      <Text style={styles.categoryOrangeText}>
                        {course.category || 'ACADEMIC BATCH'}
                      </Text>
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{tag}</Text>
                      </View>
                    </View>

                    {/* Row 2: Course Title */}
                    <Text style={styles.courseTitleText} numberOfLines={2}>
                      {course.title}
                    </Text>

                    {/* Row 3: Mentors / Teachers Line */}
                    <View style={styles.mentorRow}>
                      <Feather name="book-open" size={13} color="#64748B" />
                      <Text style={styles.mentorText} numberOfLines={1}>
                        {mentorNames ? `By ${mentorNames}` : 'Comprehensive batch access'}
                      </Text>
                    </View>

                    {/* Row 4: Status Dot + Enrolments Open */}
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: discount > 0 ? '#F59E0B' : '#10B981' },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {priceInRupees === 0
                          ? 'Free Course • Enrolments open'
                          : discount > 0
                          ? `${discount}% OFF • Enrolments open`
                          : 'Enrolments open'}
                      </Text>
                    </View>

                    {/* Row 5: Price & Action Buttons */}
                    <View style={styles.priceActionRow}>
                      <View style={styles.priceColumn}>
                        <Text style={styles.priceMainText}>
                          {priceInRupees === 0 ? 'Free' : `₹${priceInRupees.toLocaleString('en-IN')}`}
                        </Text>
                        {mrpInRupees > priceInRupees && (
                          <View style={styles.mrpRow}>
                            <Text style={styles.mrpText}>
                              ₹{mrpInRupees.toLocaleString('en-IN')}
                            </Text>
                            {discount > 0 && (
                              <Text style={styles.discountBadgeText}>{discount}% OFF</Text>
                            )}
                          </View>
                        )}
                      </View>

                      <View style={styles.actionButtonsWrap}>
                        {enrolled ? (
                          <TouchableOpacity
                            style={styles.enrolledBtn}
                            onPress={() => handleOpenCourse(course)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#047857" />
                            <Text style={styles.enrolledBtnText}>Enrolled</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.buyNowBtn}
                            onPress={() => handleEnrollClick(course)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.buyNowBtnText}>
                              {priceInRupees === 0 ? 'Enroll Free' : 'Buy Now'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.chevronBtn}
                          onPress={() => handleOpenCourse(course)}
                          activeOpacity={0.7}
                        >
                          <Feather name="chevron-right" size={17} color="#0B1C30" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Row 6: Offer Banner at Bottom (Matching Screenshot 2) */}
                    {mrpInRupees > priceInRupees && priceInRupees > 0 && (
                      <View style={styles.offerBannerWrap}>
                        <View style={styles.offerTag}>
                          <Text style={styles.offerTagText}>Offer</Text>
                        </View>
                        <Text style={styles.offerBannerText}>
                          Save ₹{(mrpInRupees - priceInRupees).toLocaleString('en-IN')} on this batch
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Plan Selection & Checkout Sheet Modal */}
      <Modal visible={isCheckoutModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Select Plan & Checkout</Text>
                <Text style={styles.modalHeaderSub}>
                  {Platform.OS === 'ios' ? 'Apple In-App Purchase' : 'Official Course Checkout'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCheckoutModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {purchasingCourse && (
              <View style={styles.orderSummary}>
                <Text style={styles.orderCourseTitle}>{purchasingCourse.title}</Text>
                <Text style={styles.orderCourseCat}>{purchasingCourse.category}</Text>
              </View>
            )}

            {/* Selectable Plans (Basic, Pro, Pro Max) */}
            {purchasingCourse && getDisplayPlans(purchasingCourse).length > 1 && (
              <View style={styles.planSelectionContainer}>
                <Text style={styles.planSelectHeader}>Choose Academic Tier</Text>
                <View style={styles.plansRow}>
                  {getDisplayPlans(purchasingCourse).map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[styles.planCard, isSelected && styles.planCardActive]}
                        onPress={() => setSelectedPlan(plan)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.planCardName, isSelected && styles.planCardNameActive]}>
                          {plan.name}
                        </Text>
                        <Text style={[styles.planCardPrice, isSelected && styles.planCardPriceActive]}>
                          ₹{plan.price.toLocaleString('en-IN')}
                        </Text>
                        {plan.features.length > 0 && (
                          <Text style={styles.planFeaturesCount} numberOfLines={1}>
                            {plan.features.length} inclusions
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Selected Plan Details */}
            {selectedPlan && (
              <View style={styles.selectedPlanSummary}>
                <Text style={styles.summaryPlanTitle}>
                  {selectedPlan.name} Plan: ₹{selectedPlan.price.toLocaleString('en-IN')}
                </Text>
                {selectedPlan.features.length > 0 && (
                  <View style={styles.featuresList}>
                    {selectedPlan.features.slice(0, 3).map((f, i) => (
                      <View key={i} style={styles.featureBullet}>
                        <Feather name="check" size={13} color="#059669" />
                        <Text style={styles.featureBulletText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Coupon Code Input */}
            <View style={styles.couponWrap}>
              <TextInput
                style={styles.couponInput}
                placeholder="Apply coupon code..."
                placeholderTextColor="#94A3B8"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
            </View>

            {/* Payment Options */}
            {Platform.OS === 'ios' ? (
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
                <Feather name="chevron-right" size={18} color="#64748B" />
              </TouchableOpacity>
            ) : (
              <>
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
                      <Text style={styles.billingOptionSub}>Instant Access • In-App Razorpay</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color="#64748B" />
                </TouchableOpacity>

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
                      <Text style={styles.billingOptionSub}>Pay with Google Play Balance</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color="#64748B" />
                </TouchableOpacity>
              </>
            )}

            {checkoutLoading && (
              <ActivityIndicator style={{ marginTop: 14 }} color="#0B3B42" size="small" />
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
    backgroundColor: '#F0F4F2',
  },
  searchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBar: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#0F3C45',
    height: '100%',
  },
  clearBtn: {
    padding: 2,
  },
  scrollContent: {
    paddingTop: 6,
  },
  titleWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  screenTitle: {
    fontSize: 18.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
  },
  categoriesWrap: {
    paddingVertical: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#0B1C20',
    borderColor: '#0B1C20',
  },
  categoryChipText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
    color: '#0B1C30',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  bannerCard: {
    width: SCREEN_WIDTH - 32,
    height: Math.round((SCREEN_WIDTH - 32) / 1.8),
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F3C45',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    backgroundColor: '#0F3C45',
    width: 16,
  },
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  clearFilterBtn: {
    marginTop: 16,
    backgroundColor: '#0B1C20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  clearFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
  },
  courseCardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
    marginTop: 6,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F3C45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 384 / 240,
    position: 'relative',
    backgroundColor: '#FFF6EA',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E6F0EE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderCourseName: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    textAlign: 'center',
  },
  multiplePlansBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  multiplePlansText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: Theme.fonts.regular,
  },
  multiplePlansBold: {
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  cardBody: {
    padding: 16,
  },
  cardCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryOrangeText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#E8590C',
    textTransform: 'uppercase',
  },
  tagBadge: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  tagBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
    color: '#475569',
  },
  courseTitleText: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    lineHeight: 23,
    marginTop: 2,
    marginBottom: 6,
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  mentorText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  priceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceColumn: {
    justifyContent: 'center',
  },
  priceMainText: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
  },
  mrpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  mrpText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
  },
  actionButtonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrolledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  enrolledBtnText: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#047857',
  },
  buyNowBtn: {
    backgroundColor: '#0B1C20',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  buyNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  offerBannerWrap: {
    marginTop: 12,
    backgroundColor: '#FFF1E6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerTag: {
    backgroundColor: '#F97316',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  offerTagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
  },
  offerBannerText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.semiBold,
    color: '#0B1C30',
    flex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 60, 69, 0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
  },
  modalHeaderSub: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  orderSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderCourseTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
  },
  orderCourseCat: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
    color: '#E8590C',
    marginTop: 2,
  },
  planSelectionContainer: {
    marginBottom: 12,
  },
  planSelectHeader: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  plansRow: {
    flexDirection: 'row',
    gap: 8,
  },
  planCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  planCardActive: {
    borderColor: '#0B1C20',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
  },
  planCardName: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: '#64748B',
  },
  planCardNameActive: {
    color: '#0B1C20',
    fontFamily: Theme.fonts.bold,
  },
  planCardPrice: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginTop: 2,
  },
  planCardPriceActive: {
    color: '#0B1C20',
  },
  planFeaturesCount: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  selectedPlanSummary: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  summaryPlanTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginBottom: 4,
  },
  featuresList: {
    gap: 4,
  },
  featureBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureBulletText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: Theme.fonts.regular,
  },
  couponWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  couponInput: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#0F3C45',
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  billingOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  billingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billingOptionTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
  },
  billingOptionSub: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
});
