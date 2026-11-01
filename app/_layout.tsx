import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider } from '../context/AppContext';
import { Theme } from '../constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'CormorantGaramond-Bold': CormorantGaramond_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Theme.colors.paper.light },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="my-purchases" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="doubt" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="mentorship" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ai-tutor" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="test-series" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="bookmarks" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ebooks" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="class-material" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="live-classes" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="course/[id]" options={{ presentation: 'card' }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
