import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SIDEBAR_WIDTH = 132;
const COLLAPSED_SIDEBAR_WIDTH = 52;

const QUIZ_RESULTS_KEY = '@echolingua_quiz_results';
const SCENARIO_RESULTS_KEY = '@echolingua_scenario_results';
const RECORDINGS_KEY = '@echolingua_recordings';
const USERS_DATABASE_KEY = '@echolingua_users_database';
const TOTAL_LEARNING_TIME_KEY = '@total_learning_time';

const CHART_DATA = [
  { month: 'Jan', value: 65, label: '65' },
  { month: 'Feb', value: 82, label: '82' },
  { month: 'Mar', value: 45, label: '45' },
  { month: 'Apr', value: 93, label: '93' },
  { month: 'May', value: 78, label: '78' },
  { month: 'Jun', value: 100, label: '100' },
];

const LEADERBOARD = [
  { id: '1', rank: 1, name: 'Sarah Iban', avatar: 'SI', points: 2450, contributions: 87, badge: 'Elder' },
  { id: '2', rank: 2, name: 'Michael Dayak', avatar: 'MD', points: 2180, contributions: 76, badge: 'Elder' },
  { id: '3', rank: 3, name: 'Grace Murut', avatar: 'GM', points: 1950, contributions: 64, badge: 'Learner' },
  { id: '4', rank: 4, name: 'John Lee', avatar: 'JL', points: 1720, contributions: 58, badge: 'Learner' },
  { id: '5', rank: 5, name: 'Maria Kadazan', avatar: 'MK', points: 1580, contributions: 52, badge: 'Elder' },
  { id: '6', rank: 6, name: 'David Wong', avatar: 'DW', points: 1340, contributions: 45, badge: 'Learner' },
  { id: '7', rank: 7, name: 'Lisa Chen', avatar: 'LC', points: 1210, contributions: 41, badge: 'Learner' },
  { id: '8', rank: 8, name: 'Ahmad Bidayuh', avatar: 'AB', points: 1085, contributions: 38, badge: 'Elder' },
];

const SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
  { id: 'contributors', label: 'Contributors', icon: 'people' },
  { id: 'insights', label: 'Insights', icon: 'bulb' },
];

const VITALITY_INPUTS = [
  { id: 'iban', language: 'Iban', speakers: 780000, youthLearningRate: 68, communityActivity: 74 },
  { id: 'bidayuh', language: 'Bidayuh', speakers: 240000, youthLearningRate: 51, communityActivity: 58 },
  { id: 'kadazan', language: 'Kadazan-Dusun', speakers: 200000, youthLearningRate: 64, communityActivity: 71 },
  { id: 'murut', language: 'Murut', speakers: 95000, youthLearningRate: 43, communityActivity: 46 },
  { id: 'penan', language: 'Penan', speakers: 12000, youthLearningRate: 37, communityActivity: 39 },
];

const DIALECT_VARIATION_DATA = [
  {
    id: 'iban-dialect',
    language: 'Iban',
    regions: ['Sri Aman', 'Sibu'],
    examples: [
      { concept: 'eat', regionA: 'makai', regionB: 'ngirup' },
      { concept: 'where', regionA: 'dini', regionB: 'ni' },
      { concept: 'friend', regionA: 'kaban', regionB: 'belayan' },
    ],
  },
  {
    id: 'bidayuh-dialect',
    language: 'Bidayuh',
    regions: ['Bau', 'Serian'],
    examples: [
      { concept: 'water', regionA: 'ayi', regionB: 'sii' },
      { concept: 'house', regionA: 'singo', regionB: 'binah' },
      { concept: 'come', regionA: 'mai', regionB: 'mari' },
    ],
  },
  {
    id: 'kadazan-dialect',
    language: 'Kadazan-Dusun',
    regions: ['Penampang', 'Ranau'],
    examples: [
      { concept: 'yes', regionA: 'oi', regionB: 'aa' },
      { concept: 'child', regionA: 'tanak', regionB: 'anak' },
      { concept: 'rice', regionA: 'parai', regionB: 'wagas' },
    ],
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// AI-inspired weighted model from three indicators: speakers, youth learning, community activity.
const predictVitality = ({ speakers, youthLearningRate, communityActivity }) => {
  const normalizedSpeakers = clamp((Math.log10(Math.max(speakers, 1)) - 3) / 3, 0, 1) * 100;
  const normalizedYouth = clamp(youthLearningRate, 0, 100);
  const normalizedCommunity = clamp(communityActivity, 0, 100);

  const vitalityScore =
    normalizedSpeakers * 0.4 +
    normalizedYouth * 0.35 +
    normalizedCommunity * 0.25;

  if (vitalityScore >= 67) {
    return { level: 'Reviving', score: Math.round(vitalityScore), tone: 'success' };
  }
  if (vitalityScore >= 45) {
    return { level: 'Stable', score: Math.round(vitalityScore), tone: 'accent' };
  }
  return { level: 'Declining', score: Math.round(vitalityScore), tone: 'error' };
};

const detectDialectDifference = (dialectEntry) => {
  const differenceCount = dialectEntry.examples.filter(
    (example) =>
      example.regionA.trim().toLowerCase() !== example.regionB.trim().toLowerCase()
  ).length;
  const ratio = differenceCount / Math.max(dialectEntry.examples.length, 1);
  const score = Math.round(ratio * 100);

  if (score >= 70) {
    return {
      level: 'High Variation',
      teachingTip: 'Teach both variants together with region labels to improve cross-region understanding.',
      tone: 'error',
      score,
    };
  }
  if (score >= 40) {
    return {
      level: 'Moderate Variation',
      teachingTip: 'Introduce base vocabulary first, then add regional alternatives in follow-up lessons.',
      tone: 'accent',
      score,
    };
  }
  return {
    level: 'Low Variation',
    teachingTip: 'Use a shared core list and add small pronunciation notes by region.',
    tone: 'success',
    score,
  };
};

export default function LanguageVitalityDashboard() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [selectedView, setSelectedView] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarAnimation] = useState(new Animated.Value(1));
  const [liveStats, setLiveStats] = useState({
    totalRecordings: 0,
    activeLearners: 0,
    quizzesCompleted: 0,
    practiceSessions: 0,
    learningMinutes: 0,
  });
  const [activeLearnersList, setActiveLearnersList] = useState([]);
  const [activityData, setActivityData] = useState(CHART_DATA);

  const toggleSidebar = () => {
    const toValue = sidebarExpanded ? 0 : 1;
    Animated.spring(sidebarAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
    setSidebarExpanded(!sidebarExpanded);
  };

  const sidebarWidth = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH],
  });

  const parseArray = (raw) => {
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const buildMonthlyActivity = (quizResults, scenarioResults, recordings) => {
    const allEvents = [...quizResults, ...scenarioResults, ...recordings];
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      months.push({
        month: date.toLocaleDateString(undefined, { month: 'short' }),
        key: monthKey,
        value: 0,
      });
    }

    allEvents.forEach((entry) => {
      const dateRaw = entry.createdAt || entry.timestamp || entry.date;
      const parsedDate = dateRaw ? new Date(dateRaw) : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        return;
      }

      const key = `${parsedDate.getFullYear()}-${parsedDate.getMonth()}`;
      const match = months.find((month) => month.key === key);
      if (match) {
        match.value += 1;
      }
    });

    return months.map((month) => ({
      month: month.month,
      value: month.value,
      label: String(month.value),
    }));
  };

  const loadDashboardMetrics = async () => {
    try {
      setIsLoading(true);
      const [quizRaw, scenarioRaw, recordingsRaw, usersRaw, learningMinutesRaw] = await Promise.all([
        AsyncStorage.getItem(QUIZ_RESULTS_KEY),
        AsyncStorage.getItem(SCENARIO_RESULTS_KEY),
        AsyncStorage.getItem(RECORDINGS_KEY),
        AsyncStorage.getItem(USERS_DATABASE_KEY),
        AsyncStorage.getItem(TOTAL_LEARNING_TIME_KEY),
      ]);

      const quizResults = parseArray(quizRaw);
      const scenarioResults = parseArray(scenarioRaw);
      const recordings = parseArray(recordingsRaw);
      const users = parseArray(usersRaw);
      const learningMinutes = Number.parseInt(learningMinutesRaw || '0', 10) || 0;

      const today = new Date().toISOString().split('T')[0];
      const activeLearners = users.filter((user) => {
        if (!user?.lastActive) return false;
        const lastActiveDate = new Date(user.lastActive).toISOString().split('T')[0];
        return lastActiveDate === today;
      });

      setLiveStats({
        totalRecordings: recordings.length,
        activeLearners: activeLearners.length,
        quizzesCompleted: quizResults.length,
        practiceSessions: scenarioResults.length,
        learningMinutes,
      });
      setActiveLearnersList(activeLearners.slice(0, 5));
      setActivityData(buildMonthlyActivity(quizResults, scenarioResults, recordings));
    } catch (error) {
      console.error('Failed to load vitality dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardMetrics();
    }, [])
  );

  const statsCards = useMemo(
    () => [
      {
        id: '1',
        title: 'Total Recordings',
        value: String(liveStats.totalRecordings),
        icon: 'mic',
        colorKey: 'primary',
        change: '+Live',
      },
      {
        id: '2',
        title: 'Active Learners Today',
        value: String(liveStats.activeLearners),
        icon: 'people',
        colorKey: 'success',
        change: '+Live',
      },
      {
        id: '3',
        title: 'Quiz Attempts',
        value: String(liveStats.quizzesCompleted),
        icon: 'help-circle',
        colorKey: 'secondary',
        change: '+Live',
      },
      {
        id: '4',
        title: 'Practice Sessions',
        value: String(liveStats.practiceSessions),
        icon: 'school',
        colorKey: 'accent',
        change: '+Live',
      },
    ],
    [liveStats]
  );

  const vitalityPredictions = useMemo(() => {
    const engagementScore =
      liveStats.quizzesCompleted * 0.8 +
      liveStats.practiceSessions * 1.1 +
      liveStats.totalRecordings * 0.6 +
      liveStats.activeLearners * 1.4 +
      Math.floor(liveStats.learningMinutes / 10);

    const engagementBoost = clamp(engagementScore / 180, 0, 0.2);

    return VITALITY_INPUTS.map((entry) => {
      const adjustedInput = {
        ...entry,
        youthLearningRate: clamp(entry.youthLearningRate + engagementBoost * 40, 0, 100),
        communityActivity: clamp(entry.communityActivity + engagementBoost * 35, 0, 100),
      };

      return {
        ...adjustedInput,
        prediction: predictVitality(adjustedInput),
      };
    });
  }, [liveStats]);
  const dialectPredictions = DIALECT_VARIATION_DATA.map((entry) => ({
    ...entry,
    detection: detectDialectDifference(entry),
  }));

  const getPredictionToneColor = (tone) => {
    if (tone === 'success') return theme.success;
    if (tone === 'error') return theme.error;
    return theme.accent || theme.primary;
  };

  const showOverview = selectedView === 'overview';
  const showAnalytics = selectedView === 'analytics';
  const showContributors = selectedView === 'contributors';
  const showInsights = selectedView === 'insights';
  const statColumns = sidebarExpanded ? 1 : 2;

  const renderStatCard = ({ item }) => {
    const itemColor = theme[item.colorKey] || theme.primary;
    return (
      <View style={[styles.statCard, { borderLeftColor: itemColor, backgroundColor: theme.surface }]}>
        <View style={styles.statHeader}>
          <View style={[styles.statIconContainer, { backgroundColor: itemColor + '20' }]}>
            <Ionicons name={item.icon} size={24} color={itemColor} />
          </View>
          <View style={[styles.changeBadge, { backgroundColor: item.change.includes('+') ? (theme.success + '20') : (theme.error + '20') }]}>
            <Ionicons
              name={item.change.includes('+') ? 'trending-up' : 'trending-down'}
              size={12}
              color={item.change.includes('+') ? theme.success : theme.error}
            />
            <Text
              style={[
                styles.changeText,
                { color: item.change.includes('+') ? theme.success : theme.error },
              ]}
            >
              {item.change}
            </Text>
          </View>
        </View>
        <Text style={[styles.statValue, { color: theme.text }]}>{item.value}</Text>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]} numberOfLines={2}>{item.title}</Text>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item }) => {
    let rankStyle = {};
    if (item.rank === 1) rankStyle = styles.rankGold;
    else if (item.rank === 2) rankStyle = styles.rankSilver;
    else if (item.rank === 3) rankStyle = styles.rankBronze;
    else rankStyle = { backgroundColor: theme.surfaceVariant, borderColor: theme.border };

    return (
      <View style={[styles.leaderboardItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.leaderboardLeft}>
          <View style={[styles.rankBadge, rankStyle]}>
            <Text style={[styles.rankText, { color: theme.text }]}>#{item.rank}</Text>
          </View>
          <View style={[styles.leaderboardAvatar, { backgroundColor: theme.primary }]}>
            <Text style={[styles.avatarText, { color: theme.onPrimary || '#FFF' }]}>{item.avatar}</Text>
          </View>
          <View style={styles.leaderboardInfo}>
            <Text style={[styles.leaderboardName, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.leaderboardMeta}>
              <View style={[styles.badgeTag, item.badge === 'Elder' ? styles.badgeTagElder : { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.badgeTagText, { color: item.badge === 'Elder' ? '#FFF' : theme.textSecondary }]}>{item.badge}</Text>
              </View>
              <Text style={[styles.contributionsText, { color: theme.textSecondary }]}>{item.contributions} contributions</Text>
            </View>
          </View>
        </View>
        <View style={styles.leaderboardRight}>
          <Text style={[styles.pointsText, { color: theme.primary }]}>{item.points}</Text>
          <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Gradient */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface }]}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Language Vitality</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Track community impact and growth</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Animated Sidebar Navigation */}
        <Animated.View 
          style={[
            styles.sidebar, 
            { 
              width: sidebarWidth,
              backgroundColor: theme.surface, 
              borderRightColor: theme.border 
            }
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {SIDEBAR_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.sidebarItem,
                  selectedView === item.id && [styles.sidebarItemActive, { backgroundColor: theme.primary + '15' }],
                ]}
                onPress={() => {
                  console.log(`📊 View: ${item.label} - Sound: tap`);
                  setSelectedView(item.id);
                }}
              >
                <View style={[
                  styles.sidebarIconContainer,
                  selectedView === item.id && { backgroundColor: theme.primary }
                ]}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={selectedView === item.id ? '#FFF' : theme.textSecondary}
                  />
                </View>
                {sidebarExpanded && (
                  <Text
                    style={[
                      styles.sidebarLabel,
                      { color: selectedView === item.id ? theme.primary : theme.textSecondary }
                    ]}
                  >
                    {item.label}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.sidebarHandleButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={toggleSidebar}
            activeOpacity={0.85}
          >
            <Ionicons
              name={sidebarExpanded ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Main Content Area */}
        <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
          {(showOverview || showAnalytics) && (
            <View style={styles.statsSection}>
              <FlatList
                data={statsCards}
                renderItem={renderStatCard}
                keyExtractor={(item) => item.id}
                numColumns={statColumns}
                key={`stats-${statColumns}`}
                scrollEnabled={false}
                columnWrapperStyle={statColumns > 1 ? styles.statsRow : undefined}
              />
            </View>
          )}

          {(showOverview || showContributors) && (
            <View style={[styles.connectionCard, { backgroundColor: theme.surface }]}> 
              <View style={styles.connectionHeader}>
                <View style={styles.connectionHeaderLeft}>
                  <MaterialCommunityIcons name="transit-connection-variant" size={22} color={theme.primary} />
                  <Text style={[styles.connectionTitle, { color: theme.text }]}>Connected Learning Hub</Text>
                </View>
                {isLoading ? <Text style={[styles.connectionBadge, { color: theme.textSecondary }]}>syncing...</Text> : null}
              </View>
              <Text style={[styles.connectionSubtitle, { color: theme.textSecondary }]}>Jump directly to practice, quizzes, recordings, and active learner community.</Text>

              <View style={styles.connectionGrid}>
                <TouchableOpacity style={[styles.connectionAction, styles.connectionActionResponsive, sidebarExpanded && styles.connectionActionWide, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => navigation.navigate('Vocabulary')}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={18} color={theme.primary} />
                  <Text style={[styles.connectionActionTitle, { color: theme.text }]} numberOfLines={2}>Practice</Text>
                  <Text style={[styles.connectionActionValue, { color: theme.textSecondary }]} numberOfLines={2}>{liveStats.practiceSessions} sessions</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.connectionAction, styles.connectionActionResponsive, sidebarExpanded && styles.connectionActionWide, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => navigation.navigate('Quiz')}>
                  <Ionicons name="help-circle" size={18} color={theme.secondary || theme.primary} />
                  <Text style={[styles.connectionActionTitle, { color: theme.text }]} numberOfLines={2}>Quiz</Text>
                  <Text style={[styles.connectionActionValue, { color: theme.textSecondary }]} numberOfLines={2}>{liveStats.quizzesCompleted} attempts</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.connectionAction, styles.connectionActionResponsive, sidebarExpanded && styles.connectionActionWide, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => navigation.navigate('Record')}>
                  <Ionicons name="mic" size={18} color={theme.accent || theme.primary} />
                  <Text style={[styles.connectionActionTitle, { color: theme.text }]} numberOfLines={2}>Recordings</Text>
                  <Text style={[styles.connectionActionValue, { color: theme.textSecondary }]} numberOfLines={2}>{liveStats.totalRecordings} clips</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.connectionAction, styles.connectionActionResponsive, sidebarExpanded && styles.connectionActionWide, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => navigation.navigate('CommunityStory')}>
                  <Ionicons name="people" size={18} color={theme.success || theme.primary} />
                  <Text style={[styles.connectionActionTitle, { color: theme.text }]} numberOfLines={2}>Active Learners</Text>
                  <Text style={[styles.connectionActionValue, { color: theme.textSecondary }]} numberOfLines={2}>{liveStats.activeLearners} online today</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(showOverview || showContributors) && (
            <View style={[styles.activeLearnerCard, { backgroundColor: theme.surface }]}> 
              <View style={styles.activeLearnerHeader}>
                <MaterialCommunityIcons name="account-group" size={20} color={theme.success || theme.primary} />
                <Text style={[styles.activeLearnerTitle, { color: theme.text }]}>Active Learners Today</Text>
              </View>
              {activeLearnersList.length === 0 ? (
                <Text style={[styles.activeLearnerEmpty, { color: theme.textSecondary }]}>No active learners detected yet today.</Text>
              ) : (
                activeLearnersList.map((user) => (
                  <View key={String(user.id || user.username)} style={[styles.activeLearnerRow, { borderColor: theme.border }]}> 
                    <View style={[styles.activeLearnerAvatar, { backgroundColor: theme.primary + '1A' }]}> 
                      <Text style={[styles.activeLearnerAvatarText, { color: theme.primary }]}>{String((user.username || user.name || 'U').charAt(0)).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activeLearnerName, { color: theme.text }]}>{user.username || user.name || 'Learner'}</Text>
                      <Text style={[styles.activeLearnerMeta, { color: theme.textSecondary }]}>{user.points || 0} points</Text>
                    </View>
                    <Ionicons name="pulse" size={16} color={theme.success || theme.primary} />
                  </View>
                ))
              )}
            </View>
          )}

          {/* AI Vitality Prediction */}
          {(showOverview || showAnalytics) && <View style={[styles.vitalityCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.vitalityHeader}>
              <View style={styles.vitalityHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                  <MaterialCommunityIcons name="brain" size={24} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.vitalityTitle, { color: theme.text }]}>AI Language Health</Text>
                  <Text style={[styles.vitalitySubtitleInline, { color: theme.textSecondary }]}>
                    Live score from speakers, youth learning, and community activity
                  </Text>
                </View>
              </View>
              <View style={[styles.vitalityBadge, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="analytics" size={12} color={theme.primary} />
                <Text style={[styles.vitalityBadgeText, { color: theme.primary }]}>AI</Text>
              </View>
            </View>

            {vitalityPredictions.map((item) => {
              const toneColor = getPredictionToneColor(item.prediction.tone);
              return (
                <View key={item.id} style={[styles.vitalityRow, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                  <View style={styles.vitalityRowTop}>
                    <Text style={[styles.vitalityLanguage, { color: theme.text }]}>{item.language}</Text>
                    <View style={[styles.vitalityLevelPill, { backgroundColor: toneColor + '22', borderColor: toneColor + '55' }]}>
                      <Text style={[styles.vitalityLevelText, { color: toneColor }]}>{item.prediction.level}</Text>
                    </View>
                  </View>

                  <View style={styles.vitalityMetricsRow}>
                    <View style={styles.vitalityMetricItem}>
                      <Text style={[styles.vitalityMetricLabel, { color: theme.textSecondary }]}>Speakers</Text>
                      <Text style={[styles.vitalityMetricValue, { color: theme.text }]}>{item.speakers.toLocaleString()}</Text>
                    </View>
                    <View style={styles.vitalityMetricItem}>
                      <Text style={[styles.vitalityMetricLabel, { color: theme.textSecondary }]}>Youth Learning Rate</Text>
                      <Text style={[styles.vitalityMetricValue, { color: theme.text }]}>{item.youthLearningRate}%</Text>
                    </View>
                    <View style={styles.vitalityMetricItem}>
                      <Text style={[styles.vitalityMetricLabel, { color: theme.textSecondary }]}>Community Activity</Text>
                      <Text style={[styles.vitalityMetricValue, { color: theme.text }]}>{item.communityActivity}%</Text>
                    </View>
                    <View style={styles.vitalityMetricItem}>
                      <Text style={[styles.vitalityMetricLabel, { color: theme.textSecondary }]}>AI Score</Text>
                      <Text style={[styles.vitalityMetricValue, { color: toneColor }]}>{item.prediction.score}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={[styles.aiExplainBox, { backgroundColor: theme.background, borderColor: theme.border }]}> 
              <Text style={[styles.aiExplainTitle, { color: theme.text }]}>How this score works</Text>
              <Text style={[styles.aiExplainText, { color: theme.textSecondary }]}> 
                More quizzes, practice, recordings, and active learners increase this score in real time.
              </Text>
            </View>

            <View style={styles.aiActionRow}>
              <TouchableOpacity
                style={[styles.aiActionButton, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '40' }]}
                onPress={() => navigation.navigate('Quiz')}
              >
                <Ionicons name="help-circle-outline" size={15} color={theme.primary} />
                <Text style={[styles.aiActionText, { color: theme.primary }]} numberOfLines={1}>Take Quiz</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aiActionButton, { backgroundColor: theme.secondary + '14', borderColor: theme.secondary + '40' }]}
                onPress={() => navigation.navigate('Record')}
              >
                <Ionicons name="mic-outline" size={15} color={theme.secondary || theme.primary} />
                <Text style={[styles.aiActionText, { color: theme.secondary || theme.primary }]} numberOfLines={1}>Add Recording</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aiActionButton, { backgroundColor: theme.success + '14', borderColor: theme.success + '40' }]}
                onPress={() => navigation.navigate('ProgressTracker')}
              >
                <Ionicons name="analytics-outline" size={15} color={theme.success} />
                <Text style={[styles.aiActionText, { color: theme.success }]} numberOfLines={1}>View Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aiActionButton, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '40' }]}
                onPress={() => navigation.navigate('CommunityStory')}
              >
                <Ionicons name="people-outline" size={15} color={theme.accent} />
                <Text style={[styles.aiActionText, { color: theme.accent }]} numberOfLines={1}>Community</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.vitalityFooterText, { color: theme.textSecondary }]}>Tip: use the buttons above to improve this score and track changes instantly.</Text>
          </View>}

          {/* Dialect Detection */}
          {(showOverview || showAnalytics) && <View style={[styles.dialectCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.dialectHeader}>
              <View style={styles.dialectHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: theme.secondary + '20' }]}>
                  <MaterialCommunityIcons name="map-search" size={24} color={theme.secondary || theme.primary} />
                </View>
                <View>
                  <Text style={[styles.dialectTitle, { color: theme.text }]}>Dialect Detection AI</Text>
                  <Text style={[styles.dialectSubtitleInline, { color: theme.textSecondary }]}>
                    AI detects dialect differences and suggests teaching strategies
                  </Text>
                </View>
              </View>
              <View style={[styles.regionBadge, { backgroundColor: theme.secondary + '15' }]}>
                <Ionicons name="location" size={12} color={theme.secondary || theme.primary} />
                <Text style={[styles.regionBadgeText, { color: theme.secondary || theme.primary }]}>Regional</Text>
              </View>
            </View>

            {dialectPredictions.map((entry) => {
              const toneColor = getPredictionToneColor(entry.detection.tone);
              const keyExample = entry.examples[0];
              return (
                <View key={entry.id} style={[styles.dialectCompactRow, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                  <View style={styles.dialectRowHeader}>
                    <Text style={[styles.dialectLanguageText, { color: theme.text }]}>{entry.language}</Text>
                    <View style={[styles.dialectLevelPill, { backgroundColor: toneColor + '22', borderColor: toneColor + '55' }]}>
                      <Text style={[styles.dialectLevelText, { color: toneColor }]}>{entry.detection.level} ({entry.detection.score}%)</Text>
                    </View>
                  </View>

                  <Text style={[styles.regionCompareText, { color: theme.textSecondary }]}> 
                    <Ionicons name="location-outline" size={13} color={theme.textSecondary} /> {entry.regions[0]} vs {entry.regions[1]}
                  </Text>

                  {keyExample ? (
                    <View style={styles.dialectExampleCompactRow}>
                      <Text style={[styles.dialectExampleLabel, { color: theme.textSecondary }]}>{keyExample.concept}</Text>
                      <View style={[styles.dialectWordChip, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '35' }]}> 
                        <Text style={[styles.dialectWordChipText, { color: theme.primary }]}>{entry.regions[0]}: {keyExample.regionA}</Text>
                      </View>
                      <View style={[styles.dialectWordChip, { backgroundColor: theme.secondary + '10', borderColor: theme.secondary + '35' }]}> 
                        <Text style={[styles.dialectWordChipText, { color: theme.secondary || theme.primary }]}>{entry.regions[1]}: {keyExample.regionB}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={[styles.teachingTipBox, { backgroundColor: toneColor + '10', borderColor: toneColor + '35' }]}> 
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={toneColor} />
                    <Text style={[styles.teachingTipTextCompact, { color: theme.text }]}>{entry.detection.teachingTip}</Text>
                  </View>
                </View>
              );
            })}
          </View>}

          {/* Leaderboard Section */}
          {(showOverview || showContributors) && <View style={[styles.leaderboardCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.leaderboardHeader}>
              <View style={styles.leaderboardHeaderLeft}>
                <MaterialCommunityIcons name="trophy" size={24} color={theme.accent || theme.secondary} />
                <Text style={[styles.leaderboardTitle, { color: theme.text }]}>Top Contributors</Text>
              </View>
              <TouchableOpacity>
                <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={LEADERBOARD}
              renderItem={renderLeaderboardItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
            />
          </View>}

          {/* Insights Section */}
          {(showOverview || showInsights) && <View style={styles.insightsSection}>
            <View style={[styles.insightCard, { backgroundColor: theme.surface }]}>
              <View style={styles.insightIcon}>
                <MaterialCommunityIcons name="chart-line" size={32} color={theme.success} />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: theme.text }]}>Growing Community</Text>
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  +342 new learners joined this month, marking a 23% increase
                </Text>
              </View>
            </View>

            <View style={[styles.insightCard, { backgroundColor: theme.surface }]}>
              <View style={styles.insightIcon}>
                <MaterialCommunityIcons name="fire" size={32} color={theme.error} />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: theme.text }]}>Most Active Day</Text>
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  Sundays see the highest engagement with 45% more contributions
                </Text>
              </View>
            </View>

            <View style={[styles.insightCard, { backgroundColor: theme.surface }]}>
              <View style={styles.insightIcon}>
                <MaterialCommunityIcons name="star" size={32} color={theme.accent || theme.tertiary || theme.primary} />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: theme.text }]}>Quality Content</Text>
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  87% approval rate for submissions with rich cultural context
                </Text>
              </View>
            </View>
          </View>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 10,
    ...SHADOWS.small,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 132,
    backgroundColor: COLORS.glassLight,
    paddingTop: SPACING.m,
    paddingBottom: SPACING.l,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.4)',
    position: 'relative',
  },
  sidebarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.s + 2,
    paddingHorizontal: SPACING.xs,
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.s,
    borderRadius: 12,
  },
  sidebarItemActive: {
    backgroundColor: COLORS.primary + '10',
    borderRightWidth: 3,
    borderRightColor: COLORS.primary,
  },
  sidebarIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  sidebarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  sidebarHandleButton: {
    position: 'absolute',
    top: 18,
    right: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...SHADOWS.small,
    elevation: 4,
  },
  contentArea: {
    flex: 1,
  },
  statsSection: {
    padding: SPACING.m,
  },
  statsRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.m,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.s,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  changeBadgePositive: {
    backgroundColor: COLORS.success + '20',
  },
  changeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  changeTextPositive: {
    color: COLORS.success,
  },
  changeTextNegative: {
    color: COLORS.error,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
    flexShrink: 1,
  },
  statTitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
    flexShrink: 1,
  },
  vitalityCard: {
    backgroundColor: COLORS.glassLight,
    margin: SPACING.m,
    marginTop: 0,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  vitalityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.s,
  },
  vitalityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    flex: 1,
  },
  vitalityTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  vitalitySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.m,
  },
  vitalityBadge: {
    borderRadius: 999,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
  },
  vitalityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  vitalityRow: {
    borderWidth: 1,
    borderRadius: SPACING.s,
    padding: SPACING.s,
    marginBottom: SPACING.s,
  },
  vitalityRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
    gap: SPACING.s,
  },
  vitalityLanguage: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  vitalityLevelPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
  },
  vitalityLevelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  vitalityMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  vitalityMetricItem: {
    width: '47%',
  },
  vitalityMetricLabel: {
    fontSize: 11,
  },
  vitalityMetricValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  vitalityFooterText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  aiExplainBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.s,
    marginTop: SPACING.xs,
  },
  aiExplainTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  aiExplainText: {
    fontSize: 11,
    lineHeight: 16,
  },
  aiActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.s,
  },
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  aiActionText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  connectionCard: {
    backgroundColor: COLORS.glassLight,
    margin: SPACING.m,
    marginTop: 0,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.xs,
  },
  connectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    flex: 1,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  connectionBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  connectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.s,
  },
  connectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  connectionAction: {
    width: '48%',
    borderWidth: 1,
    borderRadius: SPACING.s,
    padding: SPACING.s,
    gap: 4,
    overflow: 'hidden',
    minHeight: 90,
  },
  connectionActionResponsive: {
    flexShrink: 1,
  },
  connectionActionWide: {
    width: '100%',
  },
  connectionActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  connectionActionValue: {
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
  },
  activeLearnerCard: {
    backgroundColor: COLORS.glassLight,
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    marginTop: 0,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  activeLearnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  activeLearnerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  activeLearnerEmpty: {
    fontSize: 12,
    lineHeight: 18,
  },
  activeLearnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: SPACING.s,
    padding: SPACING.s,
    marginBottom: SPACING.xs,
    gap: SPACING.s,
  },
  activeLearnerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeLearnerAvatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeLearnerName: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeLearnerMeta: {
    fontSize: 11,
  },
  dialectCard: {
    backgroundColor: COLORS.glassLight,
    margin: SPACING.m,
    marginTop: 0,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  dialectHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  dialectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.s,
    width: '100%',
  },
  dialectTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  dialectSubtitlePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dialectSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.m,
  },
  dialectRow: {
    borderWidth: 1,
    borderRadius: SPACING.s,
    padding: SPACING.s,
    marginBottom: SPACING.s,
  },
  dialectCompactRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.s,
    marginBottom: SPACING.s,
    gap: 8,
  },
  dialectRowHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  dialectLanguageText: {
    fontSize: 14,
    fontWeight: '700',
    width: '100%',
  },
  dialectLevelPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  dialectLevelText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  regionCompareText: {
    fontSize: 12,
    marginBottom: 2,
  },
  dialectExampleCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dialectExampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dialectWordChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  dialectWordChipText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  exampleRow: {
    borderWidth: 1,
    borderRadius: SPACING.s,
    padding: SPACING.s,
    marginBottom: SPACING.xs,
  },
  exampleConcept: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  exampleVariant: {
    fontSize: 12,
    lineHeight: 18,
  },
  teachingTipBox: {
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderRadius: SPACING.s,
    padding: SPACING.s,
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'flex-start',
  },
  teachingTipText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  teachingTipTextCompact: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    flexWrap: 'wrap',
  },
  chartCard: {
    backgroundColor: COLORS.glassLight,
    margin: SPACING.m,
    marginTop: 0,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.l,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chartFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chart: {
    flexDirection: 'row',
    height: 220,
  },
  chartYAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingVertical: 4,
  },
  yAxisLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  gridLine: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barColumn: {
    width: '80%',
    height: 180,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
    minHeight: 20,
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  leaderboardCard: {
    backgroundColor: COLORS.glassLight,
    margin: SPACING.m,
    marginTop: 0,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leaderboardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  leaderboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.m,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.m,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankGold: {
    backgroundColor: '#FFD700',
  },
  rankSilver: {
    backgroundColor: '#C0C0C0',
  },
  rankBronze: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  leaderboardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  badgeTag: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeTagElder: {
    backgroundColor: COLORS.secondary + '20',
  },
  badgeTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  contributionsText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  leaderboardRight: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  pointsLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  insightsSection: {
    padding: SPACING.m,
    paddingTop: 0,
    gap: SPACING.m,
    marginBottom: SPACING.l,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    gap: SPACING.m,
    ...SHADOWS.small,
  },
  insightIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
