import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { Theme } from '../../constants/theme';

interface AppHeaderProps {
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  unreadCount?: number;
}

export function AppHeader({
  onSearchPress,
  onNotificationsPress,
  onProfilePress,
  unreadCount = 1,
}: AppHeaderProps) {
  const { user } = useApp();

  const initials = (user?.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      {/* Brand: Crest Logo + EduRain */}
      <TouchableOpacity
        style={styles.brandWrap}
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/home')}
      >
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>EduRain</Text>
      </TouchableOpacity>

      {/* Right Actions: Search + Bell + Avatar */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onSearchPress || (() => router.push('/(tabs)/courses'))}
          activeOpacity={0.7}
        >
          <Feather name="search" size={20} color={Theme.colors.ink.deep} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onNotificationsPress}
          activeOpacity={0.7}
        >
          <Feather name="bell" size={20} color={Theme.colors.ink.deep} />
          {unreadCount > 0 && <View style={styles.greenDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={onProfilePress || (() => router.push('/(tabs)/profile'))}
          activeOpacity={0.8}
        >
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0F4F2',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brandName: {
    fontSize: 21,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  greenDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#F0F4F2',
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
});
