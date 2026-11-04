import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';
import {
  fetchCourseById,
  fetchCourseFaqs,
  fetchSupportContacts,
  fetchPublicCoupons,
  validateCoupon,
  fetchCourseContent,
  getDisplayPlans,
  DisplayPlan,
  paiseToRupees,
  discountPct,
  formatINR,
  Course,
  CourseFaq,
  SupportContact,
  PublicCoupon,
  AppliedCouponResult,
  ContentItem,
} from '../../api/courses';
import { createRazorpayOrder, verifyRazorpayPayment, type RazorpayOrderResponse } from '../../api/payments';
import { RazorpayCheckoutModal } from '../../components/Shared/RazorpayCheckoutModal';

type TabId = 'description' | 'syllabus';

const PLAN_CONFIG: Record<
  'basic' | 'pro' | 'proMax',
  { tag: string; tagBg: string; tagColor: string; suffix: string }
> = {
  basic: {
    tag: 'Essential Prep',
    tagBg: '#EAF3F1',
    tagColor: '#175A67',
    suffix: 'Full Validity',
  },
  pro: {
    tag: 'Best Value for Rankers',
    tagBg: '#E0F2FE',
    tagColor: '#0284C7',
    suffix: 'Recommended',
  },
  proMax: {
    tag: 'Complete Package',
    tagBg: '#FEF3C7',
    tagColor: '#B45309',
    suffix: 'All-inclusive',
  },
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isEnrolled, selectActiveCourse, activeCourse, refreshUserData, user } = useApp();

  const rawId = Array.isArray(id) ? id[0] : id;
  const initialCourseId = useMemo(() => {
    if (!rawId) return 0;
    const direct = Number(rawId);
    if (!Number.isNaN(direct) && direct > 0) return direct;
    const trailingMatch = String(rawId).match(/-?(\d+)$/);
    if (trailingMatch) return Number(trailingMatch[1]);
    return 0;
  }, [rawId]);

  // Main State
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('description');

  const courseId = course?.id || initialCourseId;
  const enrolled = courseId ? isEnrolled(courseId) : false;
  const isActive = activeCourse?.id === courseId;

  // Dynamic Plans State (Basic, Pro, Pro Max from CMS)
  const [selectedPlanId, setSelectedPlanId] = useState<'basic' | 'pro' | 'proMax'>('basic');

  // Dynamic CMS Data
  const [faqs, setFaqs] = useState<CourseFaq[]>([]);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const [isIncludesOpen, setIsIncludesOpen] = useState(true);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [publicCoupons, setPublicCoupons] = useState<PublicCoupon[]>([]);

  // Enrollment / Checkout State
  const [enrolling, setEnrolling] = useState(false);
  const [activeRazorpayOrder, setActiveRazorpayOrder] = useState<RazorpayOrderResponse | null>(null);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  // Scroll Ref for jumping between sections
  const scrollRef = useRef<any>(null);
  const syllabusYRef = useRef<number>(0);
  const plansYRef = useRef<number>(0);

  // Screen recording & screenshot protection for DRM
  useEffect(() => {
    if (Platform.OS === 'android') {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
      return () => {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      };
    }
  }, []);

  // Fetch course details and dynamic CMS data
  useEffect(() => {
    if (!rawId) return;
    setLoading(true);

    fetchCourseById(rawId)
      .then((c) => {
        if (c) {
          setCourse(c);
          return Promise.all([
            fetchCourseFaqs(c.id).catch(() => []),
            fetchSupportContacts().catch(() => []),
            fetchPublicCoupons(c.id).catch(() => []),
            fetchCourseContent(c.id).catch(() => []),
          ]).then(([f, s, coupons, items]) => {
            if (Array.isArray(f)) {
              setFaqs(f);
              if (f.length > 0) setOpenFaqId(f[0].id);
            }
            if (Array.isArray(s)) setSupportContacts(s);
            if (Array.isArray(coupons)) setPublicCoupons(coupons);
            if (Array.isArray(items)) setContentItems(items);
          });
        }
      })
      .catch((err) => {
        Alert.alert('Error', err?.message || 'Failed to load course details');
      })
      .finally(() => setLoading(false));
  }, [rawId]);

  // Display Plans from CMS
  const displayPlans = useMemo(() => {
    if (!course) return [];
    return getDisplayPlans(course);
  }, [course]);

  // If course has multiple plans in CMS and student is not enrolled yet -> show comparison plans
  const showPlans = displayPlans.length > 1 && !enrolled;

  // Set default / recommended plan (Pro if available, else first plan)
  useEffect(() => {
    if (displayPlans.length > 1) {
      const rec = displayPlans.some((p) => p.id === 'pro') ? 'pro' : displayPlans[0].id;
      setSelectedPlanId(rec);
    } else if (displayPlans.length === 1) {
      setSelectedPlanId(displayPlans[0].id);
    }
  }, [displayPlans]);

  const selectedPlan = useMemo(() => {
    return displayPlans.find((p) => p.id === selectedPlanId) || displayPlans[0] || null;
  }, [displayPlans, selectedPlanId]);

  // Pricing calculations
  const basePriceRupees = useMemo(() => {
    if (selectedPlan) return selectedPlan.price;
    if (!course) return 0;
    return paiseToRupees(course.price);
  }, [selectedPlan, course]);

  const mrpRupees = useMemo(() => {
    if (selectedPlan) return selectedPlan.mrp;
    if (!course) return 0;
    const orig = paiseToRupees(course.originalPrice ?? course.price);
    return Math.max(orig, basePriceRupees);
  }, [selectedPlan, course, basePriceRupees]);

  const finalPriceRupees = useMemo(() => {
    if (appliedCoupon) {
      return paiseToRupees(appliedCoupon.finalPrice);
    }
    return basePriceRupees;
  }, [appliedCoupon, basePriceRupees]);

  const discountPercentage = useMemo(() => {
    return discountPct(finalPriceRupees, mrpRupees);
  }, [finalPriceRupees, mrpRupees]);

  const netSavingsRupees = useMemo(() => {
    return Math.max(0, mrpRupees - finalPriceRupees);
  }, [mrpRupees, finalPriceRupees]);

  // Re-validate coupon when selected plan changes
  useEffect(() => {
    if (!appliedCoupon?.code || !courseId) return;
    validateCoupon(appliedCoupon.code, courseId, selectedPlanId)
      .then((res) => setAppliedCoupon(res))
      .catch(() => setAppliedCoupon(null));
  }, [selectedPlanId, courseId]);

  // Primary support contact (fallback to Rohit if CMS has none)
  const primaryContact = useMemo(() => {
    if (supportContacts.length > 0) {
      return supportContacts[0];
    }
    return {
      id: 1,
      label: 'rohit',
      phone: '99999 77778',
    };
  }, [supportContacts]);

  // Apply Coupon Handler
  const handleApplyCoupon = async () => {
    const clean = couponCode.trim().toUpperCase();
    if (!clean) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(clean, courseId, selectedPlanId);
      setAppliedCoupon(res);
      Alert.alert('Coupon Applied! 🎉', `You saved ${formatINR(paiseToRupees(res.discountAmount))}`);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Enrollment / Checkout Flow (Android / iOS Razorpay Alternative Checkout)
  const handleEnrollment = async () => {
    if (!course) return;
    setEnrolling(true);
    try {
      const order = await createRazorpayOrder(
        course.id,
        appliedCoupon ? appliedCoupon.code : undefined,
        selectedPlanId
      );

      // If course is 100% free or discounted to 0
      if (order.free) {
        await refreshUserData();
        Alert.alert('Congratulations! 🎉', `You have been enrolled in "${course.title}".`);
        return;
      }

      if (!order.orderId) {
        throw new Error('Payment gateway order could not be created. Please try again.');
      }

      // Launch official Razorpay Checkout in-app modal
      setActiveRazorpayOrder(order);
      setIsRazorpayModalOpen(true);
    } catch (err: any) {
      Alert.alert('Checkout Error', err.message || 'Could not initiate enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRazorpaySuccess = async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setIsRazorpayModalOpen(false);
    setActiveRazorpayOrder(null);
    setEnrolling(true);
    try {
      if (!course) return;
      await verifyRazorpayPayment({
        courseId: course.id,
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      });

      await refreshUserData();
      Alert.alert(
        'Payment Successful! 🎉',
        `Welcome to "${course.title}". Your batch is now fully unlocked.`
      );
    } catch (verifyErr: any) {
      Alert.alert(
        'Verification Notice',
        verifyErr.message ||
          'Payment has been received. If your batch is not unlocked immediately, please pull to refresh.'
      );
    } finally {
      setEnrolling(false);
    }
  };

  const handleRazorpayError = (errMsg: string) => {
    setIsRazorpayModalOpen(false);
    setActiveRazorpayOrder(null);
    Alert.alert(
      'Payment Incomplete',
      typeof errMsg === 'string' ? errMsg : 'Payment could not be completed.'
    );
  };

  const handleRazorpayClose = () => {
    setIsRazorpayModalOpen(false);
    setActiveRazorpayOrder(null);
  };

  // Switch Active Course on Home
  const handleSetAsActiveCourse = async () => {
    if (!course) return;
    try {
      await selectActiveCourse(course.id);
      Alert.alert('Success', `"${course.title}" is now your active study batch on Home!`);
    } catch {
      Alert.alert('Error', 'Failed to update active batch.');
    }
  };

  // Call Counselor Phone
  const handleCallSupport = () => {
    const raw = primaryContact.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${raw}`).catch(() => {
      Alert.alert('Call Failed', `Please dial ${primaryContact.phone} directly.`);
    });
  };

  // Jump to Syllabus
  const handleViewSyllabus = () => {
    setActiveTab('syllabus');
    if (syllabusYRef.current > 0) {
      scrollRef.current?.scrollTo({ y: syllabusYRef.current - 40, animated: true });
    }
  };

  // Jump to Plans
  const handleScrollToPlans = () => {
    if (plansYRef.current > 0) {
      scrollRef.current?.scrollTo({ y: plansYRef.current - 40, animated: true });
    }
  };

  // Dynamic Course Includes features (Matching Screenshot 2 & CMS metrics).
  // Above the early returns below: hooks must run on every render, in the same order
  const courseIncludesItems = useMemo(() => {
    if (!course) return [];
    const items: { icon: any; text: string }[] = [];

    const mentorNames =
      (course.mentors ?? []).map((m) => m?.name).filter(Boolean).join(', ') ||
      course.instructorName;
    if (mentorNames) {
      items.push({ icon: 'school-outline', text: `By ${mentorNames}` });
    }

    if (course.duration) {
      items.push({ icon: 'time-outline', text: course.duration });
    }

    if (course.totalLessons) {
      items.push({
        icon: 'videocam-outline',
        text: `${course.totalLessons} ${course.totalLessons === 1 ? 'lesson' : 'lessons'}`,
      });
    }

    if (course.studentsEnrolled) {
      items.push({
        icon: 'people-outline',
        text: `${course.studentsEnrolled.toLocaleString('en-IN')}+ students enrolled`,
      });
    }

    // Additional plan features from CMS
    if (selectedPlan?.features && selectedPlan.features.length > 0) {
      selectedPlan.features.forEach((feat) => {
        items.push({ icon: 'checkmark-circle-outline', text: feat });
      });
    } else if (course.plans?.basic?.features && course.plans.basic.features.length > 0) {
      course.plans.basic.features.forEach((feat) => {
        items.push({ icon: 'checkmark-circle-outline', text: feat });
      });
    } else if (!items.length) {
      items.push({ icon: 'book-outline', text: 'Full course access after enrolment' });
    }

    return items;
  }, [course, selectedPlan]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.ink.primary} />
        <Text style={styles.loadingText}>Loading course curriculum...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Course not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
      {/* 1. Top White Navigation Header with Breadcrumbs */}
      <View style={styles.breadcrumbHeader}>
        <TouchableOpacity
          style={styles.backActionRow}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={16} color="#175A67" />
          <Text style={styles.allCoursesLink}>All Courses</Text>
        </TouchableOpacity>
        <Text style={styles.breadcrumbSlash}>/</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/home')}>
          <Text style={styles.breadcrumbMuted}>Home</Text>
        </TouchableOpacity>
        <Feather name="chevron-right" size={13} color="#94A3B8" />
        <Text style={styles.breadcrumbCategory} numberOfLines={1}>
          {course.category}
        </Text>
        <Feather name="chevron-right" size={13} color="#94A3B8" />
        <Text style={styles.breadcrumbCourseTitle} numberOfLines={1}>
          {course.title}
        </Text>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: enrolled ? insets.bottom + 40 : insets.bottom + 105 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Dark Teal Hero Banner (#0F3C45) */}
        <View style={styles.heroBanner}>
          <View style={styles.heroDecoTop} />
          <View style={styles.heroDecoBottom} />

          <View style={styles.heroContent}>
            {/* Category / Star Badge */}
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroStarPill}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={styles.heroStarText}>{course.category || 'NEET'}</Text>
              </View>
            </View>

            {/* Course Title */}
            <Text style={styles.heroTitle}>{course.title}</Text>

            {/* Dynamic Metrics Badges Row (Category, Duration, Lessons, Enrolled) - Matching Screenshot 2 */}
            <View style={styles.heroMetricsBadgesRow}>
              <View style={styles.heroCategoryPill}>
                <Ionicons name="book-outline" size={13} color="#FFFFFF" />
                <Text style={styles.heroCategoryText}>Category: {course.category}</Text>
              </View>

              {course.duration ? (
                <View style={styles.heroCategoryPill}>
                  <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.heroCategoryText}>Duration: {course.duration}</Text>
                </View>
              ) : null}

              {course.totalLessons ? (
                <View style={styles.heroCategoryPill}>
                  <Ionicons name="videocam-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.heroCategoryText}>Lessons: {course.totalLessons}</Text>
                </View>
              ) : null}

              {course.studentsEnrolled ? (
                <View style={styles.heroCategoryPill}>
                  <Ionicons name="people-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.heroCategoryText}>
                    Enrolled: {course.studentsEnrolled.toLocaleString('en-IN')}+
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Sub-Tabs: Description & All Classes & Syllabus */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'description' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('description');
                handleScrollToPlans();
              }}
            >
              <Feather
                name="file-text"
                size={14}
                color={activeTab === 'description' ? '#0F3C45' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'description' && styles.tabButtonTextActive,
                ]}
              >
                Description
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'syllabus' && styles.tabButtonActive]}
              onPress={handleViewSyllabus}
            >
              <Feather
                name="book-open"
                size={14}
                color={activeTab === 'syllabus' ? '#0F3C45' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'syllabus' && styles.tabButtonTextActive,
                ]}
              >
                All Classes & Syllabus
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Main Body Container with Soft Sage Green Tint (#DCEAE3) */}
        <View style={styles.bodyWrapper}>
          {/* COMPARISON PLANS: Shown only when multiple plans exist in CMS and unenrolled */}
          {showPlans ? (
            <View
              style={styles.plansSection}
              onLayout={(e) => {
                plansYRef.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.sectionSubtitle}>ENROLLMENT PATHWAYS</Text>
              <Text style={styles.sectionMainTitle}>Choose a Plan tailored for your preparation</Text>

              <View style={styles.plansList}>
                {displayPlans.map((plan, idx) => {
                  const isSelected = plan.id === selectedPlanId;
                  const isPopular = plan.id === 'pro';
                  const cfg = PLAN_CONFIG[plan.id] || PLAN_CONFIG.basic;
                  const discount = discountPct(plan.price, plan.mrp);
                  const previousPlanName = idx > 0 ? displayPlans[idx - 1].name : null;

                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected,
                        isPopular && styles.planCardPopularSpacing,
                      ]}
                      onPress={() => setSelectedPlanId(plan.id)}
                      activeOpacity={0.88}
                    >
                      {/* MOST POPULAR badge above top border if popular */}
                      {isPopular && (
                        <View style={styles.mostPopularBadge}>
                          <Text style={styles.mostPopularBadgeText}>MOST POPULAR</Text>
                        </View>
                      )}

                      {/* Top row: Plan Tag and Radio Circle */}
                      <View style={styles.planCardHeader}>
                        <View style={[styles.planTag, { backgroundColor: cfg.tagBg }]}>
                          <Text style={[styles.planTagText, { color: cfg.tagColor }]}>
                            {cfg.tag}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.planRadioCircle,
                            isSelected && styles.planRadioCircleActive,
                          ]}
                        >
                          {isSelected && <View style={styles.planRadioInner} />}
                        </View>
                      </View>

                      {/* Plan Name & Star if popular */}
                      <View style={styles.planTitleRow}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        {isPopular && <Ionicons name="star" size={16} color="#175A67" />}
                      </View>

                      {/* Price & MRP */}
                      <View style={styles.planPriceRow}>
                        <Text style={styles.planPriceText}>
                          {plan.price === 0 ? 'Free' : formatINR(plan.price)}
                        </Text>
                        {plan.mrp > plan.price && (
                          <Text style={styles.planMrpText}>{formatINR(plan.mrp)}</Text>
                        )}
                      </View>

                      {/* Discount & Suffix */}
                      <Text
                        style={[
                          styles.planSuffixText,
                          plan.id === 'basic' && { color: '#DC2626' },
                        ]}
                      >
                        {discount > 0 ? `${discount}% OFF • ` : ''}
                        {cfg.suffix}
                      </Text>

                      {/* Features Divider & List */}
                      <View style={styles.planFeaturesContainer}>
                        {previousPlanName && (
                          <View style={styles.planFeatureItem}>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={15}
                              color="#175A67"
                              style={{ marginTop: 1 }}
                            />
                            <Text style={styles.planFeatureTextStrong}>
                              Everything in {previousPlanName}, plus:
                            </Text>
                          </View>
                        )}
                        {plan.features.map((feat, fIdx) => (
                          <View key={fIdx} style={styles.planFeatureItem}>
                            <Feather name="shield" size={14} color="#175A67" style={{ marginTop: 2 }} />
                            <Text style={styles.planFeatureText}>{feat}</Text>
                          </View>
                        ))}
                        {plan.features.length === 0 && plan.id === 'basic' && (
                          <>
                            <View style={styles.planFeatureItem}>
                              <Feather name="shield" size={14} color="#175A67" style={{ marginTop: 2 }} />
                              <Text style={styles.planFeatureText}>Full course access after enrolment</Text>
                            </View>
                            <View style={styles.planFeatureItem}>
                              <Feather name="shield" size={14} color="#175A67" style={{ marginTop: 2 }} />
                              <Text style={styles.planFeatureText}>Interactive classes with faculty</Text>
                            </View>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* DEFAULT SINGLE PLAN: Course Includes (Collapsible Accordion) */
            <View style={styles.cardSection}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setIsIncludesOpen(!isIncludesOpen)}
                activeOpacity={0.8}
              >
                <View style={styles.includesTitleWithBadge}>
                  <Text style={styles.cardHeaderTitle}>Course Includes</Text>
                  {enrolled && (
                    <View style={styles.enrolledSmallTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#0B7A55" />
                      <Text style={styles.enrolledSmallTagText}>ENROLLED</Text>
                    </View>
                  )}
                </View>
                <Feather
                  name={isIncludesOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {isIncludesOpen && (
                <View style={styles.includesContent}>
                  {courseIncludesItems.map((item, idx) => (
                    <View key={idx} style={styles.includesRow}>
                      <Ionicons name={item.icon} size={16} color="#175A67" style={{ marginTop: 2 }} />
                      <Text style={styles.includesText}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Card: Live Classes (Lock icon if unenrolled, active status if enrolled) */}
          <View style={styles.cardSection}>
            <View style={styles.liveClassesCard}>
              <View
                style={[
                  styles.liveIconBox,
                  { backgroundColor: enrolled ? '#E6F4EA' : '#EAF3F1' },
                ]}
              >
                <Ionicons
                  name={enrolled ? 'radio' : 'lock-closed'}
                  size={20}
                  color={enrolled ? '#0B7A55' : '#175A67'}
                />
              </View>

              <View style={styles.liveTextBox}>
                <View style={styles.liveTitleRow}>
                  <Text style={styles.liveTitle}>Live Classes</Text>
                  {enrolled && (
                    <View style={styles.liveBadgeGreen}>
                      <Text style={styles.liveBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.liveSubtitle}>
                  {enrolled
                    ? 'Live classes run on Google Meet. You will receive links & notifications before every live session.'
                    : 'Live classes run on Google Meet. Enroll in this course to get the joining link and a notification for every class.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Card: About this course */}
          {course.description ? (
            <View style={styles.cardSection}>
              <Text style={styles.cardHeaderTitle}>About this course</Text>
              <Text style={styles.descriptionText}>{course.description}</Text>
            </View>
          ) : null}

          {/* Card: Your Mentors (if present) */}
          {course.mentors && course.mentors.length > 0 && (
            <View style={styles.cardSection}>
              <Text style={styles.cardHeaderTitle}>Your Mentors</Text>
              <View style={styles.mentorsGrid}>
                {course.mentors.map((mentor, index) => (
                  <View key={index} style={styles.mentorItem}>
                    {mentor.photo ? (
                      <Image source={{ uri: mentor.photo }} style={styles.mentorAvatar} />
                    ) : (
                      <View style={styles.mentorAvatarFallback}>
                        <Text style={styles.mentorInitial}>
                          {mentor.name?.charAt(0)?.toUpperCase() || 'M'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.mentorInfo}>
                      <Text style={styles.mentorName} numberOfLines={1}>
                        {mentor.name}
                      </Text>
                      {mentor.experience ? (
                        <Text style={styles.mentorExp} numberOfLines={1}>
                          {mentor.experience}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 4. Pricing & Summary Box */}
          <View style={styles.pricingCard}>
            {/* Optional Thumbnail Poster at top of card */}
            {course.thumbnail ? (
              <Image
                source={{ uri: course.thumbnail }}
                style={styles.pricingPosterImage}
                resizeMode="cover"
              />
            ) : null}

            {/* Aspirants Tag & Duration */}
            <View style={styles.aspirantRow}>
              <View style={styles.aspirantLeft}>
                <Ionicons name="disc-outline" size={16} color="#64748B" />
                <Text style={styles.aspirantText}>For {course.category} aspirants</Text>
              </View>
              {course.duration ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{course.duration}</Text>
                </View>
              ) : null}
            </View>

            {/* Special Offer Price Block */}
            <View style={styles.priceContainer}>
              <Text style={styles.specialOfferLabel}>
                {showPlans
                  ? `SPECIAL OFFER PRICE (${selectedPlan?.name || 'Basic'}${selectedPlan?.id === 'pro' ? ' • Recommended' : ''})`
                  : 'SPECIAL OFFER PRICE'}
              </Text>
              <View style={styles.priceNumberRow}>
                <Text style={styles.mainPriceText}>
                  {finalPriceRupees === 0 ? 'Free' : formatINR(finalPriceRupees)}
                </Text>
                {mrpRupees > finalPriceRupees && (
                  <Text style={styles.mrpText}>{formatINR(mrpRupees)}</Text>
                )}
                {discountPercentage > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{discountPercentage}% OFF</Text>
                  </View>
                )}
              </View>

              {appliedCoupon && (
                <View style={styles.couponSavingsRow}>
                  <Text style={styles.couponSavingsLabel}>Coupon ({appliedCoupon.code}):</Text>
                  <Text style={styles.couponSavingsValue}>
                    - {formatINR(paiseToRupees(appliedCoupon.discountAmount))}
                  </Text>
                </View>
              )}

              {netSavingsRupees > 0 && (
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Instant Net Savings:</Text>
                  <Text style={styles.savingsValue}>SAVE {formatINR(netSavingsRupees)}</Text>
                </View>
              )}
            </View>

            {/* Apply Coupon Box (Unenrolled only) */}
            {!enrolled && (
              <View style={styles.couponSection}>
                {appliedCoupon ? (
                  <View style={styles.couponAppliedCard}>
                    <View style={styles.couponAppliedLeft}>
                      <Ionicons name="pricetag" size={16} color="#0B7A55" />
                      <View>
                        <Text style={styles.couponAppliedCode}>{appliedCoupon.code} applied</Text>
                        <Text style={styles.couponAppliedSave}>
                          You save {formatINR(paiseToRupees(appliedCoupon.discountAmount))}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleRemoveCoupon}>
                      <Text style={styles.couponRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.couponInputWrapper}>
                    <View style={styles.applyCouponTitleRow}>
                      <MaterialCommunityIcons name="ticket-percent-outline" size={16} color="#175A67" />
                      <Text style={styles.applyCouponTitle}>Apply coupon</Text>
                    </View>
                    <View style={styles.couponInputRow}>
                      <TextInput
                        style={styles.couponTextInput}
                        placeholder="ENTER COUPON CODE"
                        placeholderTextColor="#94A3B8"
                        value={couponCode}
                        onChangeText={(txt) => setCouponCode(txt.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={20}
                      />
                      <TouchableOpacity
                        style={[
                          styles.couponApplyBtn,
                          (!couponCode.trim() || couponLoading) && styles.couponApplyBtnDisabled,
                        ]}
                        onPress={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                      >
                        {couponLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.couponApplyBtnText}>Apply</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}
                  </View>
                )}
              </View>
            )}

            {/* Primary Action Button inside summary card */}
            {enrolled ? (
              <View style={styles.enrolledActionContainer}>
                <TouchableOpacity
                  style={styles.enrolledButton}
                  onPress={() => router.push('/(tabs)/courses')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.enrolledButtonText}>Enrolled — Go to My Courses</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activeBatchBtn, isActive && styles.activeBatchBtnCurrent]}
                  onPress={handleSetAsActiveCourse}
                  disabled={isActive}
                >
                  <Ionicons
                    name={isActive ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={isActive ? '#0B7A55' : '#175A67'}
                  />
                  <Text style={[styles.activeBatchText, isActive && styles.activeBatchTextCurrent]}>
                    {isActive ? 'Current Active Batch on Home' : 'Set as Active Batch'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.enrollNowButton}
                onPress={handleEnrollment}
                disabled={enrolling}
                activeOpacity={0.88}
              >
                {enrolling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.enrollNowButtonText}>
                      {finalPriceRupees === 0
                        ? 'ENROLL FOR FREE'
                        : `ENROLL IN ${(selectedPlan?.name || 'BASIC').toUpperCase()}`}
                    </Text>
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* View Course Syllabus Outline Button */}
            <TouchableOpacity
              style={styles.viewSyllabusBtn}
              onPress={handleViewSyllabus}
              activeOpacity={0.8}
            >
              <Feather name="tv" size={15} color="#175A67" />
              <Text style={styles.viewSyllabusBtnText}>View Course Syllabus</Text>
            </TouchableOpacity>

            {/* 4 Feature Checklist Items with Icons */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Feather name="shield" size={15} color="#175A67" />
                <Text style={styles.featureItemText}>Interactive classes</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="headphones" size={15} color="#175A67" />
                <Text style={styles.featureItemText}>Live Doubt Solving</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="bar-chart-2" size={15} color="#175A67" />
                <Text style={styles.featureItemText}>AI Powered</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="smartphone" size={15} color="#175A67" />
                <Text style={styles.featureItemText}>Access on Web, Android, iOS</Text>
              </View>
            </View>

            {/* Counselor Call Widget */}
            <View style={styles.counselorWidget}>
              <View style={styles.counselorLeft}>
                <View style={styles.counselorSubRow}>
                  <Feather name="phone-call" size={14} color="#175A67" />
                  <Text style={styles.counselorSubtext}>Need guidance before joining?</Text>
                </View>
                <Text style={styles.counselorPhone}>{primaryContact.phone}</Text>
                <Text style={styles.counselorName}>{primaryContact.label}</Text>
              </View>

              <TouchableOpacity
                style={styles.counselorCallBtn}
                onPress={handleCallSupport}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="phone" size={16} color="#175A67" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. Subjects & Syllabus Directory Section */}
          <View
            style={styles.syllabusSection}
            onLayout={(e) => {
              syllabusYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionSubtitle}>CURRICULUM FRAMEWORK</Text>
            <Text style={styles.sectionMainTitle}>Subjects & Syllabus Directory</Text>

            {contentItems.length === 0 ? (
              <View style={styles.emptyLessonsCard}>
                <Text style={styles.emptyLessonsTitle}>Lessons are being added</Text>
                <Text style={styles.emptyLessonsSubtitle}>
                  Your teachers are uploading this course's content. Check back soon.
                </Text>
              </View>
            ) : (
              <View style={styles.lessonsCard}>
                {contentItems.map((item, idx) => (
                  <View key={item.id || idx} style={styles.lessonItemRow}>
                    <View style={styles.lessonItemLeft}>
                      <Feather
                        name={item.type === 'video' ? 'play-circle' : 'file-text'}
                        size={18}
                        color="#175A67"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lessonItemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {item.duration && (
                          <Text style={styles.lessonItemDuration}>{item.duration}</Text>
                        )}
                      </View>
                    </View>

                    {item.mediaUrl && (enrolled || idx === 0) ? (
                      <TouchableOpacity
                        style={styles.watchLessonBtn}
                        onPress={() => {
                          if (item.mediaUrl) {
                            Linking.openURL(item.mediaUrl).catch(() => {
                              Alert.alert('Notice', 'Cannot open lesson link');
                            });
                          }
                        }}
                      >
                        <Text style={styles.watchLessonText}>Open</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 6. Frequently Asked Questions (Accordion) */}
          {faqs.length > 0 && (
            <View style={styles.faqsSection}>
              <Text style={styles.sectionSubtitle}>HAVE QUESTIONS?</Text>
              <Text style={styles.sectionMainTitle}>Frequently Asked Questions</Text>

              <View style={styles.faqsWrapper}>
                {faqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <View key={faq.id} style={styles.faqCard}>
                      <TouchableOpacity
                        style={styles.faqHeader}
                        onPress={() => setOpenFaqId(isOpen ? null : faq.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.faqHeaderLeft}>
                          <Feather name="help-circle" size={16} color="#175A67" style={{ marginTop: 2 }} />
                          <Text style={styles.faqQuestionText}>{faq.question}</Text>
                        </View>
                        <Feather
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={styles.faqAnswerContainer}>
                          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* 7. Persistent Sticky Bottom "BUY NOW" Bar (Screenshot 2) */}
      {!enrolled && (
        <View
          style={[
            styles.stickyBottomBar,
            { paddingBottom: Math.max(insets.bottom + 8, 14) },
          ]}
        >
          <View style={styles.stickyPriceCol}>
            <View style={styles.stickyPriceRow}>
              <Text style={styles.stickyMainPrice}>
                {finalPriceRupees === 0 ? 'Free' : formatINR(finalPriceRupees)}
              </Text>
              {mrpRupees > finalPriceRupees && (
                <Text style={styles.stickyMrpText}>{formatINR(mrpRupees)}</Text>
              )}
            </View>
            {discountPercentage > 0 && (
              <View style={styles.stickyDiscountBadge}>
                <MaterialCommunityIcons name="tag-outline" size={12} color="#0B7A55" />
                <Text style={styles.stickyDiscountText}>{discountPercentage}% OFF</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.stickyBuyButton}
            onPress={handleEnrollment}
            disabled={enrolling}
            activeOpacity={0.88}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.stickyBuyButtonText}>BUY NOW</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {/* 8. Official Razorpay In-App Checkout Modal */}
      <RazorpayCheckoutModal
        visible={isRazorpayModalOpen}
        order={activeRazorpayOrder}
        user={user}
        onSuccess={handleRazorpaySuccess}
        onError={handleRazorpayError}
        onClose={handleRazorpayClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DCEAE3',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: '#0F3C45',
  },
  errorText: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: '#0F3C45',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },

  // 1. Breadcrumb Header
  breadcrumbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allCoursesLink: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },
  breadcrumbSlash: {
    marginHorizontal: 6,
    color: '#CBD5E1',
    fontSize: 12,
  },
  breadcrumbMuted: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  breadcrumbCategory: {
    maxWidth: 90,
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  breadcrumbCourseTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },

  scrollContent: {
    backgroundColor: '#DCEAE3',
  },

  // 2. Dark Teal Hero Banner
  heroBanner: {
    backgroundColor: '#0F3C45',
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecoTop: {
    position: 'absolute',
    top: -20,
    right: 20,
    width: 140,
    height: 90,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroDecoBottom: {
    position: 'absolute',
    bottom: 20,
    right: -10,
    width: 120,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroStarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroStarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: Theme.fonts.bold,
    lineHeight: 32,
    marginBottom: 10,
  },
  heroMetricsBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  heroCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },

  // Tabs Row
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#0F3C45',
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F3C45',
    fontFamily: Theme.fonts.bold,
  },

  // 3. Main Body Container
  bodyWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Theme.shadows.subtle,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  includesTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrolledSmallTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  enrolledSmallTagText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0B7A55',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  includesContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  includesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  includesText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#334155',
    lineHeight: 18,
  },

  // COMPARISON PLANS (Screenshot 1)
  plansSection: {
    gap: 8,
  },
  plansList: {
    gap: 16,
    marginTop: 6,
  },
  planCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Theme.shadows.card,
  },
  planCardPopularSpacing: {
    marginTop: 10,
  },
  planCardSelected: {
    borderColor: '#175A67',
    shadowColor: '#175A67',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  mostPopularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#0F3C45',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 10,
    elevation: 3,
  },
  mostPopularBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Theme.fonts.bold,
    letterSpacing: 0.8,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planTagText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
  },
  planRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  planRadioCircleActive: {
    borderColor: '#175A67',
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#175A67',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  planName: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 6,
  },
  planPriceText: {
    fontSize: 24,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  planMrpText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  planSuffixText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
    marginTop: 2,
  },
  planFeaturesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  planFeatureText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
    lineHeight: 18,
  },
  planFeatureTextStrong: {
    flex: 1,
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    lineHeight: 18,
  },

  // Live Classes Card
  liveClassesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  liveIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  liveTextBox: {
    flex: 1,
  },
  liveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  liveBadgeGreen: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0B7A55',
  },
  liveSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },

  // Description
  descriptionText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
    lineHeight: 20,
  },

  // Mentors
  mentorsGrid: {
    marginTop: 12,
    gap: 10,
  },
  mentorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  mentorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  mentorAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentorInitial: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  mentorExp: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginTop: 2,
  },

  // 4. Pricing & Checkout Card
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Theme.shadows.card,
  },
  pricingPosterImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 14,
  },
  aspirantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aspirantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aspirantText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  durationBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },

  // Price box
  priceContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  specialOfferLabel: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  priceNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  mainPriceText: {
    fontSize: 28,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  mrpText: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#DC2626',
  },
  couponSavingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  couponSavingsLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  couponSavingsValue: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B7A55',
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  savingsLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  savingsValue: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B7A55',
  },

  // Coupons
  couponSection: {
    marginBottom: 14,
  },
  couponInputWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  applyCouponTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  applyCouponTitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponTextInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  couponApplyBtn: {
    backgroundColor: '#78959C',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponApplyBtnDisabled: {
    opacity: 0.6,
  },
  couponApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
  },
  couponErrorText: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#DC2626',
  },
  couponAppliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
  },
  couponAppliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponAppliedCode: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#166534',
  },
  couponAppliedSave: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#15803D',
  },
  couponRemoveText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#DC2626',
  },

  // CTA Buttons
  enrollNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    height: 48,
    marginBottom: 10,
    ...Theme.shadows.subtle,
  },
  enrollNowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    letterSpacing: 0.5,
  },
  enrolledActionContainer: {
    gap: 10,
    marginBottom: 10,
  },
  enrolledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B7A55',
    borderRadius: 12,
    height: 48,
    ...Theme.shadows.subtle,
  },
  enrolledButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
  },
  activeBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  activeBatchBtnCurrent: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  activeBatchText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },
  activeBatchTextCurrent: {
    color: '#0B7A55',
  },
  viewSyllabusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  viewSyllabusBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
  },

  // Features List
  featuresList: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureItemText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
  },

  // Counselor Widget
  counselorWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counselorLeft: {
    flex: 1,
  },
  counselorSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counselorSubtext: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  counselorPhone: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  counselorName: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  counselorCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF3F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 5. Syllabus Directory Section
  syllabusSection: {
    marginTop: 10,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#175A67',
    letterSpacing: 0.8,
  },
  sectionMainTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginTop: 2,
    marginBottom: 12,
  },
  emptyLessonsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Theme.shadows.subtle,
  },
  emptyLessonsTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  emptyLessonsSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  lessonsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  lessonItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lessonItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  lessonItemTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#0F172A',
  },
  lessonItemDuration: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
  watchLessonBtn: {
    backgroundColor: '#175A67',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  watchLessonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
  },

  // 6. FAQs Section
  faqsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  faqsWrapper: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  faqHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginRight: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    lineHeight: 18,
  },
  faqAnswerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  faqAnswerText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
    lineHeight: 18,
  },

  // 7. Persistent Sticky Bottom "BUY NOW" Bar (Screenshot 2)
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  stickyPriceCol: {
    justifyContent: 'center',
  },
  stickyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stickyMainPrice: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#5046E5', // Brand purple / indigo matching Screenshot 2
  },
  stickyMrpText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  stickyDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  stickyDiscountText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0B7A55',
  },
  stickyBuyButton: {
    backgroundColor: '#5046E5', // Brand Purple matching Screenshot 2
    borderRadius: 12,
    paddingHorizontal: 32,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.subtle,
  },
  stickyBuyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    letterSpacing: 0.6,
  },
});
