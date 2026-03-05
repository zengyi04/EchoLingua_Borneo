import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Linking, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserProfile, getAverageScoreByDifficulty } from '../services/scoringService';
import { WORLD_LANGUAGES, getBorneoLanguages, getLanguagesByRegion } from '../constants/languages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const USER_STORAGE_KEY = '@echolingua_current_user';
const USERS_DB_KEY = '@echolingua_users_database';

// Group languages by region for organized display
const LANGUAGE_GROUPS = [
  { title: 'Indigenous Borneo', languages: getBorneoLanguages() },
  { title: 'Southeast Asia', languages: getLanguagesByRegion('Southeast Asia') },
  { title: 'Major World Languages', languages: WORLD_LANGUAGES.filter(l => l.region === 'Global' || ['mandarin', 'spanish', 'hindi', 'arabic', 'french', 'german', 'japanese', 'korean', 'portuguese', 'russian'].includes(l.id)) },
  { title: 'East Asia', languages: getLanguagesByRegion('East Asia').filter(l => !['mandarin', 'japanese', 'korean'].includes(l.id)) },
  { title: 'South Asia', languages: getLanguagesByRegion('South Asia').filter(l => l.id !== 'hindi') },
  { title: 'Europe', languages: WORLD_LANGUAGES.filter(l => l.region.includes('Europe') && !['french', 'german', 'russian'].includes(l.id)) },
  { title: 'Middle East & Africa', languages: WORLD_LANGUAGES.filter(l => l.region.includes('Middle East') || l.region.includes('Africa')) },
  { title: 'Americas', languages: WORLD_LANGUAGES.filter(l => l.region.includes('America')) },
  { title: 'Oceania', languages: getLanguagesByRegion('Oceania') },
];

export default function ProfileScreen() {
  const { theme, updateTheme, themeMode } = useTheme();
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [easyAvg, setEasyAvg] = useState(0);
  const [mediumAvg, setMediumAvg] = useState(0);
  const [hardAvg, setHardAvg] = useState(0);
  const [showLangOptions, setShowLangOptions] = useState(false);
  const [currentLang, setCurrentLang] = useState('Kadazan-Dusun');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [settings, setSettings] = useState({
    dailyReminders: true,
    achievements: true,
    autoplayAudio: true,
  });

  // Load user profile on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      // Load current user from AsyncStorage
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      }

      const profile = await getUserProfile();
      setUserProfile(profile);
      
      // Load averages by difficulty
      const easy = await getAverageScoreByDifficulty('easy');
      const medium = await getAverageScoreByDifficulty('medium');
      const hard = await getAverageScoreByDifficulty('hard');
      
      setEasyAvg(easy);
      setMediumAvg(medium);
      setHardAvg(hard);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(USER_STORAGE_KEY);
              // Reset navigation to Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Failed to logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.topBarBackButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.text }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            <Text style={[styles.avatarText, { color: theme.surface }]}>
              {currentUser?.fullName 
                ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : 'JD'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>{currentUser?.fullName || 'User Profile'}</Text>
          {userProfile && (
            <>
              <Text style={[styles.userLevel, { color: theme.textSecondary }]}>{userProfile.title}</Text>
              <Text style={[styles.levelType, { color: theme.primary }]}>{userProfile.badge} {userProfile.levelType}</Text>
              <View style={[styles.pointsContainer, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={[styles.pointsText, { color: theme.text }]}>{userProfile.totalPoints} Points</Text>
              </View>
            </>
          )}
        </View>

        {userProfile && (
          <TouchableOpacity 
            style={[styles.statsButton, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={() => setShowStats(true)}
          >
            <View style={styles.statsContent}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>{userProfile.quizzesCompleted}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Quizzes</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>{userProfile.scenariosCompleted}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Scenarios</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>Lvl {userProfile.level}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Current</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={() => setShowLangOptions((prev) => !prev)}
        >
          <Ionicons name="globe-outline" size={24} color={theme.text} />
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: theme.text }]}>Language Preference</Text>
            <Text style={[styles.menuSubtext, { color: theme.textSecondary }]}>{currentLang}</Text>
          </View>
          <Ionicons name={showLangOptions ? 'chevron-down' : 'chevron-forward'} size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {showLangOptions && (
          <ScrollView style={[styles.langDropdown, { backgroundColor: theme.surface }]} nestedScrollEnabled={true}>
            {LANGUAGE_GROUPS.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.langGroup}>
                <Text style={[styles.langGroupTitle, { backgroundColor: theme.surfaceVariant, color: theme.primary }]}>{group.title}</Text>
                {group.languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.id}
                    style={styles.langOption}
                    onPress={() => {
                      setCurrentLang(lang.label);
                      setShowLangOptions(false);
                    }}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langOptionText, { color: theme.text }]}>{lang.label}</Text>
                    {lang.indigenous && <Text style={[styles.indigenousBadge, { backgroundColor: theme.surfaceVariant, color: theme.accent }]}>Indigenous</Text>}
                    {currentLang === lang.label && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text} />
          <Text style={[styles.menuListItem, { color: theme.text }]}>General Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={() => setShowHelp(true)}
        >
          <Ionicons name="help-circle-outline" size={24} color={theme.text} />
          <Text style={[styles.menuListItem, { color: theme.text }]}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.error, shadowColor: theme.error, elevation: 4 }]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* User Signup Info Section */}
        {currentUser && (
          <View style={styles.userInfoSection}>
            <Text style={[styles.userInfoSectionTitle, { color: theme.text }]}>Account Information</Text>
            <View style={[styles.userInfoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="mail-outline" size={18} color={theme.primary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
                </View>
                <Text style={[styles.infoValue, { color: theme.text }]}>{currentUser.email}</Text>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="people-outline" size={18} color={theme.primary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Community</Text>
                </View>
                <Text style={[styles.infoValue, { color: theme.text }]}>{currentUser.community || 'Not set'}</Text>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="language" size={18} color={theme.primary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Languages</Text>
                </View>
                <Text style={[styles.infoValue, { color: theme.text }]}>{Array.isArray(currentUser.languages) && currentUser.languages.length > 0 ? currentUser.languages.join(', ') : 'Not set'}</Text>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="cake-outline" size={18} color={theme.primary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Age</Text>
                </View>
                <Text style={[styles.infoValue, { color: theme.text }]}>{currentUser.age || 'Not set'}</Text>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Joined</Text>
                </View>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {currentUser.joinedAt 
                    ? new Date(currentUser.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Not set'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showStats} animationType="slide" transparent onRequestClose={() => setShowStats(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Statistics</Text>
              <TouchableOpacity onPress={() => setShowStats(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {userProfile && (
                <>
                  <View style={styles.statSection}>
                    <Text style={[styles.statSectionTitle, { color: theme.text }]}>Quiz Performance by Difficulty</Text>
                    <View style={styles.difficultyStats}>
                      <View style={styles.diffStat}>
                        <Text style={[styles.diffLabel, { color: theme.text }]}>Easy</Text>
                        <View style={[styles.diffScore, { borderTopColor: '#4CAF50', backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                          <Text style={[styles.diffValue, { color: theme.text }]}>{easyAvg}%</Text>
                        </View>
                      </View>
                      <View style={styles.diffStat}>
                        <Text style={[styles.diffLabel, { color: theme.text }]}>Medium</Text>
                        <View style={[styles.diffScore, { borderTopColor: '#FF9800', backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                          <Text style={[styles.diffValue, { color: theme.text }]}>{mediumAvg}%</Text>
                        </View>
                      </View>
                      <View style={styles.diffStat}>
                        <Text style={[styles.diffLabel, { color: theme.text }]}>Hard</Text>
                        <View style={[styles.diffScore, { borderTopColor: '#E53935', backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                          <Text style={[styles.diffValue, { color: theme.text }]}>{hardAvg}%</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statSection}>
                    <Text style={[styles.statSectionTitle, { color: theme.text }]}>Level Progression</Text>
                    <View style={[styles.levelInfo, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                      <View style={[styles.levelRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.levelRowLabel, { color: theme.textSecondary }]}>Current Level:</Text>
                        <Text style={[styles.levelRowValue, { color: theme.primary }]}>{userProfile.level}</Text>
                      </View>
                      <View style={[styles.levelRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.levelRowLabel, { color: theme.textSecondary }]}>Type:</Text>
                        <Text style={[styles.levelRowValue, { color: theme.primary }]}>{userProfile.levelType}</Text>
                      </View>
                      <View style={[styles.levelRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.levelRowLabel, { color: theme.textSecondary }]}>Total Points:</Text>
                        <Text style={[styles.levelRowValue, { color: theme.primary }]}>{userProfile.totalPoints}</Text>
                      </View>
                      <View style={[styles.levelRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.levelRowLabel, { color: theme.textSecondary }]}>Quizzes Completed:</Text>
                        <Text style={[styles.levelRowValue, { color: theme.primary }]}>{userProfile.quizzesCompleted}</Text>
                      </View>
                      <View style={[styles.levelRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.levelRowLabel, { color: theme.textSecondary }]}>Scenarios Practiced:</Text>
                        <Text style={[styles.levelRowValue, { color: theme.primary }]}>{userProfile.scenariosCompleted}</Text>
                      </View>
                    </View>
                  </View>

                  {userProfile.levelMap && (
                    <View style={styles.statSection}>
                      <Text style={[styles.statSectionTitle, { color: theme.text }]}>Quiz Achievements</Text>
                      <View style={styles.achievementsList}>
                        {['easy_1', 'easy_2', 'medium_1', 'medium_2', 'hard_1', 'hard_2'].map((key) => {
                          const [difficulty, quizNum] = key.split('_');
                          const data = userProfile.levelMap[key];
                          const avgScore = data ? Math.round(data.totalScore / data.attempts) : 0;
                          const passed = avgScore > 50;
                          const levelNames = {
                            'easy_1': 'Beginner Level 1',
                            'easy_2': 'Beginner Level 2',
                            'medium_1': 'Intermediate Level 1',
                            'medium_2': 'Intermediate Level 2',
                            'hard_1': 'Advanced Level 1',
                            'hard_2': 'Advanced Level 2',
                          };
                          const emojis = {
                            'easy_1': '🌿',
                            'easy_2': '🌱',
                            'medium_1': '🌳',
                            'medium_2': '🌲',
                            'hard_1': '♻️',
                            'hard_2': '👑',
                          };
                          
                          return (
                            <View key={key} style={[styles.achievementItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }, passed && { backgroundColor: theme.card, borderColor: theme.success }]}>
                              <Text style={styles.achievementEmoji}>{emojis[key]}</Text>
                              <View style={styles.achievementInfo}>
                                <Text style={[styles.achievementTitle, { color: theme.textSecondary }, passed && { color: theme.text }]}>
                                  {levelNames[key]}
                                </Text>
                                <Text style={[styles.achievementDetail, { color: theme.textSecondary }]}>
                                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz {quizNum}
                                  {data ? ` • ${avgScore}% avg` : ' • Not attempted'}
                                </Text>
                              </View>
                              {passed && <Ionicons name="checkmark-circle" size={24} color={theme.success} />}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>General Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
            </View>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.toggleRow, { backgroundColor: theme.glassMedium, borderColor: theme.border }]}>
                <View style={styles.toggleLeft}><Ionicons name="alarm" size={20} color={theme.primary} /><Text style={[styles.toggleText, { color: theme.text }]}>Daily Reminders</Text></View>
                <Switch value={settings.dailyReminders} onValueChange={() => toggle('dailyReminders')} trackColor={{ false: '#767577', true: theme.primary }} thumbColor={settings.dailyReminders ? '#fff' : '#f4f3f4'} />
              </View>
              <View style={[styles.toggleRow, { backgroundColor: theme.glassMedium, borderColor: theme.border }]}>
                <View style={styles.toggleLeft}><Ionicons name="trophy" size={20} color={theme.accent} /><Text style={[styles.toggleText, { color: theme.text }]}>Achievement Notifications</Text></View>
                <Switch value={settings.achievements} onValueChange={() => toggle('achievements')} trackColor={{ false: '#767577', true: theme.primary }} thumbColor={settings.achievements ? '#fff' : '#f4f3f4'} />
              </View>
              <View style={[styles.toggleRow, { backgroundColor: theme.glassMedium, borderColor: theme.border }]}>
                <View style={styles.toggleLeft}><Ionicons name="volume-high" size={20} color={theme.secondary} /><Text style={[styles.toggleText, { color: theme.text }]}>Auto-play Audio</Text></View>
                <Switch value={settings.autoplayAudio} onValueChange={() => toggle('autoplayAudio')} trackColor={{ false: '#767577', true: theme.primary }} thumbColor={settings.autoplayAudio ? '#fff' : '#f4f3f4'} />
              </View>

              <View style={{ marginTop: SPACING.m, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SPACING.m }}>
                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: SPACING.s, color: theme.text }]}>Appearance</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.s }}>
                  {['light', 'dark', 'system'].map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => updateTheme(mode)}
                      style={{
                        flex: 1,
                        padding: SPACING.s,
                        borderRadius: SPACING.s,
                        backgroundColor: themeMode === mode ? theme.primary : theme.glassMedium,
                        alignItems: 'center',
                        borderColor: theme.border,
                        borderWidth: 1,
                        justifyContent: 'center'
                      }}
                    >
                      <Ionicons 
                        name={mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'settings-outline'} 
                        size={20} 
                        color={themeMode === mode ? '#FFF' : theme.text} 
                      />
                      <Text style={{ marginTop: 4, color: themeMode === mode ? '#FFF' : theme.text, fontSize: 12, textTransform: 'capitalize', fontWeight: '600' }}>
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showHelp} animationType="slide" transparent onRequestClose={() => setShowHelp(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Help & Support</Text>
              <TouchableOpacity onPress={() => setShowHelp(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity style={[styles.contactItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]} onPress={() => Linking.openURL('tel:0169515429')}>
                <Ionicons name="call" size={20} color={theme.secondary} />
                <View style={styles.contactTextWrap}><Text style={[styles.contactLabel, { color: theme.textSecondary }]}>Phone</Text><Text style={[styles.contactValue, { color: theme.text }]}>0169515429</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]} onPress={() => Linking.openURL('https://wa.me/60169515429')}>
                <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
                <View style={styles.contactTextWrap}><Text style={[styles.contactLabel, { color: theme.textSecondary }]}>WhatsApp</Text><Text style={[styles.contactValue, { color: theme.text }]}>0169515429</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]} onPress={() => Linking.openURL('mailto:zengyiham@gmail.com')}>
                <Ionicons name="mail" size={20} color={theme.accent} />
                <View style={styles.contactTextWrap}><Text style={[styles.contactLabel, { color: theme.textSecondary }]}>Email</Text><Text style={[styles.contactValue, { color: theme.text }]}>zengyiham@gmail.com</Text></View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportButton, { backgroundColor: theme.error }]}
                onPress={() =>
                  Alert.alert('Report a Bug', 'Choose channel', [
                    { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/60169515429?text=Bug%20Report%20for%20EchoLingua%3A%20') },
                    { text: 'Email', onPress: () => Linking.openURL('mailto:zengyiham@gmail.com?subject=Bug Report') },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
              >
                <Ionicons name="bug" size={20} color={theme.surface} />
                <Text style={[styles.reportButtonText, { color: theme.surface }]}>Report a Bug</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportButton, { backgroundColor: theme.accent }]}
                onPress={() =>
                  Alert.alert('Suggest Improvement', 'Choose channel', [
                    { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/60169515429?text=Improvement%20Suggestion%20for%20EchoLingua%3A%20') },
                    { text: 'Email', onPress: () => Linking.openURL('mailto:zengyiham@gmail.com?subject=EchoLingua Improvement Suggestion') },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
              >
                <Ionicons name="language" size={20} color={theme.surface} />
                <Text style={[styles.reportButtonText, { color: theme.surface }]}>Suggest Improvements</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarBackButton: { padding: SPACING.xs, marginRight: SPACING.s },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  content: { padding: SPACING.l, paddingBottom: SPACING.xl },
  profileCard: { backgroundColor: COLORS.glassLight, borderColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderRadius: SPACING.l, padding: SPACING.l, alignItems: 'center', marginBottom: SPACING.l, ...SHADOWS.small },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.s },
  avatarText: { fontSize: 28, fontWeight: '700', color: COLORS.surface },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  userLevel: { fontSize: 13, color: COLORS.textSecondary },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.s,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.glassLight,
    borderRadius: 20,
  },
  pointsText: { 
    fontSize: 14, 
    fontWeight: '600',
    color: COLORS.text, 
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.m },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glassLight, borderColor: 'rgba(255, 255, 255, 0.5)', borderWidth: 1, borderRadius: SPACING.m, padding: SPACING.m, marginBottom: SPACING.s, ...SHADOWS.small },
  menuContent: { flex: 1, marginLeft: SPACING.s },
  menuText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  menuSubtext: { fontSize: 12, color: COLORS.textSecondary },
  menuListItem: { flex: 1, marginLeft: SPACING.s, fontSize: 15, fontWeight: '700', color: COLORS.text },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SPACING.l,
    marginTop: SPACING.m,
    gap: SPACING.s,
    ...SHADOWS.medium,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  langDropdown: { backgroundColor: COLORS.surface, borderRadius: SPACING.m, padding: SPACING.s, marginBottom: SPACING.s, maxHeight: 400 },
  langGroup: { marginBottom: SPACING.m },
  langGroupTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', paddingHorizontal: SPACING.s, paddingVertical: SPACING.xs, backgroundColor: COLORS.glassLight, borderRadius: SPACING.s, marginBottom: SPACING.xs },
  langOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.s, gap: SPACING.s },
  langFlag: { fontSize: 20 },
  langOptionText: { fontSize: 14, color: COLORS.text, flex: 1 },
  indigenousBadge: { fontSize: 10, color: COLORS.accent, backgroundColor: COLORS.glassLight, paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: SPACING.l, borderTopRightRadius: SPACING.l, maxHeight: '85%', borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.l, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalContent: { padding: SPACING.l },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.glassMedium, borderColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 1, borderRadius: SPACING.s, padding: SPACING.m, marginBottom: SPACING.s },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, flex: 1 },
  toggleText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glassLight, borderColor: 'rgba(255, 255, 255, 0.5)', borderWidth: 1, borderRadius: SPACING.s, padding: SPACING.m, marginBottom: SPACING.s },
  contactTextWrap: { marginLeft: SPACING.s },
  contactLabel: { fontSize: 12, color: COLORS.textSecondary },
  contactValue: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  reportButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.error, borderRadius: SPACING.s, paddingVertical: SPACING.m, gap: SPACING.s, marginTop: SPACING.s },
  reportButtonText: { color: COLORS.surface, fontWeight: '700' },
  statsButton: { backgroundColor: COLORS.glassLight, borderColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderRadius: SPACING.m, marginBottom: SPACING.l, ...SHADOWS.small },
  statsContent: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: SPACING.m },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: SPACING.xs },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  statSection: { marginBottom: SPACING.l },
  statSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.m },
  difficultyStats: { flexDirection: 'row', gap: SPACING.s, justifyContent: 'space-around' },
  diffStat: { flex: 1, alignItems: 'center' },
  diffLabel: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginBottom: SPACING.xs },
  diffScore: { width: '100%', borderTopWidth: 4, paddingTop: SPACING.s, alignItems: 'center', backgroundColor: COLORS.glassMedium, borderColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 1, borderRadius: SPACING.s, paddingVertical: SPACING.m },
  diffValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  levelInfo: { backgroundColor: COLORS.glassMedium, borderColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 1, borderRadius: SPACING.m, padding: SPACING.m },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.s, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  levelRowLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  levelRowValue: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  levelType: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: SPACING.xs },
  pointsText: { fontSize: 11, color: COLORS.textSecondary, marginTop: SPACING.xs },
  achievementsList: { gap: SPACING.s },
  achievementItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glassLight, borderRadius: SPACING.s, padding: SPACING.m, gap: SPACING.s, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  userInfoSection: { marginTop: SPACING.xl, marginBottom: SPACING.l },
  userInfoSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.m },
  userInfoCard: { backgroundColor: COLORS.glassLight, borderColor: 'rgba(255, 255, 255, 0.5)', borderWidth: 1, borderRadius: SPACING.m, padding: SPACING.m, ...SHADOWS.small },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.s },
  infoLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: SPACING.s },
  infoDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  achievementPassed: { backgroundColor: COLORS.glassMedium, borderColor: COLORS.success, borderWidth: 2 },
  achievementEmoji: { fontSize: 32 },
  achievementInfo: { flex: 1 },
  achievementTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  achievementTitlePassed: { color: COLORS.text },
  achievementDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
