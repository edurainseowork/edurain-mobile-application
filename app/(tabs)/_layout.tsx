import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0B3B42',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(23, 90, 103, 0.1)',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontFamily: Theme.fonts.medium,
          fontSize: 11,
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
        name="daily-drop"
        options={{
          title: 'Daily Drop',
          tabBarIcon: ({ color, size }) => <Feather name="zap" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="test-pass"
        options={{
          title: 'Test Pass',
          tabBarIcon: ({ color, size }) => <Feather name="check-circle" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
