import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const NOTIFICATIONS_KEY = '@echolingua_notifications';
const USER_STORAGE_KEY = '@echolingua_current_user';

export default function NotificationScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      loadCurrentUser();
    }, [])
  );

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        const user = JSON.parse(userData);
        const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (notifData) {
          const allNotifications = JSON.parse(notifData);
          // Filter notifications for current user
          const userNotifications = allNotifications.filter(n => n.recipientId === user.id);
          // Sort by timestamp (newest first)
          userNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setNotifications(userNotifications);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (notifData) {
        const allNotifications = JSON.parse(notifData);
        const updated = allNotifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
        loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'follow') {
      // Navigate to the follower's profile
      navigation.navigate('UserProfile', { 
        userId: notification.senderId, 
        userName: notification.senderName 
      });
    } else if (notification.type === 'story') {
      // Navigate to the story
      navigation.navigate('Story', { story: notification.storyData });
    } else if (notification.type === 'comment') {
      // Navigate to the story with comments
      navigation.navigate('Story', { story: notification.storyData });
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
              if (notifData) {
                const allNotifications = JSON.parse(notifData);
                // Remove notifications for current user
                const filtered = allNotifications.filter(n => n.recipientId !== currentUser.id);
                await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
                setNotifications([]);
              }
            } catch (error) {
              console.error('Failed to clear notifications:', error);
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow':
        return 'person-add';
      case 'story':
        return 'book';
      case 'comment':
        return 'chatbubble';
      case 'like':
        return 'heart';
      default:
        return 'notifications';
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        { backgroundColor: item.read ? theme.surface : theme.primary + '15', borderColor: theme.border }
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name={getNotificationIcon(item.type)} size={24} color={theme.primary} />
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.notificationMessage, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
          {getTimeSince(item.timestamp)}
        </Text>
      </View>

      {!item.read && (
        <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
      )}
    </TouchableOpacity>
  );

  const getTimeSince = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <Text style={[styles.clearButton, { color: theme.primary }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Notifications</Text>
          <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
            You'll see notifications here when someone follows you or interacts with your content
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.s,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: SPACING.m,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: SPACING.m,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.m,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: SPACING.s,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
