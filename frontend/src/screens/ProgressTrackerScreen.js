import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function ProgressTrackerScreen({ navigation, route }) {
  const { theme } = useTheme();
  const selectedFamilyAccount = route?.params?.familyAccount || null;
  const [progressData, setProgressData] = useState({
    vocabularyLearned: 0,
    totalVocabulary: 500,
    quizzesTaken: 0,
    quizzesScore: 0,
    pronunciationAccuracy: 0,
    pronunciationAttempts: 0,
    dailyStreak: 0,
    longestStreak: 0,
    totalLearningTime: 0,
    storiesRead: 0,
    recordingsMade: 0,
    level: 'Beginner',
    xp: 0,
    nextLevelXP: 1000,
  });

  const [weeklyActivity, setWeeklyActivity] = useState([
    { day: 'Mon', active: true, xp: 120 },
    { day: 'Tue', active: true, xp: 85 },
    { day: 'Wed', active: false, xp: 0 },
    { day: 'Thu', active: true, xp: 150 },
    { day: 'Fri', active: true, xp: 95 },
    { day: 'Sat', active: false, xp: 0 },
    { day: 'Sun', active: true, xp: 110 },
  ]);

  const [achievements, setAchievements] = useState([
    { id: '1', title: 'First Steps', description: 'Complete your first lesson', unlocked: true, icon: 'star' },
    { id: '2', title: 'Word Master', description: 'Learn 50 vocabulary words', unlocked: true, icon: 'book' },
    { id: '3', title: 'Quiz Champion', description: 'Score 100% on a quiz', unlocked: false, icon: 'trophy' },
    { id: '4', title: 'Pronunciation Pro', description: 'Achieve 90% pronunciation accuracy', unlocked: false, icon: 'mic' },
    { id: '5', title: 'Story Teller', description: 'Read 10 stories', unlocked: true, icon: 'book-open' },
    { id: '6', title: 'Streak Master', description: 'Maintain a 7-day streak', unlocked: false, icon: 'flame' },
    { id: '7', title: 'Recording Artist', description: 'Make 20 recordings', unlocked: true, icon: 'microphone' },
    { id: '8', title: 'Language Guardian', description: 'Complete all levels', unlocked: false, icon: 'shield' },
  ]);

  const [selectedTab, setSelectedTab] = useState('overview'); // overview, achievements, stats
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const checkInScale = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadProgressData();
    checkDailyCheckIn();
  }, []);

  const checkDailyCheckIn = async () => {
    try {
      const lastCheckIn = await AsyncStorage.getItem('@last_check_in_date');
      const today = new Date().toDateString();
      
      if (lastCheckIn === today) {
        setCheckedInToday(true);
        setCanCheckIn(false);
      } else {
        setCheckedInToday(false);
        setCanCheckIn(true);
      }
    } catch (error) {
      console.error('Error checking daily check-in:', error);
    }
  };

  const handleDailyCheckIn = async () => {
    if (!canCheckIn || checkedInToday) {
      Alert.alert(
        'Already Checked In',
        'You have already checked in today. Come back tomorrow for your next reward! 🎁'
      );
      return;
    }

    // Animate button press
    Animated.sequence([
      Animated.timing(checkInScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(checkInScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const today = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      const POINTS_REWARD = 50; // Points awarded for daily check-in
      const XP_REWARD = 25; // XP awarded for daily check-in

      const lastCheckIn = await AsyncStorage.getItem('@last_check_in_date');
      const currentStreakRaw = await AsyncStorage.getItem('@dailyStreak');
      const currentStreak = Number.parseInt(currentStreakRaw || '0', 10) || 0;

      let nextStreak = 1;
      if (lastCheckIn === yesterdayStr) {
        nextStreak = currentStreak + 1;
      }

      const longestRaw = await AsyncStorage.getItem('@longestStreak');
      const currentLongest = Number.parseInt(longestRaw || '0', 10) || 0;
      const nextLongest = Math.max(currentLongest, nextStreak);
      
      // Update check-in date
      await AsyncStorage.setItem('@last_check_in_date', today);
      await AsyncStorage.setItem('@lastActiveDate', today);
      await AsyncStorage.setItem('@dailyStreak', String(nextStreak));
      await AsyncStorage.setItem('@longestStreak', String(nextLongest));
      
      // Award points and XP
      const currentXP = progressData.xp;
      const newXP = currentXP + XP_REWARD;
      
      // Load and update user data
      const userDataStr = await AsyncStorage.getItem('@echolingua_current_user');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        const currentPoints = userData.points || 0;
        userData.points = currentPoints + POINTS_REWARD;
        await AsyncStorage.setItem('@echolingua_current_user', JSON.stringify(userData));
        
        // Update users database
        const usersDbStr = await AsyncStorage.getItem('@echolingua_users_database');
        if (usersDbStr) {
          const usersDb = JSON.parse(usersDbStr);
          const userIndex = usersDb.findIndex(u => u.id === userData.id);
          if (userIndex !== -1) {
            usersDb[userIndex].points = userData.points;
            await AsyncStorage.setItem('@echolingua_users_database', JSON.stringify(usersDb));
          }
        }
      }
      
      // Update state
      setProgressData(prev => ({
        ...prev,
        xp: newXP,
        dailyStreak: nextStreak,
        longestStreak: nextLongest,
      }));
      setCheckedInToday(true);
      setCanCheckIn(false);
      
      // Show success alert
      Alert.alert(
        '🎉 Daily Check-In Complete!',
        `Great job! You earned:\n\n🎁 ${POINTS_REWARD} Points\n⭐ ${XP_REWARD} XP\n🔥 Daily streak: ${nextStreak}\n\nCheck in once per day to keep your streak growing.`,
        [{ text: 'Awesome!' }]
      );
      
      // Reload progress data to update streak
      await loadProgressData();
    } catch (error) {
      console.error('Error handling daily check-in:', error);
      Alert.alert('Error', 'Failed to process check-in. Please try again.');
    }
  };

  const loadProgressData = async () => {
    try {
      // Load data from all sources
      const quizResultsStr = await AsyncStorage.getItem('@echolingua_quiz_results');
      const scenarioScoresStr = await AsyncStorage.getItem('@echolingua_scenario_results');
      const recordingsStr = await AsyncStorage.getItem('@echolingua_recordings');
      const storiesStr = await AsyncStorage.getItem('@echolingua_stories');
      const lastActive = await AsyncStorage.getItem('@lastActiveDate');
      const learningTimeStr = await AsyncStorage.getItem('@total_learning_time');
      const pronunciationAttemptsStr = await AsyncStorage.getItem('@echolingua_pronunciation_attempts');
      const currentUserRaw = await AsyncStorage.getItem('@echolingua_current_user');
      const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;

      let vocabCount = 0;
      let totalQuizzes = 0;
      let totalScore = 0;
      let pronunciationScore = 0;
      let pronunciationCount = 0;
      let storiesCount = 0;
      let recordingsCount = 0;
      let totalXP = 0;

      // Load quiz results
      if (quizResultsStr) {
        const results = JSON.parse(quizResultsStr);
        totalQuizzes = results.length;
        results.forEach((result) => {
          totalScore += result.score || 0;
          vocabCount += result.totalQuestions || 0;
          totalXP += (result.score || 0) * 10;
        });
      }

      // Load pronunciation attempts from vocabulary practice
      if (pronunciationAttemptsStr) {
        const allAttempts = JSON.parse(pronunciationAttemptsStr);
        // Filter attempts for current user
        const userAttempts = currentUser?.id
          ? allAttempts.filter((attempt) => attempt.userId === currentUser.id)
          : allAttempts;
        pronunciationCount = userAttempts.length;
        
        // Calculate average accuracy
        if (pronunciationCount > 0) {
          const totalAccuracy = userAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0);
          pronunciationScore = totalAccuracy / pronunciationCount;
        }
        
        // Add XP for pronunciation practice
        totalXP += pronunciationCount * 10;
      }

      // Load scenario/pronunciation scores (legacy - keep for backwards compatibility)
      if (scenarioScoresStr) {
        const scores = JSON.parse(scenarioScoresStr);
        scores.forEach((scoreData) => {
          if (scoreData.pronunciation && pronunciationCount === 0) {
            // Only use if no pronunciation attempts from vocabulary
            pronunciationScore += scoreData.pronunciation;
            pronunciationCount++;
          }
          totalXP += (scoreData.overall || 0) * 5;
        });
      }

      // Load recordings count
      if (recordingsStr) {
        const recordings = JSON.parse(recordingsStr);
        recordingsCount = recordings.length;
        totalXP += recordingsCount * 15;
      }

      // Load stories read count
      if (storiesStr) {
        const stories = JSON.parse(storiesStr);
        storiesCount = stories.length;
        totalXP += storiesCount * 10;
      }

      // Load total learning time (in minutes)
      const totalLearningTime = learningTimeStr ? parseInt(learningTimeStr) : 0;

      // Read streak values and only reset when streak is genuinely broken.
      const today = new Date().toDateString();
      const lastCheckIn = await AsyncStorage.getItem('@last_check_in_date');
      let streak = Number.parseInt((await AsyncStorage.getItem('@dailyStreak')) || '0', 10) || 0;
      let longestStreak = Number.parseInt((await AsyncStorage.getItem('@longestStreak')) || '0', 10) || 0;

      if (lastCheckIn) {
        const lastDate = new Date(lastCheckIn);
        const todayDate = new Date(today);
        const diffTime = todayDate - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          streak = 0;
          await AsyncStorage.setItem('@dailyStreak', '0');
        }
      }

      if (!lastCheckIn && lastActive) {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diffTime = todayDate - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 1 && streak > 0) {
          streak = 0;
          await AsyncStorage.setItem('@dailyStreak', '0');
        }
      }

      // Determine level based on XP
      let level = 'Beginner';
      let nextLevelXP = 1000;
      if (totalXP >= 5000) {
        level = 'Expert';
        nextLevelXP = 10000;
      } else if (totalXP >= 3000) {
        level = 'Advanced';
        nextLevelXP = 5000;
      } else if (totalXP >= 1000) {
        level = 'Intermediate';
        nextLevelXP = 3000;
      }

      // Calculate average pronunciation accuracy
      // pronunciationScore is already the average accuracy percentage (0-100)
      const avgPronunciation = pronunciationCount > 0
        ? Math.round(pronunciationScore)
        : 0;

      setProgressData({
        vocabularyLearned: vocabCount,
        totalVocabulary: 500,
        quizzesTaken: totalQuizzes,
        quizzesScore: totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0,
        pronunciationAccuracy: avgPronunciation,
        pronunciationAttempts: pronunciationCount,
        dailyStreak: streak,
        longestStreak: longestStreak,
        totalLearningTime: totalLearningTime, // Use actual session time
        storiesRead: storiesCount,
        recordingsMade: recordingsCount,
        level: level,
        xp: totalXP,
        nextLevelXP: nextLevelXP,
      });

      // Update achievements based on progress
      const updatedAchievements = achievements.map((achievement) => {
        if (achievement.id === '2' && vocabCount >= 50) {
          return { ...achievement, unlocked: true };
        }
        if (achievement.id === '3' && quizResultsStr) {
          // Check if user scored 100% on any quiz
          const results = JSON.parse(quizResultsStr);
          const perfectScore = results.some(r => r.percentage === 100 || (r.score === r.totalQuestions));
          return { ...achievement, unlocked: perfectScore };
        }
        if (achievement.id === '4' && avgPronunciation >= 90) {
          return { ...achievement, unlocked: true };
        }
        if (achievement.id === '5' && storiesCount >= 10) {
          return { ...achievement, unlocked: true };
        }
        if (achievement.id === '6' && streak >= 7) {
          return { ...achievement, unlocked: true };
        }
        if (achievement.id === '7' && recordingsCount >= 20) {
          return { ...achievement, unlocked: true };
        }
        return achievement;
      });
      setAchievements(updatedAchievements);
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  const getProgressPercentage = (current, total) => {
    return Math.min(Math.round((current / total) * 100), 100);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'Expert':
        return '#FFD700';
      case 'Advanced':
        return '#FF6B6B';
      case 'Intermediate':
        return '#4ECDC4';
      default:
        return COLORS.primary;
    }
  };

  const renderOverviewTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Level & XP Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.levelHeader}>
          <View>
            <Text style={[styles.levelLabel, { color: theme.textSecondary }]}>Current Level</Text>
            <Text style={[styles.levelText, { color: getLevelColor(progressData.level) }]}>
              {progressData.level}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="star-circle"
            size={48}
            color={getLevelColor(progressData.level)}
          />
        </View>

        <View style={styles.xpProgressContainer}>
          <View style={[styles.xpBar, { backgroundColor: theme.surfaceVariant }]}>
            <View
              style={[
                styles.xpBarFill,
                {
                  width: `${getProgressPercentage(progressData.xp, progressData.nextLevelXP)}%`,
                  backgroundColor: getLevelColor(progressData.level),
                },
              ]}
            />
          </View>
          <Text style={[styles.xpText, { color: theme.textSecondary }]}>
            {progressData.xp} / {progressData.nextLevelXP} XP
          </Text>
        </View>
      </View>

      {/* Daily Streak Card */}
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={handleDailyCheckIn}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <Animated.View style={{ transform: [{ scale: checkInScale }] }}>
          <View style={styles.cardHeader}>
            <Ionicons name="flame" size={24} color="#FF6B35" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Daily Streak</Text>
            {!checkedInToday && canCheckIn && (
              <View style={[styles.checkInBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.checkInBadgeText}>+1 Daily Check-In</Text>
              </View>
            )}
            {checkedInToday && (
              <View style={[styles.checkInBadge, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.checkInBadgeText}>Checked In Today</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Text style={[styles.streakStatusText, { color: theme.textSecondary }]}> 
          {checkedInToday
            ? 'You checked in today. Come back tomorrow for another +1 streak.'
            : 'Tap once per day to increase your streak by +1.'}
        </Text>

        <View style={styles.streakContainer}>
          <View style={styles.streakItem}>
            <Text style={[styles.streakNumber, { color: theme.primary }]}>{progressData.dailyStreak}</Text>
            <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>Current</Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: theme.border }]} />
          <View style={styles.streakItem}>
            <Text style={[styles.streakNumber, { color: theme.primary }]}>{progressData.longestStreak}</Text>
            <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>Longest</Text>
          </View>
        </View>

        {/* Check-in Reward Info */}
        {!checkedInToday && canCheckIn && (
          <View style={[styles.rewardInfo, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
            <Ionicons name="gift" size={20} color={theme.primary} />
            <Text style={[styles.rewardText, { color: theme.text }]}>
              Check in now to earn 50 points + 25 XP!
            </Text>
          </View>
        )}

        {/* Weekly Activity */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>This Week</Text>
        <View style={styles.weeklyActivityContainer}>
          {weeklyActivity.map((day) => (
            <View key={day.day} style={styles.dayContainer}>
              <View
                style={[
                  styles.dayCircle,
                  day.active && { backgroundColor: theme.primary },
                  !day.active && { backgroundColor: theme.surfaceVariant },
                  {
                    opacity: day.xp > 0 ? Math.min(day.xp / 150, 1) : 0.2,
                  },
                ]}
              />
              <Text style={[styles.dayLabel, { color: theme.textSecondary }]}>{day.day}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="book" size={28} color={theme.primary} />
          <Text style={[styles.statNumber, { color: theme.text }]}>{progressData.vocabularyLearned}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Words Learned</Text>
          <View style={[styles.miniProgressBar, { backgroundColor: theme.surfaceVariant }]}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  width: `${getProgressPercentage(
                    progressData.vocabularyLearned,
                    progressData.totalVocabulary
                  )}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <FontAwesome5 name="clipboard-check" size={28} color="#4ECDC4" />
          <Text style={[styles.statNumber, { color: theme.text }]}>{progressData.quizzesTaken}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Quizzes Taken</Text>
          <Text style={[styles.statSubtext, { color: theme.textSecondary }]}>Avg: {progressData.quizzesScore}%</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="mic" size={28} color="#FF6B6B" />
          <Text style={[styles.statNumber, { color: theme.text }]}>{progressData.pronunciationAccuracy}%</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pronunciation</Text>
          <Text style={[styles.statSubtext, { color: theme.textSecondary }]}>{progressData.pronunciationAttempts} attempts</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="time" size={28} color="#FFD93D" />
          <Text style={[styles.statNumber, { color: theme.text }]}>{progressData.totalLearningTime}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Minutes</Text>
          <Text style={[styles.statSubtext, { color: theme.textSecondary }]}>Total time</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <FontAwesome5 name="book-open" size={28} color="#A8DADC" />
          <Text style={[styles.statNumber, { color: theme.text }]}>{progressData.storiesRead}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Stories Read</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="recording" size={28} color="#F4A261" />
          <Text style={[styles.statNumber, { color: theme.text }]}>{progressData.recordingsMade}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Recordings</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderAchievementsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.achievementsContainer}>
        {achievements.map((achievement) => (
          <View
            key={achievement.id}
            style={[styles.achievementCard, { backgroundColor: theme.surface, borderColor: theme.border }, !achievement.unlocked && styles.achievementLocked]}
          >
            <View
              style={[
                styles.achievementIcon,
                { backgroundColor: achievement.unlocked ? theme.primary : theme.surfaceVariant },
              ]}
            >
              <FontAwesome5
                name={achievement.icon}
                size={24}
                color={achievement.unlocked ? theme.background : theme.textSecondary}
              />
            </View>
            <View style={styles.achievementContent}>
              <Text style={[styles.achievementTitle, { color: theme.text }, !achievement.unlocked && { color: theme.textSecondary }]}>
                {achievement.title}
              </Text>
              <Text style={[styles.achievementDescription, { color: theme.textSecondary }]}>
                {achievement.description}
              </Text>
            </View>
            {achievement.unlocked && (
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Detailed Statistics</Text>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Vocabulary Progress</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>
            {progressData.vocabularyLearned} / {progressData.totalVocabulary}
          </Text>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Average Quiz Score</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>{progressData.quizzesScore}%</Text>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Pronunciation Accuracy</Text>
          <View style={styles.detailedStatValueContainer}>
            <Text style={[styles.detailedStatValue, { color: theme.primary }]}>
              {progressData.pronunciationAccuracy}%
            </Text>
            <Text style={[styles.detailedStatSubtext, { color: theme.textSecondary }]}>
              {progressData.pronunciationAttempts} {progressData.pronunciationAttempts === 1 ? 'attempt' : 'attempts'}
            </Text>
          </View>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Current Streak</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>{progressData.dailyStreak} days</Text>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Longest Streak</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>{progressData.longestStreak} days</Text>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Total Learning Time</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>{progressData.totalLearningTime} min</Text>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Stories Read</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>{progressData.storiesRead}</Text>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Recordings Made</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>{progressData.recordingsMade}</Text>
        </View>

        <View style={[styles.detailedStatRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.detailedStatLabel, { color: theme.text }]}>Total XP</Text>
          <Text style={[styles.detailedStatValue, { color: theme.primary }]}>{progressData.xp}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Learning Insights</Text>
        <Text style={[styles.insightText, { color: theme.text }]}>
          🎯 You're doing great! Keep up your {progressData.dailyStreak}-day streak!
        </Text>
        <Text style={[styles.insightText, { color: theme.text }]}>
          📚 You've learned {getProgressPercentage(progressData.vocabularyLearned, progressData.totalVocabulary)}% of available vocabulary.
        </Text>
        <Text style={[styles.insightText, { color: theme.text }]}>
          🎤 Your pronunciation accuracy is {progressData.pronunciationAccuracy}%. Keep practicing!
        </Text>
        <Text style={[styles.insightText, { color: theme.text }]}>
          🏆 {achievements.filter((a) => a.unlocked).length} out of {achievements.length} achievements unlocked!
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'HomeTab' });
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Progress</Text>
        <TouchableOpacity onPress={() => loadProgressData()}>
          <Ionicons name="refresh" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {selectedFamilyAccount && (
        <View style={[styles.familyContextBanner, { backgroundColor: theme.surfaceVariant, borderBottomColor: theme.border }]}> 
          <Text style={[styles.familyContextText, { color: theme.text }]}>Viewing: {selectedFamilyAccount.avatar} {selectedFamilyAccount.name} ({selectedFamilyAccount.role})</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'bar-chart' },
          { key: 'achievements', label: 'Achievements', icon: 'trophy' },
          { key: 'stats', label: 'Stats', icon: 'stats-chart' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab, 
              { backgroundColor: theme.surface },
              selectedTab === tab.key && { backgroundColor: theme.primary }
            ]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={selectedTab === tab.key ? theme.background : theme.textSecondary}
            />
            <Text style={[styles.tabText, { color: theme.textSecondary }, selectedTab === tab.key && { color: theme.background }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'achievements' && renderAchievementsTab()}
        {selectedTab === 'stats' && renderStatsTab()}
      </View>
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
  familyContextBanner: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
  },
  familyContextText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    gap: SPACING.s,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.s,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.l,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  levelLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  levelText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  xpProgressContainer: {
    marginTop: SPACING.s,
  },
  xpBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  checkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  checkInBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.m,
    borderWidth: 1,
    gap: SPACING.s,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  streakStatusText: {
    fontSize: 13,
    marginBottom: SPACING.m,
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.l,
  },
  streakItem: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  streakLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  streakDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  weeklyActivityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    marginBottom: SPACING.xs,
  },
  dayCircleActive: {
    backgroundColor: COLORS.primary,
  },
  dayLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.m,
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: (width - SPACING.l * 2 - SPACING.m) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.s,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  miniProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: SPACING.s,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  achievementsContainer: {
    marginBottom: SPACING.xl,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.small,
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  achievementDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  textLocked: {
    color: '#999',
  },
  detailedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailedStatLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  detailedStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailedStatValueContainer: {
    alignItems: 'flex-end',
  },
  detailedStatSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.m,
  },
});
