import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Dynamic bottom padding: respects 3-button navigation, gesture indicator, or full-screen immersive
  const bottomInset = insets.bottom;
  const bottomPadding = bottomInset > 0 ? bottomInset : 8;
  const tabHeight = 58 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0B3B42',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(23, 90, 103, 0.1)',
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontFamily: Theme.fonts.medium,
          fontSize: 11,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Batches',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
