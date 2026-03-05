import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, GLASS_EFFECTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const MOCK_SUBMISSIONS = [
  {
    id: '1',
    title: 'Traditional Wedding Song',
    category: 'Story',
    status: 'Approved',
    date: '2026-02-28',
    adminComment: 'Beautiful contribution! Well recorded and documented.',
  },
  {
    id: '2',
    title: 'Greeting Phrases for Festival',
    category: 'Phrase',
    status: 'Pending',
    date: '2026-03-02',
    adminComment: '',
  },
  {
    id: '3',
    title: 'Harvest Ritual Story',
    category: 'Cultural Knowledge',
    status: 'Rejected',
    date: '2026-02-25',
    adminComment: 'Audio quality too low. Please re-record in a quieter environment.',
  },
];

const CATEGORIES = ['Story', 'Phrase', 'Cultural Knowledge'];

export default function CommunityContributionScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('contribute');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [hasAudioFile, setHasAudioFile] = useState(false);

  const handleSubmit = () => {
    if (!title || !description || !selectedCategory) {
      alert('Please fill in all required fields');
      return;
    }
    console.log('📤 Submission sent - Sound: success chime');
    alert('Contribution submitted successfully!');
    setTitle('');
    setDescription('');
    setSelectedCategory('');
    setHasAudioFile(false);
  };

  const renderStatusBadge = (status) => {
    let backgroundColor, textColor, icon;
    switch (status) {
      case 'Approved':
        backgroundColor = (theme.success || COLORS.success) + '20';
        textColor = theme.success || COLORS.success;
        icon = 'checkmark-circle';
        break;
      case 'Pending':
        backgroundColor = (theme.accent || COLORS.accent) + '20';
        textColor = theme.accent || COLORS.accent;
        icon = 'time';
        break;
      case 'Rejected':
        backgroundColor = (theme.error || COLORS.error) + '20';
        textColor = theme.error || COLORS.error;
        icon = 'close-circle';
        break;
      default:
        backgroundColor = theme.textSecondary + '20';
        textColor = theme.textSecondary;
        icon = 'help-circle';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <Ionicons name={icon} size={16} color={textColor} />
        <Text style={[styles.statusText, { color: textColor }]}>{status}</Text>
      </View>
    );
  };

  const renderSubmissionCard = ({ item }) => (
    <View style={[styles.submissionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.submissionHeader}>
        <View style={styles.submissionTitleContainer}>
          <Text style={[styles.submissionTitle, { color: theme.text }]}>{item.title}</Text>
          <View style={[styles.categoryTag, { backgroundColor: theme.surfaceVariant }]}>
            <MaterialCommunityIcons
              name={
                item.category === 'Story'
                  ? 'book-open-variant'
                  : item.category === 'Phrase'
                  ? 'message-text'
                  : 'school'
              }
              size={14}
              color={theme.secondary}
            />
            <Text style={[styles.categoryText, { color: theme.textSecondary }]}>{item.category}</Text>
          </View>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      <View style={styles.submissionMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.date}</Text>
        </View>
      </View>

      {item.adminComment && (
        <View style={[styles.adminCommentContainer, { backgroundColor: theme.surfaceVariant }]}>
          <View style={styles.adminCommentHeader}>
            <MaterialCommunityIcons name="comment-account" size={18} color={theme.primary} />
            <Text style={[styles.adminCommentLabel, { color: theme.text }]}>Admin Feedback</Text>
          </View>
          <Text style={[styles.adminCommentText, { color: theme.textSecondary }]}>{item.adminComment}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
      >
        <Ionicons name="chevron-back" size={24} color={theme.primary} />
      </TouchableOpacity>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Community Hub</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Contribute and track your submissions
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.tab, 
            { backgroundColor: theme.surface },
            activeTab === 'contribute' && [styles.activeTab, { backgroundColor: theme.primary }]
          ]}
          onPress={() => {
            console.log('📝 Tab: Contribute - Sound: tap');
            setActiveTab('contribute');
          }}
        >
          <Ionicons
            name="add-circle"
            size={20}
            color={activeTab === 'contribute' ? (theme.onPrimary || '#FFFFFF') : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: theme.textSecondary },
              activeTab === 'contribute' && [styles.activeTabText, { color: theme.onPrimary || '#FFFFFF' }],
            ]}
          >
            Contribute
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab, 
            { backgroundColor: theme.surface },
            activeTab === 'submissions' && [styles.activeTab, { backgroundColor: theme.primary }]
          ]}
          onPress={() => {
            console.log('📋 Tab: Submissions - Sound: tap');
            setActiveTab('submissions');
          }}
        >
          <Ionicons
            name="list"
            size={20}
            color={activeTab === 'submissions' ? (theme.onPrimary || '#FFFFFF') : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: theme.textSecondary },
              activeTab === 'submissions' && [styles.activeTabText, { color: theme.onPrimary || '#FFFFFF' }],
            ]}
          >
            My Submissions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab, 
            { backgroundColor: theme.surface },
            activeTab === 'profile' && [styles.activeTab, { backgroundColor: theme.primary }]
          ]}
          onPress={() => {
            console.log('👤 Tab: Profile - Sound: tap');
            setActiveTab('profile');
          }}
        >
          <Ionicons
            name="person"
            size={20}
            color={activeTab === 'profile' ? (theme.onPrimary || '#FFFFFF') : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: theme.textSecondary },
              activeTab === 'profile' && [styles.activeTabText, { color: theme.onPrimary || '#FFFFFF' }],
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contribute Tab */}
        {activeTab === 'contribute' && (
          <View style={styles.contributeSection}>
            <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.formTitle, { color: theme.text }]}>Submit New Contribution</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Title <Text style={[styles.required, { color: theme.error }]}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g., Traditional Harvest Song"
                  placeholderTextColor={theme.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Category <Text style={[styles.required, { color: theme.error }]}>*</Text>
                </Text>
                <View style={styles.categorySelector}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                        selectedCategory === category && [styles.categoryButtonActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          { color: theme.text },
                          selectedCategory === category && [styles.categoryButtonTextActive, { color: theme.onPrimary }],
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Audio Recording <Text style={[styles.required, { color: theme.error }]}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.uploadButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                  onPress={() => setHasAudioFile(!hasAudioFile)}
                >
                  <MaterialCommunityIcons name="microphone" size={28} color={theme.primary} />
                  <View style={styles.uploadTextContainer}>
                    <Text style={[styles.uploadButtonText, { color: theme.text }]}>
                      {hasAudioFile ? 'Audio file attached ✓' : 'Upload Audio File'}
                    </Text>
                    <Text style={[styles.uploadButtonSubtext, { color: theme.textSecondary }]}>MP3, WAV, M4A (Max 50MB)</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Description <Text style={[styles.required, { color: theme.error }]}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                  placeholder="Describe the context, cultural significance, or any relevant information..."
                  placeholderTextColor={theme.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleSubmit}>
                <Text style={[styles.submitButtonText, { color: theme.onPrimary }]}>Submit Contribution</Text>
                <Ionicons name="send" size={20} color={theme.onPrimary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.guidelinesCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <View style={styles.guidelinesHeader}>
                <Ionicons name="information-circle" size={24} color={theme.accent || COLORS.accent} />
                <Text style={[styles.guidelinesTitle, { color: theme.text }]}>Contribution Guidelines</Text>
              </View>
              <View style={styles.guidelinesList}>
                <Text style={[styles.guidelineItem, { color: theme.textSecondary }]}>• Use clear audio with minimal background noise</Text>
                <Text style={[styles.guidelineItem, { color: theme.textSecondary }]}>• Provide accurate context and translations</Text>
                <Text style={[styles.guidelineItem, { color: theme.textSecondary }]}>• Respect cultural sensitivity and authenticity</Text>
                <Text style={[styles.guidelineItem, { color: theme.textSecondary }]}>• Admin review typically takes 2-3 days</Text>
              </View>
            </View>
          </View>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <View style={styles.submissionsSection}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{MOCK_SUBMISSIONS.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statNumber, { color: theme.success || COLORS.success }]}>
                  {MOCK_SUBMISSIONS.filter((s) => s.status === 'Approved').length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Approved</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statNumber, { color: theme.accent || COLORS.accent }]}>
                  {MOCK_SUBMISSIONS.filter((s) => s.status === 'Pending').length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
              </View>
            </View>

            <FlatList
              data={MOCK_SUBMISSIONS}
              renderItem={renderSubmissionCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.submissionsList}
            />
          </View>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <View style={styles.profileSection}>
            <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.avatarText, { color: theme.onPrimary }]}>JD</Text>
                </View>
                <TouchableOpacity style={[styles.editAvatarButton, { backgroundColor: theme.secondary }]}>
                  <Ionicons name="camera" size={16} color={theme.onPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.userName, { color: theme.text }]}>John Dayak</Text>
              
              <View style={[styles.roleBadge, { backgroundColor: (theme.accent || COLORS.accent) + '20' }]}>
                <MaterialCommunityIcons name="shield-star" size={18} color={theme.accent || COLORS.accent} />
                <Text style={[styles.roleText, { color: theme.accent || COLORS.accent }]}>Community Learner</Text>
              </View>

              <View style={styles.profileStats}>
                <View style={styles.profileStatItem}>
                  <MaterialCommunityIcons name="file-document" size={24} color={theme.primary} />
                  <Text style={[styles.profileStatNumber, { color: theme.text }]}>3</Text>
                  <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>Contributions</Text>
                </View>

                <View style={[styles.profileDivider, { backgroundColor: theme.border }]} />

                <View style={styles.profileStatItem}>
                  <MaterialCommunityIcons name="trophy" size={24} color={theme.accent || COLORS.accent} />
                  <Text style={[styles.profileStatNumber, { color: theme.text }]}>245</Text>
                  <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>Points Earned</Text>
                </View>

                <View style={[styles.profileDivider, { backgroundColor: theme.border }]} />

                <View style={styles.profileStatItem}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color={theme.secondary} />
                  <Text style={[styles.profileStatNumber, { color: theme.text }]}>12</Text>
                  <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>Days Active</Text>
                </View>
              </View>
            </View>

            <View style={[styles.achievementsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.achievementsTitle, { color: theme.text }]}>Recent Achievements</Text>
              <View style={styles.achievementsList}>
                <View style={[styles.achievementItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <View style={[styles.achievementIcon, { backgroundColor: (theme.accent || COLORS.accent) + '20' }]}>
                    <MaterialCommunityIcons name="star" size={24} color={theme.accent || COLORS.accent} />
                  </View>
                  <View style={styles.achievementTextContainer}>
                    <Text style={[styles.achievementName, { color: theme.text }]}>First Contribution</Text>
                    <Text style={[styles.achievementDesc, { color: theme.textSecondary }]}>Submit your first recording</Text>
                  </View>
                  <Text style={[styles.achievementPoints, { color: theme.accent || COLORS.accent }]}>+50</Text>
                </View>

                <View style={[styles.achievementItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <View style={[styles.achievementIcon, { backgroundColor: (theme.error || COLORS.error) + '20' }]}>
                    <MaterialCommunityIcons name="fire" size={24} color={theme.error || COLORS.error} />
                  </View>
                  <View style={styles.achievementTextContainer}>
                    <Text style={[styles.achievementName, { color: theme.text }]}>3 Day Streak</Text>
                    <Text style={[styles.achievementDesc, { color: theme.textSecondary }]}>Active for 3 consecutive days</Text>
                  </View>
                  <Text style={[styles.achievementPoints, { color: theme.error || COLORS.error }]}>+30</Text>
                </View>
              </View>
            </View>

            <View style={[styles.activityCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>Recent Activity</Text>
              <View style={styles.activityList}>
                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.activityText, { color: theme.text }]}>Submitted "Traditional Wedding Song"</Text>
                  <Text style={[styles.activityTime, { color: theme.textSecondary }]}>2d ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: theme.secondary }]} />
                  <Text style={[styles.activityText, { color: theme.text }]}>Earned "First Contribution" badge</Text>
                  <Text style={[styles.activityTime, { color: theme.textSecondary }]}>3d ago</Text>
                </View>

                <View style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <Text style={styles.activityText}>Joined Community Hub</Text>
                  <Text style={styles.activityTime}>5d ago</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: SPACING.m,
    marginTop: SPACING.s,
    padding: SPACING.xs,
  },
  header: {
    padding: SPACING.l,
    backgroundColor: COLORS.glassLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    ...SHADOWS.small,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.glassLight,
    paddingHorizontal: SPACING.s,
    paddingTop: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  contributeSection: {
    padding: SPACING.l,
  },
  formCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.l,
    marginBottom: SPACING.l,
    ...SHADOWS.medium,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.l,
  },
  inputGroup: {
    marginBottom: SPACING.l,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  required: {
    color: COLORS.error,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.s,
    padding: SPACING.m,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: SPACING.s,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.s,
    borderRadius: SPACING.s,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  categoryButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryButtonTextActive: {
    color: COLORS.primary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: SPACING.s,
    padding: SPACING.l,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  uploadButtonSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    borderRadius: SPACING.s,
    marginTop: SPACING.m,
    ...SHADOWS.medium,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  guidelinesCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: SPACING.m,
    padding: SPACING.l,
    ...SHADOWS.small,
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  guidelinesList: {
    gap: SPACING.s,
  },
  guidelineItem: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  submissionsSection: {
    padding: SPACING.l,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.m,
    marginBottom: SPACING.l,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    borderRadius: SPACING.m,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  submissionsList: {
    gap: SPACING.m,
  },
  submissionCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.s,
  },
  submissionTitleContainer: {
    flex: 1,
    marginRight: SPACING.s,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  submissionMeta: {
    flexDirection: 'row',
    gap: SPACING.m,
    marginBottom: SPACING.s,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  adminCommentContainer: {
    backgroundColor: COLORS.background,
    borderRadius: SPACING.s,
    padding: SPACING.m,
    marginTop: SPACING.s,
  },
  adminCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  adminCommentLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  adminCommentText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  profileSection: {
    padding: SPACING.l,
  },
  profileCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.l,
    ...SHADOWS.medium,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.m,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    marginBottom: SPACING.l,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  profileStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: SPACING.l,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.s,
  },
  profileStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  achievementsCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.l,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  achievementsList: {
    gap: SPACING.m,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  achievementDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  achievementPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  activityCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: SPACING.l,
    ...SHADOWS.small,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  activityList: {
    gap: SPACING.m,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
