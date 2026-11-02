import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';

/**
 * Core Shimmer Hook
 * Adheres strictly to UI/UX Engineering Manual:
 * - Ambient Loop: 1350ms (within 1200ms - 2000ms psychophysics threshold)
 * - GPU Compositor only: Animates 'opacity' via useNativeDriver: true (0ms layout reflow)
 */
export function useSkeletonShimmer() {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1350,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.85, 0.35],
  });

  return opacity;
}

/**
 * 1. Base Skeleton Block
 */
export function SkeletonBox({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const opacity = useSkeletonShimmer();

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * 2. Skeleton Text Line
 */
export function SkeletonText({
  width = '80%',
  height = 14,
  style,
}: {
  width?: number | string;
  height?: number | string;
  style?: ViewStyle;
}) {
  return (
    <SkeletonBox
      width={width}
      height={height}
      borderRadius={height ? Number(height) / 2 : 7}
      style={style}
    />
  );
}

/**
 * 3. Course Card Skeleton (Matching 384x286 Aspect Ratio & Golden Spacing)
 */
export function CourseCardSkeleton({ style }: { style?: ViewStyle }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={[styles.courseCardContainer, isTablet && styles.tabletCard, style]}>
      {/* Thumbnail Aspect 384 / 286 */}
      <SkeletonBox
        width="100%"
        height={210}
        borderRadius={18}
        style={styles.thumbnailBox}
      />
      {/* Content Meta */}
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <SkeletonText width="30%" height={12} />
          <SkeletonText width="20%" height={12} />
        </View>
        <SkeletonText width="85%" height={16} style={{ marginTop: 8 }} />
        <SkeletonText width="55%" height={12} style={{ marginTop: 6 }} />

        {/* Pricing & CTA */}
        <View style={[styles.rowBetween, { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
          <SkeletonBox width={70} height={20} borderRadius={6} />
          <SkeletonBox width={100} height={36} borderRadius={18} />
        </View>
      </View>
    </View>
  );
}

/**
 * 4. Test Series Card Skeleton (Matching test-series.tsx)
 */
export function TestCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.testCardContainer, style]}>
      <View style={styles.rowBetween}>
        <SkeletonBox width={120} height={18} borderRadius={6} />
        <SkeletonBox width={65} height={18} borderRadius={9} />
      </View>
      <SkeletonText width="70%" height={17} style={{ marginTop: 10 }} />
      <SkeletonText width="40%" height={12} style={{ marginTop: 6 }} />

      {/* 3-Column Info Row */}
      <View style={styles.testMetaRow}>
        <View style={styles.metaCol}>
          <SkeletonText width={40} height={10} />
          <SkeletonText width={30} height={13} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.metaCol}>
          <SkeletonText width={40} height={10} />
          <SkeletonText width={30} height={13} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.metaCol}>
          <SkeletonText width={40} height={10} />
          <SkeletonText width={30} height={13} style={{ marginTop: 4 }} />
        </View>
      </View>

      <SkeletonBox width="100%" height={42} borderRadius={12} style={{ marginTop: 12 }} />
    </View>
  );
}

/**
 * 5. Doubt Ticket Card Skeleton (Matching doubt.tsx)
 */
export function DoubtTicketCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.doubtCardContainer, style]}>
      <View style={styles.rowBetween}>
        <View style={styles.rowGap6}>
          <SkeletonBox width={60} height={18} borderRadius={6} />
          <SkeletonBox width={80} height={14} borderRadius={4} />
        </View>
        <SkeletonBox width={65} height={18} borderRadius={8} />
      </View>

      <SkeletonText width="85%" height={16} style={{ marginTop: 10 }} />
      <SkeletonText width="95%" height={13} style={{ marginTop: 6 }} />
      <SkeletonText width="70%" height={13} style={{ marginTop: 4 }} />

      <View style={[styles.rowBetween, { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
        <SkeletonText width={120} height={11} />
        <SkeletonBox width={75} height={20} borderRadius={6} />
      </View>
    </View>
  );
}

/**
 * 6. Live Class / Notification Card Skeleton (Matching notifications.tsx)
 */
export function NotificationCardSkeleton({ isLive = false, style }: { isLive?: boolean; style?: ViewStyle }) {
  return (
    <View style={[styles.notificationCard, isLive ? styles.liveCardDark : styles.scheduledCardLight, style]}>
      <View style={styles.notifHeaderRow}>
        <SkeletonBox width={44} height={44} borderRadius={12} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonText width="40%" height={10} />
          <SkeletonText width="85%" height={15} style={{ marginTop: 6 }} />
          <SkeletonText width="50%" height={12} style={{ marginTop: 5 }} />
        </View>
        <SkeletonBox width={60} height={20} borderRadius={6} />
      </View>
      <View style={{ marginTop: 12 }}>
        <SkeletonText width="60%" height={12} />
      </View>
      <SkeletonBox width="100%" height={38} borderRadius={10} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap6: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardBody: {
    padding: 16,
  },

  /* Course Card */
  courseCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tabletCard: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  thumbnailBox: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  /* Test Card */
  testCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  testMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  metaCol: {
    alignItems: 'center',
  },

  /* Doubt Card */
  doubtCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },

  /* Notification Card */
  notificationCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  scheduledCardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveCardDark: {
    backgroundColor: '#0F172A',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

