import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '../../components/Home/AppHeader';
import { Theme } from '../../constants/theme';

export default function TestPassScreen() {
  const [isNotified, setIsNotified] = useState(false);

  const handleNotifyPress = () => {
    setIsNotified(true);
    Alert.alert(
      'Test Pass Updates',
      "You will receive notification updates here when All India Test Passes are released."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Test Pass</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name="ticket-outline" size={32} color="#0B3B42" />
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>COMING SOON</Text>
          </View>

          <Text style={styles.heroTitle}>All India Test Pass</Text>

          <Text style={styles.heroDesc}>
            All India test passes will be released here in upcoming batches ahead
            of the examination season. Updates will be available soon.
          </Text>

          <TouchableOpacity
            style={[styles.notifyBtn, isNotified && styles.notifyBtnDone]}
            onPress={handleNotifyPress}
            activeOpacity={0.85}
          >
            <Feather
              name={isNotified ? 'check' : 'bell'}
              size={17}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.notifyBtnText}>
              {isNotified ? 'Subscribed to Updates' : 'Notify Me of Updates'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    marginTop: 10,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 14,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#92400E',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    color: '#0B1C30',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3C45',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
  },
  notifyBtnDone: {
    backgroundColor: '#059669',
  },
  notifyBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
});
