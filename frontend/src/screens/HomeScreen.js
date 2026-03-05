import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const USERS_DATABASE_KEY = '@echolingua_users_database';
const COMMUNITY_STORIES_KEY = '@echolingua_stories';
const SEEN_STORIES_KEY = '@echolingua_seen_stories';

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

  // Load stats when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadActiveUsersCount();
      loadUnreadStoriesCount();
    }, [])
  );

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
             {/* Language Selector moved to Profile/Settings */}
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
                           {lang.speakers} speakers • {lang.status}
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
                ))}
             </View>
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
          {/* Row 1: AI & Discovery (Wow Features) */}
          <QuickAction 
            title="AI Chat" 
            icon={<Ionicons name="chatbubbles-sharp" size={24} />}
            color="#2196F3" // Blue
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('AIChat');
                return;
              }
              navigation.navigate('AIChat');
            }}
          />
          <QuickAction 
            title="Dictionary" 
            icon={<FontAwesome5 name="book" size={20} />}
            color="#8E44AD" // Purple
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('Dictionary');
                return;
              }
              navigation.navigate('Dictionary');
            }}
          />
          <QuickAction 
            title="Map" 
            icon={<FontAwesome5 name="map-marked-alt" size={20} />}
            color="#FF9800" // Orange
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('Map');
                return;
              }
              navigation.navigate('Map');
            }}
          />

          {/* Row 2: Core Learning & Preservation */}
          <QuickAction 
            title="Learn" 
            icon={<FontAwesome5 name="book-open" size={20} />}
            color={theme.primary}
            onPress={() => navigation.navigate('LearnTab')}
          />
          <QuickAction 
            title="Practice" 
            icon={<MaterialIcons name="translate" size={24} />}
            color={theme.secondary}
            onPress={() => navigation.navigate('Vocabulary')}
          />
          <QuickAction 
            title="Quiz" 
            icon={<MaterialIcons name="quiz" size={24} />}
            color={theme.accent}
            onPress={() => navigation.navigate('Quiz')}
          />

          {/* Row 3: Community & Progress */}
          <QuickAction 
            title="Community" 
            icon={<FontAwesome5 name="users" size={20} />}
            color="#3498DB" // Light Blue
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('CommunityStory');
                return;
              }
              navigation.navigate('CommunityStory');
            }}
          />
          <QuickAction 
            title="Progress" 
            icon={<MaterialIcons name="trending-up" size={24} />}
            color="#27AE60" // Green
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('ProgressTracker');
                return;
              }
              navigation.navigate('ProgressTracker');
            }}
          />
          <QuickAction 
            title="Stories" 
            icon={<Ionicons name="library" size={24} />}
            color="#009688" // Teal
            onPress={() => navigation.navigate('StoriesTab')}
          />

          {/* Row 4: Culture & Family */}
          <QuickAction 
            title="Festivals" 
            icon={<MaterialIcons name="festival" size={24} />}
            color="#F39C12" // Yellow-Orange
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('CulturalEvents');
                return;
              }
              navigation.navigate('CulturalEvents');
            }}
          />
          <QuickAction 
            title="Knowledge" 
            icon={<FontAwesome5 name="scroll" size={20} />}
            color="#9B59B6" // Purple
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('CulturalKnowledge');
                return;
              }
              navigation.navigate('CulturalKnowledge');
            }}
          />
          <QuickAction 
            title="Family" 
            icon={<MaterialIcons name="family-restroom" size={24} />}
            color="#E74C3C" // Red
            onPress={() => {
              if (navigation.getParent()) {
                navigation.getParent().navigate('FamilyLearning');
                return;
              }
              navigation.navigate('FamilyLearning');
            }}
          />

          {/* Row 5: Recording */}
          <QuickAction 
            title="Record" 
            icon={<MaterialIcons name="mic" size={24} />}
            color={theme.error}
            onPress={() => navigation.navigate('RecordTab')}
          />
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
    paddingBottom: 100, // Extra space for bottom tab
  },
  header: {
    marginBottom: SPACING.l,
    // marginTop removed to reduce space
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
  elderCard: {
    backgroundColor: 'rgba(255, 224, 178, 0.6)',
    borderColor: 'rgba(208, 140, 96, 0.3)',
    borderWidth: 1,
    borderRadius: SPACING.m,
    padding: SPACING.m,
    marginBottom: SPACING.l,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    ...SHADOWS.small,
  },
  elderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  elderTitle: {
    fontSize: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tipText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.text,
  },
  sectionTitle: { // Restored missing sectionTitle style
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', 
    marginBottom: SPACING.l,
    rowGap: SPACING.l,
  },
  actionBtn: {
    width: '23%', // ~1/4th of screen width
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  actionIconBox: {
    width: 60,
    height: 60,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: COLORS.glassLight,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    ...SHADOWS.small,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    width: '100%',
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
});