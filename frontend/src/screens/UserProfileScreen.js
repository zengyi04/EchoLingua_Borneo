import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const USER_STORAGE_KEY = '@echolingua_current_user';
const USERS_DATABASE_KEY = '@echolingua_users_database';

export default function UserProfileScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { userId, userName } = route.params || {};
  const [userStories, setUserStories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewedUser, setViewedUser] = useState(null);
  const [userStats, setUserStats] = useState({
    storiesCount: 0,
    followers: 156,
    following: 89,
    totalLikes: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      // Load current user
      const currentUserData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (currentUserData) {
        const parsedCurrentUser = JSON.parse(currentUserData);
        setCurrentUser(parsedCurrentUser);
        
        // If viewing another user's profile
        if (userId && userId !== parsedCurrentUser.id) {
          const usersData = await AsyncStorage.getItem(USERS_DATABASE_KEY);
          if (usersData) {
            const users = JSON.parse(usersData);
            const foundUser = users.find(u => u.id === userId);
            if (foundUser) {
              const { password, ...userWithoutPassword } = foundUser;
              setViewedUser(userWithoutPassword);
            }
          }
        } else {
          // Viewing own profile
          setViewedUser(parsedCurrentUser);
        }
      }
      
      // Load all stories and filter by user
      const storedStories = await AsyncStorage.getItem('communityStories');
      if (storedStories) {
        const allStories = JSON.parse(storedStories);
        const targetUserId = userId || currentUser?.id;
        const filtered = allStories.filter(
          (story) => story.userId === targetUserId || story.author === userName
        );
        setUserStories(filtered);

        // Calculate stats
        const totalLikes = filtered.reduce((sum, story) => sum + story.likes, 0);
        setUserStats({
          ...userStats,
          storiesCount: filtered.length,
          totalLikes,
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    setUserStats({
      ...userStats,
      followers: userStats.followers + (isFollowing ? -1 : 1),
    });
  };

  const renderStoryItem = ({ item }) => (
    <TouchableOpacity style={[styles.storyItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.storyItemContent}>
        <Text style={[styles.storyItemTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.storyItemDescription, { color: theme.text }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.storyItemMeta}>
          <Text style={[styles.storyItemMetaText, { color: theme.textSecondary }]}>
            {item.language} • {item.category}
          </Text>
          <View style={styles.storyItemStats}>
            <Ionicons name="heart" size={14} color="#FF4458" />
            <Text style={[styles.storyItemStatsText, { color: theme.textSecondary }]}>{item.likes}</Text>
            <Ionicons name="chatbubble" size={14} color={theme.textSecondary} style={{ marginLeft: 8 }} />
            <Text style={[styles.storyItemStatsText, { color: theme.textSecondary }]}>{item.comments}</Text>
          </View>
        </View>
      </View>
      {item.audioUri && (
        <Ionicons name="musical-notes" size={24} color={theme.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.surfaceVariant, borderBottomColor: theme.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '33' }]}>
            <Text style={styles.avatarEmoji}>{viewedUser?.avatar || '👤'}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>{viewedUser?.fullName || userName || 'Anonymous User'}</Text>
          
          {/* Role Badge */}
          {viewedUser?.role && (
            <View style={[styles.roleBadge, styles[`roleBadge${viewedUser.role.charAt(0).toUpperCase() + viewedUser.role.slice(1)}`]]}>
              <Ionicons 
                name={viewedUser.role === 'elder' ? 'people' : viewedUser.role === 'admin' ? 'shield-checkmark' : 'school'} 
                size={14} 
                color={theme.surface} 
              />
              <Text style={[styles.roleBadgeText, { color: theme.surface }]}>{viewedUser.role.toUpperCase()}</Text>
            </View>
          )}
          
          {/* User Info */}
          {viewedUser && (
            <View style={styles.userInfoContainer}>
              {viewedUser.email && (
                <View style={styles.userInfoRow}>
                  <Ionicons name="mail" size={16} color={theme.textSecondary} />
                  <Text style={[styles.userInfoText, { color: theme.text }]}>{viewedUser.email}</Text>
                </View>
              )}
              {viewedUser.community && (
                <View style={styles.userInfoRow}>
                  <Ionicons name="location" size={16} color={theme.textSecondary} />
                  <Text style={[styles.userInfoText, { color: theme.text }]}>{viewedUser.community}</Text>
                </View>
              )}
              {viewedUser.languages && (
                <View style={styles.userInfoRow}>
                  <Ionicons name="language" size={16} color={theme.textSecondary} />
                  <Text style={[styles.userInfoText, { color: theme.text }]}>{viewedUser.languages}</Text>
                </View>
              )}
              {viewedUser.age && (
                <View style={styles.userInfoRow}>
                  <Ionicons name="calendar" size={16} color={theme.textSecondary} />
                  <Text style={[styles.userInfoText, { color: theme.text }]}>{viewedUser.age} years old</Text>
                </View>
              )}
              {viewedUser.joinedAt && (
                <View style={styles.userInfoRow}>
                  <Ionicons name="time" size={16} color={theme.textSecondary} />
                  <Text style={[styles.userInfoText, { color: theme.text }]}>
                    Joined {new Date(viewedUser.joinedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{userStats.storiesCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Stories</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{userStats.followers}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Followers</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{userStats.following}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Following</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{userStats.totalLikes}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Likes</Text>
            </View>
          </View>

          {/* Follow Button or Emergency Contacts Button */}
          {viewedUser?.id === currentUser?.id ? (
            <TouchableOpacity
              style={[styles.emergencyContactsButton, { backgroundColor: theme.error || '#EF4444' }]}
              onPress={() => navigation.navigate('EmergencyContacts')}
            >
              <Ionicons name="people" size={20} color={theme.surface} />
              <Text style={[styles.emergencyContactsButtonText, { color: theme.surface }]}>Emergency Contacts</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.followButton, { backgroundColor: theme.primary }, isFollowing && { backgroundColor: 'transparent', borderColor: theme.primary, borderWidth: 1 }]}
              onPress={handleFollowToggle}
            >
              <Ionicons
                name={isFollowing ? 'checkmark-circle' : 'add-circle'}
                size={20}
                color={isFollowing ? theme.primary : theme.surface}
              />
              <Text style={[styles.followButtonText, { color: theme.surface }, isFollowing && { color: theme.primary }]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* User's Stories Section */}
        <View style={styles.storiesSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book" size={22} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Shared Stories</Text>
            <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.countBadgeText, { color: theme.surface }]}>{userStats.storiesCount}</Text>
            </View>
          </View>

          {userStories.length > 0 ? (
            <FlatList
              data={userStories}
              renderItem={renderStoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.storiesList}
            />
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="book-open" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No stories shared yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.m,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.m,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: SPACING.m,
  },
  roleBadgeLearner: {
    backgroundColor: '#10B981',
  },
  roleBadgeElder: {
    backgroundColor: '#F59E0B',
  },
  roleBadgeAdmin: {
    backgroundColor: '#EF4444',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  userInfoContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.l,
    gap: SPACING.s,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  userInfoText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  userBio: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.l,
    paddingHorizontal: SPACING.xl,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.l,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.m,
    borderRadius: 24,
    gap: SPACING.xs,
    ...SHADOWS.small,
  },
  followingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  followingButtonText: {
    color: COLORS.primary,
  },
  emergencyContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.m,
    borderRadius: 24,
    gap: SPACING.xs,
    ...SHADOWS.small,
  },
  emergencyContactsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  storiesSection: {
    padding: SPACING.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  storiesList: {
    gap: SPACING.m,
  },
  storyItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...SHADOWS.small,
  },
  storyItemContent: {
    flex: 1,
  },
  storyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  storyItemDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.s,
  },
  storyItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyItemMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  storyItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storyItemStatsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.m,
  },
});
