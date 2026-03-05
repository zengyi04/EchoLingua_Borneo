import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stories } from '../data/mockData';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const STORIES_STORAGE_KEY = '@echolingua_stories';

export default function StoryLibraryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [communityStories, setCommunityStories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load community stories from AsyncStorage
  const loadCommunityStories = async () => {
    try {
      const storiesJson = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
      if (storiesJson) {
        const loadedStories = JSON.parse(storiesJson);
        console.log(`📚 Loaded ${loadedStories.length} community stories`);
        setCommunityStories(loadedStories);
      }
    } catch (error) {
      console.error('Failed to load community stories:', error);
    }
  };

  // Load stories when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadCommunityStories();
    }, [])
  );

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunityStories();
    setRefreshing(false);
  };

  // Combine default stories with community stories
  const allStories = [...communityStories, ...stories];

  const renderStoryItem = ({ item }) => {
    const isCommunityStory = !!item.audioUri; // Community stories have audioUri
    
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
                backgroundColor: isCommunityStory ? theme.accent + '15' : theme.secondary + '15' // Light background
              }
            ]}>
               <Ionicons 
                 name={isCommunityStory ? "mic" : "book"} 
                 size={28} 
                 color={isCommunityStory ? theme.accent : theme.secondary} // Colored icon
               />
            </View>
        </View>
        <View style={styles.contentContainer}>
            <Text style={[styles.category, { color: theme.textSecondary }]}>{isCommunityStory ? 'COMMUNITY' : 'FOLKLORE'}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
            <View style={styles.metaRow}>
                {isCommunityStory ? (
                  <>
                    <View style={[styles.aiBadge, { backgroundColor: theme.accent + '15' }]}>
                        <Ionicons name="people" size={12} color={theme.accent} />
                        <Text style={[styles.aiBadgeText, { color: theme.accent }]}>
                          {item.language || 'Community'}
                        </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.aiBadge, { backgroundColor: theme.primary + '15' }]}>
                        <MaterialCommunityIcons name="robot" size={12} color={theme.primary} />
                        <Text style={[styles.aiBadgeText, { color: theme.primary }]}>AI Illustrated</Text>
                    </View>
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}> • 5 min</Text>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Story Library</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Discover ancient wisdom & tales</Text>
      </View>


      {/* NEW: AI Story Generator Call-to-Action */}
      <View style={styles.createSection}>
          <TouchableOpacity 
            style={[styles.createCard, { backgroundColor: theme.primary, shadowColor: theme.shadow }]} 
            activeOpacity={0.9} 
            onPress={() => navigation.navigate('RecordTab', { createStory: true })}
          >
              <View style={[styles.createIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <MaterialCommunityIcons name="magic-staff" size={24} color={theme.onPrimary || '#FFFFFF'} />
              </View>
              <View style={styles.createTexts}>
                  <Text style={[styles.createTitle, { color: theme.onPrimary || '#FFFFFF' }]}>Create AI Folktale</Text>
                  <Text style={[styles.createSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Turn elder recordings into illustrated e-books instantly.</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color={theme.onPrimary || '#FFFFFF'} />
          </TouchableOpacity>
      </View>
      
      <Text style={[styles.sectionHeader, { color: theme.text }]}>Community Archive</Text>
      
      <FlatList
        data={allStories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStoryItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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