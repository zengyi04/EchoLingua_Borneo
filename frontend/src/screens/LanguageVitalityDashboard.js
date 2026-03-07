import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const STATS = [
  { id: '1', title: 'Total Recordings', value: '1,247', icon: 'mic', colorKey: 'primary', change: '+15%' },
  { id: '2', title: 'Active Learners', value: '3,842', icon: 'people', colorKey: 'success', change: '+8%' },
  { id: '3', title: 'Stories Created', value: '156', icon: 'book', colorKey: 'secondary', change: '+23%' },
  { id: '4', title: 'Words Documented', value: '4,521', icon: 'text', colorKey: 'accent', change: '+12%' },
];

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

export default function LanguageVitalityDashboard() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [selectedView, setSelectedView] = useState('overview');

  const maxValue = Math.max(...CHART_DATA.map(d => d.value));
  const vitalityPredictions = VITALITY_INPUTS.map((entry) => ({
    ...entry,
    prediction: predictVitality(entry),
  }));

  const getPredictionToneColor = (tone) => {
    if (tone === 'success') return theme.success;
    if (tone === 'error') return theme.error;
    return theme.accent || theme.primary;
  };

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
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{item.title}</Text>
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
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Language Vitality</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Track community impact and growth</Text>
      </View>

      <View style={styles.mainContent}>
        {/* Sidebar Navigation */}
        <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
          {SIDEBAR_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.sidebarItem,
                selectedView === item.id && { backgroundColor: theme.primary + '20' },
              ]}
              onPress={() => {
                console.log(`📊 View: ${item.label} - Sound: tap`);
                setSelectedView(item.id);
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={selectedView === item.id ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.sidebarLabel,
                  { color: selectedView === item.id ? theme.primary : theme.textSecondary }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Content Area */}
        <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
          {/* Statistics Cards */}
          <View style={styles.statsSection}>
            <FlatList
              data={STATS}
              renderItem={renderStatCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.statsRow}
            />
          </View>

          {/* AI Vitality Prediction */}
          <View style={[styles.vitalityCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.vitalityHeader}>
              <View style={styles.vitalityHeaderLeft}>
                <MaterialCommunityIcons name="brain" size={22} color={theme.primary} />
                <Text style={[styles.vitalityTitle, { color: theme.text }]}>AI Language Vitality Prediction</Text>
              </View>
              <View style={[styles.vitalityBadge, { backgroundColor: theme.primary + '1A' }]}>
                <Text style={[styles.vitalityBadgeText, { color: theme.primary }]}>Research Mode</Text>
              </View>
            </View>
            <Text style={[styles.vitalitySubtitle, { color: theme.textSecondary }]}>Based on number of speakers, youth learning rate, and community activity.</Text>

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
                      <Text style={[styles.vitalityMetricLabel, { color: theme.textSecondary }]}>Youth Learning</Text>
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

            <Text style={[styles.vitalityFooterText, { color: theme.textSecondary }]}>This prediction helps researchers monitor language survival trends and prioritize revitalization support.</Text>
          </View>

          {/* Chart Section */}
          <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Monthly Activity</Text>
                <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>New contributions per month</Text>
              </View>
              <TouchableOpacity style={styles.chartFilterButton}>
                <Text style={[styles.chartFilterText, { color: theme.textSecondary }]}>2026</Text>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.chart}>
              <View style={styles.chartYAxis}>
                <Text style={[styles.yAxisLabel, { color: theme.textSecondary }]}>100</Text>
                <Text style={[styles.yAxisLabel, { color: theme.textSecondary }]}>75</Text>
                <Text style={[styles.yAxisLabel, { color: theme.textSecondary }]}>50</Text>
                <Text style={[styles.yAxisLabel, { color: theme.textSecondary }]}>25</Text>
                <Text style={[styles.yAxisLabel, { color: theme.textSecondary }]}>0</Text>
              </View>

              <View style={styles.chartContent}>
                {/* Grid Lines */}
                <View style={styles.gridLines}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.gridLine, { backgroundColor: theme.border }]} />
                  ))}
                </View>

                {/* Bars */}
                <View style={styles.barsContainer}>
                  {CHART_DATA.map((data, index) => (
                    <View key={index} style={styles.barWrapper}>
                      <View style={styles.barColumn}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${(data.value / maxValue) * 100}%`,
                              backgroundColor:
                                data.value === maxValue ? theme.primary : theme.primary + '60',
                            },
                          ]}
                        >
                          <Text style={[styles.barValue, { color: theme.text }]}>{data.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{data.month}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Leaderboard Section */}
          <View style={[styles.leaderboardCard, { backgroundColor: theme.surface }]}>
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
          </View>

          {/* Insights Section */}
          <View style={styles.insightsSection}>
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
          </View>
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
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 80,
    backgroundColor: COLORS.glassLight,
    paddingVertical: SPACING.m,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.4)',
  },
  sidebarItem: {
    alignItems: 'center',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.s,
    marginBottom: SPACING.s,
  },
  sidebarItemActive: {
    backgroundColor: COLORS.primary + '10',
    borderRightWidth: 3,
    borderRightColor: COLORS.primary,
  },
  sidebarLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sidebarLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
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
  },
  statTitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
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
