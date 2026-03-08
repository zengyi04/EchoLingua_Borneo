import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, Image, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const USERS_DATABASE_KEY = '@echolingua_users_database';
const COMMUNITY_STORIES_KEY = '@echolingua_stories';
const SEEN_STORIES_KEY = '@echolingua_seen_stories';
const NOTIFICATIONS_KEY = '@echolingua_notifications';
const USER_STORAGE_KEY = '@echolingua_current_user';
const DAILY_REMINDER_KEY = '@echolingua_daily_learning_reminder';
const QUIZ_RESULTS_KEY = '@echolingua_quiz_results';
const SCENARIO_RESULTS_KEY = '@echolingua_scenario_results';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { id: 'kad', name: 'Kadazandusun', status: 'Vulnerable', speakers: '180,000', iso: 'dtp' },
  { id: 'iba', name: 'Iban', status: 'Safe', speakers: '750,000', iso: 'iba' },
  { id: 'baj', name: 'Bajau', status: 'Developing', speakers: '400,000', iso: 'bDR' }, 
  { id: 'mur', name: 'Murut', status: 'Threatened', speakers: '20,000', iso: 'mwi' },
  { id: 'mah', name: 'Mah Meri', status: 'Endangered', speakers: '3,000', iso: 'mhe' }, 
];

const QuickAction = ({ title, icon, color, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity 
      style={styles.actionBtn} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIconBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {React.cloneElement(icon, { color: color })}
      </View>
      <Text style={[styles.actionLabel, { color: theme.text }]} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
};


export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [showLangModal, setShowLangModal] = useState(false); // Language selector hidden by default
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [unreadStoriesCount, setUnreadStoriesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showShareVocabularyModal, setShowShareVocabularyModal] = useState(false);
  const [todaysVocabulary, setTodaysVocabulary] = useState([]);

  const getStatusIndicator = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized.includes('safe') || normalized.includes('develop')) {
      return { emoji: '🟢', label: 'Safe' };
    }
    if (normalized.includes('endanger')) {
      return { emoji: '🔴', label: 'Endangered' };
    }
    if (normalized.includes('threat') || normalized.includes('vulner')) {
      return { emoji: '🟡', label: 'Vulnerable' };
    }

    return { emoji: '🟡', label: 'Vulnerable' };
  };

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
          const userNotifications = allNotifications.filter(n => n.recipientId === user.id);
          userNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setNotifications(userNotifications);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const ensureDailyLearningReminder = async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (!userData) {
        return;
      }

      const user = JSON.parse(userData);
      const recipientId = user.id;
      if (!recipientId) {
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const reminderDateKey = `${DAILY_REMINDER_KEY}_${recipientId}`;
      const sentToday = await AsyncStorage.getItem(reminderDateKey);
      if (sentToday === today) {
        return;
      }

      const notifRaw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const allNotifications = notifRaw ? JSON.parse(notifRaw) : [];
      const alreadyQueued = allNotifications.some(
        (n) => n.type === 'daily_reminder' && n.recipientId === recipientId && n.reminderDate === today
      );

      if (alreadyQueued) {
        await AsyncStorage.setItem(reminderDateKey, today);
        return;
      }

      const reminder = {
        id: `daily-reminder-${recipientId}-${today}`,
        type: 'daily_reminder',
        title: 'Daily Learning Reminder',
        message: 'Time to learn your indigenous language today!',
        recipientId,
        read: false,
        reminderDate: today,
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([reminder, ...allNotifications]));
      await AsyncStorage.setItem(reminderDateKey, today);
      loadUnreadNotificationsCount();
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
    }
  };

  const loadTodaysVocabulary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const vocabulary = [];

      // Load quiz results from today
      const quizResultsRaw = await AsyncStorage.getItem(QUIZ_RESULTS_KEY);
      if (quizResultsRaw) {
        const quizResults = JSON.parse(quizResultsRaw);
        const todaysQuizzes = quizResults.filter(result => {
          const resultDate = new Date(result.createdAt).toISOString().split('T')[0];
          return resultDate === today;
        });

        todaysQuizzes.forEach(quiz => {
          vocabulary.push({
            type: 'quiz',
            language: quiz.language || selectedLang?.name || 'Indigenous Language',
            difficulty: quiz.difficulty || 'medium',
            score: quiz.percentage || 0,
            timestamp: quiz.createdAt,
          });
        });
      }

      // Load scenario practice results from today
      const scenarioResultsRaw = await AsyncStorage.getItem(SCENARIO_RESULTS_KEY);
      if (scenarioResultsRaw) {
        const scenarioResults = JSON.parse(scenarioResultsRaw);
        const todaysScenarios = scenarioResults.filter(result => {
          const resultDate = new Date(result.createdAt).toISOString().split('T')[0];
          return resultDate === today;
        });

        todaysScenarios.forEach(scenario => {
          vocabulary.push({
            type: 'practice',
            language: scenario.toLanguage || selectedLang?.name || 'Indigenous Language',
            scenario: scenario.scenarioTitle || 'Conversation Practice',
            score: scenario.overall || 0,
            timestamp: scenario.createdAt,
          });
        });
      }

      setTodaysVocabulary(vocabulary);
    } catch (error) {
      console.error('Failed to load today\'s vocabulary:', error);
      setTodaysVocabulary([]);
    }
  };

  const handleShareWordToCommunity = async (vocabularyItem = null) => {
    try {
      const userDataRaw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const user = userDataRaw ? JSON.parse(userDataRaw) : null;
      const authorName = user?.name || user?.username || 'Community Learner';

      let description = '';
      let language = selectedLang?.name || 'Indigenous Language';

      if (vocabularyItem) {
        language = vocabularyItem.language || language;
        if (vocabularyItem.type === 'quiz') {
          description = `I completed a ${vocabularyItem.difficulty} quiz in ${language} and scored ${vocabularyItem.score}%! 📚`;
        } else if (vocabularyItem.type === 'practice') {
          description = `I practiced "${vocabularyItem.scenario}" in ${language} and scored ${vocabularyItem.score}%! 🎯`;
        }
      } else {
        description = `Learning ${language} today! Join me in preserving our indigenous languages! 💪`;
      }

      const newStory = {
        id: Date.now().toString(),
        title: 'Learning Progress Share',
        description,
        author: authorName,
        authorAvatar: '👤',
        language,
        category: 'Learning Share',
        likes: 0,
        comments: 0,
        bookmarks: 0,
        audioUri: null,
        timestamp: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        isFollowing: false,
        commentsList: [],
      };

      const storiesRaw = await AsyncStorage.getItem(COMMUNITY_STORIES_KEY);
      const stories = storiesRaw ? JSON.parse(storiesRaw) : [];
      const updatedStories = [newStory, ...stories];

      await AsyncStorage.setItem(COMMUNITY_STORIES_KEY, JSON.stringify(updatedStories));

      setShowShareVocabularyModal(false);

      Alert.alert(
        'Shared Successfully! 🎉',
        'Your learning progress has been shared to the community.',
        [
          { text: 'View Community', onPress: () => navigation.navigate('CommunityStory') },
          { text: 'Done' },
        ]
      );
    } catch (error) {
      console.error('Failed to share:', error);
      Alert.alert('Share Failed', 'Unable to share right now. Please try again.');
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
        loadUnreadNotificationsCount();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification.id);
    setShowNotificationModal(false);
    
    if (notification.type === 'follow') {
      navigation.navigate('UserProfile', { 
        userId: notification.senderId, 
        userName: notification.senderName 
      });
    } else if (notification.type === 'story' || notification.type === 'shared_story') {
      navigation.navigate('Story', { story: notification.storyData });
    } else if (notification.type === 'comment') {
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
                const filtered = allNotifications.filter(n => n.recipientId !== currentUser.id);
                await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
                setNotifications([]);
                loadUnreadNotificationsCount();
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
      case 'shared_story':
        return 'share';
      case 'comment':
        return 'chatbubble';
      case 'like':
        return 'heart';
      default:
        return 'notifications';
    }
  };

  const getTimeSince = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  const loadActiveUsersCount = async () => {
    try {
      const usersData = await AsyncStorage.getItem(USERS_DATABASE_KEY);
      if (usersData) {
        const users = JSON.parse(usersData);
        const today = new Date().toISOString().split('T')[0]; // Get today's date (YYYY-MM-DD)
        
        // Count users who logged in today (check their lastActive field)
        const activeToday = users.filter(user => {
          if (user.lastActive) {
            const lastActiveDate = new Date(user.lastActive).toISOString().split('T')[0];
            return lastActiveDate === today;
          }
          return false;
        });
        
        setActiveUsersCount(activeToday.length);
      }
    } catch (error) {
      console.error('Failed to load active users count:', error);
      setActiveUsersCount(0);
    }
  };

  const loadUnreadStoriesCount = async () => {
    try {
      const storiesData = await AsyncStorage.getItem(COMMUNITY_STORIES_KEY);
      const seenStoriesData = await AsyncStorage.getItem(SEEN_STORIES_KEY);
      
      if (storiesData) {
        const stories = JSON.parse(storiesData);
        const seenStories = seenStoriesData ? JSON.parse(seenStoriesData) : [];
        const today = new Date().toISOString().split('T')[0]; // Get today's date (YYYY-MM-DD)
        
        // Count stories created today that haven't been seen
        const todayStories = stories.filter(story => {
          if (story.timestamp) {
            const storyDate = new Date(story.timestamp).toISOString().split('T')[0];
            const isToday = storyDate === today;
            const notSeen = !seenStories.includes(story.id);
            return isToday && notSeen;
          }
          return false;
        });
        
        setUnreadStoriesCount(todayStories.length);
      }
    } catch (error) {
      console.error('Failed to load unread stories count:', error);
      setUnreadStoriesCount(0);
    }
  };

  const loadUnreadNotificationsCount = async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        const user = JSON.parse(userData);
        const notifData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (notifData) {
          const allNotifications = JSON.parse(notifData);
          const unreadCount = allNotifications.filter(n => 
            n.recipientId === user.id && !n.read
          ).length;
          setUnreadNotificationsCount(unreadCount);
        }
      }
    } catch (error) {
      console.error('Failed to load unread notifications count:', error);
      setUnreadNotificationsCount(0);
    }
  };

  // Load stats when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadActiveUsersCount();
      loadUnreadStoriesCount();
      loadUnreadNotificationsCount();
      loadCurrentUser();
      ensureDailyLearningReminder();
      loadTodaysVocabulary();
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section with Logo */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
             <View style={styles.headerTitleContainer}>
                <Image 
                  source={require('../../assets/appLogo.png')} 
                  style={styles.appLogo} 
                  resizeMode="contain"
                />
                <View>
                  <Text style={[styles.greeting, { color: theme.textSecondary }]}>Selamat Datang,</Text>
                  <Text style={[styles.appName, { color: theme.primary }]}>EchoLingua</Text>
                </View>
             </View>
             {/* Notification Icon */}
             <TouchableOpacity 
               style={styles.notificationButton}
               onPress={() => {
                 setShowNotificationModal(true);
                 loadNotifications();
               }}
             >
               <Ionicons name="notifications-outline" size={24} color={theme.text} />
               {unreadNotificationsCount > 0 && (
                 <View style={[styles.notificationBadge, { backgroundColor: theme.error || '#EF4444' }]}>
                   <Text style={styles.notificationBadgeText}>
                     {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                   </Text>
                 </View>
               )}
             </TouchableOpacity>
          </View>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>Revitalizing Indigenous Languages</Text>
        </View>

        {/* Language Selection Modal */}
        <Modal
          visible={showLangModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLangModal(false)}
        >
          <TouchableOpacity 
             style={styles.modalOverlay} 
             activeOpacity={1} 
             onPress={() => setShowLangModal(false)}
          >
             <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Language</Text>
                
                {/* Data Attribution Badge */}
                <View style={[styles.sourceBadge, { backgroundColor: theme.inputBackground }]}>
                  <Ionicons name="globe-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.sourceText, { color: theme.textSecondary }]}>Data verified by Ethnologue & JMM</Text>
                </View>

                {LANGUAGES.map(lang => (
                  (() => {
                    const statusIndicator = getStatusIndicator(lang.status);
                    return (
                   <TouchableOpacity 
                      key={lang.id} 
                      style={[styles.langOption, { borderBottomColor: theme.border }]}
                      onPress={() => {
                         setSelectedLang(lang);
                         setShowLangModal(false);
                      }}
                   >
                     <View>
                        <Text style={[
                           styles.langOptionText, 
                           { color: theme.text },
                           selectedLang.id === lang.id && [styles.activeLangText, { color: theme.primary }]
                        ]}>{lang.name}</Text>
                        <Text style={[styles.langMeta, { color: theme.textSecondary }]}>
                        {lang.speakers} speakers • Language Status: {statusIndicator.emoji} {statusIndicator.label}
                        </Text>
                     </View>
                      
                      {selectedLang.id === lang.id && (
                         <Ionicons name="checkmark" size={20} color={theme.primary} />
                      )}
                      
                      {/* Endangerment Indicator */}
                      {['Threatened', 'Endangered'].includes(lang.status) && (
                         <View style={styles.warningDot} />
                      )}
                   </TouchableOpacity>
                      );
                    })()
                ))}
             </View>
          </TouchableOpacity>
        </Modal>

        {/* Notification Modal */}
        <Modal
          visible={showNotificationModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowNotificationModal(false)}
        >
          <TouchableOpacity 
            style={styles.notificationModalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowNotificationModal(false)}
          >
            <TouchableOpacity 
              style={[styles.notificationModalContent, { backgroundColor: theme.cardBackground }]} 
              activeOpacity={1}
            >
              {/* Notification Header */}
              <View style={[styles.notificationModalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.notificationModalTitle, { color: theme.text }]}>Notifications</Text>
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={clearAllNotifications}>
                    <Text style={[styles.clearButtonText, { color: theme.primary }]}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setShowNotificationModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Notifications List */}
              {notifications.length === 0 ? (
                <View style={styles.emptyNotificationContainer}>
                  <Ionicons name="notifications-off-outline" size={64} color={theme.textSecondary} />
                  <Text style={[styles.emptyNotificationTitle, { color: theme.text }]}>No Notifications</Text>
                  <Text style={[styles.emptyNotificationMessage, { color: theme.textSecondary }]}>
                    You'll see notifications here when someone follows you or shares content with you
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.notificationItem,
                        { 
                          backgroundColor: item.read ? theme.surface : theme.primary + '15', 
                          borderColor: theme.border 
                        }
                      ]}
                      onPress={() => handleNotificationPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.notificationIconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name={getNotificationIcon(item.type)} size={24} color={theme.primary} />
                      </View>
                      
                      <View style={styles.notificationItemContent}>
                        <Text style={[styles.notificationItemTitle, { color: theme.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.notificationItemMessage, { color: theme.textSecondary }]} numberOfLines={2}>
                          {item.message}
                        </Text>
                        <Text style={[styles.notificationItemTime, { color: theme.textSecondary }]}>
                          {getTimeSince(item.timestamp)}
                        </Text>
                      </View>

                      {!item.read && (
                        <View style={[styles.unreadIndicator, { backgroundColor: theme.primary }]} />
                      )}
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.notificationListContainer}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Share Vocabulary Modal */}
        <Modal
          visible={showShareVocabularyModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowShareVocabularyModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowShareVocabularyModal(false)}
          >
            <TouchableOpacity 
              style={[styles.shareModalContent, { backgroundColor: theme.cardBackground }]} 
              activeOpacity={1}
            >
              {/* Header */}
              <View style={[styles.shareModalHeader, { borderBottomColor: theme.border }]}>
                <Ionicons name="share-social" size={24} color={theme.primary} />
                <Text style={[styles.shareModalTitle, { color: theme.text }]}>Share Your Progress</Text>
                <TouchableOpacity 
                  onPress={() => setShowShareVocabularyModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Today's Learning */}
              {todaysVocabulary.length === 0 ? (
                <View style={styles.emptyShareContainer}>
                  <Ionicons name="book-outline" size={64} color={theme.textSecondary} />
                  <Text style={[styles.emptyShareTitle, { color: theme.text }]}>No Practice Today</Text>
                  <Text style={[styles.emptyShareMessage, { color: theme.textSecondary }]}>
                    Complete a quiz or practice session to share your progress!
                  </Text>
                  <TouchableOpacity
                    style={[styles.startLearningButton, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      setShowShareVocabularyModal(false);
                      navigation.navigate('Learn');
                    }}
                  >
                    <Text style={styles.startLearningButtonText}>Start Learning</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.shareListContainer} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.shareInstructions, { color: theme.textSecondary }]}>
                    Select what you want to share with the community:
                  </Text>

                  {/* Share General Progress */}
                  <TouchableOpacity
                    style={[styles.shareItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => handleShareWordToCommunity(null)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.shareIconContainer, { backgroundColor: theme.primary + '20' }]}>
                      <Ionicons name="trophy" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.shareItemContent}>
                      <Text style={[styles.shareItemTitle, { color: theme.text }]}>
                        🎯 Share Today's Achievement
                      </Text>
                      <Text style={[styles.shareItemDescription, { color: theme.textSecondary }]}>
                        {todaysVocabulary.length} practice session{todaysVocabulary.length > 1 ? 's' : ''} completed today
                      </Text>
                    </View>
                    <Ionicons name="share-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>

                  {/* Individual Items */}
                  {todaysVocabulary.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.type}-${index}`}
                      style={[styles.shareItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => handleShareWordToCommunity(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.shareIconContainer, { backgroundColor: theme.secondary + '20' }]}>
                        <Ionicons 
                          name={item.type === 'quiz' ? 'school' : 'chatbubbles'} 
                          size={24} 
                          color={theme.secondary} 
                        />
                      </View>
                      <View style={styles.shareItemContent}>
                        <Text style={[styles.shareItemTitle, { color: theme.text }]}>
                          {item.type === 'quiz' 
                            ? `${item.language} Quiz (${item.difficulty})`
                            : `${item.scenario}`
                          }
                        </Text>
                        <Text style={[styles.shareItemDescription, { color: theme.textSecondary }]}>
                          Score: {item.score}% • {new Date(item.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <Ionicons name="share-outline" size={20} color={theme.secondary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Living Language Stats (New Feature) */}
        <View style={[
           styles.statsCard, 
           { 
             backgroundColor: theme.surface, 
             borderWidth: 0,
             elevation: 4,
             shadowColor: '#000',
             shadowOffset: { width: 0, height: 2 },
             shadowOpacity: 0.1,
             shadowRadius: 8,
             marginBottom: SPACING.medium // Ensure spacing
           }
        ]}>
           <Text style={[styles.statsTitle, { color: theme.text }]}>Living Language Status</Text>
           <View style={styles.statsRow}>
              <View style={styles.statItem}>
                 <Text style={[styles.statNumber, { color: theme.secondary }]}>1,204</Text>
                 <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Words Preserved</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border, alignSelf: 'center', height: 40 }]} />
              <View style={styles.statItem}>
                 <Text style={[styles.statNumber, { color: theme.secondary }]}>{activeUsersCount}</Text>
                 <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Today</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border, alignSelf: 'center', height: 40 }]} />
              <View style={styles.statItem}>
                 <Text style={[styles.statNumber, { color: theme.secondary }]}>{unreadStoriesCount}</Text>
                 <Text style={[styles.statLabel, { color: theme.textSecondary }]}>New Community Today</Text>
              </View>
           </View>
        </View>

        <View style={{ height: SPACING.l }} />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tools & Discovery</Text>

        <View style={styles.grid}>
          {/* Row 1: Key Features */}
          <QuickAction 
            title="AI Chat" 
            icon={<MaterialCommunityIcons name="robot" size={20} />} 
            color="#E91E63"
            onPress={() => navigation.navigate('AIChat')}
          />
          <QuickAction 
            title="Dictionary" 
            icon={<FontAwesome5 name="book" size={20} />}
            color="#8E44AD" 
            onPress={() => navigation.navigate('Dictionary')}
          />
          <QuickAction 
            title="Map" 
            icon={<FontAwesome5 name="map-marked-alt" size={20} />}
            color="#FF9800" 
            onPress={() => navigation.navigate('Map')}
          />
          <QuickAction 
            title="Quiz" 
            icon={<MaterialIcons name="quiz" size={24} />}
            color={theme.accent}
            onPress={() => navigation.navigate('Quiz')}
          />

          {/* Row 2: Learning & Practice */}
          <QuickAction 
            title="Practice" 
            icon={<MaterialIcons name="translate" size={24} />}
            color={theme.secondary}
            onPress={() => navigation.navigate('Vocabulary')}
          />
          <QuickAction 
            title="Family" 
            icon={<MaterialIcons name="family-restroom" size={24} />}
            color="#E74C3C" 
            onPress={() => navigation.navigate('FamilyLearning')}
          />
          <QuickAction 
            title="Festivals" 
            icon={<MaterialIcons name="festival" size={24} />}
            color="#F39C12" 
            onPress={() => navigation.navigate('CulturalEvents')}
          />
          <QuickAction 
            title="Knowledge" 
            icon={<FontAwesome5 name="scroll" size={20} />}
            color="#9B59B6" 
            onPress={() => navigation.navigate('CulturalKnowledge')}
          />

          {/* Row 3: Others */}
          <QuickAction 
            title="Community" 
            icon={<FontAwesome5 name="users" size={20} />}
            color="#3498DB" 
            onPress={() => {
              Alert.alert(
                'Community Action',
                'Choose what you want to do:',
                [
                  { text: 'Open Community', onPress: () => navigation.navigate('CommunityStory') },
                  {
                    text: 'Share My Progress',
                    onPress: () => {
                      loadTodaysVocabulary();
                      setShowShareVocabularyModal(true);
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          />
          <QuickAction 
            title="Progress" 
            icon={<MaterialIcons name="trending-up" size={24} />}
            color="#27AE60" 
            onPress={() => navigation.navigate('ProgressTracker')}
          />
          <QuickAction 
            title="Vitality AI" 
            icon={<MaterialCommunityIcons name="chart-timeline-variant" size={22} />}
            color="#16A34A" 
            onPress={() => navigation.navigate('LanguageVitality')}
          />
        </View>

        <View style={styles.spotlightSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cultural Spotlight</Text>
          <View style={[styles.spotlightCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={[styles.spotlightHeader, { backgroundColor: theme.secondary }]}>
                <MaterialIcons name="lightbulb" size={20} color="white" />
                <Text style={styles.spotlightLabel}>Did You Know?</Text>
             </View>
             <View style={styles.spotlightBody}>
                <Text style={[styles.spotlightTitle, { color: theme.text }]}>The Sape': Boat Lute</Text>
                <Text style={[styles.spotlightDesc, { color: theme.textSecondary }]}>
                  Traditionally carved from a single block of wood, the Sape' is the iconic musical instrument of the Orang Ulu people in Sarawak, originally used for healing rituals.
                </Text>
             </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.xl, 
  },
  header: {
    marginBottom: SPACING.l,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
  },
  appLogo: {
    width: 55,
    height: 55,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 14,
    color: '#8D99AE',
    marginTop: SPACING.xs,
  },
  statsCard: {
    backgroundColor: COLORS.glassLight,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderRadius: SPACING.m,
    padding: SPACING.m,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 60,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#eee',
  },
  
  // Word of the Day Styles
  wordCard: {
    padding: SPACING.l,
    borderRadius: SPACING.l,
    borderWidth: 1,
    position: 'relative',
    ...SHADOWS.small,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  wordLanguage: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wordTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  wordType: {
    fontSize: 10,
    fontWeight: '700',
  },
  wordContent: {
    alignItems: 'center',
    paddingVertical: SPACING.s,
  },
  mainWord: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  pronunciation: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: SPACING.m,
  },
  divider: {
    height: 1,
    width: '40%',
    marginBottom: SPACING.m,
  },
  wordMeaning: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  playWordButton: {
    position: 'absolute',
    bottom: SPACING.m,
    right: SPACING.m,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  sectionTitle: { 
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', 
    marginBottom: 0,
  },
  actionBtn: {
    width: (width - SPACING.l * 2) / 5, // 5 columns dynamic width based on available space
    alignItems: 'center',
    marginBottom: SPACING.l,
    paddingHorizontal: 2,
  },
  actionIconBox: {
    width: 50,
    height: 50,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: COLORS.glassLight,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    ...SHADOWS.small,
  },
  actionLabel: {
    fontSize: 9, 
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    width: '100%',
  },

  // Cultural Spotlight
  spotlightSection: {
    marginTop: 0,
    marginBottom: SPACING.m,
  },
  spotlightCard: {
    borderRadius: SPACING.m,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    gap: SPACING.s,
  },
  spotlightLabel: {
    color: '#FFFFFF', // Assuming secondary background is dark/colored
    fontWeight: 'bold',
    fontSize: 14,
  },
  spotlightBody: {
    padding: SPACING.m,
  },
  spotlightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.s,
  },
  spotlightDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Duplicate styles removed here
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.s,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  langButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.glassLight,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderRadius: SPACING.m,
    padding: SPACING.l,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.s,
    textAlign: 'center',
    color: COLORS.text,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: SPACING.m,
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  langOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  langMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warningDot: {
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: COLORS.error,
    marginLeft: 8,
    position: 'absolute',
    right: 0,
    top: 10,
  },
  activeLangText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tipCard: {
    backgroundColor: '#E3F2FD',
    padding: SPACING.m,
    borderRadius: SPACING.m,
    marginBottom: SPACING.l,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
    gap: SPACING.s,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tipText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.text,
  },
  // Notification Modal Styles
  notificationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: SPACING.m,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: SPACING.m,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  notificationListContainer: {
    padding: SPACING.m,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.m,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  notificationItemContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationItemMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationItemTime: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: SPACING.s,
  },
  emptyNotificationContainer: {
    padding: SPACING.xl * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyNotificationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  emptyNotificationMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Share Modal Styles
  shareModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: SPACING.m,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  shareModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    gap: SPACING.s,
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  shareListContainer: {
    padding: SPACING.m,
  },
  shareInstructions: {
    fontSize: 14,
    marginBottom: SPACING.m,
    paddingHorizontal: 4,
  },
  shareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.m,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  shareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  shareItemContent: {
    flex: 1,
  },
  shareItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  shareItemDescription: {
    fontSize: 13,
  },
  emptyShareContainer: {
    padding: SPACING.xl * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyShareTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  emptyShareMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.l,
  },
  startLearningButton: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderRadius: 25,
    ...SHADOWS.medium,
  },
  startLearningButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});