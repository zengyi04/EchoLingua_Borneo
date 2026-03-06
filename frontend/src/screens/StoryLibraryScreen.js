import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stories } from '../data/mockData';
import { WORLD_LANGUAGES } from '../constants/languages';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const STORIES_STORAGE_KEY = '@echolingua_stories';
const USER_STORAGE_KEY = '@echolingua_current_user';
const SHARED_STORIES_KEY = '@echolingua_shared_stories';
const USERS_DATABASE_KEY = '@echolingua_users_database';


export default function StoryLibraryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [createdStories, setCreatedStories] = useState([]);
  const [sharedStories, setSharedStories] = useState([]);
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'creations' | 'shared'
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
  const loadCurrentUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (userJson) {
        setCurrentUser(JSON.parse(userJson));
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  // Load created/generated stories from AsyncStorage
  const loadCreatedStories = async () => {
    try {
      const storiesJson = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
      const loadedStories = storiesJson ? JSON.parse(storiesJson) : [];
      setCreatedStories(loadedStories);
    } catch (error) {
      console.error('Failed to load created stories:', error);
    }
  };

  // Load shared stories sent to current user
  const loadSharedStories = async () => {
    try {
      if (!currentUser) {
        setSharedStories([]);
        return;
      }

      const sharedJson = await AsyncStorage.getItem(SHARED_STORIES_KEY);
      const allSharedStories = sharedJson ? JSON.parse(sharedJson) : [];
      
      // Filter stories shared with current user
      const myEmail = currentUser.email?.trim().toLowerCase();
      const myUserId = currentUser.id;

      const mySharedStories = allSharedStories.filter((story) => {
        const emailMatch =
          myEmail &&
          Array.isArray(story.sharedWithEmails) &&
          story.sharedWithEmails.some((email) => email?.trim().toLowerCase() === myEmail);

        const userIdMatch =
          myUserId &&
          Array.isArray(story.sharedWithUserIds) &&
          story.sharedWithUserIds.includes(myUserId);

        return Boolean(emailMatch || userIdMatch);
      });
      
      setSharedStories(mySharedStories);
    } catch (error) {
      console.error('Failed to load shared stories:', error);
    }
  };

  // Load stories when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadCurrentUser();
      loadCreatedStories();
    }, [])
  );

  // Load shared stories when user is loaded
  useEffect(() => {
    if (currentUser) {
      loadSharedStories();
    }
  }, [currentUser]);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadCurrentUser();
    await loadCreatedStories();
    await loadSharedStories();
    setRefreshing(false);
  };

  // Determine which list to show
  const displayStories = activeTab === 'library' ? stories : (activeTab === 'creations' ? createdStories : sharedStories);

  const getLanguageFlag = (langName) => {
    if (!langName) return '🌏';
    const lang = WORLD_LANGUAGES.find(l => l.label === langName || l.id === langName.toLowerCase());
    return lang ? lang.flag : '🇲🇾'; // Default to MY flag for local context
  };

  const renderStoryItem = ({ item }) => {
    const isAiStory = !!item.isAiGenerated;
    const isCommunityRecording = !!item.audioUri && !item.isAiGenerated;
    const isSharedStory = !!item.sharedBy;
    const itemFlag = getLanguageFlag(item.language);
    
    return (
      <TouchableOpacity 
        style={[
          styles.storyCard, 
          { 
            backgroundColor: theme.surface, 
            borderColor: 'transparent',
            shadowColor: theme.shadow,
            shadowOpacity: 0.1,
            elevation: 3,
            marginBottom: 12
          }
        ]} 
        onPress={() => navigation.navigate('Story', { storyId: item.id, story: item })}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
            {/* Placeholder for story image */}
            <View style={[
              styles.placeholderImage, 
              { 
                backgroundColor: isAiStory ? theme.primary + '15' : (isCommunityRecording ? theme.accent + '15' : theme.secondary + '15')
              }
            ]}>
               <Text style={{ fontSize: 24 }}>{itemFlag}</Text>
            </View>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
             <Text style={[styles.category, { color: theme.textSecondary, marginBottom: 0, marginRight: 8, fontSize: 11, fontWeight: '700' }]}>
                {isSharedStory ? 'SHARED' : (isCommunityRecording ? 'COMMUNITY' : (isAiStory ? 'AI TALE' : 'FOLKLORE'))}
             </Text>
             <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.textSecondary, marginRight: 8 }} />
             <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>
               {item.language || 'English'}
             </Text>
             <View style={{ flex: 1 }} />
             {isSharedStory && (
               <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accent + '20', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                 <Ionicons name="people" size={10} color={theme.accent} />
                 <Text style={{ fontSize: 10, color: theme.accent, marginLeft: 2, fontWeight: 'bold'}}>FROM {item.sharedBy}</Text>
               </View>
             )}
             {isAiStory && !isSharedStory && (
               <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '20', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                 <MaterialCommunityIcons name="robot" size={10} color={theme.primary} />
                 <Text style={{ fontSize: 10, color: theme.primary, marginLeft: 2, fontWeight: 'bold'}}>AI</Text>
               </View>
             )}
          </View>
            <Text style={[styles.title, { color: theme.text, marginTop: 4, marginBottom: 4 }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.storyDesc, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.summary || item.description || "No description available."}
            </Text>

            <View style={styles.metaRow}>
                {isCommunityRecording ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="mic" size={12} color={theme.accent} />
                        <Text style={{ color: theme.accent, marginLeft: 4, fontSize: 12, fontWeight: '500' }}>
                          Recording
                        </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                        <Text style={{ color: theme.textSecondary, marginLeft: 4, fontSize: 12 }}>
                           5 min read
                        </Text>
                    </View>
                  </>
                )}
            </View>
        </View>
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Story Library</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Discover ancient wisdom & tales</Text>
        </View>
      </View>


      
      {/* TABS */}
      <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.l, marginBottom: SPACING.m }}>
         <TouchableOpacity 
           style={{ paddingVertical: 12, marginRight: 24, borderBottomWidth: activeTab === 'library' ? 3 : 0, borderBottomColor: theme.primary }}
           onPress={() => setActiveTab('library')}
         >
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: activeTab === 'library' ? theme.primary : theme.textSecondary }}>
               Explore Library
            </Text>
         </TouchableOpacity>
         <TouchableOpacity 
           style={{ paddingVertical: 12, marginRight: 24, borderBottomWidth: activeTab === 'creations' ? 3 : 0, borderBottomColor: theme.primary }}
           onPress={() => setActiveTab('creations')}
         >
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: activeTab === 'creations' ? theme.primary : theme.textSecondary }}>
               My Creations
            </Text>
         </TouchableOpacity>
         <TouchableOpacity 
           style={{ paddingVertical: 12, borderBottomWidth: activeTab === 'shared' ? 3 : 0, borderBottomColor: theme.primary }}
           onPress={() => setActiveTab('shared')}
         >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: activeTab === 'shared' ? theme.primary : theme.textSecondary }}>
                 Other Creation
              </Text>
              {sharedStories.length > 0 && (
                <View style={{ marginLeft: 6, backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{sharedStories.length}</Text>
                </View>
              )}
            </View>
         </TouchableOpacity>
      </View>
      
      <FlatList
        data={displayStories}
        keyExtractor={(item, index) => {
          const sourcePrefix = item.isAiGenerated ? 'ai' : (item.audioUri ? 'community' : 'default');
          return `${sourcePrefix}-${String(item.id)}-${index}`;
        }}
        renderItem={renderStoryItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          activeTab === 'creations' ? (
             <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <MaterialCommunityIcons name="magic-staff" size={64} color={theme.textSecondary + '40'} />
                <Text style={{ textAlign: 'center', marginTop: 16, color: theme.textSecondary }}>
                   You haven't created any stories yet. Start preserving your heritage today!
                </Text>
             </View>
          ) : activeTab === 'shared' ? (
             <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <Ionicons name="people-outline" size={64} color={theme.textSecondary + '40'} />
                <Text style={{ textAlign: 'center', marginTop: 16, color: theme.textSecondary }}>
                   No stories shared with you yet. Stories from your emergency contacts will appear here.
                </Text>
             </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.m,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  createSection: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
  },
  createCard: {
    backgroundColor: COLORS.accent,
    borderRadius: SPACING.l,
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  createIconBg: {
    width: 48, 
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  createTexts: {
    flex: 1,
    marginRight: SPACING.s,
  },
  createTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  createSubtitle: {
    fontSize: 12,
    color: COLORS.surface,
    opacity: 0.9,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: SPACING.l,
    marginTop: SPACING.s,
    marginBottom: SPACING.s,
  },
  listContent: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  storyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: SPACING.m,
    padding: SPACING.m,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  imageContainer: {
    marginRight: SPACING.m,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: SPACING.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiGeneratorCard: {
    margin: SPACING.m,
    padding: SPACING.m,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    ...SHADOWS.small,
  },
  aiIconContainer: {
    width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m
  },
  aiTextContainer: { flex: 1 },
  aiTitle: { fontWeight: 'bold', fontSize: 16 },
  aiSubtitle: { fontSize: 12, marginTop: 4 },
  
  contentContainer: {
    flex: 1,
  },
  category: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 2,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  arrowContainer: {
    marginLeft: SPACING.s,
  },
});